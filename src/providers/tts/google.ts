import { TTSConfig, TTSResult } from '../../types';
import { TTSProviderInterface } from './index';
import textToSpeech, { protos, TextToSpeechClient } from '@google-cloud/text-to-speech';

export class GoogleProvider implements TTSProviderInterface {
  private config: TTSConfig;
  private client: TextToSpeechClient;

  constructor(config: TTSConfig) {
    this.config = config;
    this.client = new textToSpeech.TextToSpeechClient({
      credentials: { private_key: config.apiKey, client_email: '' }, // You may want to adjust this for your use case
    });
  }

  async synthesize(text: string): Promise<TTSResult> {
    try {
      const [response] = await this.client.synthesizeSpeech({
        input: { text },
        voice: {
          languageCode: 'en-US',
          name: this.config.voice || 'en-US-Wavenet-D',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: this.config.speed || 1.0,
        },
      });
      const audioBuffer = Buffer.from(response.audioContent as Uint8Array);
      return {
        audioBuffer,
        duration: audioBuffer.length / 16000,
      };
    } catch (error) {
      throw new Error(`Google TTS error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 