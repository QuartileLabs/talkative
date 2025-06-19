import OpenAI from 'openai';
import { LLMConfig, LLMResponse } from '../../types';
import { LLMProviderInterface } from './index';

export class OpenAIProvider implements LLMProviderInterface {
  private client: OpenAI;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  async generateResponse(messages: Array<{ role: string; content: string }>): Promise<LLMResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4',
        messages: messages as any,
        max_tokens: this.config.maxTokens || 1000,
        temperature: this.config.temperature || 0.7,
      });

      const completion = response.choices[0];
      if (!completion?.message?.content) {
        throw new Error('No response content from OpenAI');
      }

      return {
        text: completion.message.content,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 