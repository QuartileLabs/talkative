import { VoiceServer } from '../src/VoiceServer';
import { VoiceServerConfig } from '../src/types';
import { LangChainLLMConfig } from '../src/types/langchain';
import { LLMProviderFactory } from '../src/providers/llm';
import { EnhancedLangChainLLMProviderFactory } from '../src/providers/llm/langchain/enhanced';

// Example 1: Basic LangChain migration (drop-in replacement)
async function basicLangChainExample() {
  console.log('=== Basic LangChain Migration Example ===');
  
  const config: VoiceServerConfig = {
    port: 3000,
    llm: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
      model: 'gpt-4',
      maxTokens: 150,
      temperature: 0.7,
      systemPrompt: 'You are a helpful AI assistant. Keep your responses concise and conversational.',
    },
    tts: {
      provider: 'elevenlabs',
      apiKey: process.env.ELEVENLABS_API_KEY || 'your-elevenlabs-api-key',
      voice: 'pNInz6obpgDQGcFmaJgB',
      model: 'eleven_monolingual_v1',
      speed: 1.0,
    },
    stt: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
      model: 'whisper-1',
      language: 'en',
    },
  };

  // Create voice server with LangChain (default behavior)
  const voiceServer = new VoiceServer(config);
  
  console.log('Voice server created with LangChain providers');
  console.log('This is a drop-in replacement - no code changes needed!');
  
  return voiceServer;
}

// Example 2: Enhanced LangChain features
async function enhancedLangChainExample() {
  console.log('\n=== Enhanced LangChain Features Example ===');
  
  const enhancedConfig: LangChainLLMConfig = {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
    model: 'gpt-4',
    maxTokens: 150,
    temperature: 0.7,
    systemPrompt: 'You are a helpful AI assistant with enhanced capabilities.',
    streaming: true,
    memory: {
      type: 'buffer',
      maxTokenLimit: 2000,
      returnMessages: true,
    },
    callbacks: [
      {
        name: 'tokenLogger',
        handler: (token: string) => {
          process.stdout.write(token); // Stream tokens to console
        },
      },
    ],
    retry: {
      maxRetries: 3,
      backoffMultiplier: 2,
      maxDelay: 10000,
    },
    cache: {
      enabled: true,
      ttl: 3600, // 1 hour
    },
  };

  // Create enhanced provider directly
  const enhancedProvider = EnhancedLangChainLLMProviderFactory.createProvider(enhancedConfig);
  
  // Test streaming response
  const messages = [
    { role: 'user', content: 'Tell me a short story about a robot learning to paint.' }
  ];

  console.log('Testing streaming response:');
  await enhancedProvider.generateStreamingResponse(messages, (token) => {
    process.stdout.write(token);
  });
  
  console.log('\n\nEnhanced features available:');
  console.log('- Streaming responses');
  console.log('- Memory management');
  console.log('- Callback handlers');
  console.log('- Retry logic');
  console.log('- Response caching');
  
  return enhancedProvider;
}

// Example 3: Backward compatibility
async function backwardCompatibilityExample() {
  console.log('\n=== Backward Compatibility Example ===');
  
  const config: VoiceServerConfig = {
    port: 3001,
    llm: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
      model: 'gpt-4',
      maxTokens: 150,
      temperature: 0.7,
      systemPrompt: 'You are a helpful AI assistant.',
    },
    tts: {
      provider: 'elevenlabs',
      apiKey: process.env.ELEVENLABS_API_KEY || 'your-elevenlabs-api-key',
      voice: 'pNInz6obpgDQGcFmaJgB',
      model: 'eleven_monolingual_v1',
      speed: 1.0,
    },
    stt: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
      model: 'whisper-1',
      language: 'en',
    },
  };

  // Create provider with legacy implementation
  const legacyProvider = LLMProviderFactory.createProvider(config.llm!, false);
  
  console.log('Using legacy provider implementation');
  console.log('This ensures backward compatibility with existing code');
  
  return legacyProvider;
}

// Example 4: Provider comparison
async function providerComparisonExample() {
  console.log('\n=== Provider Comparison Example ===');
  
  const testMessage = [
    { role: 'user', content: 'What is the capital of France?' }
  ];

  const providers = [
    { name: 'OpenAI (LangChain)', provider: 'openai' },
    { name: 'Claude (LangChain)', provider: 'claude' },
    { name: 'Google (LangChain)', provider: 'google' },
  ];

  for (const { name, provider } of providers) {
    try {
      const config: LangChainLLMConfig = {
        provider: provider as any,
        apiKey: process.env[`${provider.toUpperCase()}_API_KEY`] || 'test-key',
        model: provider === 'openai' ? 'gpt-4' : 
               provider === 'claude' ? 'claude-3-sonnet-20240229' : 'gemini-pro',
        maxTokens: 50,
        temperature: 0.7,
      };

      const langchainProvider = LLMProviderFactory.createProvider(config, true);
      
      console.log(`\nTesting ${name}...`);
      const response = await langchainProvider.generateResponse(testMessage);
      console.log(`Response: ${response.text}`);
      
    } catch (error) {
      console.log(`${name}: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Main function
async function main() {
  console.log('LangChain Migration Examples\n');
  
  try {
    // Example 1: Basic migration
    await basicLangChainExample();
    
    // Example 2: Enhanced features
    await enhancedLangChainExample();
    
    // Example 3: Backward compatibility
    await backwardCompatibilityExample();
    
    // Example 4: Provider comparison
    await providerComparisonExample();
    
    console.log('\n=== Migration Summary ===');
    console.log('✅ LangChain integration complete');
    console.log('✅ Backward compatibility maintained');
    console.log('✅ Enhanced features available');
    console.log('✅ Multiple provider support');
    console.log('✅ Streaming capabilities');
    console.log('✅ Memory management');
    console.log('✅ Callback system');
    
  } catch (error) {
    console.error('Error in examples:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { 
  basicLangChainExample, 
  enhancedLangChainExample, 
  backwardCompatibilityExample, 
  providerComparisonExample 
}; 