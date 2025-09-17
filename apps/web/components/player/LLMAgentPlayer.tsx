import React, { useEffect, useRef, useState } from 'react';
import { type TrainingSection } from '@/lib/api';
import { Mic, MicOff, Volume2, Bot, ArrowLeft, ArrowRight, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@lxplayer/ui';
import { useAgentConversation } from '../../app/hooks/useAgentConversation';
import { type ActionPayload, type ActionResponse } from '@/lib/training-llm';

interface LLMAgentPlayerProps {
  section: TrainingSection;
  onComplete: () => void;
  onNavigateNext: () => void;
  onNavigatePrevious: () => void;
  onLLMAction?: (actionPayload: ActionPayload) => Promise<ActionResponse>;
}

type ViewState = 'loading' | 'voice-chat' | 'error';

export function LLMAgentPlayer({ section, onComplete, onNavigateNext, onNavigatePrevious, onLLMAction }: LLMAgentPlayerProps) {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [error, setError] = useState<string | null>(null);

  // Use our optimized ElevenLabs voice conversation hook
  const {
    startConversation,
    stopConversation,
    toggleRecording,
    sendContextualUpdate,
    isConnected,
    isRecording,
    isPlaying,
    error: webSocketError
  } = useAgentConversation();

  // ElevenLabs Agent ID - this should come from section config or environment
  const agentId = section.agent_id || 'agent_2901k5a3e15feg6sjmw44apewq20';

  console.log('🎭 LLMAgentPlayer rendered for section:', section.title);

  // Auto-start session when component mounts
  useEffect(() => {
    handleStartSession();
    
    // Cleanup on unmount
    return () => {
      if (isConnected) {
        stopConversation();
      }
    };
  }, []);

  const handleStartSession = async () => {
    try {
      console.log('🎭 Starting ElevenLabs voice chat for section:', section.title);
      setError(null);
      setViewState('loading');
      
      await startConversation(agentId);
      
      // Send section context after connection is established
      if (section) {
        // Wait for WebSocket to be fully ready and stable
        const checkConnectionAndSend = () => {
          if (isConnected) {
            console.log('📝 Sending section context to agent...');
            const contextMessage = `Training section: "${section.title}". Description: "${section.description}". Script: "${section.script}". Please act as a training assistant for this section and help the user learn about this topic through natural conversation. Be engaging and educational.`;
            sendContextualUpdate(contextMessage);
            setViewState('voice-chat');
          } else {
            // Check again after a short delay
            setTimeout(checkConnectionAndSend, 100);
          }
        };
        
        // Start checking after initial delay
        setTimeout(checkConnectionAndSend, 500);
      }
      
    } catch (err) {
      console.error('Error starting voice chat session:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start voice chat';
      setError(errorMessage);
      setViewState('error');
    }
  };

  const handleEndSession = async () => {
    try {
      await stopConversation();
      onComplete();
    } catch (err) {
      console.error('Error ending voice chat session:', err);
      onComplete(); // Complete anyway
    }
  };

  const handleToggleRecording = async () => {
    try {
      await toggleRecording();
      
      // LLM sistemine action gönder
      if (onLLMAction) {
        await onLLMAction({
          type: isRecording ? 'agent_stop_recording' : 'agent_start_recording',
          data: {
            sectionId: section.id,
            isRecording: !isRecording
          },
          timestamp: Date.now()
        });
      }
    } catch (err) {
      console.error('Error toggling recording:', err);
      setError('Failed to toggle recording');
    }
  };

  const retry = () => {
    setError(null);
    handleStartSession();
  };

  const getConnectionStatus = () => {
    if (webSocketError || error) return 'error';
    if (isConnected) return 'connected';
    return 'connecting';
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

  // Loading State
  if (viewState === 'loading') {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            ElevenLabs Agent Başlatılıyor...
          </h3>
          <p className="text-gray-600 text-center">
            {section.title} için sesli sohbet hazırlanıyor.
          </p>
        </div>
        
        {/* Navigation buttons */}
        <div className="flex justify-between items-center p-4 bg-white border-t">
          <Button
            onClick={onNavigatePrevious}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Önceki</span>
          </Button>
          
          <div className="text-sm text-gray-500">
            🎭 {section.title}
          </div>
          
          <Button
            onClick={onComplete}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <span>Atla</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Error State
  if (viewState === 'error') {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <XCircle className="w-16 h-16 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            LLM Agent Hatası
          </h3>
          <p className="text-gray-600 text-center mb-6">
            {error || webSocketError || 'Bilinmeyen bir hata oluştu.'}
          </p>
          
          <div className="flex space-x-4">
            <Button onClick={retry} variant="outline">
              Tekrar Dene
            </Button>
            <Button onClick={onComplete}>
              Devam Et
            </Button>
          </div>
        </div>
        
        {/* Navigation buttons */}
        <div className="flex justify-between items-center p-4 bg-white border-t">
          <Button
            onClick={onNavigatePrevious}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Önceki</span>
          </Button>
          
          <div className="text-sm text-gray-500">
            🎭 {section.title}
          </div>
          
          <Button
            onClick={onComplete}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <span>Atla</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Voice Chat State
  if (viewState === 'voice-chat') {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
          {/* Section Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              🎭 {section.title}
            </h2>
            <p className="text-gray-600 mb-4">
              {section.description}
            </p>
            
            {/* Connection Status */}
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(getConnectionStatus())}`}></div>
              <span className="text-sm font-medium">
                {getStatusText(getConnectionStatus())}
              </span>
            </div>
          </div>

          {/* Voice Chat Interface */}
          <div className="flex flex-col items-center space-y-8">
            {/* Main Voice Status */}
            <div className="text-center">
              {!isConnected ? (
                <div className="text-gray-500">
                  <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">ElevenLabs Agent bağlanıyor...</p>
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
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
                  <p className="text-lg font-medium mb-2">Hazır</p>
                  <p className="text-sm">Kaydet butonuna basın ve konuşmaya başlayın</p>
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="flex space-x-4">
              {isConnected && (
                <Button
                  onClick={handleToggleRecording}
                  disabled={!isConnected}
                  className={`flex items-center gap-2 px-6 py-3 ${
                    isRecording 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-5 h-5" />
                      Kaydı Durdur
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      Kaydet
                    </>
                  )}
                </Button>
              )}
              
              <Button
                onClick={handleEndSession}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="w-5 h-5" />
                Tamamla
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-xs text-gray-500 text-center max-w-md">
              <p>
                🎤 Bu eğitim bölümü hakkında agent ile sesli sohbet edin.
              </p>
              <p className="mt-1">
                🤖 Agent size bu konuda yardımcı olacak ve sorularınızı yanıtlayacak.
              </p>
            </div>
          </div>
        </div>
        
        {/* Navigation buttons */}
        <div className="flex justify-between items-center p-4 bg-white border-t">
          <Button
            onClick={onNavigatePrevious}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Önceki</span>
          </Button>
          
          <div className="text-sm text-gray-500">
            🎭 {section.title}
          </div>
          
          <Button
            onClick={handleEndSession}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Tamamla</span>
          </Button>
        </div>
      </div>
    );
  }

  return null;
}