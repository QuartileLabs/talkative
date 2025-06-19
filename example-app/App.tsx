import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert,
  StatusBar,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { VoiceClient } from '../sdks/expo-client/src/VoiceClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function App() {
  const [client, setClient] = useState<VoiceClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeVoiceClient();
    return () => {
      if (client) {
        client.disconnect();
      }
    };
  }, []);

  const initializeVoiceClient = () => {
    try {
      const voiceClient = new VoiceClient({
        serverUrl: 'http://localhost:3000', // Change this to your server URL
        sessionId: `session-${Date.now()}`,
        autoConnect: true,
        audioConfig: {
          sampleRate: 16000,
          channels: 1,
          bitDepth: 16,
          format: 'wav',
        },
      });

      // Set up event listeners
      voiceClient.on('connected', () => {
        console.log('Connected to voice server');
        setIsConnected(true);
        setError(null);
      });

      voiceClient.on('disconnected', () => {
        console.log('Disconnected from voice server');
        setIsConnected(false);
      });

      voiceClient.on('session-joined', (sessionId) => {
        console.log('Joined session:', sessionId);
      });

      voiceClient.on('transcription', (text, confidence) => {
        console.log('Transcribed:', text, 'Confidence:', confidence);
        if (text.trim()) {
          addMessage('user', text);
        }
      });

      voiceClient.on('llm-response', (text) => {
        console.log('LLM Response:', text);
        addMessage('assistant', text);
        setIsLoading(false);
      });

      voiceClient.on('tts-audio', (audioBuffer) => {
        console.log('Received TTS audio');
        setIsPlaying(true);
      });

      voiceClient.on('recording-started', () => {
        console.log('Recording started');
        setIsRecording(true);
      });

      voiceClient.on('recording-stopped', () => {
        console.log('Recording stopped');
        setIsRecording(false);
      });

      voiceClient.on('playing-started', () => {
        console.log('Playing started');
        setIsPlaying(true);
      });

      voiceClient.on('playing-stopped', () => {
        console.log('Playing stopped');
        setIsPlaying(false);
      });

      voiceClient.on('error', (errorMessage) => {
        console.error('Voice client error:', errorMessage);
        setError(errorMessage);
        Alert.alert('Error', errorMessage);
      });

      voiceClient.on('session-timeout', () => {
        console.log('Session timeout');
        Alert.alert('Session Timeout', 'Your session has timed out. Please reconnect.');
        setIsConnected(false);
      });

      setClient(voiceClient);
    } catch (err) {
      console.error('Failed to initialize voice client:', err);
      setError('Failed to initialize voice client');
    }
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const toggleRecording = async () => {
    if (!client) {
      Alert.alert('Error', 'Voice client not initialized');
      return;
    }

    if (!isConnected) {
      Alert.alert('Error', 'Not connected to server');
      return;
    }

    try {
      if (isRecording) {
        await client.stopRecording();
      } else {
        setIsLoading(true);
        await client.startRecording();
      }
    } catch (err) {
      console.error('Recording error:', err);
      Alert.alert('Error', 'Failed to toggle recording');
      setIsLoading(false);
    }
  };

  const reconnect = () => {
    if (client) {
      client.disconnect();
    }
    setMessages([]);
    setError(null);
    initializeVoiceClient();
  };

  const clearConversation = () => {
    setMessages([]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Talkative Voice Chat</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#FF5722' }]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={reconnect}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Start a conversation by tapping the microphone button below
            </Text>
          </View>
        ) : (
          messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.role === 'user' ? styles.userMessage : styles.assistantMessage,
              ]}
            >
              <View style={styles.messageHeader}>
                <Text style={styles.messageRole}>
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </Text>
                <Text style={styles.messageTime}>
                  {formatTime(message.timestamp)}
                </Text>
              </View>
              <Text style={styles.messageContent}>{message.content}</Text>
            </View>
          ))
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </ScrollView>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={reconnect}
            disabled={isRecording}
          >
            <Text style={styles.secondaryButtonText}>Reconnect</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={clearConversation}
            disabled={isRecording}
          >
            <Text style={styles.secondaryButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording && styles.recordingButton,
            (!isConnected || isLoading) && styles.disabledButton,
          ]}
          onPress={toggleRecording}
          disabled={!isConnected || isLoading}
        >
          {isRecording ? (
            <Text style={styles.recordButtonText}>⏹ Stop</Text>
          ) : isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.recordButtonText}>🎤 Record</Text>
          )}
        </TouchableOpacity>

        {/* Status indicators */}
        <View style={styles.statusIndicators}>
          {isRecording && (
            <View style={styles.statusIndicator}>
              <View style={styles.recordingPulse} />
              <Text style={styles.statusIndicatorText}>Recording...</Text>
            </View>
          )}
          {isPlaying && (
            <View style={styles.statusIndicator}>
              <View style={styles.playingPulse} />
              <Text style={styles.statusIndicatorText}>Playing...</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#ccc',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: '#FF5722',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: 'white',
    flex: 1,
    marginRight: 10,
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    padding: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyStateText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  messageContainer: {
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    maxWidth: '85%',
  },
  userMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    backgroundColor: '#333',
    alignSelf: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  messageRole: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageTime: {
    color: '#999',
    fontSize: 10,
  },
  messageContent: {
    color: 'white',
    fontSize: 16,
    lineHeight: 22,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#007AFF',
    marginLeft: 10,
    fontSize: 14,
  },
  controlsContainer: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  secondaryButton: {
    backgroundColor: '#444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.48,
  },
  secondaryButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  recordButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 15,
  },
  recordingButton: {
    backgroundColor: '#FF3B30',
  },
  disabledButton: {
    backgroundColor: '#555',
  },
  recordButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusIndicators: {
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  recordingPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  playingPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  statusIndicatorText: {
    color: '#ccc',
    fontSize: 12,
  },
}); 