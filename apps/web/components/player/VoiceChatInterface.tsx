import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Bot, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@lxplayer/ui';
import { useAgentConversation } from '../../app/hooks/useAgentConversation';

interface VoiceChatInterfaceProps {
  sessionId: string;
  sectionTitle: string;
  sectionDescription: string;
  onComplete: () => void;
  onError: (error: string) => void;
}

export function VoiceChatInterface({ 
  sessionId, 
  sectionTitle, 
  sectionDescription, 
  onComplete, 
  onError 
}: VoiceChatInterfaceProps) {
  const [isSessionStarted, setIsSessionStarted] = useState(false);
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

  // ElevenLabs Agent ID - should be configured per section
  const agentId = 'agent_2901k5a3e15feg6sjmw44apewq20';

  // Auto-start session when component mounts
  useEffect(() => {
    if (!isSessionStarted) {
      handleStartSession();
    }
    
    // Cleanup on unmount
    return () => {
      if (isConnected) {
        stopConversation();
      }
    };
  }, []);

  const handleStartSession = async () => {
    try {
      console.log('🎭 Starting optimized ElevenLabs voice chat:', sectionTitle);
      setError(null);
      setIsSessionStarted(true);
      
      await startConversation(agentId);
      
      // Send section context after connection is established
      const checkConnectionAndSend = () => {
        if (isConnected) {
          console.log('📝 Sending section context to agent...');
          const contextMessage = `Training section: "${sectionTitle}". Description: "${sectionDescription}". Please act as a training assistant for this section and help the user learn about this topic through natural conversation. Be engaging and educational.`;
          sendContextualUpdate(contextMessage);
        } else {
          // Check again after a short delay
          setTimeout(checkConnectionAndSend, 100);
        }
      };
      
      // Start checking after initial delay
      setTimeout(checkConnectionAndSend, 500);
      
    } catch (err) {
      console.error('Error starting voice chat session:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start voice chat';
      setError(errorMessage);
      onError(errorMessage);
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
    } catch (err) {
      console.error('Error toggling recording:', err);
      setError('Failed to toggle recording');
    }
  };

  const getConnectionStatus = () => {
    if (webSocketError || error) return 'error';
    if (isConnected) return 'connected';
    return 'connecting';
  };

  const getStatusColor = () => {
    switch (getConnectionStatus()) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    switch (getConnectionStatus()) {
      case 'connected': return 'Bağlı';
      case 'connecting': return 'Bağlanıyor';
      case 'error': return 'Hata';
      default: return 'Bağlantı Yok';
    }
  };

  if (error || webSocketError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg">
        <XCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">Sesli Sohbet Hatası</h3>
        <p className="text-red-700 mb-4">{error || webSocketError}</p>
        <div className="flex space-x-4">
          <Button onClick={handleStartSession} variant="outline">
            Tekrar Dene
          </Button>
          <Button onClick={onComplete}>
            Atla
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg">
      {/* Section Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🎭 {sectionTitle}
        </h2>
        <p className="text-gray-600 mb-4">
          {sectionDescription}
        </p>
        
        {/* Connection Status */}
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className={`w-3 h-3 rounded-full ${
            getConnectionStatus() === 'connected' ? 'bg-green-500' : 
            getConnectionStatus() === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
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
          <p className="mt-2 text-green-600 font-medium">
            ✨ Optimize edilmiş ses sistemi: Net, hızlı, kesintisiz
          </p>
        </div>
      </div>
    </div>
  );
}
