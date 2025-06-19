import { TTSConfig, TTSResult } from '../../types';
import { ElevenLabsProvider } from './elevenlabs';
import { GoogleProvider } from './google';
import { OpenAIProvider } from './openai';
import { ResembleAIProvider } from './resembleai';


export interface TTSProviderInterface {
  synthesize(text: string): Promise<TTSResult>;
}

export class TTSProviderFactory {
  static createProvider(config: TTSConfig): TTSProviderInterface {
    switch (config.provider) {
      case 'elevenlabs':
        return new ElevenLabsProvider(config);
      case 'openai':
        return new OpenAIProvider(config);
      case 'google':
        return new GoogleProvider(config);
      case 'resembleai':
        return new ResembleAIProvider(config);
      default:
        throw new Error(`Unsupported TTS provider: ${config.provider}`);
    }
  }
} 