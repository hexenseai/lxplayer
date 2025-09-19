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
  const [microphonePermission, setMicrophonePermission] = useState<'unknown' | 'granted' | 'denied' | 'checking'>('unknown');

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

  // Check microphone permissions
  const checkMicrophonePermission = async () => {
    try {
      setMicrophonePermission('checking');
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser or context');
      }
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Permission granted, clean up the stream
      stream.getTracks().forEach(track => track.stop());
      setMicrophonePermission('granted');
      
      return true;
    } catch (err) {
      console.error('Microphone permission error:', err);
      setMicrophonePermission('denied');
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Mikrofon izni reddedildi. Lütfen tarayıcı ayarlarından mikrofon iznini etkinleştirin.');
        } else if (err.name === 'NotFoundError') {
          setError('Mikrofon bulunamadı. Lütfen bir mikrofon bağlı olduğundan emin olun.');
        } else if (err.name === 'NotSupportedError') {
          setError('Bu tarayıcı mikrofon erişimini desteklemiyor.');
        } else {
          setError(`Mikrofon hatası: ${err.message}`);
        }
      } else {
        setError('Mikrofon erişimi sağlanamadı. HTTPS bağlantısı gerekli olabilir.');
      }
      
      return false;
    }
  };

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

  // Watch for connection status changes
  useEffect(() => {
    if (isConnected && viewState === 'loading') {
      console.log('🔄 WebSocket connected, transitioning to voice-chat mode...');
      
      // Send context and transition to voice-chat mode
      if (section) {
        console.log('📝 Sending contextual update...');
        sendContextualUpdate(`Training section: ${section.title}. Description: ${section.description}. Script: ${section.script}`);
      }
      setViewState('voice-chat');
    }
  }, [isConnected, viewState, section, sendContextualUpdate]);

  const handleStartSession = async () => {
    try {
      console.log('🚀 Starting WebSocket conversation with agent:', agentId);
      setError(null);
      setViewState('loading');
      
      // First check microphone permission
      console.log('🎤 Checking microphone permission...');
      const hasPermission = await checkMicrophonePermission();
      
      if (!hasPermission) {
        console.error('❌ Microphone permission not granted');
        setViewState('error');
        return;
      }
      
      console.log('✅ Microphone permission granted, starting conversation...');
      await startConversation(agentId);
      
    } catch (err) {
      console.error('Error starting session:', err);
      setError('Failed to start conversation');
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
      <div className="w-full h-full max-w-7xl mx-auto flex flex-col">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎭</span>
              <div>
                <h2 
                  className="text-xl font-semibold text-white cursor-help" 
                  title={section.description || ''}
                >
                  {section.title}
                </h2>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onNavigatePrevious}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Önceki</span>
              </button>
              <button
                onClick={onComplete}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors"
              >
                <span>Atla</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden bg-slate-900">
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              ElevenLabs Agent Başlatılıyor...
            </h3>
            <p className="text-slate-300 text-center">
              {section.title} için sesli sohbet hazırlanıyor.
            </p>
          </div>
        </div>

        <div className="bg-slate-800 border-t border-slate-700 p-4">
          <div className="flex items-center justify-between">
            {/* Sol taraf - Durum */}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span className="text-sm text-slate-300">ElevenLabs Agent Başlatılıyor...</span>
            </div>

            {/* Sağ taraf - İptal */}
            <div className="flex items-center space-x-3">
              <Button
                onClick={async () => {
                  try {
                    await stopConversation();
                    setViewState('error');
                    setError('Session cancelled by user');
                  } catch (err) {
                    console.error('Error cancelling session:', err);
                    setViewState('error');
                    setError('Failed to cancel session');
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white"
              >
                <span>İptal Et</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (viewState === 'error') {
    return (
      <div className="w-full h-full max-w-7xl mx-auto flex flex-col">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎭</span>
              <div>
                <h2 
                  className="text-xl font-semibold text-white cursor-help" 
                  title={section.description || ''}
                >
                  {section.title}
                </h2>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onNavigatePrevious}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Önceki</span>
              </button>
              <button
                onClick={onComplete}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors"
              >
                <span>Atla</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden bg-slate-900">
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <XCircle className="w-16 h-16 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              LLM Agent Hatası
            </h3>
            <p className="text-slate-300 text-center mb-6">
              {error || webSocketError || 'Bilinmeyen bir hata oluştu.'}
            </p>
            
          </div>
        </div>

        <div className="bg-slate-800 border-t border-slate-700 p-4">
          <div className="flex items-center justify-between">
            {/* Sol taraf - Hata Durumu */}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-sm text-slate-300">Bağlantı Hatası: {error || webSocketError || 'Bilinmeyen hata'}</span>
            </div>

            {/* Sağ taraf - Aksiyonlar */}
            <div className="flex items-center space-x-3">
              <Button
                onClick={retry}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <span>Tekrar Dene</span>
              </Button>
              <Button
                onClick={onComplete}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white"
              >
                <span>Devam Et</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Voice Chat State
  if (viewState === 'voice-chat') {
    return (
      <div className="w-full h-full max-w-7xl mx-auto flex flex-col">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎭</span>
              <div>
                <h2 
                  className="text-xl font-semibold text-white cursor-help" 
                  title={section.description || ''}
                >
                  {section.title}
                </h2>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onNavigatePrevious}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Önceki</span>
              </button>
              <button
                onClick={onNavigateNext}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors"
              >
                <span>Sonraki</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden bg-slate-900">
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Connection Status */}
            <div className="flex items-center justify-center space-x-2 mb-8">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(getConnectionStatus())}`}></div>
              <span className="text-sm font-medium">
                {getStatusText(getConnectionStatus())}
              </span>
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
        </div>

        <div className="bg-slate-800 border-t border-slate-700 p-4">
          <div className="flex items-center justify-between">
            {/* Sol taraf - Mikrofon İzinleri */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  microphonePermission === 'granted' ? 'bg-green-500' :
                  microphonePermission === 'denied' ? 'bg-red-500' :
                  microphonePermission === 'checking' ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`}></div>
                <span className="text-sm text-slate-300">
                  Mikrofon: {
                    microphonePermission === 'granted' ? 'İzinli' :
                    microphonePermission === 'denied' ? 'Reddedildi' :
                    microphonePermission === 'checking' ? 'Kontrol Ediliyor' :
                    'Bilinmiyor'
                  }
                </span>
              </div>
            </div>

            {/* Orta - Konuşma Kontrolü */}
            <div className="flex items-center space-x-3">
              {isConnected && (
                <Button
                  onClick={handleToggleRecording}
                  className={`flex items-center gap-2 px-4 py-2 ${
                    isRecording 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span>Konuşmayı Durdur</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>Konuşmayı Başlat</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Sağ taraf - Ses Denetimi */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">Ses:</span>
                <div className="flex items-center space-x-1">
                  <button className="w-6 h-6 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs flex items-center justify-center">
                    -
                  </button>
                  <div className="w-16 h-2 bg-slate-600 rounded-full">
                    <div className="w-3/4 h-full bg-blue-500 rounded-full"></div>
                  </div>
                  <button className="w-6 h-6 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs flex items-center justify-center">
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}