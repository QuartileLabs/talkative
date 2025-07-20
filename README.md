# VoiceServer

A real-time voice conversation server that provides speech-to-text, language model processing, and text-to-speech capabilities through WebSocket connections. Now powered by **LangChain** for enhanced LLM capabilities!

## Features

- **Real-time Audio Processing**: Stream audio chunks and process them in real-time
- **Automatic Silence Detection**: Automatically triggers processing after 2 seconds of silence
- **Session Management**: Maintains conversation history and session state
- **LangChain Integration**: Enhanced LLM capabilities with streaming, memory, and tools
- **Multiple Provider Support**: 
  - LLM: OpenAI, Claude, XAI, Google, Custom Endpoints (with LangChain)
  - TTS: ElevenLabs, OpenAI, Google, ResembleAI
  - STT: OpenAI, Google, ElevenLabs
- **WebSocket Communication**: Real-time bidirectional communication
- **REST API Endpoints**: Health checks and session management
- **Configurable Timeouts**: Automatic session cleanup and audio buffer management

## 🚀 LangChain Migration

The LLM service has been migrated to use **LangChain**, providing:

- **Drop-in Replacement**: No code changes needed for existing implementations
- **Enhanced Features**: Streaming, memory management, callbacks, and tools
- **Better Abstraction**: Consistent interface across all LLM providers
- **Advanced Capabilities**: Retry logic, caching, and cost tracking
- **Backward Compatibility**: Legacy providers still available

### Migration Benefits

✅ **Streaming Responses**: Real-time token streaming for better UX  
✅ **Memory Management**: Conversation memory with configurable limits  
✅ **Callback System**: Custom handlers for tokens, errors, and events  
✅ **Tool Integration**: Support for function calling and tools  
✅ **Retry Logic**: Automatic retry with exponential backoff  
✅ **Response Caching**: Configurable caching to reduce API calls  
✅ **Cost Tracking**: Usage and cost monitoring  

## Installation

```bash
npm install
```

## Configuration

### Basic Configuration (LangChain by default)

```typescript
import { VoiceServerConfig } from './src/types';

const config: VoiceServerConfig = {
  port: 3000,
  cors: {
    origin: ['http://localhost:3001'],
    credentials: true,
  },
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
    maxTokens: 150,
    temperature: 0.7,
    systemPrompt: 'You are a helpful AI assistant.',
  },
  tts: {
    provider: 'elevenlabs',
    apiKey: process.env.ELEVENLABS_API_KEY,
    voice: 'pNInz6obpgDQGcFmaJgB',
    model: 'eleven_monolingual_v1',
    speed: 1.0,
  },
  stt: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'whisper-1',
    language: 'en',
  },
};
```

### Enhanced LangChain Configuration

```typescript
import { LangChainLLMConfig } from './src/types/langchain';

const enhancedConfig: LangChainLLMConfig = {
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
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
        console.log('Token:', token);
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
```

### Custom Endpoint Configuration

You can use custom LLM endpoints that follow the same request/response format as standard providers:

```typescript
const customLLMConfig: LLMConfig = {
  provider: 'custom',
  apiKey: 'your-api-key-here',
  endpoint: 'https://your-custom-endpoint.com/v1/chat/completions',
  model: 'your-model-name',
  maxTokens: 1000,
  temperature: 0.7,
  systemPrompt: 'You are a helpful assistant.'
};
```

**Custom Endpoint Requirements:**
- Must accept POST requests with JSON body
- Request format: `{ model, messages, max_tokens, temperature }`
- Response format: `{ choices: [{ message: { content } }], usage?: { prompt_tokens, completion_tokens, total_tokens } }`
- Must support Bearer token authentication via `Authorization` header

**Example Use Cases:**
- Local LLM servers (Ollama, LM Studio)
- OpenAI-compatible API clones
- Self-hosted model deployments
- Custom model APIs

## Usage

### Server Setup (LangChain by default)

```typescript
import { VoiceServer } from './src/VoiceServer';

const voiceServer = new VoiceServer(config);

// Set up event listeners
voiceServer.on('session-created', (session) => {
  console.log(`New session: ${session.id}`);
});

voiceServer.on('transcription-complete', (sessionId, text) => {
  console.log(`Transcription: "${text}"`);
});

voiceServer.on('llm-response-complete', (sessionId, response) => {
  console.log(`AI Response: "${response.text}"`);
});

// Start the server
await voiceServer.start();
```

### Using Enhanced LangChain Features

```typescript
import { EnhancedLangChainLLMProviderFactory } from './src/providers/llm/langchain/enhanced';

// Create enhanced provider
const enhancedProvider = EnhancedLangChainLLMProviderFactory.createProvider(enhancedConfig);

// Streaming response
const messages = [{ role: 'user', content: 'Tell me a story.' }];
await enhancedProvider.generateStreamingResponse(messages, (token) => {
  process.stdout.write(token); // Stream tokens in real-time
});

// Memory management
enhancedProvider.setMemory({
  messages: [
    { role: 'user', content: 'Hello', timestamp: new Date() },
    { role: 'assistant', content: 'Hi there!', timestamp: new Date() },
  ],
  metadata: {
    sessionId: 'session-123',
    createdAt: new Date(),
    lastUpdated: new Date(),
  },
});
```

### Backward Compatibility

```typescript
import { LLMProviderFactory } from './src/providers/llm';

// Use legacy providers if needed
const legacyProvider = LLMProviderFactory.createProvider(config.llm, false);
```

### Custom Endpoint Usage

```typescript
import { LLMProviderFactory } from './src/providers/llm';

// Create custom endpoint provider
const customProvider = LLMProviderFactory.createProvider({
  provider: 'custom',
  apiKey: 'your-api-key',
  endpoint: 'http://localhost:8000/v1/chat/completions',
  model: 'llama-2-7b',
  maxTokens: 500,
  temperature: 0.5,
  systemPrompt: 'You are a helpful local AI assistant.'
});

// Use it like any other provider
const response = await customProvider.generateResponse([
  { role: 'user', content: 'Hello, how are you?' }
]);
```

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and session count.

### List Sessions
```
GET /sessions
```
Returns all active sessions with metadata.

### Destroy Session
```
DELETE /sessions/:sessionId
```
Manually destroy a session.

## WebSocket Events

### Client to Server
- `join-session`: Join a conversation session
- `start-listening`: Start listening for audio input
- `stop-listening`: Stop listening for audio input
- `audio-chunk`: Send audio data chunk
- `end-audio`: End the current audio stream

### Server to Client
- `session-joined`: Confirmation of session join
- `listening-started`: Confirmation of listening start
- `listening-stopped`: Confirmation of listening stop
- `transcription`: Speech-to-text result
- `llm-response`: AI language model response
- `tts-audio`: Text-to-speech audio buffer
- `error`: Error message
- `session-timeout`: Session timeout notification

## Audio Processing

The server implements intelligent audio processing:

1. **Chunk Accumulation**: Audio chunks are accumulated in a buffer
2. **Silence Detection**: Processing is triggered after 2 seconds of silence
3. **Buffer Management**: Automatic cleanup of old chunks to prevent memory issues
4. **Confidence Filtering**: Only processes transcriptions with confidence > 0.5
5. **Minimum Duration**: Requires at least 500ms of audio before processing

## Session Management

- **Automatic Cleanup**: Sessions are automatically destroyed after 30 minutes of inactivity
- **Conversation History**: Maintains full conversation context for LLM responses
- **State Tracking**: Tracks listening and processing states per session
- **Manual Control**: APIs available for manual session management

## Error Handling

- Comprehensive error handling for all operations
- Graceful degradation when providers fail
- Detailed error messages sent to clients
- Automatic cleanup of resources on errors
- LangChain retry logic with exponential backoff

## Configuration Options

### Audio Processing
- `SILENCE_THRESHOLD`: 2000ms (2 seconds)
- `MAX_AUDIO_BUFFER_SIZE`: 10MB
- `MIN_AUDIO_DURATION`: 500ms

### Session Management
- `sessionTimeout`: Configurable session timeout (default: 30 minutes)
- Automatic cleanup interval: 1 minute

### LangChain Features
- `streaming`: Enable real-time token streaming
- `memory`: Configure conversation memory
- `callbacks`: Custom event handlers
- `retry`: Automatic retry configuration
- `cache`: Response caching settings

## Examples

### Basic Usage
See `examples/voice-server-usage.ts` for a complete working example.

### LangChain Migration
See `examples/langchain-migration-example.ts` for LangChain migration examples.

### Custom Endpoint Usage
See `examples/custom-endpoint-usage.ts` for examples of using custom LLM endpoints.

## Environment Variables

Set these environment variables for your API keys:

```bash
export OPENAI_API_KEY="your-openai-api-key"
export ELEVENLABS_API_KEY="your-elevenlabs-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export GOOGLE_API_KEY="your-google-api-key"
```

## Migration Guide

### From Legacy to LangChain

1. **No Code Changes Required**: The migration is automatic and backward compatible
2. **Enhanced Features**: Enable streaming, memory, and callbacks as needed
3. **Provider Consistency**: All providers now use the same LangChain interface
4. **Better Error Handling**: Improved retry logic and error recovery

### Testing the Migration

```bash
# Run the migration example
npm run build
node dist/examples/langchain-migration-example.js
```

## License

MIT
