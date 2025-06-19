import Anthropic from '@anthropic-ai/sdk';
import { LLMConfig, LLMResponse } from '../../types';
import { LLMProviderInterface } from './index';

export class ClaudeProvider implements LLMProviderInterface {
  private client: Anthropic;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  async generateResponse(messages: Array<{ role: string; content: string }>): Promise<LLMResponse> {
    try {
      // Convert messages to Claude format
      const systemMessage = this.config.systemPrompt || 'You are a helpful assistant.';
      const userMessages = messages
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
        .join('\n');

      const response = await this.client.completions.create({
        model: this.config.model || 'claude-3-sonnet-20240229',
        max_tokens_to_sample: this.config.maxTokens || 1000,
        temperature: this.config.temperature || 0.7,
        prompt: `\n\nHuman: ${systemMessage}\n\n${userMessages}\n\nAssistant:`,
      });

      return {
        text: response.completion,
        usage: response.stop_reason ? {
          promptTokens: 0, // Claude v1 doesn't provide token usage
          completionTokens: 0,
          totalTokens: 0,
        } : undefined,
      };
    } catch (error) {
      throw new Error(`Claude API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 