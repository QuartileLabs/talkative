import { io, Socket } from 'socket.io-client';
import { Audio } from 'expo-av';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

import {
  VoiceClientConfig,
  VoiceClientEvents,
  VoiceClientState,
  ConversationMessage,
  AudioConfig,
} from './types';

export class VoiceClient extends EventEmitter {
  private socket: Socket | null = null;
  private config: VoiceClientConfig;
  private state: VoiceClientState;
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private audioConfig: AudioConfig;

  constructor(config: VoiceClientConfig) {
    super();
    this.config = {
      autoConnect: true,
      audioConfig: {
        sampleRate: 16000,
        channels: 1,
        bitDepth: 16,
        format: 'wav',
      },
      ...config,
    };
    
    this.audioConfig = this.config.audioConfig!;
    
    this.state = {
      isConnected: false,
      isRecording: false,
      isPlaying: false,
      sessionId: config.sessionId,
      conversationHistory: [],
    };

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  public async connect(): Promise<void> {
    try {
      this.socket = io(this.config.serverUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });

      this.setupSocketHandlers();
      
      if (this.config.sessionId) {
        await this.joinSession(this.config.sessionId);
      }
    } catch (error) {
      this.emit('error', `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.state.isConnected = false;
    this.emit('disconnected');
  }

  public async joinSession(sessionId: string): Promise<void> {
    if (!this.socket) {
      throw new Error('Not connected to server');
    }

    return new Promise((resolve, reject) => {
      this.socket!.emit('join-session', sessionId);
      
      const timeout = setTimeout(() => {
        reject(new Error('Session join timeout'));
      }, 10000);

      this.socket!.once('session-joined', (joinedSessionId: string) => {
        clearTimeout(timeout);
        this.state.sessionId = joinedSessionId;
        resolve();
      });

      this.socket!.once('error', (error: string) => {
        clearTimeout(timeout);
        reject(new Error(error));
      });
    });
  }

  public async startRecording(): Promise<void> {
    if (this.state.isRecording) {
      throw new Error('Already recording');
    }

    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Audio recording permission not granted');
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Start recording
      this.recording = new Audio.Recording();
      await this.recording.prepareAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await this.recording.startAsync();

      this.state.isRecording = true;
      this.emit('recording-started');

      // Set up recording status updates
      this.recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && status.durationMillis) {
          // Send audio chunks to server
          this.sendAudioChunk();
        }
      });

    } catch (error) {
      this.emit('error', `Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  public async stopRecording(): Promise<void> {
    if (!this.state.isRecording || !this.recording) {
      throw new Error('Not recording');
    }

    try {
      await this.recording.stopAndUnloadAsync();
      this.state.isRecording = false;
      this.emit('recording-stopped');

      // Send end-audio signal
      if (this.socket && this.state.sessionId) {
        this.socket.emit('end-audio', this.state.sessionId);
      }

      this.recording = null;
    } catch (error) {
      this.emit('error', `Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  public async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    if (this.state.isPlaying) {
      await this.stopAudio();
    }

    try {
      this.sound = new Audio.Sound();
      await this.sound.loadAsync({ uri: this.createAudioUri(audioBuffer) });
      
      this.state.isPlaying = true;
      this.emit('playing-started');

      await this.sound.playAsync();

      this.sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && !status.isPlaying) {
          this.state.isPlaying = false;
          this.emit('playing-stopped');
          this.sound = null;
        }
      });

    } catch (error) {
      this.emit('error', `Failed to play audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  public async stopAudio(): Promise<void> {
    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
    }
    this.state.isPlaying = false;
    this.emit('playing-stopped');
  }

  public getState(): VoiceClientState {
    return { ...this.state };
  }

  public getConversationHistory(): ConversationMessage[] {
    return [...this.state.conversationHistory];
  }

  private setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.state.isConnected = true;
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      this.state.isConnected = false;
      this.emit('disconnected');
    });

    this.socket.on('session-joined', (sessionId: string) => {
      this.state.sessionId = sessionId;
      this.emit('session-joined', sessionId);
    });

    this.socket.on('transcription', (result: { text: string; confidence: number; isFinal: boolean }) => {
      if (result.isFinal) {
        this.emit('transcription', result.text, result.confidence);
        
        // Add user message to conversation history
        const userMessage: ConversationMessage = {
          id: uuidv4(),
          role: 'user',
          content: result.text,
          timestamp: new Date(),
        };
        this.state.conversationHistory.push(userMessage);
      }
    });

    this.socket.on('llm-response', (response: { text: string }) => {
      this.emit('llm-response', response.text);
      
      // Add assistant message to conversation history
      const assistantMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response.text,
        timestamp: new Date(),
      };
      this.state.conversationHistory.push(assistantMessage);
    });

    this.socket.on('tts-audio', (audioBuffer: ArrayBuffer) => {
      this.emit('tts-audio', audioBuffer);
      this.playAudio(audioBuffer);
    });

    this.socket.on('error', (error: string) => {
      this.emit('error', error);
    });

    this.socket.on('session-timeout', () => {
      this.emit('session-timeout');
    });
  }

  private async sendAudioChunk(): Promise<void> {
    if (!this.recording || !this.socket || !this.state.sessionId) return;

    try {
      const uri = this.recording.getURI();
      if (!uri) return;

      // In a real implementation, you would read the audio file in chunks
      // and send them to the server. For now, this is a placeholder.
      // You might want to use expo-file-system to read the file in chunks.
      
      // Placeholder for audio chunk sending
      // const audioChunk = await this.readAudioChunk(uri);
      // this.socket.emit('audio-chunk', {
      //   sessionId: this.state.sessionId,
      //   data: audioChunk,
      //   timestamp: Date.now(),
      //   isFinal: false,
      // });
    } catch (error) {
      this.emit('error', `Failed to send audio chunk: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createAudioUri(audioBuffer: ArrayBuffer): string {
    // Convert ArrayBuffer to base64 data URI
    const base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    return `data:audio/wav;base64,${base64}`;
  }
} 