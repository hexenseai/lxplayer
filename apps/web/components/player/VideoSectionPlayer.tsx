import React, { useEffect, useRef, useState, useMemo } from 'react';
import { VideoFrame } from './VideoFrame';
import { OverlayManager, OverlayComponent } from './Overlay';
import { type TrainingSection } from '@/lib/api';
import { Play, Pause, Volume2, VolumeX, Send, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type ActionPayload, type ActionResponse } from '@/lib/training-llm';
import { api } from '@/lib/api';

interface VideoSectionPlayerProps {
  section: TrainingSection;
  trainingTitle: string;
  trainingAvatar: any;
  overlays: any[];
  onNavigateNext: () => void;
  onNavigatePrevious: () => void;
  onTrackVideoPlay: () => void;
  onTrackVideoPause: () => void;
  onTrackVideoSeek: () => void;
  onTrackOverlayClick: (overlayId: string, overlayType: string, caption: string) => void;
  onTrackUserMessage: (message: string) => void;
  onTrackAssistantMessage: (message: string) => void;
  onLLMAction?: (actionPayload: ActionPayload) => Promise<ActionResponse>;
  // LLM Chat props
  sessionId?: string;
  accessCode?: string;
  userId?: string;
}

function buildVideoUrl(section: TrainingSection): string | undefined {
  if (!section || section.type === 'llm_interaction' || section.type === 'llm_agent') {
    return undefined;
  }

  const cdn = (process.env.NEXT_PUBLIC_CDN_URL || 'http://yodea.hexense.ai:9000/lxplayer').replace(/\/+$/, '');
  const fromObj = (value?: string) => value ? (value.startsWith('http') ? value : `${cdn}/${encodeURIComponent(value)}`) : undefined;

  const videoObject = section.video_object as string | undefined;
  if (videoObject) {
    return fromObj(videoObject);
  }

  const asset = section.asset as { kind?: string; uri?: string } | undefined;
  if (asset?.kind === 'video' && asset.uri) {
    return fromObj(asset.uri);
  }

  return undefined;
}

export function VideoSectionPlayer({
  section,
  trainingTitle,
  trainingAvatar,
  overlays,
  onNavigateNext,
  onNavigatePrevious,
  onTrackVideoPlay,
  onTrackVideoPause,
  onTrackVideoSeek,
  onTrackOverlayClick,
  onTrackUserMessage,
  onTrackAssistantMessage,
  onLLMAction,
  sessionId,
  accessCode,
  userId
}: VideoSectionPlayerProps) {
  const playerRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [currentFrame, setCurrentFrame] = useState<string>('wide');
  const [currentFrameConfig, setCurrentFrameConfig] = useState<any>(null);
  const [playerVolume, setPlayerVolume] = useState<number>(1);
  
  // Chat states
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Array<{ type: 'user'|'ai'|'system'; content: string; ts: number }>>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatSuggestions, setChatSuggestions] = useState<string[]>([]);
  const [overlaySuggestions, setOverlaySuggestions] = useState<Array<{ overlay_id?: string; caption?: string; time_seconds?: number }>>([]);
  
  
  // Overlay states
  const [overlayPaused, setOverlayPaused] = useState<boolean>(false);
  const [pausedByOverlayId, setPausedByOverlayId] = useState<string | null>(null);
  const [modalContentOverlay, setModalContentOverlay] = useState<any | null>(null);
  
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const suppressNextPauseRef = useRef<boolean>(false);
  const videoEndedRef = useRef<boolean>(false);
  const lastOverlayIdRef = useRef<string | null>(null);

  const videoUrl = useMemo(() => {
    const url = buildVideoUrl(section);
    console.log('🎥 Video URL built:', { section, videoUrl: url });
    return url;
  }, [section]);

  // WebSocket URL utility
  const toWsUrl = (apiBase: string) => {
    if (!apiBase) return (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.host + '/chat/ws';
    const url = new URL(apiBase);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = (url.pathname.replace(/\/+$/, '')) + '/chat/ws';
    return url.toString();
  };

  // Initialize WebSocket connection for video overlays and chat
  useEffect(() => {
    if (!videoUrl) return; // Only connect for video sections
    
    console.log('🎥 Video Section: Initializing WebSocket connection');
    
    const openSocket = () => {
      try {
        const wsUrl = toWsUrl(process.env.NEXT_PUBLIC_API_URL || '');
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onopen = () => {
          console.log('✅ Video Section WebSocket connected');
          ws.send(JSON.stringify({ 
            type: 'init', 
            context: { 
              sectionId: section.id,
              sectionType: 'video',
              trainingId: section.training_id 
            } 
          }));
          
          // Send training context as system message (LLM should not respond to this)
          setTimeout(() => {
            ws.send(JSON.stringify({ 
              type: 'system_message', 
              content: `# EĞİTİM BİLGİLERİ (Bu bilgilere cevap verme, sadece referans olarak kullan)
              
**Eğitim Başlığı:** ${trainingTitle}
**Bölüm:** ${section.title}
**Bölüm Açıklaması:** ${section.description || 'Açıklama yok'}
**Bölüm Türü:** Video Bölümü

Bu bölümde video oynatılıyor. Kullanıcı videoyu durdurduğunda veya overlay etkileşimlerinde chat açılır. Video bittiğinde kullanıcıya seçenek sun (tekrar et, devam et, sonraki bölüm).`
            }));
          }, 500);
        };
        
        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            
            if (data.type === 'assistant_message') {
              let assistantMessage = '';
              
              if (typeof data.content === 'object' && data.content) {
                assistantMessage = String(data.content.message || '');
              } else if (typeof data.content === 'string') {
                assistantMessage = data.content;
              }
              
              if (assistantMessage && assistantMessage.trim()) {
                setChatMessages(m => [...m, { type: 'ai', content: assistantMessage, ts: Date.now() }]);
                onTrackAssistantMessage(assistantMessage);
                
                // Check if this is a video ended message
                const isVideoEndedMessage = data.content?.is_video_ended === true || data.type === 'video_ended';
                
                if (isVideoEndedMessage) {
                  setChatOpen(true);
                  
                  if (data.content?.action === 'restart_video') {
                    setTimeout(() => {
                      if (playerRef.current) {
                        videoEndedRef.current = false;
                        playerRef.current.seekTo(0);
                        setIsPlaying(true);
                        setChatOpen(false);
                      }
                    }, 2000);
                  } else if (data.content?.action === 'navigate_next') {
                    onNavigateNext();
                  }
                }
              }
              
              // Handle suggestions
              if (data.suggestions && data.suggestions.length > 0) {
                const suggestionTexts = data.suggestions.map((s: any) => s.text || s).filter(Boolean);
                if (suggestionTexts.length > 0) {
                  setChatSuggestions(suggestionTexts);
                }
              }
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.error('❌ Video Section WebSocket error:', error);
        };
        
        ws.onclose = () => {
          console.log('🔌 Video Section WebSocket closed');
          wsRef.current = null;
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
      }
    };
    
    openSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [section.id, section.training_id, videoUrl]);

  // Auto-populate overlay suggestions
  useEffect(() => {
    const meaningfulOverlays = overlays.filter((ov: any) => 
      (ov.caption && ov.caption.trim()) || 
      (ov.content_asset && ov.content_asset.title)
    ).map((ov: any) => ({
      overlay_id: ov.id,
      caption: ov.caption || ov.content_asset?.title || 'İçerik',
      time_seconds: ov.time_stamp
    }));
    setOverlaySuggestions(meaningfulOverlays);
  }, [overlays]);

  // Auto-scroll chat to the latest message
  useEffect(() => {
    if (!chatOpen) return;
    try {
      const el = messagesScrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }, [chatMessages, chatOpen]);

  const sendUserMessage = async (text: string) => {
    const msg = (text || '').trim();
    if (!msg) return;
    
    // Add user message to chat
    setChatMessages(m => [...m, { type: 'user', content: msg, ts: Date.now() }]);
    onTrackUserMessage(msg);
    setChatInput('');
    
    // Check if this is a video ended response
    const isVideoEndedResponse = msg.toLowerCase().includes('devam et') || 
                                 msg.toLowerCase().includes('tekrar et') ||
                                 msg.toLowerCase().includes('sonraki');
    
    if (isVideoEndedResponse) {
      if (msg.toLowerCase().includes('tekrar et')) {
        if (playerRef.current) {
          videoEndedRef.current = false;
          playerRef.current.seekTo(0);
          setIsPlaying(true);
          setChatOpen(false);
        }
        return;
      } else if (msg.toLowerCase().includes('devam et') || msg.toLowerCase().includes('sonraki')) {
        // Use LLM API for navigation
        if (sessionId) {
          try {
            const response = await api.sendMessageToLLM(sessionId, msg, 'user');
            
            // Add LLM response to chat
            setChatMessages(m => [...m, { 
              type: 'ai', 
              content: response.message, 
              ts: Date.now() 
            }]);
            onTrackAssistantMessage(response.message);
            
            // Handle LLM actions
            if (response.actions && response.actions.length > 0) {
              for (const action of response.actions) {
                if (onLLMAction) {
                  await onLLMAction(action);
                }
              }
            }
          } catch (error) {
            console.error('❌ Failed to send message to LLM:', error);
          }
        }
        return;
      }
    }
    
    // Use LLM API for regular messages
    if (sessionId) {
      try {
        const response = await api.sendMessageToLLM(sessionId, msg, 'user');
        
        // Add LLM response to chat
        setChatMessages(m => [...m, { 
          type: 'ai', 
          content: response.message, 
          ts: Date.now() 
        }]);
        onTrackAssistantMessage(response.message);
        
        // Update suggestions
        setChatSuggestions(response.suggestions || []);
        
        // Handle LLM actions
        if (response.actions && response.actions.length > 0) {
          for (const action of response.actions) {
            if (onLLMAction) {
              await onLLMAction(action);
            }
          }
        }
      } catch (error) {
        console.error('❌ Failed to send message to LLM:', error);
        // Fallback to old WebSocket system if LLM fails
        try { wsRef.current?.send(JSON.stringify({ type: 'user_message', content: msg })); } catch {}
      }
    } else {
      // Fallback to old WebSocket system if no session
      try { wsRef.current?.send(JSON.stringify({ type: 'user_message', content: msg })); } catch {}
    }
  };

  const openChatWindow = () => {
    setChatOpen(true);
    if (isPlaying) {
      suppressNextPauseRef.current = true;
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = (t: number) => {
    setCurrentTime(t);
    
    // Video bitimine 0.5 saniye kala flag'i set et
    if (duration && t >= Math.max(0, duration - 0.5) && !videoEndedRef.current) {
      videoEndedRef.current = true;
    }
  };

  const handleDurationChange = (d: number) => {
    setDuration(d);
  };

  const handleSeek = (value: number) => {
    setCurrentTime(value);
    playerRef.current?.seekTo(value);
    onTrackVideoSeek();
  };

  if (!videoUrl) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-lg mb-2">Video bulunamadı</div>
          <div className="text-gray-400">Bu bölümde video içeriği mevcut değil</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl relative" style={{ aspectRatio: '16/9' }}>
        {/* Training Title Overlay - Show when chat is open */}
        {chatOpen && (
          <div className="absolute top-3 left-3 z-30 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
            <div className="text-sm font-semibold">{trainingTitle || 'Eğitim'}</div>
            <div className="text-xs text-gray-300">{section.title || ''}</div>
          </div>
        )}
        
        {/* Video Player */}
        <VideoFrame
          ref={playerRef}
          videoUrl={videoUrl}
          currentTime={currentTime}
          isPlaying={isPlaying}
          frame={currentFrame}
          frameConfig={currentFrameConfig}
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={handleDurationChange}
          onPlay={() => {
            if (videoEndedRef.current) {
              setIsPlaying(false);
              playerRef.current?.pauseVideo?.();
              return;
            }
            setIsPlaying(true);
            setChatOpen(false);
            onTrackVideoPlay();
          }}
          onPause={() => {
            if (videoEndedRef.current) return;
            setIsPlaying(false);
            onTrackVideoPause();
            if (suppressNextPauseRef.current) {
              suppressNextPauseRef.current = false;
              return;
            }
            try {
              wsRef.current?.send(JSON.stringify({
                type: 'user_message',
                content: `Kullanıcı videoyu durdurdu. Bölüm: ${section.title}. Zaman: ${Math.floor(currentTime)}s.`
              }));
            } catch {}
            openChatWindow();
          }}
          onEnded={() => {
            videoEndedRef.current = true;
            try {
              wsRef.current?.send(JSON.stringify({
                type: 'video_ended',
                content: `Video bitti. Bölüm: ${section.title}.`,
                section_id: section.id
              }));
            } catch {}
            openChatWindow();
          }}
        />

        {/* Overlays */}
        <div className="absolute inset-0 pointer-events-none">
          <OverlayManager
            overlays={overlays}
            currentTime={currentTime}
            isPaused={!isPlaying}
            pausedOverlayId={pausedByOverlayId}
            onAction={async (action, value) => {
              if (value && typeof value === 'string') {
                const overlay = overlays.find(ov => ov.id === value);
                if (overlay) {
                  onTrackOverlayClick(overlay.id, overlay.type, overlay.caption);
                }
              }
              
              if (action === 'frame_set' && value) {
                setCurrentFrame(value);
                if (value === 'custom') {
                  const frameOverlay = overlays.find(ov => 
                    ov.type === 'frame_set' && 
                    ov.frame === 'custom' && 
                    currentTime >= ov.time_stamp
                  );
                  
                  if (frameOverlay?.frame_config_id) {
                    // Load frame config if needed
                    console.log('Custom frame config needed:', frameOverlay.frame_config_id);
                  }
                } else {
                  setCurrentFrameConfig(null);
                }
              }
              
              if (action === 'pause_video' || action === 'pause_video_overlay') {
                suppressNextPauseRef.current = true;
                setIsPlaying(false);
                setOverlayPaused(true);
                if (value) setPausedByOverlayId(String(value));
              }
              
              if (action === 'resume_video' || action === 'resume_video_overlay') {
                if (value && pausedByOverlayId && String(value) !== pausedByOverlayId) return;
                if (!videoEndedRef.current) {
                  setOverlayPaused(false);
                  setPausedByOverlayId(null);
                  setModalContentOverlay(null);
                  setIsPlaying(true);
                }
                if (!videoEndedRef.current) {
                  setChatOpen(false);
                }
              }
              
              if (action === 'show_fullscreen_content' && value) {
                const ov = overlays.find(o => o.id === value);
                if (ov) {
                  const fullscreenOverlay: any = {
                    ...ov,
                    type: 'content',
                    position: ov.position && ov.position.startsWith('fullscreen') ? ov.position : 'fullscreen_dark'
                  };
                  setModalContentOverlay(fullscreenOverlay);
                }
              }
              
              if (action === 'overlay_visible' && value) {
                lastOverlayIdRef.current = String(value);
              }
              
              if (action === 'open_chat_with_message' && value) {
                setChatOpen(true);
                const { message, isLLMInteraction } = value;
                if (message) {
                  setChatMessages(m => [...m, { type: 'ai', content: message, ts: Date.now() }]);
                  
                  if (isLLMInteraction) {
                    setChatMessages(m => [...m, { 
                      type: 'system', 
                      content: 'LLM_INTERACTION_WAITING', 
                      ts: Date.now() 
                    }]);
                    
                    try { 
                      wsRef.current?.send(JSON.stringify({ 
                        type: 'system_message', 
                        content: 'OVERLAY_INTERACTION: This is an overlay-triggered LLM interaction. The user should respond to the question, and then the video should continue playing.',
                        ts: Date.now()
                      })); 
                    } catch {}
                  }
                }
              }
            }}
          />
        </div>

        {modalContentOverlay && (
          <div className="absolute inset-0 pointer-events-none">
            <OverlayComponent
              overlay={modalContentOverlay}
              isVisible={true}
              isInPositionContainer={true}
              isSticky={true}
            />
          </div>
        )}

        {/* Resume button */}
        {overlayPaused && (
          <button
            onClick={() => { setIsPlaying(true); setOverlayPaused(false); setPausedByOverlayId(null); setModalContentOverlay(null); }}
            className="absolute bottom-3 right-3 z-50 px-3 py-1.5 text-sm bg-white/90 text-black rounded shadow pointer-events-auto"
          >
            ▶ Devam Et
          </button>
        )}

        {/* Chat window */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-16 right-3 left-3 z-40 max-h-[70%] overflow-hidden bg-gray-900/95 border border-gray-700 rounded-lg shadow-lg pointer-events-auto flex flex-col min-h-0"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center overflow-hidden">
                    {trainingAvatar?.image_url ? (
                      <img 
                        src={trainingAvatar.image_url} 
                        alt={trainingAvatar.name || 'AI Asistan'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {trainingAvatar?.name ? (
                          <div className="text-xs font-bold text-white">
                            {trainingAvatar.name.charAt(0).toUpperCase()}
                          </div>
                        ) : (
                          <div className="text-sm">🤖</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-white text-sm font-medium">{trainingAvatar?.name || 'AI Asistan'}</div>
                </div>
                <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white text-sm">Kapat</button>
              </div>
              
              {/* Main Content - Two Column Layout */}
              <div className="flex flex-1 overflow-hidden min-h-0">
                {/* Left Column - Chat Messages */}
                <div className="flex-1 flex flex-col min-h-0 border-r border-gray-700">
                  <div ref={messagesScrollRef} className="flex-1 overflow-y-auto p-2 space-y-2">
                    {chatMessages.filter(m => m.type !== 'system').map((m, i) => (
                      <div key={i} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`${m.type === 'user' ? 'bg-purple-600' : 'bg-gray-700'} text-white text-sm px-3 py-2 rounded-lg max-w-[75%] whitespace-pre-wrap`}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-2 border-t border-gray-700 flex items-center gap-2 bg-gray-900/95">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendUserMessage(chatInput);
                        }
                      }}
                      placeholder="Mesaj yazın..."
                      className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-purple-500 outline-none text-sm"
                    />
                    <button
                      onClick={() => sendUserMessage(chatInput)}
                      className="px-2 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
                
                {/* Right Column - Suggestions */}
                <div className="w-80 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto p-2 space-y-3">
                    {/* Chat Suggestions */}
                    {chatSuggestions.length > 0 && (
                      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-600">
                        <div className="text-sm text-gray-300 mb-2 font-medium">💡 Öneriler</div>
                        <div className="space-y-2">
                          {chatSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                sendUserMessage(suggestion);
                                setChatSuggestions([]);
                              }}
                              className="w-full text-left px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded border border-gray-600 transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Overlay Suggestions */}
                    {overlaySuggestions.length > 0 && (
                      <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-600">
                        <div className="text-sm text-blue-300 mb-2 font-medium">🎬 Video İçeriği</div>
                        <div className="space-y-2">
                          {overlaySuggestions.map((overlay, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                if (overlay.time_seconds !== undefined) {
                                  setCurrentTime(overlay.time_seconds);
                                  playerRef.current?.seekTo(overlay.time_seconds);
                                }
                                setOverlaySuggestions([]);
                              }}
                              className="w-full text-left px-3 py-2 text-sm bg-blue-700 hover:bg-blue-600 text-white rounded border border-blue-600 transition-colors"
                            >
                              <div className="font-medium">{overlay.caption || 'Video İçeriği'}</div>
                              {overlay.time_seconds !== undefined && (
                                <div className="text-xs text-blue-200">{overlay.time_seconds}s</div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Empty State */}
                    {chatSuggestions.length === 0 && overlaySuggestions.length === 0 && (
                      <div className="text-center text-gray-500 text-sm py-8">
                        <div className="mb-2">💬</div>
                        <div>Öneriler ve video içeriği burada görünecek</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Video Controls */}
      <div className="w-full max-w-6xl flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-3">
        <button
          onClick={async () => {
            const newPlayingState = !isPlaying;
            setIsPlaying(newPlayingState);
            
            // LLM sistemine action gönder
            if (onLLMAction) {
              await onLLMAction({
                type: newPlayingState ? 'video_play' : 'video_pause',
                data: {
                  sectionId: section.id,
                  currentTime: currentTime,
                  isPlaying: newPlayingState
                },
                timestamp: Date.now()
              });
            }
            
            // Tracking
            if (newPlayingState) {
              onTrackVideoPlay();
            } else {
              onTrackVideoPause();
            }
          }}
          className="p-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
          title={isPlaying ? 'Durdur' : 'Oynat'}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        
        {/* Volume control */}
        <div className="flex items-center gap-2 text-white/80 text-xs">
          <span>{playerVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={playerVolume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setPlayerVolume(v);
              try { playerRef.current?.setVolume?.(v); } catch {}
            }}
          />
          <span className="w-10 text-right">{Math.round(playerVolume * 100)}%</span>
        </div>
        
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={(e) => handleSeek(parseFloat(e.target.value))}
          className="flex-1"
        />
        
        <div className="text-xs text-white/80 w-24 text-right">
          {Math.floor(currentTime)}s {duration ? `/ ${duration}s` : ''}
        </div>
      </div>

    </div>
  );

}

