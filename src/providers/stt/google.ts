import { STTConfig, TranscriptionResult } from '../../types';
import { STTProviderInterface } from './index';
import { SpeechClient, protos } from '@google-cloud/speech';

export class GoogleProvider implements STTProviderInterface {
  private config: STTConfig;
  private client: SpeechClient;

  constructor(config: STTConfig) {
    this.config = config;
    this.client = new SpeechClient({
      credentials: { private_key: config.apiKey, client_email: '' }, // Adjust as needed
    });
  }

  async transcribe(audioBuffer: Buffer): Promise<TranscriptionResult> {
    try {
      const audio = {
        content: audioBuffer.toString('base64'),
      };
      const config: protos.google.cloud.speech.v1.IRecognitionConfig = {
        encoding: protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
        sampleRateHertz: 16000,
        languageCode: this.config.language || 'en-US',
        model: this.config.model || 'default',
      };
      const [response] = await this.client.recognize({ audio, config });
      const transcription = response.results?.map((r: any) => r.alternatives?.[0]?.transcript).join(' ') || '';
      const confidence = response.results?.[0]?.alternatives?.[0]?.confidence || 1.0;
      return {
        text: transcription,
        confidence,
        isFinal: true,
      };
    } catch (error) {
      throw new Error(`Google STT error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 