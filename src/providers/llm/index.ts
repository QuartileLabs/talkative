import { LLMConfig, LLMResponse, LLMProvider } from '../../types';
import { LangChainLLMProviderFactory, LangChainLLMProviderInterface } from './langchain';

// Legacy providers for backward compatibility
import { OpenAIProvider } from './openai';
import { ClaudeProvider } from './claude';
import { XAIProvider } from './xai';
import { GoogleProvider } from './google';
import { CustomProvider } from './custom';

export interface LLMProviderInterface {
  generateResponse(messages: Array<{ role: string; content: string }>): Promise<LLMResponse>;
}

export class LLMProviderFactory {
  static createProvider(config: LLMConfig, useLangChain: boolean = true): LLMProviderInterface {
    if (useLangChain) {
      return LangChainLLMProviderFactory.createProvider(config);
    }

    // Legacy providers for backward compatibility
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'claude':
        return new ClaudeProvider(config);
      case 'xai':
        return new XAIProvider(config);
      case 'google':
        return new GoogleProvider(config);
      case 'custom':
        return new CustomProvider(config);
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }
}

// Export the new LangChain providers for direct use
export { 
  LangChainLLMProviderFactory, 
  LangChainLLMProviderInterface,
  BaseLangChainProvider,
  LangChainOpenAIProvider,
  LangChainClaudeProvider,
  LangChainGoogleProvider,
  LangChainXAIProvider,
  LangChainCustomProvider
} from './langchain'; 