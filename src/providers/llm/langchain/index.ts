import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { LLMConfig, LLMResponse } from '../../../types';

export interface LangChainLLMProviderInterface {
  generateResponse(messages: Array<{ role: string; content: string }>): Promise<LLMResponse>;
}

export abstract class BaseLangChainProvider implements LangChainLLMProviderInterface {
  protected model: BaseChatModel;
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.model = this.createModel();
  }

  protected abstract createModel(): BaseChatModel;

  async generateResponse(messages: Array<{ role: string; content: string }>): Promise<LLMResponse> {
    try {
      // Convert messages to LangChain format
      const langchainMessages = this.convertMessages(messages);
      
      // Generate response
      const response = await this.model.invoke(langchainMessages);
      
      return {
        text: response.content as string,
        usage: this.extractUsage(response),
      };
    } catch (error) {
      throw new Error(`${this.constructor.name} error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  protected convertMessages(messages: Array<{ role: string; content: string }>) {
    const langchainMessages = [];
    
    // Add system message if provided
    if (this.config.systemPrompt) {
      langchainMessages.push(new SystemMessage(this.config.systemPrompt));
    }

    // Convert conversation messages
    for (const message of messages) {
      switch (message.role) {
        case 'user':
          langchainMessages.push(new HumanMessage(message.content));
          break;
        case 'assistant':
          langchainMessages.push(new AIMessage(message.content));
          break;
        default:
          // Skip unknown message types
          break;
      }
    }

    return langchainMessages;
  }

  protected extractUsage(response: any): LLMResponse['usage'] {
    // Extract usage information if available
    if (response.usage) {
      return {
        promptTokens: response.usage.promptTokens || 0,
        completionTokens: response.usage.completionTokens || 0,
        totalTokens: response.usage.totalTokens || 0,
      };
    }
    return undefined;
  }
}

export class LangChainOpenAIProvider extends BaseLangChainProvider {
  protected createModel(): BaseChatModel {
    return new ChatOpenAI({
      openAIApiKey: this.config.apiKey,
      modelName: this.config.model || 'gpt-4',
      maxTokens: this.config.maxTokens || 1000,
      temperature: this.config.temperature || 0.7,
    });
  }
}

export class LangChainClaudeProvider extends BaseLangChainProvider {
  protected createModel(): BaseChatModel {
    return new ChatAnthropic({
      anthropicApiKey: this.config.apiKey,
      modelName: this.config.model || 'claude-3-sonnet-20240229',
      maxTokens: this.config.maxTokens || 1000,
      temperature: this.config.temperature || 0.7,
    });
  }
}

export class LangChainGoogleProvider extends BaseLangChainProvider {
  protected createModel(): BaseChatModel {
    return new ChatGoogleGenerativeAI({
      apiKey: this.config.apiKey,
      modelName: this.config.model || 'gemini-pro',
      maxOutputTokens: this.config.maxTokens || 1000,
      temperature: this.config.temperature || 0.7,
    });
  }
}

// XAI provider - keeping the existing implementation for now since LangChain doesn't have official XAI support
export class LangChainXAIProvider implements LangChainLLMProviderInterface {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async generateResponse(messages: Array<{ role: string; content: string }>): Promise<LLMResponse> {
    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model || 'x-1',
          messages: messages,
          max_tokens: this.config.maxTokens || 1000,
          temperature: this.config.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`XAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        text: data.choices?.[0]?.message?.content || 'No response from XAI',
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        } : undefined,
      };
    } catch (error) {
      throw new Error(`XAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export class LangChainLLMProviderFactory {
  static createProvider(config: LLMConfig): LangChainLLMProviderInterface {
    switch (config.provider) {
      case 'openai':
        return new LangChainOpenAIProvider(config);
      case 'claude':
        return new LangChainClaudeProvider(config);
      case 'google':
        return new LangChainGoogleProvider(config);
      case 'xai':
        return new LangChainXAIProvider(config);
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }
} 