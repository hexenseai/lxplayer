import React, { useCallback, useEffect, useRef, useState } from 'react';
import { type TrainingSection } from '@/lib/api';
import { Mic, MicOff, Volume2, Bot, ArrowLeft, ArrowRight, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@lxplayer/ui';
import { useAgentConversation } from '../../app/hooks/useAgentConversation';
import { type ActionPayload, type ActionResponse } from '@/lib/training-llm';

interface LLMAgentPlayerProps {
  section: TrainingSection;
  trainingAvatar?: any;
  onComplete: () => void;
  onNavigateNext: () => void;
  onNavigatePrevious: () => void;
  onLLMAction?: (actionPayload: ActionPayload) => Promise<ActionResponse>;
  sessionId?: string;
  trainingId?: string;
  userId?: string;
}

type ViewState = 'loading' | 'voice-chat' | 'error';

const LLMAgentPlayerComponent = ({ section, trainingAvatar, onComplete, onNavigateNext, onNavigatePrevious, onLLMAction, sessionId, trainingId, userId }: LLMAgentPlayerProps) => {
  
  // Sadece llm_agent section'lar için çalış
  if (section.type !== 'llm_agent') {
    console.log('❌ LLMAgentPlayer sadece llm_agent section\'lar için kullanılabilir');
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Geçersiz Bölüm Tipi</h2>
          <p className="text-gray-600">Bu bölüm LLM Agent için uygun değil.</p>
        </div>
      </div>
    );
  }
  
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [microphonePermission, setMicrophonePermission] = useState<'unknown' | 'granted' | 'denied' | 'checking'>('unknown');

  // Use our optimized ElevenLabs voice conversation hook
  const {
    startConversation,
    stopConversation,
    toggleRecording,
    sendContextualUpdate,
    initializeConversationSession,
    isConnected,
    isRecording,
    isPlaying,
    error: webSocketError
  } = useAgentConversation();

  // ElevenLabs Agent ID - this should come from section config or environment
  const agentId = section.agent_id || 'agent_2901k5a3e15feg6sjmw44apewq20';

  console.log('🎭 LLMAgentPlayer rendered for section:', section.title);
  console.log('🤖 Section agent_id:', section.agent_id);
  console.log('🤖 Using agentId:', agentId);
  console.log('👤 Section avatar:', section.avatar);
  console.log('👤 Training avatar:', trainingAvatar);
  console.log('🖼️ Training avatar image_url:', trainingAvatar?.image_url);
  console.log('🖼️ Training avatar name:', trainingAvatar?.name);

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
    // Initialize conversation session if we have the required data
    if (sessionId && trainingId && section.id) {
      initializeConversationSession(sessionId, section.id, trainingId, agentId);
    }
    
    handleStartSession();
    
    // Cleanup on unmount
    return () => {
      if (isConnected) {
        stopConversation();
      }
    };
  }, [sessionId, trainingId, section.id, agentId]);

  // Watch for connection status changes
  useEffect(() => {
    if (isConnected && viewState === 'loading') {
      console.log('🔄 WebSocket connected, transitioning to voice-chat mode...');
      
      // Send context and transition to voice-chat mode
      if (section) {
        console.log('📝 Sending contextual update...');
        // Add a small delay to ensure WebSocket is fully ready
        setTimeout(() => {
          sendContextualUpdate(`Training section: ${section.title}. Description: ${section.description}. Script: ${section.script}`);
        }, 100);
      }
      setViewState('voice-chat');
    }
  }, [isConnected, viewState, section]);

  const handleStartSession = useCallback(async () => {
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
  }, [agentId, startConversation]);

  const handleEndSession = async () => {
    try {
      await stopConversation();
      
      // Show evaluation results if available
      // Note: This will be handled by the conversation session save
      
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
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Avatar Display */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-2xl font-bold relative overflow-hidden shadow-lg border-2 border-white/20">
                  {section.avatar?.image_url ? (
                    <img 
                      src={section.avatar.image_url} 
                      alt={section.avatar.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = section.avatar?.name?.charAt(0).toUpperCase() || section.title.charAt(0).toUpperCase();
                        }
                      }}
                    />
                  ) : (
                    section.avatar?.name?.charAt(0).toUpperCase() || section.title.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
              
              {/* Section Info */}
              <div className="flex-1">
                <h2 
                  className="text-xl font-semibold text-white cursor-help" 
                  title={section.description || ''}
                >
                  {section.title}
                </h2>
                {section.avatar && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200">{section.avatar.name}</span>
                      {section.avatar.personality && (
                        <span className="px-2 py-1 text-xs bg-blue-600/20 text-blue-300 rounded-full border border-blue-500/30">
                          {section.avatar.personality}
                        </span>
                      )}
                    </div>
                    {section.avatar.description && (
                      <p className="text-xs text-slate-400 max-w-md">
                        {section.avatar.description}
                      </p>
                    )}
                  </div>
                )}
                {section.description && (
                  <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
                    {section.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onNavigatePrevious}
                className="flex items-center space-x-2 px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg border border-slate-600 transition-all duration-200 hover:shadow-md"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Önceki</span>
              </button>
              <button
                onClick={onComplete}
                className="flex items-center space-x-2 px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg border border-slate-600 transition-all duration-200 hover:shadow-md"
              >
                <span>Atla</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden bg-slate-900">
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              AI Asistan Başlatılıyor...
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
              <span className="text-sm text-slate-300">AI Asistan Başlatılıyor...</span>
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
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Avatar Display */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-2xl font-bold relative overflow-hidden shadow-lg border-2 border-white/20">
                  {section.avatar?.image_url ? (
                    <img 
                      src={section.avatar.image_url} 
                      alt={section.avatar.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = section.avatar?.name?.charAt(0).toUpperCase() || section.title.charAt(0).toUpperCase();
                        }
                      }}
                    />
                  ) : (
                    section.avatar?.name?.charAt(0).toUpperCase() || section.title.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
              
              {/* Section Info */}
              <div className="flex-1">
                <h2 
                  className="text-xl font-semibold text-white cursor-help" 
                  title={section.description || ''}
                >
                  {section.title}
                </h2>
                {section.avatar && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200">{section.avatar.name}</span>
                      {section.avatar.personality && (
                        <span className="px-2 py-1 text-xs bg-blue-600/20 text-blue-300 rounded-full border border-blue-500/30">
                          {section.avatar.personality}
                        </span>
                      )}
                    </div>
                    {section.avatar.description && (
                      <p className="text-xs text-slate-400 max-w-md">
                        {section.avatar.description}
                      </p>
                    )}
                  </div>
                )}
                {section.description && (
                  <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
                    {section.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onNavigatePrevious}
                className="flex items-center space-x-2 px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg border border-slate-600 transition-all duration-200 hover:shadow-md"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Önceki</span>
              </button>
              <button
                onClick={onComplete}
                className="flex items-center space-x-2 px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg border border-slate-600 transition-all duration-200 hover:shadow-md"
              >
                <span>Atla</span>
                <ArrowRight className="w-4 h-4" />
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
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Section Info */}
              <div className="flex-1">
                <h2 
                  className="text-xl font-semibold text-white cursor-help" 
                  title={section.description || ''}
                >
                  {section.title}
                </h2>
                {section.avatar && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200">{section.avatar.name}</span>
                      {section.avatar.personality && (
                        <span className="px-2 py-1 text-xs bg-blue-600/20 text-blue-300 rounded-full border border-blue-500/30">
                          {section.avatar.personality}
                        </span>
                      )}
                    </div>
                    {section.avatar.description && (
                      <p className="text-xs text-slate-400 max-w-md">
                        {section.avatar.description}
                      </p>
                    )}
                  </div>
                )}
                {section.description && (
                  <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
                    {section.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onNavigatePrevious}
                className="flex items-center space-x-2 px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg border border-slate-600 transition-all duration-200 hover:shadow-md"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Önceki</span>
              </button>
              <button
                onClick={onNavigateNext}
                className="flex items-center space-x-2 px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg border border-slate-600 transition-all duration-200 hover:shadow-md"
              >
                <span>Sonraki</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden bg-slate-900">
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Agent Avatar and Persona Display */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-3xl font-bold relative overflow-hidden shadow-xl border-4 border-white/30 mb-4">
                {trainingAvatar?.image_url ? (
                  <img 
                    src={trainingAvatar.image_url} 
                    alt={trainingAvatar.name}
                    className="w-full h-full object-cover"
                    onLoad={() => console.log('✅ Avatar image loaded successfully:', trainingAvatar.image_url)}
                    onError={(e) => {
                      console.log('❌ Avatar image failed to load:', trainingAvatar.image_url);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = trainingAvatar?.name?.charAt(0).toUpperCase() || section.title.charAt(0).toUpperCase();
                      }
                    }}
                  />
                ) : (
                  trainingAvatar?.name?.charAt(0).toUpperCase() || section.title.charAt(0).toUpperCase()
                )}
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {trainingAvatar?.name || 'AI Agent'}
                </h3>
                {trainingAvatar?.personality && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 max-w-md shadow-lg border border-white/50 mb-3 max-h-32 overflow-y-auto">
                    <p className="text-sm text-gray-700 font-medium mb-2">Kişilik:</p>
                    <p className="text-gray-600 leading-relaxed">{trainingAvatar.personality}</p>
                  </div>
                )}
                {!trainingAvatar && (
                  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 max-w-md shadow-lg border border-white/30">
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Bu eğitim bölümü için AI agent ile sesli sohbet edebilirsiniz.
                    </p>
                  </div>
                )}
              </div>
            </div>

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
                  <p className="text-lg mb-2">AI Asistan bağlanıyor...</p>
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
                🎤 Agent ile sesli sohbet edin ve sorularınızı sorun.
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
};

// Memoize the component to prevent unnecessary re-renders
export const LLMAgentPlayer = React.memo(LLMAgentPlayerComponent);