import { LLMConfig, LLMResponse } from '../../types';

export class CustomProvider {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    if (!config.endpoint) {
      throw new Error('Custom endpoint URL is required for custom provider');
    }
  }

  async generateResponse(messages: Array<{ role: string; content: string }>): Promise<LLMResponse> {
    try {
      const response = await fetch(this.config.endpoint!, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model || 'default',
          messages: messages,
          max_tokens: this.config.maxTokens || 1000,
          temperature: this.config.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`Custom endpoint error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      return {
        text: data.choices?.[0]?.message?.content || 'No response from custom endpoint',
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens || data.usage.promptTokens || 0,
          completionTokens: data.usage.completion_tokens || data.usage.completionTokens || 0,
          totalTokens: data.usage.total_tokens || data.usage.totalTokens || 0,
        } : undefined,
      };
    } catch (error) {
      throw new Error(`Custom endpoint error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 