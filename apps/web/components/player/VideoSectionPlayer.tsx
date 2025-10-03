import React, { useEffect, useRef, useState, useMemo } from 'react';
import { VideoFrame } from './VideoFrame';
import { OverlayManager, OverlayComponent } from './Overlay';
import { OverlayProgressBar } from './OverlayProgressBar';
// import { 
//   SectionContainer, 
//   SectionHeader, 
//   SectionContent, 
//   SectionControls 
// } from './SectionContainer';
import { type TrainingSection } from '@/lib/api';
import { Play, Pause, Volume2, VolumeX, Send, MessageCircle, ArrowLeft, ArrowRight } from 'lucide-react';
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
  // Progress props
  sectionProgress?: any;
  hasPreviousSection?: boolean;
  hasNextSection?: boolean;
}

function buildVideoUrl(section: TrainingSection): string | undefined {
  console.log('🔍 buildVideoUrl called for section:', section.title, 'type:', section.type);
  
  if (!section || section.type === 'llm_interaction' || section.type === 'llm_agent') {
    console.log('❌ Section is not a video type, returning undefined');
    return undefined;
  }

  const cdn = (process.env.NEXT_PUBLIC_CDN_URL || 'https://yodea.hexense.ai:9000/lxplayer').replace(/\/+$/, '');
  console.log('🌐 CDN URL:', cdn);
  
  const fromObj = (value?: string) => value ? (value.startsWith('http') ? value : `${cdn}/${encodeURIComponent(value)}`) : undefined;

  const videoObject = section.video_object as string | undefined;
  console.log('🎥 video_object:', videoObject);
  
  if (videoObject) {
    const url = fromObj(videoObject);
    console.log('✅ Built video URL from video_object:', url);
    return url;
  }

  const asset = (section as any).asset as { kind?: string; uri?: string } | undefined;
  console.log('📁 asset:', asset);
  
  if (asset?.kind === 'video' && asset.uri) {
    const url = fromObj(asset.uri);
    console.log('✅ Built video URL from asset:', url);
    return url;
  }

  console.log('❌ No video source found, returning undefined');
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
  userId,
  sectionProgress,
  hasPreviousSection = false,
  hasNextSection = true
}: VideoSectionPlayerProps) {
  const playerRef = useRef<any>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [currentFrame, setCurrentFrame] = useState<string>('wide');
  const [currentFrameConfig, setCurrentFrameConfig] = useState<any>(null);
  const [playerVolume, setPlayerVolume] = useState<number>(1);
  const [isVideoCompleted, setIsVideoCompleted] = useState(false);
  
  // Chat states - section-specific
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Array<{ type: 'user'|'ai'|'system'; content: string; ts: number; section_id?: string }>>([]);
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

  // Clear chat history and reset video state when section changes
  useEffect(() => {
    console.log('🔄 Section changed, clearing chat history and resetting video state for section:', section.id);
    setChatMessages([]);
    setChatSuggestions([]);
    setOverlaySuggestions([]);
    setChatInput('');
    
    // Reset video state for new section
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(undefined);
    setChatOpen(false);
    setOverlayPaused(false);
    setPausedByOverlayId(null);
    setModalContentOverlay(null);
    
    // Reset video ended flag - CRITICAL for fixing play issues
    videoEndedRef.current = false;
    suppressNextPauseRef.current = false;
    lastOverlayIdRef.current = null;
  }, [section.id]);

  // Load chat history for this video section
  const loadChatHistory = async () => {
    if (!sessionId) return;
    
    try {
      const history = await api.getSectionChatHistory(sessionId, section.id);
      setChatMessages(history);
      console.log('📚 Video section chat history loaded:', history.length, 'messages');
    } catch (error) {
      console.error('❌ Failed to load video section chat history:', error);
    }
  };

  // Initialize video section and load chat history
  useEffect(() => {
    if (!videoUrl || !sessionId) return;
    
    console.log('🎥 Video Section: Initializing REST API chat system');
    
    // Load chat history for this section
    loadChatHistory();
    
  }, [section.id, videoUrl, sessionId]);

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
    
    // Sadece video section'lar için LLM mesaj gönderimi
    if (section.type !== 'video') {
      console.log('❌ LLM mesaj gönderimi sadece video section\'lar için destekleniyor');
      setChatMessages(m => [...m, { 
        type: 'ai', 
        content: 'Bu bölüm tipi için mesaj gönderimi desteklenmiyor.', 
        ts: Date.now(), 
        section_id: section.id 
      }]);
      return;
    }
    
    // Add user message to chat with section_id
    setChatMessages(m => [...m, { type: 'user', content: msg, ts: Date.now(), section_id: section.id }]);
    onTrackUserMessage(msg);
    setChatInput('');
    
    // Check if this is a video ended response - but DON'T trigger navigation
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
        // REMOVED: Navigation actions from video section chat
        // Video sections should not automatically navigate to next section from chat
        // Just respond with LLM without processing navigation actions
        if (sessionId) {
          try {
            // Add video context to the message
        const messageWithContext = `${msg}

[Video Context: Currently at ${Math.floor(currentTime)}s of ${duration ? Math.floor(duration) : 'unknown'}s in "${section.title}" section]`;
        
        const response = await api.sendMessageToLLM(sessionId, messageWithContext, 'user');
            
            // Add LLM response to chat with section_id
            setChatMessages(m => [...m, { 
              type: 'ai', 
              content: response.message, 
              ts: Date.now(),
              section_id: section.id
            }]);
            onTrackAssistantMessage(response.message);
            
            // Save chat history after each message
            try {
              await api.saveSectionChatHistory(sessionId, section.id, [...chatMessages, 
                { type: 'user', content: msg, ts: Date.now(), section_id: section.id },
                { type: 'ai', content: response.message, ts: Date.now(), section_id: section.id }
              ]);
            } catch (saveError) {
              console.error('❌ Failed to save chat history:', saveError);
            }
            
            // REMOVED: LLM action processing to prevent unwanted navigation
            // if (response.actions && response.actions.length > 0) {
            //   for (const action of response.actions) {
            //     if (onLLMAction) {
            //       await onLLMAction(action);
            //     }
            //   }
            // }
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
        // Check if this is a response to an LLM interaction overlay
        const lastMessage = chatMessages[chatMessages.length - 1];
        const isResponseToOverlay = lastMessage && lastMessage.type === 'ai' && 
          chatMessages.filter(m => m.type === 'ai').length === 1;
        
        let messageToSend = msg;
        
        if (isResponseToOverlay) {
          // This is a response to an overlay question, add context
          messageToSend = `[OVERLAY_RESPONSE] Kullanıcı overlay sorusuna cevap verdi: "${msg}"`;
          console.log('🤖 User responding to overlay question:', msg);
        } else {
          // Regular video section message
          messageToSend = `${msg}

[Video Context: Currently at ${Math.floor(currentTime)}s of ${duration ? Math.floor(duration) : 'unknown'}s in "${section.title}" section]`;
        }
        
        const response = await api.sendMessageToLLM(sessionId, messageToSend, 'user');
        
        // Add LLM response to chat with section_id
        setChatMessages(m => [...m, { 
          type: 'ai', 
          content: response.message, 
          ts: Date.now(),
          section_id: section.id
        }]);
        onTrackAssistantMessage(response.message);
        
        // Update suggestions
        setChatSuggestions(response.suggestions || []);
        
        // Save chat history after each message
        try {
          await api.saveSectionChatHistory(sessionId, section.id, [...chatMessages, 
            { type: 'user', content: msg, ts: Date.now(), section_id: section.id },
            { type: 'ai', content: response.message, ts: Date.now(), section_id: section.id }
          ]);
        } catch (saveError) {
          console.error('❌ Failed to save chat history:', saveError);
        }
        
        // REMOVED: LLM action processing to prevent unwanted navigation from video section chats
        // Video sections should not process navigation actions from chat interactions
        // if (response.actions && response.actions.length > 0) {
        //   for (const action of response.actions) {
        //     if (onLLMAction) {
        //       await onLLMAction(action);
        //     }
        //   }
        // }
      } catch (error) {
        console.error('❌ Failed to send message to LLM:', error);
        // Show error message to user
        setChatMessages(m => [...m, { 
          type: 'ai', 
          content: 'Üzgünüm, şu anda mesajınızı işleyemiyorum. Lütfen tekrar deneyin.', 
          ts: Date.now(), 
          section_id: section.id 
        }]);
      }
    } else {
      // No session available
      setChatMessages(m => [...m, { 
        type: 'ai', 
        content: 'Chat sistemi şu anda kullanılamıyor.', 
        ts: Date.now(), 
        section_id: section.id 
      }]);
    }
  };

  const openChatWindow = async () => {
    setChatOpen(true);
    if (isPlaying) {
      suppressNextPauseRef.current = true;
      setIsPlaying(false);
    }
    
    // Video section'lar için chat aç ama otomatik mesaj gönderme
    if (section.type === 'video') {
      // Video durdurulduğunda chat açılır ama otomatik mesaj gönderilmez
      // Kullanıcı isterse soru sorabilir
      console.log('🎥 Video durduruldu, chat açıldı - kullanıcı isterse soru sorabilir');
    } else if (section.type !== 'video') {
      // Video olmayan section'lar için basit mesaj
      setChatMessages(m => [...m, { 
        type: 'ai', 
        content: 'Bu bölüm için chat özelliği mevcut değil.', 
        ts: Date.now(), 
        section_id: section.id 
      }]);
    }
  };

  const lastSeekTimeRef = useRef<number>(0);
  
  const handleTimeUpdate = (t: number) => {
    const prevTime = currentTime;
    setCurrentTime(t);
    
    // Track video seek events (jumps in time)
    const timeDiff = Math.abs(t - prevTime);
    if (timeDiff > 2 && prevTime > 0) { // More than 2 seconds jump
      console.log(`⏩ Video seek detected: ${prevTime.toFixed(1)}s → ${t.toFixed(1)}s (jump: ${timeDiff.toFixed(1)}s)`);
      
      // Log seek event to backend
      if (sessionId) {
        // You can add a specific API call for seek tracking here if needed
        console.log(`📊 Seek event logged for section: ${section.title}`);
      }
    }
    
    // Video bitimine 0.5 saniye kala flag'i set et
    if (duration && t >= Math.max(0, duration - 0.5) && !videoEndedRef.current) {
      videoEndedRef.current = true;
      setIsVideoCompleted(true);
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
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col">
       <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-4">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
             <span className="text-2xl">🎥</span>
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
               disabled={!hasPreviousSection}
               className={`flex items-center space-x-1 px-3 py-1.5 text-sm rounded border transition-colors ${
                 hasPreviousSection
                   ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600'
                   : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
               }`}
             >
               <ArrowLeft className="w-3 h-3" />
               <span>Önceki</span>
             </button>
             <button
               onClick={onNavigateNext}
               disabled={!hasNextSection || (!isVideoCompleted && sectionProgress?.status !== 'completed')}
               className={`flex items-center space-x-1 px-3 py-1.5 text-sm rounded border transition-colors ${
                 hasNextSection && (isVideoCompleted || sectionProgress?.status === 'completed')
                   ? 'bg-green-600 hover:bg-green-700 text-white border-green-500'
                   : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
               }`}
             >
               <span>Sonraki</span>
               <ArrowRight className="w-3 h-3" />
             </button>
           </div>
         </div>
       </div>
      
      <div className="flex-1 overflow-hidden bg-slate-900">
        <div className="w-full h-full flex items-center justify-center p-4">
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
              // Video bittiğinde oynatmaya çalışırsa, videoyu başa al ve oynat
              videoEndedRef.current = false;
              setIsVideoCompleted(false);
              playerRef.current?.seekTo?.(0);
              setCurrentTime(0);
              setIsPlaying(true);
              setChatOpen(false);
              onTrackVideoPlay();
              return;
            }
            setIsPlaying(true);
            // Chat'i otomatik kapatma - kullanıcı manuel olarak kapatabilir
            // setChatOpen(false);
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
            // Log video pause event
            console.log(`🎥 Video paused at ${Math.floor(currentTime)}s in section: ${section.title}`);
            openChatWindow();
          }}
          onEnded={() => {
            videoEndedRef.current = true;
            setIsVideoCompleted(true);
            
            // Log video completion and mark section as completed
            console.log(`🎉 Video completed for section: ${section.title}`);
            
            // Mark section as completed in database
            if (sessionId) {
              api.updateSectionProgress(sessionId, section.id, {
                status: 'completed',
                completed_at: new Date().toISOString()
              }).catch(error => {
                console.error('❌ Failed to update section progress:', error);
              });
            }
            
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
                // Chat'i otomatik kapatma - kullanıcı manuel olarak kapatabilir
                // if (!videoEndedRef.current) {
                //   setChatOpen(false);
                // }
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
                  if (isLLMInteraction) {
                    // LLM interaction overlay: Overlay mesajını LLM'nin sorusu olarak göster
                    console.log(`🎯 LLM interaction overlay triggered: ${message} at ${currentTime}s`);
                    
                    // Overlay mesajını LLM'nin sorusu olarak ekle
                    setChatMessages(m => [...m, { 
                      type: 'ai', 
                      content: message, 
                      ts: Date.now(), 
                      section_id: section.id 
                    }]);
                    
                    // Kullanıcının cevap vermesini bekle, otomatik mesaj gönderme
                    console.log('🤖 Waiting for user response to overlay question...');
                  } else {
                    // Normal overlay mesajı
                    setChatMessages(m => [...m, { type: 'ai', content: message, ts: Date.now() }]);
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
        </div>
      </div>

      <div className="bg-slate-800 border-t border-slate-700 p-4">
        {/* Video Controls */}
        <div className="w-full max-w-6xl mx-auto flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-3">
          <button
            onClick={async () => {
              // Video bittiğinde play tuşuna basılırsa videoyu başa al
              if (videoEndedRef.current && !isPlaying) {
                videoEndedRef.current = false;
                playerRef.current?.seekTo?.(0);
                setCurrentTime(0);
                setIsPlaying(true);
                setChatOpen(false);
                onTrackVideoPlay();
                return;
              }
              
              const newPlayingState = !isPlaying;
              setIsPlaying(newPlayingState);
              
              // REMOVED: LLM action sending to prevent unwanted navigation triggers
              // Video controls should not send actions to LLM system that could cause navigation
              // if (onLLMAction) {
              //   await onLLMAction({
              //     type: newPlayingState ? 'video_play' : 'video_pause',
              //     data: {
              //       sectionId: section.id,
              //       currentTime: currentTime,
              //       isPlaying: newPlayingState
              //     },
              //     timestamp: Date.now()
              //   });
              // }
              
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
          
          <OverlayProgressBar
            currentTime={currentTime}
            duration={duration || 0}
            overlays={overlays}
            onSeek={handleSeek}
            className="flex-1"
          />
          
          <div className="text-xs text-white/80 w-24 text-right">
            {Math.floor(currentTime)}s {duration ? `/ ${duration}s` : ''}
          </div>
        </div>
      </div>
    </div>
    );

}

