# VoiceServer

A real-time voice conversation server that provides speech-to-text, language model processing, and text-to-speech capabilities through WebSocket connections.

## Features

- **Real-time Audio Processing**: Stream audio chunks and process them in real-time
- **Automatic Silence Detection**: Automatically triggers processing after 2 seconds of silence
- **Session Management**: Maintains conversation history and session state
- **Multiple Provider Support**: 
  - LLM: OpenAI, Claude, XAI, Google
  - TTS: ElevenLabs, OpenAI, Google, ResembleAI
  - STT: OpenAI, Google, ElevenLabs
- **WebSocket Communication**: Real-time bidirectional communication
- **REST API Endpoints**: Health checks and session management
- **Configurable Timeouts**: Automatic session cleanup and audio buffer management

## Installation

```bash
npm install
```

## Configuration

Create a configuration object with your API keys and preferences:

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

## Usage

### Server Setup

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

### Client Connection

```javascript
// Install socket.io-client: npm install socket.io-client
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

// Join a session
socket.emit('join-session', 'user-session-123');

socket.on('session-joined', (sessionId) => {
  console.log(`Joined session: ${sessionId}`);
  
  // Start listening for audio
  socket.emit('start-listening', sessionId);
});

socket.on('listening-started', (sessionId) => {
  console.log(`Started listening in session: ${sessionId}`);
});

// Send audio chunks
function sendAudioChunk(audioBuffer, isFinal = false) {
  socket.emit('audio-chunk', {
    sessionId: 'user-session-123',
    data: audioBuffer,
    timestamp: Date.now(),
    isFinal,
  });
}

// Listen for responses
socket.on('transcription', (result) => {
  console.log(`Transcription: "${result.text}"`);
});

socket.on('llm-response', (response) => {
  console.log(`AI Response: "${response.text}"`);
});

socket.on('tts-audio', (audioBuffer) => {
  // Play the audio
  playAudio(audioBuffer);
});
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

## Configuration Options

### Audio Processing
- `SILENCE_THRESHOLD`: 2000ms (2 seconds)
- `MAX_AUDIO_BUFFER_SIZE`: 10MB
- `MIN_AUDIO_DURATION`: 500ms

### Session Management
- `sessionTimeout`: Configurable session timeout (default: 30 minutes)
- Automatic cleanup interval: 1 minute

## Example

See `examples/voice-server-usage.ts` for a complete working example.

## Environment Variables

Set these environment variables for your API keys:

```bash
export OPENAI_API_KEY="your-openai-api-key"
export ELEVENLABS_API_KEY="your-elevenlabs-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export GOOGLE_API_KEY="your-google-api-key"
```

## License

MIT
