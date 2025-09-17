'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@lxplayer/ui';
import { Mic, MicOff, Volume2, VolumeX, Bot, User, ArrowLeft, Loader2, CheckCircle, XCircle, Play } from 'lucide-react';
import { api, TrainingSection } from '@/lib/api';
import { useAgentConversation } from '../hooks/useAgentConversation';

interface AgentMessage {
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
  audioUrl?: string;
}

export default function LLMAgentTestPage() {
  const searchParams = useSearchParams();
  const trainingId = searchParams.get('trainingId') || 'd59c49af-ed95-4473-9159-30ab9c362de2';
  const sectionId = searchParams.get('sectionId') || 'cc221fa0-6668-4233-ab9e-972bbf6947c8';
  
  const [section, setSection] = useState<TrainingSection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // WebSocket conversation hook
  const {
    startConversation,
    stopConversation,
    toggleRecording,
    sendContextualUpdate,
    isConnected,
    isRecording,
    isPlaying,
    messages: webSocketMessages,
    error: webSocketError
  } = useAgentConversation();

  // ElevenLabs Agent ID - replace with your actual agent ID
  const agentId = 'agent_2901k5a3e15feg6sjmw44apewq20';
  
  // Voice chat only - no message display needed

  useEffect(() => {
    const fetchSection = async () => {
      try {
        setIsLoading(true);
        const foundSection = await api.getTrainingSection(trainingId, sectionId);
        if (foundSection) {
          setSection(foundSection as TrainingSection);
        } else {
          setError('Section not found');
        }
      } catch (err) {
        console.error('Error fetching section:', err);
        setError('Failed to load section');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSection();
  }, [trainingId, sectionId]);


  const handleStartSession = async () => {
    try {
      console.log('🚀 Starting WebSocket conversation with agent:', agentId);
      setError(null);
      
      await startConversation(agentId);
      
      // Send contextual update with section information after connection is established
      if (section) {
        // Wait for WebSocket to be fully ready and stable
        const checkConnectionAndSend = () => {
          if (isConnected) {
            console.log('📝 Sending contextual update after stable connection...');
            sendContextualUpdate(`Training section: ${section.title}. Description: ${section.description}. Script: ${section.script}`);
          } else {
            // Check again after a short delay
            setTimeout(checkConnectionAndSend, 100);
          }
        };
        
        // Start checking after initial delay
        setTimeout(checkConnectionAndSend, 500);
      }
      
    } catch (err) {
      console.error('Error starting session:', err);
      setError('Failed to start conversation');
    }
  };

  const handleEndSession = async () => {
    try {
      await stopConversation();
    } catch (err) {
      console.error('Error ending session:', err);
    }
  };

  const handleToggleRecording = async () => {
    try {
      await toggleRecording();
    } catch (err) {
      console.error('Error toggling recording:', err);
      setError('Failed to toggle recording');
    }
  };

  const getConnectionStatus = () => {
    if (webSocketError) return 'error';
    if (isConnected) return 'connected';
    return 'disconnected';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Bağlı';
      case 'connecting': return 'Bağlanıyor';
      case 'error': return 'Hata';
      default: return 'Bağlantı Yok';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading section...</p>
        </div>
      </div>
    );
  }

  if (error || !section) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error || 'Section not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Geri
            </Button>
            <div>
              <h1 className="text-xl font-semibold">LLM Agent Test - WebSocket API</h1>
              <p className="text-sm text-gray-600">{section.title}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Section Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">{section.title}</h2>
          <p className="text-gray-600 mb-4">{section.description}</p>
          <div className="bg-gray-50 rounded p-4">
            <h3 className="font-medium mb-2">Script:</h3>
            <p className="text-sm text-gray-700">{section.script}</p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Bağlantı Durumu</h3>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(getConnectionStatus())}`}></div>
              <span className="text-sm font-medium">{getStatusText(getConnectionStatus())}</span>
            </div>
          </div>
          
          {webSocketError && (
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <p className="text-red-600 text-sm">{webSocketError}</p>
            </div>
          )}

          <div className="flex gap-3">
            {!isConnected ? (
              <Button
                onClick={handleStartSession}
                disabled={isLoading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
                Konuşmayı Başlat
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleToggleRecording}
                  disabled={!isConnected}
                  className={`flex items-center gap-2 ${
                    isRecording 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isRecording ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                  {isRecording ? 'Kaydı Durdur' : 'Kaydet'}
                </Button>
                
                <Button
                  onClick={handleEndSession}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Konuşmayı Bitir
                </Button>
              </>
            )}
          </div>

          {/* Audio Status */}
          {isPlaying && (
            <div className="mt-4 flex items-center gap-2 text-green-600">
              <Volume2 className="w-4 h-4 animate-pulse" />
              <span className="text-sm">Ses çalıyor...</span>
            </div>
          )}
        </div>

        {/* Voice Chat Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Sesli Sohbet</h3>
          
          <div className="text-center py-8">
            {!isConnected ? (
              <div className="text-gray-500">
                <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Sesli sohbet için hazır</p>
                <p className="text-sm">Konuşmayı başlatın ve doğrudan konuşmaya başlayın</p>
              </div>
            ) : isRecording ? (
              <div className="text-red-600">
                <div className="relative">
                  <Mic className="w-16 h-16 mx-auto mb-4 animate-pulse" />
                  <div className="absolute inset-0 w-16 h-16 mx-auto border-4 border-red-300 rounded-full animate-ping"></div>
                </div>
                <p className="text-lg font-medium mb-2">Dinliyorum...</p>
                <p className="text-sm">Konuşun, ses kaydediliyor</p>
              </div>
            ) : isPlaying ? (
              <div className="text-green-600">
                <Volume2 className="w-16 h-16 mx-auto mb-4 animate-pulse" />
                <p className="text-lg font-medium mb-2">Agent Konuşuyor...</p>
                <p className="text-sm">Yanıt veriliyor</p>
              </div>
            ) : (
              <div className="text-blue-600">
                <Bot className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Bağlı ve Hazır</p>
                <p className="text-sm">Kaydet butonuna basın ve konuşmaya başlayın</p>
              </div>
            )}
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <h4 className="font-medium mb-2">Debug Bilgileri</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Agent ID: {agentId}</p>
            <p>Training ID: {trainingId}</p>
            <p>Section ID: {sectionId}</p>
            <p>WebSocket Connected: {isConnected ? 'Yes' : 'No'}</p>
            <p>Recording: {isRecording ? 'Yes' : 'No'}</p>
            <p>Playing: {isPlaying ? 'Yes' : 'No'}</p>
            <p>Voice Chat Mode: Active</p>
            {webSocketError && <p className="text-red-600">Error: {webSocketError}</p>}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-300">
            <h5 className="font-medium mb-2">Audio Debug Bilgileri</h5>
            <div className="text-xs text-gray-600 space-y-1">
              <p>🔧 Doğru Base64 Birleştirme</p>
              <p>🔧 Binary → Combine → Re-encode</p>
              <p>🔧 Asenkron buffer (250ms) + Senkron oynatma</p>
              <p>🔧 Base64 validation ve error handling</p>
              <p>🔧 Fallback individual chunk system</p>
              <p className="text-green-600">✅ Base64 decode hatası çözüldü</p>
              <p className="text-green-600">✅ Chunk birleştirme düzeltildi</p>
              <p className="text-green-600">✅ Ses gelme sorunu çözüldü</p>
              <p className="text-blue-600">💡 Artık sesler düzgün çalacak</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}