export interface VoiceServerConfig {
  port?: number;
  cors?: {
    origin?: string | string[];
    credentials?: boolean;
  };
  llm?: LLMConfig;
  tts?: TTSConfig;
  stt?: STTConfig;
  sessionTimeout?: number; // in milliseconds
}

export interface LLMConfig {
  provider: 'openai' | 'claude' | 'xai' | 'google' | 'custom';
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  endpoint?: string; // Custom endpoint URL for custom provider
}

export interface TTSConfig {
  provider: 'elevenlabs' | 'openai' | 'google' | 'resembleai';
  apiKey: string;
  voice?: string;
  model?: string;
  speed?: number;
}

export interface STTConfig {
  provider: 'openai' | 'google' | 'elevenlabs';
  apiKey: string;
  model?: string;
  language?: string;
}

export interface Session {
  id: string;
  createdAt: Date;
  lastActivity: Date;
  conversationHistory: ConversationMessage[];
  config: {
    llm: LLMConfig;
    tts: TTSConfig;
    stt: STTConfig;
  };
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

export interface AudioChunk {
  sessionId: string;
  data: Buffer;
  timestamp: number;
  isFinal: boolean;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

export interface TTSResult {
  audioBuffer: Buffer;
  duration: number;
}

export interface LLMResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface SocketEvents {
  // Client to Server
  'join-session': (sessionId: string) => void;
  'start-listening': (sessionId: string) => void;
  'stop-listening': (sessionId: string) => void;
  'audio-chunk': (data: AudioChunk) => void;
  'end-audio': (sessionId: string) => void;
  'disconnect': () => void;

  // Server to Client
  'session-joined': (sessionId: string) => void;
  'listening-started': (sessionId: string) => void;
  'listening-stopped': (sessionId: string) => void;
  'transcription': (result: TranscriptionResult) => void;
  'llm-response': (response: LLMResponse) => void;
  'tts-audio': (audioBuffer: Buffer) => void;
  'error': (error: string) => void;
  'session-timeout': () => void;
}

export interface VoiceServerEvents {
  'session-created': (session: Session) => void;
  'session-destroyed': (sessionId: string) => void;
  'transcription-complete': (sessionId: string, text: string) => void;
  'llm-response-complete': (sessionId: string, response: LLMResponse) => void;
  'tts-complete': (sessionId: string, audioBuffer: Buffer) => void;
  'error': (error: Error) => void;
}

export type LLMProvider = 'openai' | 'claude' | 'xai' | 'google' | 'custom';
export type TTSProvider = 'elevenlabs' | 'openai' | 'google' | 'resembleai';
export type STTProvider = 'openai' | 'google' | 'elevenlabs'; 