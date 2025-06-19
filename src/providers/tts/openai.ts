import { TTSConfig, TTSResult } from '../../types';
import { TTSProviderInterface } from './index';
import OpenAI from 'openai';

export class OpenAIProvider implements TTSProviderInterface {
  private config: TTSConfig;
  private client: OpenAI;

  constructor(config: TTSConfig) {
    this.config = config;
    this.client = new OpenAI({ apiKey: config.apiKey });
  }

  async synthesize(text: string): Promise<TTSResult> {
    try {
      // OpenAI TTS API (v1/audio/speech)
      const response = await this.client.audio.speech.create({
        model: this.config.model || 'tts-1',
        input: text,
        voice: this.config.voice || 'alloy',
        response_format: 'mp3',
        speed: this.config.speed || 1.0,
      });
      // response is a stream, so we need to convert to Buffer
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      return {
        audioBuffer,
        duration: audioBuffer.length / 16000, // Approximate duration
      };
    } catch (error) {
      throw new Error(`OpenAI TTS error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 