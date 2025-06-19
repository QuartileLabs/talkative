import { LLMConfig, LLMResponse } from '../../types';
import { LLMProviderInterface } from './index';

interface XAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export class XAIProvider implements LLMProviderInterface {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async generateResponse(messages: Array<{ role: string; content: string }>): Promise<LLMResponse> {
    try {
      // XAI API implementation would go here
      // For now, returning a placeholder response
      const userMessages = messages
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
        .join('\n');

      // This is a placeholder - you would need to implement the actual XAI API call
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

      const data = await response.json() as XAIResponse;
      
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