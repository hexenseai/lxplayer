'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useVoiceStream } from 'voice-stream';
import type { ElevenLabsWebSocketEvent } from '../types/websocket';

const sendMessage = (websocket: WebSocket, request: object) => {
  if (websocket.readyState !== WebSocket.OPEN) {
    console.warn('⚠️ WebSocket is not open, cannot send message');
    return;
  }
  websocket.send(JSON.stringify(request));
};

export const useAgentConversation = () => {
  const websocketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [messages, setMessages] = useState<Array<{type: 'user' | 'agent', content: string}>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Audio handling
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isProcessingAudioRef = useRef<boolean>(false);
  
  // Audio chunk buffering for same event_id
  const audioChunkBufferRef = useRef<Map<number, string[]>>(new Map());
  const chunkTimeoutRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  // Stop any currently playing audio (but keep recording active)
  const stopCurrentAudio = useCallback(() => {
    console.log('🛑 Stopping current audio playback (keeping recording active)...');
    
    // Stop HTML5 Audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    
    // Stop Web Audio API source
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (error) {
        // Ignore error if already stopped
      }
      currentSourceRef.current = null;
    }
    
    setIsPlaying(false);
    isPlayingRef.current = false;
    isProcessingAudioRef.current = false;
    
    // Note: We don't stop recording here - continuous recording for natural conversation
    console.log('🎤 Recording continues during audio playback for natural conversation');
  }, []);

  // Process audio queue - sequential playback to prevent overlapping
  const processAudioQueue = useCallback(async () => {
    if (isProcessingAudioRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isProcessingAudioRef.current = true;
    console.log('🎵 Processing audio queue sequentially, items:', audioQueueRef.current.length);

    while (audioQueueRef.current.length > 0) {
      const audioBase64 = audioQueueRef.current.shift();
      if (audioBase64) {
        console.log('🔄 Starting sequential audio playback...');
        
        try {
          // Play audio and wait for it to complete
          await playAudioWithWebAudio(audioBase64);
          
          // Wait for audio to finish before processing next
          while (isPlayingRef.current) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          console.log('✅ Audio finished, processing next in queue...');
        } catch (error) {
          console.error('❌ Error in sequential audio playback:', error);
        }
      }
    }

    isProcessingAudioRef.current = false;
    console.log('✅ Audio queue processing completed (sequential)');
  }, []);

  // Add audio to queue instead of playing directly
  const queueAudio = useCallback((audioBase64: string) => {
    console.log('📥 Adding audio to queue, current queue size:', audioQueueRef.current.length);
    audioQueueRef.current.push(audioBase64);
    processAudioQueue();
  }, [processAudioQueue]);

  // Handle audio chunks - buffer chunks with same event_id
  const handleAudioChunk = useCallback((eventId: number, audioBase64: string) => {
    console.log(`📥 Received audio chunk for event_id: ${eventId}, size: ${audioBase64.length} chars`);
    
    // Get or create buffer for this event_id
    if (!audioChunkBufferRef.current.has(eventId)) {
      audioChunkBufferRef.current.set(eventId, []);
      console.log(`🆕 Created new buffer for event_id: ${eventId}`);
    } else {
      console.log(`🔄 Reusing existing buffer for event_id: ${eventId}`);
    }
    
    // Add chunk to buffer
    const buffer = audioChunkBufferRef.current.get(eventId)!;
    buffer.push(audioBase64);
    console.log(`📦 Added chunk to buffer, total chunks for event_id ${eventId}: ${buffer.length}`);
    
    // Clear existing timeout for this event_id
    const existingTimeout = chunkTimeoutRef.current.get(eventId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      console.log(`⏰ Cleared existing timeout for event_id: ${eventId}`);
    }
    
    // Set timeout to process buffered chunks (wait for more chunks)
    const timeout = setTimeout(() => {
      const chunks = audioChunkBufferRef.current.get(eventId);
      if (chunks && chunks.length > 0) {
        console.log(`🔗 Combining ${chunks.length} chunks for event_id: ${eventId}`);
        
        // Properly combine audio chunks by decoding, concatenating binary data, then re-encoding
        try {
          console.log(`🔧 Properly combining ${chunks.length} audio chunks...`);
          
          // Decode each base64 chunk to binary data
          const binaryChunks: Uint8Array[] = [];
          let totalLength = 0;
          
          for (const chunk of chunks) {
            try {
              const binaryString = atob(chunk);
              const uint8Array = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                uint8Array[i] = binaryString.charCodeAt(i);
              }
              binaryChunks.push(uint8Array);
              totalLength += uint8Array.length;
              console.log(`✅ Decoded chunk: ${uint8Array.length} bytes`);
            } catch (decodeError) {
              console.error(`❌ Failed to decode chunk:`, decodeError);
              continue; // Skip invalid chunks
            }
          }
          
          if (binaryChunks.length === 0) {
            console.error(`❌ No valid chunks to combine for event_id ${eventId}`);
            return;
          }
          
          // Concatenate all binary data
          const combinedBinary = new Uint8Array(totalLength);
          let offset = 0;
          
          for (const chunk of binaryChunks) {
            combinedBinary.set(chunk, offset);
            offset += chunk.length;
          }
          
          // Convert back to base64
          let binaryString = '';
          for (let i = 0; i < combinedBinary.length; i++) {
            binaryString += String.fromCharCode(combinedBinary[i]);
          }
          const combinedAudio = btoa(binaryString);
          
          console.log(`✅ Combined audio: ${combinedBinary.length} bytes → ${combinedAudio.length} chars base64`);
          
          // Queue the combined audio
          queueAudio(combinedAudio);
          
        } catch (combineError) {
          console.error(`❌ Error combining chunks for event_id ${eventId}:`, combineError);
          // Try to queue individual chunks as fallback
          console.log(`🔄 Fallback: Queuing individual chunks for event_id ${eventId}`);
          for (const chunk of chunks) {
            try {
              // Validate chunk before queuing
              atob(chunk); // Test decode
              queueAudio(chunk);
              console.log(`✅ Queued individual chunk: ${chunk.length} chars`);
            } catch (chunkError) {
              console.error(`❌ Skipping invalid chunk:`, chunkError);
            }
          }
        }
        
        // Clean up ONLY after processing
        audioChunkBufferRef.current.delete(eventId);
        chunkTimeoutRef.current.delete(eventId);
        console.log(`🧹 Cleaned up buffers for event_id: ${eventId}`);
      }
    }, 250); // Optimized: Fast enough for real-time, slow enough to collect chunks
    
    chunkTimeoutRef.current.set(eventId, timeout);
  }, [queueAudio]);

  // Use voice-stream for microphone handling
  const { startStreaming, stopStreaming } = useVoiceStream({
    onAudioChunked: (audioData) => {
      if (!websocketRef.current) return;
      console.log('🎤 Sending audio chunk via voice-stream:', audioData.length, 'chars');
      sendMessage(websocketRef.current, {
        user_audio_chunk: audioData,
      });
    },
  });

  const playAudioWithHTML5 = useCallback(async (audioBase64: string) => {
    try {
      console.log('🎵 Playing audio with HTML5 Audio API...');
      
      if (!audioBase64 || audioBase64.length === 0) {
        console.error('❌ Empty audio data received');
        return;
      }
      
      // Stop any currently playing audio first
      stopCurrentAudio();
      
      // Minimal wait to ensure previous audio is stopped  
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Create audio blob from base64
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Try different audio formats
      const formats = [
        'audio/wav',
        'audio/mpeg',
        'audio/mp3',
        'audio/ogg',
        'audio/webm'
      ];
      
      for (const format of formats) {
        try {
          const blob = new Blob([bytes], { type: format });
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          
          // Optimize playback rate for natural conversation speed
          audio.playbackRate = 1.0; // Normal speed for better sync
          
          audio.onloadeddata = () => {
            console.log(`✅ Audio loaded successfully with format: ${format}`);
            console.log(`🔍 Audio duration: ${audio.duration}s, playback rate: ${audio.playbackRate}`);
          };
          
          audio.onended = () => {
            console.log('🎵 HTML5 audio playback ended');
            setIsPlaying(false);
            isPlayingRef.current = false;
            currentAudioRef.current = null;
            URL.revokeObjectURL(audioUrl);
          };
          
          audio.onerror = (error) => {
            console.error(`❌ HTML5 audio error with ${format}:`, error);
            URL.revokeObjectURL(audioUrl);
          };
          
          // Store reference to current audio
          currentAudioRef.current = audio;
          
          await audio.play();
          setIsPlaying(true);
          isPlayingRef.current = true;
          console.log(`✅ HTML5 audio playback started with ${format} at ${audio.playbackRate}x speed`);
          return; // Success, exit the loop
          
        } catch (formatError) {
          console.log(`⏭️ Format ${format} failed, trying next...`);
          continue;
        }
      }
      
      // If HTML5 fails, fallback to Web Audio API
      console.log('🔄 HTML5 Audio failed, falling back to Web Audio API...');
      return playAudioWithWebAudio(audioBase64);
      
    } catch (error) {
      console.error('❌ Error with HTML5 audio, falling back to Web Audio API:', error);
      return playAudioWithWebAudio(audioBase64);
    }
  }, [stopCurrentAudio]);

  const playAudioWithWebAudio = useCallback(async (audioBase64: string) => {
    try {
      console.log('🎵 Playing audio with Web Audio API (async mode)...');
      
      // Check if audio data is empty
      if (!audioBase64 || audioBase64.length === 0) {
        console.error('❌ Empty audio data received');
        return;
      }
      
      // Don't stop current audio - allow parallel playback for natural conversation
      // Multiple audio sources can play simultaneously
      console.log('🔄 Starting parallel audio playback...');
      
      // Convert base64 to ArrayBuffer with validation
      let binaryString;
      try {
        binaryString = atob(audioBase64);
      } catch (atobError) {
        console.error('❌ Invalid base64 audio data:', atobError);
        console.log('🔍 Base64 sample:', audioBase64.substring(0, 50) + '...');
        return;
      }
      
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
      
      console.log('🔍 Audio buffer size:', arrayBuffer.byteLength, 'bytes');

      // Create AudioContext if not exists
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;

      // Clone the ArrayBuffer before decodeAudioData (it consumes the buffer)
      const clonedBuffer = arrayBuffer.slice(0);
      
      // Try to decode as standard audio format first
      try {
        console.log('🔄 Attempting standard audio decode...');
        const decodedAudio = await audioContext.decodeAudioData(arrayBuffer);
        
        const source = audioContext.createBufferSource();
        source.buffer = decodedAudio;
        source.connect(audioContext.destination);
        
        // Single source tracking for sequential playback
        currentSourceRef.current = source;
        
        source.onended = () => {
          console.log('🎵 Web Audio API playback ended (sequential)');
          setIsPlaying(false);
          isPlayingRef.current = false;
          currentSourceRef.current = null;
        };
        
        source.start();
        setIsPlaying(true);
        isPlayingRef.current = true;
        console.log('✅ Standard audio played successfully (async)');
        
      } catch (decodeError) {
        console.log('🔄 Standard decode failed, trying multiple sample rates...');
        console.log('🔍 Decode error:', decodeError);
        
        // Try different sample rates commonly used by ElevenLabs
        // ElevenLabs typically uses 22050Hz for WebSocket streaming
        const sampleRates = [16000, 22050, 24000, 44100, 48000];
        
        for (const sampleRate of sampleRates) {
          try {
            console.log(`🔄 Trying sample rate: ${sampleRate}Hz`);
            
            // Handle as raw PCM data (16-bit, mono)
            const numberOfChannels = 1;
            const length = Math.floor(clonedBuffer.byteLength / 2); // 16-bit samples
            
            console.log('🔍 PCM Processing Details:', {
              sampleRate,
              originalBufferSize: arrayBuffer.byteLength,
              clonedBufferSize: clonedBuffer.byteLength,
              calculatedLength: length,
              expectedDuration: length / sampleRate
            });
            
            // Check if we have valid audio data
            if (length <= 0) {
              console.error('❌ Invalid audio data: length is 0 or negative');
              continue;
            }
            
            // Skip very small audio chunks
            if (length < 50) {
              console.log('⏭️ Skipping very small audio chunk:', length, 'samples');
              continue;
            }
            
            const audioBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate);
            const channelData = audioBuffer.getChannelData(0);
            const dataView = new DataView(clonedBuffer);
            
            // Convert 16-bit PCM to float32
            for (let i = 0; i < length; i++) {
              const byteOffset = i * 2;
              if (byteOffset + 1 < clonedBuffer.byteLength) {
                const sample = dataView.getInt16(byteOffset, true); // Little-endian
                channelData[i] = sample / 32768.0; // Convert to float32 range [-1, 1]
              } else {
                break;
              }
            }
            
            console.log('✅ PCM conversion completed, samples processed:', length);
            
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            
            // Single source tracking for sequential playback
            currentSourceRef.current = source;
            
            source.onended = () => {
              console.log('🎵 PCM audio playback ended (sequential)');
              setIsPlaying(false);
              isPlayingRef.current = false;
              currentSourceRef.current = null;
              console.log('🔇 Audio source finished');
            };
            
            source.onerror = (error) => {
              console.error('❌ Audio source error:', error);
              setIsPlaying(false);
              isPlayingRef.current = false;
              currentSourceRef.current = null;
            };
            
            source.start();
            setIsPlaying(true);
            isPlayingRef.current = true;
            
            console.log(`✅ Raw PCM audio playback started successfully with ${sampleRate}Hz!`, {
              duration: audioBuffer.duration.toFixed(3) + 's',
              sampleRate: audioBuffer.sampleRate,
              channels: audioBuffer.numberOfChannels
            });
            
            return; // Success, exit the loop
            
          } catch (pcmError) {
            console.error(`❌ PCM processing error with ${sampleRate}Hz:`, pcmError);
            continue;
          }
        }
        
        console.error('❌ All sample rates failed');
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
      
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  }, [stopCurrentAudio]);

  // Alternative: ElevenLabs React library method (if needed)
  const playAudioWithElevenLabsReact = useCallback(async (audioBase64: string) => {
    try {
      console.log('🎵 Attempting ElevenLabs React library method...');
      
      // This would use @elevenlabs/react library
      // Currently using manual implementation for better control
      // To use ElevenLabs React library, you would:
      // 1. Import { ElevenLabsConversation } from '@elevenlabs/react'
      // 2. Use their built-in audio handling
      
      console.log('⚠️ ElevenLabs React library method not implemented yet');
      console.log('🔄 Falling back to HTML5 Audio...');
      
      return playAudioWithHTML5(audioBase64);
      
    } catch (error) {
      console.error('❌ ElevenLabs React library error:', error);
      return playAudioWithHTML5(audioBase64);
    }
  }, [playAudioWithHTML5]);

  const playAudio = useCallback(async (audioBase64: string) => {
    // Direct queue for manual audio (not chunked)
    queueAudio(audioBase64);
  }, [queueAudio]);

  const startConversation = useCallback(async (agentId: string) => {
    if (isConnected) return;
    
    try {
      console.log('🚀 Starting ElevenLabs WebSocket conversation with agent:', agentId);
      setError(null);
      setMessages([]);
      
      // Stop any currently playing audio
      stopCurrentAudio();
      
      // Create WebSocket connection
      const websocket = new WebSocket(`wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`);
      
      websocket.onopen = () => {
        console.log('✅ ElevenLabs WebSocket connected');
        setIsConnected(true);
        
        // Small delay to ensure state is updated
        setTimeout(() => {
          console.log('🔄 WebSocket connection established, ready for audio streaming');
        }, 100);
      };
      
      websocket.onmessage = async (event) => {
        const data = JSON.parse(event.data) as ElevenLabsWebSocketEvent;
        
        // Handle ping events to keep connection alive
        if (data.type === "ping") {
          setTimeout(() => {
            sendMessage(websocket, {
              type: "pong",
              event_id: data.ping_event.event_id,
            });
          }, data.ping_event.ping_ms);
        }
        
        if (data.type === "user_transcript") {
          const { user_transcription_event } = data;
          console.log("📝 User transcript:", user_transcription_event.user_transcript);
          // Voice-only mode: Skip message storage for better performance
        }
        
        if (data.type === "agent_response") {
          const { agent_response_event } = data;
          console.log("🤖 Agent response:", agent_response_event.agent_response);
          // Voice-only mode: Skip message storage for better performance
        }
        
        if (data.type === "agent_response_correction") {
          const { agent_response_correction_event } = data;
          console.log("🔄 Agent response correction:", agent_response_correction_event.corrected_agent_response);
          // Voice-only mode: Skip message storage for better performance
        }
        
        if (data.type === "interruption") {
          console.log("⚠️ Interruption:", data.interruption_event.reason);
        }
        
        if (data.type === "audio") {
          const { audio_event } = data;
          console.log("🎵 Audio event received, event_id:", audio_event.event_id);
          // Handle audio chunk with buffering for same event_id
          handleAudioChunk(audio_event.event_id, audio_event.audio_base_64);
        }
      };
      
      websocketRef.current = websocket;
      
      websocket.onclose = async () => {
        console.log('🔌 ElevenLabs WebSocket disconnected');
        websocketRef.current = null;
        setIsConnected(false);
        setIsRecording(false);
        stopStreaming();
      };
      
      websocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('WebSocket connection error');
      };
      
    } catch (error) {
      console.error('❌ Error starting conversation:', error);
      setError('Failed to start conversation');
    }
  }, [isConnected, playAudio, stopStreaming, stopCurrentAudio, handleAudioChunk]);

  const stopConversation = useCallback(async () => {
    if (!websocketRef.current) return;
    
    console.log('🛑 Stopping ElevenLabs conversation...');
    
    // Stop any currently playing audio and clear queue
    stopCurrentAudio();
    audioQueueRef.current = [];
    
    // Stop current audio source if playing
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (error) {
        // Ignore if already stopped
      }
      currentSourceRef.current = null;
    }
    
    // Clear audio chunk buffers and timeouts
    chunkTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
    chunkTimeoutRef.current.clear();
    audioChunkBufferRef.current.clear();
    
    console.log('🧹 Audio queue, current source and chunk buffers cleared');
    
    websocketRef.current.close();
    setIsRecording(false);
    stopStreaming();
  }, [stopStreaming, stopCurrentAudio]);

  const toggleRecording = useCallback(async () => {
    if (!isConnected) {
      console.error('❌ Cannot start recording: WebSocket not connected');
      return;
    }
    
    if (isRecording) {
      console.log('🛑 Stopping audio recording...');
      stopStreaming();
      setIsRecording(false);
    } else {
      console.log('🎤 Starting audio recording...');
      try {
        await startStreaming();
        setIsRecording(true);
      } catch (error) {
        console.error('❌ Error starting recording:', error);
        setError('Failed to start recording');
      }
    }
  }, [isConnected, isRecording, startStreaming, stopStreaming]);

  const sendContextualUpdate = useCallback((text: string) => {
    if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ Cannot send contextual update: WebSocket not connected');
      return;
    }
    
    console.log('📝 Sending contextual update:', text);
    sendMessage(websocketRef.current, {
      type: "contextual_update",
      text: text
    });
  }, []);

  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  return {
    startConversation,
    stopConversation,
    toggleRecording,
    sendContextualUpdate,
    isConnected,
    isRecording,
    isPlaying,
    messages,
    error
  };
};