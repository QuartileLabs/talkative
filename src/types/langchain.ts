import { LLMConfig, LLMResponse } from './index';

export interface LangChainLLMConfig extends LLMConfig {
  // Enhanced LangChain-specific options
  streaming?: boolean;
  memory?: {
    type: 'buffer' | 'summary' | 'conversation';
    maxTokenLimit?: number;
    returnMessages?: boolean;
  };
  tools?: Array<{
    name: string;
    description: string;
    schema: any;
  }>;
  callbacks?: Array<{
    name: string;
    handler: (token: string) => void;
  }>;
  // Advanced options
  retry?: {
    maxRetries?: number;
    backoffMultiplier?: number;
    maxDelay?: number;
  };
  cache?: {
    enabled?: boolean;
    ttl?: number;
  };
}

export interface LangChainResponse extends LLMResponse {
  // Additional LangChain-specific response data
  generationInfo?: {
    finishReason?: string;
    logprobs?: any;
  };
  toolCalls?: Array<{
    name: string;
    arguments: any;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
  };
}

export interface ConversationMemory {
  messages: Array<{
    role: string;
    content: string;
    timestamp: Date;
  }>;
  summary?: string;
  metadata?: {
    sessionId: string;
    createdAt: Date;
    lastUpdated: Date;
  };
}

export interface LangChainTool {
  name: string;
  description: string;
  schema: any;
  handler: (args: any) => Promise<any>;
}

export interface LangChainCallback {
  name: string;
  onToken?: (token: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
} 