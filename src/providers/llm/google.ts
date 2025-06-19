import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMConfig, LLMResponse } from '../../types';
import { LLMProviderInterface } from './index';

export class GoogleProvider implements LLMProviderInterface {
  private genAI: GoogleGenerativeAI;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.genAI = new GoogleGenerativeAI(config.apiKey);
  }

  async generateResponse(messages: Array<{ role: string; content: string }>): Promise<LLMResponse> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.config.model || 'gemini-pro',
      });

      // Convert messages to Google format
      const chat = model.startChat({
        generationConfig: {
          maxOutputTokens: this.config.maxTokens || 1000,
          temperature: this.config.temperature || 0.7,
        },
      });

      const userMessages = messages
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
        .join('\n');

      const result = await chat.sendMessage(userMessages);
      const response = await result.response;
      const text = response.text();

      return {
        text,
        usage: {
          promptTokens: 0, // Google doesn't provide token usage in the same way
          completionTokens: 0,
          totalTokens: 0,
        },
      };
    } catch (error) {
      throw new Error(`Google AI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 