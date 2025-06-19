import { STTConfig, TranscriptionResult } from '../../types';
import { STTProviderInterface } from './index';

interface ElevenLabsSTTResponse {
  text: string;
  confidence?: number;
}

export class ElevenLabsProvider implements STTProviderInterface {
  private config: STTConfig;

  constructor(config: STTConfig) {
    this.config = config;
  }

  async transcribe(audioBuffer: Buffer): Promise<TranscriptionResult> {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.apiKey,
          'Content-Type': 'audio/wav',
        },
        body: audioBuffer,
      });
      if (!response.ok) {
        throw new Error(`ElevenLabs STT API error: ${response.statusText}`);
      }
      const data = await response.json() as ElevenLabsSTTResponse;
      return {
        text: data.text,
        confidence: data.confidence || 1.0,
        isFinal: true,
      };
    } catch (error) {
      throw new Error(`ElevenLabs STT error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 