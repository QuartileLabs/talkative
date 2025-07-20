import { LLMConfig } from '../src/types';
import { LLMProviderFactory } from '../src/providers/llm';

// Example configuration for using a custom LLM endpoint
const customLLMConfig: LLMConfig = {
  provider: 'custom',
  apiKey: 'your-api-key-here',
  endpoint: 'https://your-custom-endpoint.com/v1/chat/completions',
  model: 'your-model-name',
  maxTokens: 1000,
  temperature: 0.7,
  systemPrompt: 'You are a helpful assistant.'
};

async function exampleCustomEndpointUsage() {
  try {
    // Create provider using LangChain (recommended)
    const langchainProvider = LLMProviderFactory.createProvider(customLLMConfig, true);
    
    // Or create provider using legacy implementation
    const legacyProvider = LLMProviderFactory.createProvider(customLLMConfig, false);

    const messages = [
      { role: 'user', content: 'Hello, how are you?' }
    ];

    // Generate response using LangChain provider
    const langchainResponse = await langchainProvider.generateResponse(messages);
    console.log('LangChain Custom Endpoint Response:', langchainResponse);

    // Generate response using legacy provider
    const legacyResponse = await legacyProvider.generateResponse(messages);
    console.log('Legacy Custom Endpoint Response:', legacyResponse);

  } catch (error) {
    console.error('Error using custom endpoint:', error);
  }
}

// Example with different custom endpoint configurations
const openAICloneConfig: LLMConfig = {
  provider: 'custom',
  apiKey: 'your-openai-clone-api-key',
  endpoint: 'https://api.openai-clone.com/v1/chat/completions',
  model: 'gpt-4-clone',
  maxTokens: 1500,
  temperature: 0.8,
  systemPrompt: 'You are an AI assistant trained to help users.'
};

const localLLMConfig: LLMConfig = {
  provider: 'custom',
  apiKey: 'your-local-api-key',
  endpoint: 'http://localhost:8000/v1/chat/completions',
  model: 'llama-2-7b',
  maxTokens: 500,
  temperature: 0.5,
  systemPrompt: 'You are a helpful local AI assistant.'
};

// Run the example
if (require.main === module) {
  exampleCustomEndpointUsage();
}

export { customLLMConfig, openAICloneConfig, localLLMConfig, exampleCustomEndpointUsage }; 