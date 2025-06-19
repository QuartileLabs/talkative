import { LLMConfig, LLMResponse, LLMProvider } from '../../types';
import { OpenAIProvider } from './openai';
import { ClaudeProvider } from './claude';
import { XAIProvider } from './xai';
import { GoogleProvider } from './google';

export interface LLMProviderInterface {
  generateResponse(messages: Array<{ role: string; content: string }>): Promise<LLMResponse>;
}

export class LLMProviderFactory {
  static createProvider(config: LLMConfig): LLMProviderInterface {
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'claude':
        return new ClaudeProvider(config);
      case 'xai':
        return new XAIProvider(config);
      case 'google':
        return new GoogleProvider(config);
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }
} 