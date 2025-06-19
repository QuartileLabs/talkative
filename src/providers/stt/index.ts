import { STTConfig, TranscriptionResult } from '../../types';
import { OpenAIProvider } from './openai';
import { GoogleProvider } from './google';
import { ElevenLabsProvider } from './elevenlabs';

export interface STTProviderInterface {
  transcribe(audioBuffer: Buffer): Promise<TranscriptionResult>;
}

export class STTProviderFactory {
  static createProvider(config: STTConfig): STTProviderInterface {
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'google':
        return new GoogleProvider(config);
      case 'elevenlabs':
        return new ElevenLabsProvider(config);
      default:
        throw new Error(`Unsupported STT provider: ${config.provider}`);
    }
  }
} 