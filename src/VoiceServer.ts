import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

import {
  VoiceServerConfig,
  Session,
  ConversationMessage,
  AudioChunk,
  TranscriptionResult,
  LLMResponse,
  TTSResult,
  VoiceServerEvents,
  SocketEvents,
} from './types';
import { LLMProviderFactory, LLMProviderInterface } from './providers/llm';
import { TTSProviderFactory, TTSProviderInterface } from './providers/tts';
import { STTProviderFactory, STTProviderInterface } from './providers/stt';

interface AudioBuffer {
  chunks: Buffer[];
  startTime: number;
  lastChunkTime: number;
  isProcessing: boolean;
  silenceTimer: NodeJS.Timeout | null;
}

interface ProcessingState {
  isListening: boolean;
  isProcessing: boolean;
  currentAudioBuffer: AudioBuffer | null;
  pendingTranscription: boolean;
}

export class VoiceServer extends EventEmitter {
  private io!: SocketIOServer;
  private httpServer!: HTTPServer;
  private sessions: Map<string, Session> = new Map();
  private processingStates: Map<string, ProcessingState> = new Map();
  private config: VoiceServerConfig;
  private llmProvider!: LLMProviderInterface;
  private ttsProvider!: TTSProviderInterface;
  private sttProvider!: STTProviderInterface;
  private sessionTimeout: NodeJS.Timeout | null = null;

  // Audio processing configuration
  private readonly SILENCE_THRESHOLD = 2000; // 2 seconds of silence
  private readonly MAX_AUDIO_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MIN_AUDIO_DURATION = 500; // 500ms minimum audio duration

  constructor(config: VoiceServerConfig) {
    super();
    this.config = {
      port: 3000,
      cors: {
        origin: '*',
        credentials: true,
      },
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      ...config,
    };

    this.initializeProviders();
    this.initializeServer();
    this.setupSocketHandlers();
    this.startSessionCleanup();
  }

  private initializeProviders(): void {
    if (!this.config.llm) {
      throw new Error('LLM configuration is required');
    }
    if (!this.config.tts) {
      throw new Error('TTS configuration is required');
    }
    if (!this.config.stt) {
      throw new Error('STT configuration is required');
    }

    // Use LangChain providers by default
    this.llmProvider = LLMProviderFactory.createProvider(this.config.llm, true);
    this.ttsProvider = TTSProviderFactory.createProvider(this.config.tts);
    this.sttProvider = STTProviderFactory.createProvider(this.config.stt);
  }

  private initializeServer(): void {
    const app = express();
    
    app.use(helmet());
    app.use(cors(this.config.cors));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.raw({ type: 'audio/*', limit: '10mb' }));

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        sessions: this.sessions.size,
        activeProcessing: Array.from(this.processingStates.values()).filter(state => state.isProcessing).length
      });
    });

    // Session management endpoints
    app.get('/sessions', (req, res) => {
      const sessions = Array.from(this.sessions.values()).map(session => ({
        id: session.id,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        messageCount: session.conversationHistory.length,
      }));
      res.json(sessions);
    });

    app.delete('/sessions/:sessionId', (req, res) => {
      const { sessionId } = req.params;
      const destroyed = this.destroySession(sessionId);
      res.json({ destroyed });
    });

    this.httpServer = new HTTPServer(app);
    this.io = new SocketIOServer(this.httpServer, {
      cors: this.config.cors,
      transports: ['websocket', 'polling'],
    });
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on('join-session', async (sessionId: string) => {
        try {
          const session = await this.getOrCreateSession(sessionId);
          socket.join(sessionId);
          
          // Initialize processing state for this session
          this.processingStates.set(sessionId, {
            isListening: false,
            isProcessing: false,
            currentAudioBuffer: null,
            pendingTranscription: false,
          });

          socket.emit('session-joined', sessionId);
          console.log(`Client ${socket.id} joined session ${sessionId}`);
        } catch (error) {
          socket.emit('error', `Failed to join session: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      socket.on('start-listening', async (sessionId: string) => {
        try {
          await this.startListening(socket, sessionId);
        } catch (error) {
          socket.emit('error', `Failed to start listening: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      socket.on('stop-listening', async (sessionId: string) => {
        try {
          await this.stopListening(socket, sessionId);
        } catch (error) {
          socket.emit('error', `Failed to stop listening: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      socket.on('audio-chunk', async (data: AudioChunk) => {
        try {
          await this.handleAudioChunk(socket, data);
        } catch (error) {
          socket.emit('error', `Failed to process audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      socket.on('end-audio', async (sessionId: string) => {
        try {
          await this.handleEndAudio(socket, sessionId);
        } catch (error) {
          socket.emit('error', `Failed to end audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        // Clean up any processing states for this socket's sessions
        this.cleanupSocketSessions(socket.id);
      });
    });
  }

  private async getOrCreateSession(sessionId: string): Promise<Session> {
    let session = this.sessions.get(sessionId);
    
    if (!session) {
      session = {
        id: sessionId,
        createdAt: new Date(),
        lastActivity: new Date(),
        conversationHistory: [],
        config: {
          llm: this.config.llm!,
          tts: this.config.tts!,
          stt: this.config.stt!,
        },
      };
      
      this.sessions.set(sessionId, session);
      this.emit('session-created', session);
    } else {
      session.lastActivity = new Date();
    }

    return session;
  }

  private async startListening(socket: any, sessionId: string): Promise<void> {
    const state = this.processingStates.get(sessionId);
    if (!state) {
      throw new Error('Session not found');
    }

    if (state.isListening) {
      return; // Already listening
    }

    state.isListening = true;
    state.currentAudioBuffer = {
      chunks: [],
      startTime: Date.now(),
      lastChunkTime: Date.now(),
      isProcessing: false,
      silenceTimer: null,
    };

    socket.emit('listening-started', sessionId);
    console.log(`Started listening for session ${sessionId}`);
  }

  private async stopListening(socket: any, sessionId: string): Promise<void> {
    const state = this.processingStates.get(sessionId);
    if (!state) {
      return;
    }

    state.isListening = false;
    
    // Clear any pending silence timer
    if (state.currentAudioBuffer?.silenceTimer) {
      clearTimeout(state.currentAudioBuffer.silenceTimer);
      state.currentAudioBuffer.silenceTimer = null;
    }

    // Process any remaining audio
    if (state.currentAudioBuffer && state.currentAudioBuffer.chunks.length > 0) {
      await this.processAudioBuffer(socket, sessionId, state.currentAudioBuffer);
    }

    state.currentAudioBuffer = null;
    socket.emit('listening-stopped', sessionId);
    console.log(`Stopped listening for session ${sessionId}`);
  }

  private async handleAudioChunk(socket: any, data: AudioChunk): Promise<void> {
    const state = this.processingStates.get(data.sessionId);
    if (!state || !state.isListening) {
      return;
    }

    if (!state.currentAudioBuffer) {
      state.currentAudioBuffer = {
        chunks: [],
        startTime: Date.now(),
        lastChunkTime: Date.now(),
        isProcessing: false,
        silenceTimer: null,
      };
    }

    const audioBuffer = state.currentAudioBuffer;
    
    // Add chunk to buffer
    audioBuffer.chunks.push(data.data);
    audioBuffer.lastChunkTime = Date.now();

    // Check buffer size limit
    let totalSize = audioBuffer.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    if (totalSize > this.MAX_AUDIO_BUFFER_SIZE) {
      console.warn(`Audio buffer size limit exceeded for session ${data.sessionId}`);
      // Remove oldest chunks to stay under limit
      while (totalSize > this.MAX_AUDIO_BUFFER_SIZE && audioBuffer.chunks.length > 1) {
        const removedChunk = audioBuffer.chunks.shift();
        if (removedChunk) {
          totalSize -= removedChunk.length;
        }
      }
    }

    // Clear existing silence timer
    if (audioBuffer.silenceTimer) {
      clearTimeout(audioBuffer.silenceTimer);
    }

    // Set new silence timer
    audioBuffer.silenceTimer = setTimeout(async () => {
      if (state.isListening && audioBuffer.chunks.length > 0) {
        const audioDuration = Date.now() - audioBuffer.startTime;
        if (audioDuration >= this.MIN_AUDIO_DURATION) {
          await this.processAudioBuffer(socket, data.sessionId, audioBuffer);
        }
      }
    }, this.SILENCE_THRESHOLD);

    // If this is marked as final, process immediately
    if (data.isFinal) {
      if (audioBuffer.silenceTimer) {
        clearTimeout(audioBuffer.silenceTimer);
        audioBuffer.silenceTimer = null;
      }
      await this.processAudioBuffer(socket, data.sessionId, audioBuffer);
    }
  }

  private async handleEndAudio(socket: any, sessionId: string): Promise<void> {
    const state = this.processingStates.get(sessionId);
    if (!state) {
      return;
    }

    // Stop listening and process any remaining audio
    await this.stopListening(socket, sessionId);
  }

  private async processAudioBuffer(socket: any, sessionId: string, audioBuffer: AudioBuffer): Promise<void> {
    const state = this.processingStates.get(sessionId);
    if (!state || state.isProcessing || audioBuffer.isProcessing) {
      return;
    }

    if (audioBuffer.chunks.length === 0) {
      return;
    }

    state.isProcessing = true;
    audioBuffer.isProcessing = true;

    try {
      // Combine all audio chunks
      const combinedAudio = Buffer.concat(audioBuffer.chunks);
      
      // Clear the buffer
      audioBuffer.chunks = [];
      audioBuffer.isProcessing = false;

      // Transcribe the audio
      const transcription = await this.sttProvider.transcribe(combinedAudio);
      
      socket.emit('transcription', transcription);
      this.emit('transcription-complete', sessionId, transcription.text);

      // Only process if we have meaningful text
      if (transcription.text.trim() && transcription.confidence > 0.5) {
        await this.processUserMessage(socket, sessionId, transcription.text);
      } else {
        console.log(`Low confidence transcription or empty text for session ${sessionId}: "${transcription.text}"`);
      }

    } catch (error) {
      console.error(`Error processing audio for session ${sessionId}:`, error);
      socket.emit('error', `Failed to process audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      state.isProcessing = false;
    }
  }

  private async processUserMessage(socket: any, sessionId: string, text: string): Promise<void> {
    const session = await this.getOrCreateSession(sessionId);
    
    // Add user message to conversation history
    const userMessage: ConversationMessage = {
      id: uuidv4(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    
    session.conversationHistory.push(userMessage);
    session.lastActivity = new Date();

    try {
      // Generate LLM response
      const messages = session.conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const llmResponse = await this.llmProvider.generateResponse(messages);
      
      // Add assistant message to conversation history
      const assistantMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: llmResponse.text,
        timestamp: new Date(),
      };
      
      session.conversationHistory.push(assistantMessage);

      // Send LLM response to client
      socket.emit('llm-response', llmResponse);
      this.emit('llm-response-complete', sessionId, llmResponse);

      // Generate TTS audio
      const ttsResult = await this.ttsProvider.synthesize(llmResponse.text);
      
      // Send TTS audio to client
      socket.emit('tts-audio', ttsResult.audioBuffer);
      this.emit('tts-complete', sessionId, ttsResult.audioBuffer);

    } catch (error) {
      const errorMessage = `Failed to process message: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`Error in processUserMessage for session ${sessionId}:`, error);
      socket.emit('error', errorMessage);
      this.emit('error', new Error(errorMessage));
    }
  }

  private cleanupSocketSessions(socketId: string): void {
    // This would need to be implemented based on how you track which sessions a socket belongs to
    // For now, we'll just log the cleanup
    console.log(`Cleaning up sessions for socket ${socketId}`);
  }

  private startSessionCleanup(): void {
    setInterval(() => {
      const now = new Date();
      const timeoutThreshold = now.getTime() - (this.config.sessionTimeout || 30 * 60 * 1000);

      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.lastActivity.getTime() < timeoutThreshold) {
          this.sessions.delete(sessionId);
          this.processingStates.delete(sessionId);
          this.io.to(sessionId).emit('session-timeout');
          this.emit('session-destroyed', sessionId);
          console.log(`Session ${sessionId} timed out and was destroyed`);
        }
      }
    }, 60000); // Check every minute
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.config.port, () => {
        console.log(`Voice server started on port ${this.config.port}`);
        console.log(`Health check available at http://localhost:${this.config.port}/health`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      // Clean up all processing states
      for (const [sessionId, state] of this.processingStates.entries()) {
        if (state.currentAudioBuffer?.silenceTimer) {
          clearTimeout(state.currentAudioBuffer.silenceTimer);
        }
      }
      this.processingStates.clear();

      this.httpServer.close(() => {
        console.log('Voice server stopped');
        resolve();
      });
    });
  }

  public getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  public getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  public getProcessingState(sessionId: string): ProcessingState | undefined {
    return this.processingStates.get(sessionId);
  }

  public destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Clean up processing state
      const state = this.processingStates.get(sessionId);
      if (state?.currentAudioBuffer?.silenceTimer) {
        clearTimeout(state.currentAudioBuffer.silenceTimer);
      }
      this.processingStates.delete(sessionId);

      this.sessions.delete(sessionId);
      this.io.to(sessionId).emit('session-timeout');
      this.emit('session-destroyed', sessionId);
      return true;
    }
    return false;
  }

  // Public methods for manual control
  public async forceProcessAudio(sessionId: string): Promise<void> {
    const state = this.processingStates.get(sessionId);
    if (state?.currentAudioBuffer && state.currentAudioBuffer.chunks.length > 0) {
      const socket = this.io.sockets.sockets.get(sessionId);
      if (socket) {
        await this.processAudioBuffer(socket, sessionId, state.currentAudioBuffer);
      }
    }
  }

  public isSessionListening(sessionId: string): boolean {
    return this.processingStates.get(sessionId)?.isListening || false;
  }

  public isSessionProcessing(sessionId: string): boolean {
    return this.processingStates.get(sessionId)?.isProcessing || false;
  }
} 