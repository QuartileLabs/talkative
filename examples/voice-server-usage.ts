import { VoiceServer } from '../src/VoiceServer';
import { VoiceServerConfig } from '../src/types';

// Example configuration
const config: VoiceServerConfig = {
  port: 3000,
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
  },
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
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
    voice: 'pNInz6obpgDQGcFmaJgB', // Adam voice
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

async function main() {
  // Create and start the voice server
  const voiceServer = new VoiceServer(config);

  // Set up event listeners
  voiceServer.on('session-created', (session) => {
    console.log(`New session created: ${session.id}`);
  });

  voiceServer.on('session-destroyed', (sessionId) => {
    console.log(`Session destroyed: ${sessionId}`);
  });

  voiceServer.on('transcription-complete', (sessionId, text) => {
    console.log(`Transcription for session ${sessionId}: "${text}"`);
  });

  voiceServer.on('llm-response-complete', (sessionId, response) => {
    console.log(`LLM response for session ${sessionId}: "${response.text}"`);
  });

  voiceServer.on('tts-complete', (sessionId, audioBuffer) => {
    console.log(`TTS audio generated for session ${sessionId}, size: ${audioBuffer.length} bytes`);
  });

  voiceServer.on('error', (error) => {
    console.error('Voice server error:', error);
  });

  try {
    await voiceServer.start();
    console.log('Voice server is running!');
    console.log('Available endpoints:');
    console.log('- Health check: GET /health');
    console.log('- List sessions: GET /sessions');
    console.log('- Destroy session: DELETE /sessions/:sessionId');

    // Example: Get all sessions after some time
    setTimeout(() => {
      const sessions = voiceServer.getAllSessions();
      console.log(`Active sessions: ${sessions.length}`);
      
      sessions.forEach(session => {
        const state = voiceServer.getProcessingState(session.id);
        console.log(`Session ${session.id}:`);
        console.log(`  - Messages: ${session.conversationHistory.length}`);
        console.log(`  - Listening: ${voiceServer.isSessionListening(session.id)}`);
        console.log(`  - Processing: ${voiceServer.isSessionProcessing(session.id)}`);
        console.log(`  - Last activity: ${session.lastActivity.toISOString()}`);
      });
    }, 10000);

  } catch (error) {
    console.error('Failed to start voice server:', error);
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down voice server...');
    await voiceServer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down voice server...');
    await voiceServer.stop();
    process.exit(0);
  });
}

// Example client-side usage (for reference)
// Note: This requires socket.io-client to be installed: npm install socket.io-client
function exampleClientUsage() {
  // This would be in your client application
  // const socket = require('socket.io-client')('http://localhost:3000');
  // or with ES modules: import { io } from 'socket.io-client'; const socket = io('http://localhost:3000');

  // Join a session
  // socket.emit('join-session', 'user-session-123');

  // socket.on('session-joined', (sessionId) => {
  //   console.log(`Joined session: ${sessionId}`);
    
  //   // Start listening for audio
  //   socket.emit('start-listening', sessionId);
  // });

  // socket.on('listening-started', (sessionId) => {
  //   console.log(`Started listening in session: ${sessionId}`);
    
  //   // Now you can send audio chunks
  //   // Example: sendAudioChunk(sessionId, audioBuffer);
  // });

  // socket.on('transcription', (result) => {
  //   console.log(`Transcription: "${result.text}" (confidence: ${result.confidence})`);
  // });

  // socket.on('llm-response', (response) => {
  //   console.log(`AI Response: "${response.text}"`);
  // });

  // socket.on('tts-audio', (audioBuffer) => {
  //   console.log(`Received TTS audio: ${audioBuffer.length} bytes`);
  //   // Play the audio buffer
  //   // playAudio(audioBuffer);
  // });

  // socket.on('error', (error) => {
  //   console.error(`Socket error: ${error}`);
  // });

  // Example function to send audio chunks
  // function sendAudioChunk(sessionId: string, audioBuffer: Buffer, isFinal: boolean = false) {
  //   socket.emit('audio-chunk', {
  //     sessionId,
  //     data: audioBuffer,
  //     timestamp: Date.now(),
  //     isFinal,
  //   });
  // }

  // Example function to stop listening
  // function stopListening(sessionId: string) {
  //   socket.emit('stop-listening', sessionId);
  // }

  // Example function to end audio stream
  // function endAudio(sessionId: string) {
  //   socket.emit('end-audio', sessionId);
  // }

  console.log('Client example - see comments for implementation details');
}

if (require.main === module) {
  main().catch(console.error);
}

export { main, exampleClientUsage }; 