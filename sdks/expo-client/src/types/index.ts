export interface VoiceClientConfig {
  serverUrl: string;
  sessionId?: string;
  autoConnect?: boolean;
  audioConfig?: AudioConfig;
}

export interface AudioConfig {
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  format?: 'wav' | 'mp3' | 'aac';
}

export interface VoiceClientEvents {
  'connected': () => void;
  'disconnected': () => void;
  'session-joined': (sessionId: string) => void;
  'transcription': (text: string, confidence: number) => void;
  'llm-response': (text: string) => void;
  'tts-audio': (audioBuffer: ArrayBuffer) => void;
  'error': (error: string) => void;
  'session-timeout': () => void;
  'recording-started': () => void;
  'recording-stopped': () => void;
  'playing-started': () => void;
  'playing-stopped': () => void;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

export interface VoiceClientState {
  isConnected: boolean;
  isRecording: boolean;
  isPlaying: boolean;
  sessionId?: string;
  conversationHistory: ConversationMessage[];
} 