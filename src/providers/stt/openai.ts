import { STTConfig, TranscriptionResult } from '../../types';
import { STTProviderInterface } from './index';
import OpenAI from 'openai';
// @ts-ignore
import { File } from 'openai/uploads';

export class OpenAIProvider implements STTProviderInterface {
  private config: STTConfig;
  private client: OpenAI;

  constructor(config: STTConfig) {
    this.config = config;
    this.client = new OpenAI({ apiKey: config.apiKey });
  }

  async transcribe(audioBuffer: Buffer): Promise<TranscriptionResult> {
    try {
      // OpenAI Whisper API (v1/audio/transcriptions)
      const file = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });
      const response = await this.client.audio.transcriptions.create({
        file,
        model: this.config.model || 'whisper-1',
        language: this.config.language || 'en',
        response_format: 'json',
      });
      return {
        text: response.text,
        confidence: 1.0,
        isFinal: true,
      };
    } catch (error) {
      throw new Error(`OpenAI STT error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 