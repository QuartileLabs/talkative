import { TTSConfig, TTSResult } from '../../types';
import { TTSProviderInterface } from './index';

export class ElevenLabsProvider implements TTSProviderInterface {
  private config: TTSConfig;

  constructor(config: TTSConfig) {
    this.config = config;
  }

  async synthesize(text: string): Promise<TTSResult> {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.config.voice || '21m00Tcm4TlvDq8ikWAM'}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.config.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: this.config.model || 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      return {
        audioBuffer,
        duration: audioBuffer.length / 16000, // Approximate duration based on sample rate
      };
    } catch (error) {
      throw new Error(`ElevenLabs TTS error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 