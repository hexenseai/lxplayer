"use client";
import React, { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { VideoFrame } from './player/VideoFrame';
import { OverlayManager, OverlayComponent } from './player/Overlay';
import { api, type TrainingSection, type Overlay as OverlayT, type CompanyTraining } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Volume2, VolumeX, Send, Play, Pause } from 'lucide-react';

interface InteractivePlayerProps {
  accessCode: string;
  userId?: string;
}

function buildVideoUrl(sectionNode: any | null): string | undefined {
  if (!sectionNode) return undefined;
  const cdn = process.env.NEXT_PUBLIC_CDN_URL || 'http://localhost:9000/lxplayer';
  // Support unified training_json: node.data.section
  const sectionData = sectionNode?.data?.section ?? sectionNode;
  const videoObject = sectionData?.video_object as string | undefined;
  if (videoObject && videoObject.length > 0) {
    if (videoObject.startsWith('http')) return videoObject;
    return `${cdn}/${encodeURIComponent(videoObject)}`;
  }
  const asset = sectionData?.asset as any;
  if (asset && asset.kind === 'video') {
    if (asset.uri.startsWith('http')) return asset.uri;
    return `${cdn}/${encodeURIComponent(asset.uri)}`;
  }
  return undefined;
}

export const InteractivePlayer = forwardRef<any, InteractivePlayerProps>(({ accessCode, userId }, ref) => {
  const playerRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectTimerRef = useRef<any>(null);
  const wsDidOpenRef = useRef(false);
  const wsUnmountedRef = useRef(false);
  const wsHelloSentRef = useRef(false);

  const [companyTraining, setCompanyTraining] = useState<CompanyTraining | null>(null);
  const [trainingTitle, setTrainingTitle] = useState<string>('');
  const [sections, setSections] = useState<any[]>([]);
  const [currentSection, setCurrentSection] = useState<any | null>(null);
  const [overlays, setOverlays] = useState<any[]>([]);
  const [trainingJson, setTrainingJson] = useState<any | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [currentFrame, setCurrentFrame] = useState<string>('wide');
  const [currentFrameConfig, setCurrentFrameConfig] = useState<any>(null);
  const [overlayPaused, setOverlayPaused] = useState<boolean>(false);
  const [pausedByOverlayId, setPausedByOverlayId] = useState<string | null>(null);
  const [modalContentOverlay, setModalContentOverlay] = useState<any | null>(null);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Array<{ type: 'user'|'ai'; content: string; ts: number }>>([]);
  const lastOverlayIdRef = useRef<string | null>(null);
  const [chatInput, setChatInput] = useState<string>('');
  const [liveMode, setLiveMode] = useState<boolean>(false);
  const [playerVolume, setPlayerVolume] = useState<number>(1);
  const isPlayingRef = useRef<boolean>(false);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const suppressNextPauseRef = useRef<boolean>(false);
  const [chatSuggestions, setChatSuggestions] = useState<string[]>([]);
  const [overlaySuggestions, setOverlaySuggestions] = useState<Array<{ overlay_id?: string; caption?: string; time_seconds?: number }>>([]);
  const openChatWindow = () => {
    setChatOpen(true);
    if (isPlayingRef.current) {
      suppressNextPauseRef.current = true;
      setIsPlaying(false);
    }
  };
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const sendUserMessage = (text: string) => {
    const msg = (text || '').trim();
    if (!msg) return;
    try { wsRef.current?.send(JSON.stringify({ type: 'user_message', content: msg })); } catch {}
    setChatMessages(m => [...m, { type: 'user', content: msg, ts: Date.now() }]);
    openChatWindow();
    setChatInput('');
  };

  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => playerRef.current?.seekTo(time),
    setFrame: (frame: string) => setCurrentFrame(frame)
  }));

  // Load training data based on access code
  useEffect(() => {
    const loadTrainingByAccessCode = async () => {
      if (!accessCode) return;
      
      try {
        // Access code ile CompanyTraining'i bul
        const companyTrainings = await api.listCompanyTrainings();
        const training = companyTrainings.find(ct => ct.access_code === accessCode);
        
        if (!training) {
          console.error('Training not found for access code:', accessCode);
          return;
        }
        
        setCompanyTraining(training);
        
        // Eğitim verilerini yükle
        const trainingData = await api.getTraining(training.training_id);
        setTrainingTitle(trainingData.title);
        
        // Eğitim bölümlerini yükle
        const sections = await api.listTrainingSections(training.training_id);
        const sectionNodes = sections.map((section, index) => ({
          id: section.id,
          title: section.title,
          data: {
            section: {
              ...section,
              order_index: index,
              overlays: []
            }
          }
        }));
        
        setSections(sectionNodes);
        
        // İlk bölümü seç
        if (sectionNodes.length > 0) {
          const firstSection = sectionNodes[0];
          setCurrentSection(firstSection);
          
          // İlk bölümün overlay'lerini yükle
          try {
            const overlays = await api.listSectionOverlays(training.training_id, firstSection.id);
            setOverlays(overlays);
          } catch (error) {
            console.error('Error loading overlays:', error);
          }
        }
        
      } catch (error) {
        console.error('Error loading training by access code:', error);
      }
    };
    
    loadTrainingByAccessCode();
  }, [accessCode]);

  // Open chat websocket connection
  useEffect(() => {
    const openSocket = () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
        const wsUrl = apiBase.replace(/^http/i, 'ws') + '/chat/ws';
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        wsDidOpenRef.current = false;
        ws.onopen = () => {
          wsDidOpenRef.current = true;
          if (wsUnmountedRef.current) return;
          // optional init context
          const ctx = { accessCode, userId };
          ws.send(JSON.stringify({ type: 'init', context: ctx }));
          // Optionally send an initial hello shortly after opening (fallback if no ack)
          setTimeout(() => {
            try {
              if (!wsHelloSentRef.current && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'user_message', content: 'Merhaba!' }));
                wsHelloSentRef.current = true;
                openChatWindow();
              }
            } catch {}
          }, 200);
        };
        ws.onmessage = (ev) => {
          if (wsUnmountedRef.current) return;
          try {
            const data = JSON.parse(ev.data);
            if ((data.type === 'session_started' || data.type === 'initialized') && !wsHelloSentRef.current) {
              try {
                ws.send(JSON.stringify({ type: 'user_message', content: 'Merhaba!' }));
                wsHelloSentRef.current = true;
                openChatWindow();
              } catch {}
            }
            if (data.type === 'assistant_message') {
              console.log('[chat] assistant:', data.content);
              openChatWindow();
              let assistantMessage = '';
              if (typeof data.content === 'object' && data.content) {
                assistantMessage = String(data.content.message || '');
              } else if (typeof data.content === 'string') {
                try {
                  const parsed = JSON.parse(data.content);
                  assistantMessage = String(parsed?.message || data.content);
                } catch {
                  assistantMessage = data.content;
                }
              }
              setChatMessages(m => [...m, { type: 'ai', content: assistantMessage, ts: Date.now() }]);
              // Consume structured actions from JSON to drive player
              try {
                const contentObj = typeof data.content === 'object' && data.content ? data.content : null;
                if (contentObj && Array.isArray(contentObj.actions)) {
                  for (const act of contentObj.actions) {
                    if (!act || typeof act !== 'object') continue;
                    if (act.type === 'jump_to_time' && typeof act.time_seconds === 'number') {
                      handleSeek(act.time_seconds);
                    } else if (act.type === 'play_video') {
                      setIsPlaying(true);
                    } else if (act.type === 'pause_video') {
                      setIsPlaying(false);
                    } else if (act.type === 'play_section' && typeof act.section_id === 'string') {
                      const targetSection = sections.find(s => (s.data?.sectionId || s.id) === act.section_id);
                      if (targetSection) {
                        setCurrentSection(targetSection);
                        if (typeof act.time_seconds === 'number') {
                          setTimeout(() => handleSeek(act.time_seconds), 50);
                        }
                        setIsPlaying(true);
                      }
                    }
                  }
                }
                // update suggestions panels
                setChatSuggestions(Array.isArray(contentObj?.suggestions) ? contentObj!.suggestions : []);
                // Keep overlay suggestions from current section, don't override with LLM suggestions
              } catch {}
              // Optional TTS when live mode is on
              try {
                if (liveMode) {
                  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
                  fetch(`${apiBase}/chat/tts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: assistantMessage })
                  }).then(r => r.ok ? r.json() : null).then(j => {
                    if (j && j.audio) {
                      const audio = new Audio(`data:audio/mp3;base64,${j.audio}`);
                      audio.play().catch(() => {});
                    }
                  }).catch(() => {});
                }
              } catch {}
            }
          } catch {}
        };
        ws.onerror = () => {
          // no-op; reconnect handled on close
        };
        ws.onclose = () => {
          wsRef.current = null;
          if (!wsUnmountedRef.current) {
            // reconnect with small backoff
            clearTimeout(wsReconnectTimerRef.current);
            wsReconnectTimerRef.current = setTimeout(openSocket, wsDidOpenRef.current ? 1500 : 400);
          }
        };
      } catch {}
    };
    wsUnmountedRef.current = false;
    openSocket();
    
    return () => {
      // Close chat websocket on unmount; cancel reconnects
      wsUnmountedRef.current = true;
      wsHelloSentRef.current = false;
      try {
        clearTimeout(wsReconnectTimerRef.current);
      } catch {}
      try {
        const ws = wsRef.current;
        wsRef.current = null;
        if (ws) {
          // Detach handlers to avoid side-effects
          ws.onopen = null as any;
          ws.onmessage = null as any;
          ws.onerror = null as any;
          ws.onclose = null as any;
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          } else if (ws.readyState === WebSocket.CONNECTING) {
            // In dev StrictMode, avoid closing while CONNECTING to prevent warning; close right after open
            ws.onopen = () => ws.close();
          }
        }
      } catch {}
    };
  }, [accessCode, userId]);

  // Sync initial volume to player once ref is ready
  useEffect(() => {
    try { playerRef.current?.setVolume?.(playerVolume); } catch {}
  }, [playerRef]);

  // When section changes, update overlays from training_json
  useEffect(() => {
    if (!currentSection || !companyTraining) return;
    
    const loadSectionOverlays = async () => {
      try {
        // Yeni bölümün overlay'lerini yükle
        const overlays = await api.listSectionOverlays(companyTraining.training_id, currentSection.id);
        setOverlays(overlays);
        
        // Auto-populate overlay suggestions from current section overlays
        const meaningfulOverlays = overlays.filter((ov: any) => 
          (ov.caption && ov.caption.trim()) || 
          (ov.content_asset && ov.content_asset.title)
        ).map((ov: any) => ({
          overlay_id: ov.id,
          caption: ov.caption || ov.content_asset?.title || 'İçerik',
          time_seconds: ov.time_stamp
        }));
        setOverlaySuggestions(meaningfulOverlays);
      } catch (e) {
        console.error('Overlay update error:', e);
      }
    };
    
    loadSectionOverlays();
    setCurrentTime(0);
    setCurrentFrame('wide');
    setOverlayPaused(false);
    setPausedByOverlayId(null);
    setModalContentOverlay(null);
  }, [currentSection, companyTraining]);

  const videoUrl = useMemo(() => buildVideoUrl(currentSection), [currentSection]);

  const handleTimeUpdate = (t: number) => {
    setCurrentTime(t);
  };

  const handleSeek = (value: number) => {
    setCurrentTime(value);
    playerRef.current?.seekTo(value);
  };

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Auto-scroll chat to the latest message when messages change or window opens
  useEffect(() => {
    if (!chatOpen) return;
    try {
      const el = messagesScrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }, [chatMessages, chatOpen]);

  if (!currentSection) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <div className="text-white text-lg">Oynatıcı yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto space-y-3">
        <div className="flex items-center justify-between text-white">
          <div>
            <div className="text-lg font-semibold">{trainingTitle || 'Eğitim'}</div>
            <div className="text-xs text-gray-300">Bölüm {sections.findIndex(s => s.id === currentSection.id) + 1}/{sections.length} · {currentSection.title}</div>
          </div>
          <div className="flex items-center gap-2">
            {sections.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const idx = sections.findIndex(s => s.id === currentSection.id);
                    if (idx > 0) {
                      const newSection = sections[idx - 1];
                      setCurrentSection(newSection);
                      
                      // Yeni bölümün overlay'lerini yükle
                      if (companyTraining) {
                        try {
                          const overlays = await api.listSectionOverlays(companyTraining.training_id, newSection.id);
                          setOverlays(overlays);
                        } catch (error) {
                          console.error('Error loading overlays for previous section:', error);
                        }
                      }
                    }
                  }}
                  className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded"
                >Önceki</button>
                <button
                  onClick={async () => {
                    const idx = sections.findIndex(s => s.id === currentSection.id);
                    if (idx < sections.length - 1) {
                      const newSection = sections[idx + 1];
                      setCurrentSection(newSection);
                      
                      // Yeni bölümün overlay'lerini yükle
                      if (companyTraining) {
                        try {
                          const overlays = await api.listSectionOverlays(companyTraining.training_id, newSection.id);
                          setOverlays(overlays);
                        } catch (error) {
                          console.error('Error loading overlays for next section:', error);
                        }
                      }
                    }
                  }}
                  className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded"
                >Sonraki</button>
              </div>
            )}
          </div>
        </div>

        <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
          <VideoFrame
            ref={playerRef}
            videoUrl={videoUrl}
            currentTime={currentTime}
            isPlaying={isPlaying}
            frame={currentFrame}
            frameConfig={currentFrameConfig}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => {
              setIsPlaying(true);
              // Chat penceresini video oynarken gizle
              setChatOpen(false);
            }}
            onPause={() => {
              setIsPlaying(false);
              // LLM kaynaklı açılan sohbetin tetiklediği otomatik pause'u bastır
              if (suppressNextPauseRef.current) {
                suppressNextPauseRef.current = false;
                return;
              }
              // Kullanıcı tarafından durdurulduğunda LLM'e bağlamlı mesaj gönder
              const sectionTitle = currentSection?.title || '';
              const ovId = lastOverlayIdRef.current;
              const payload = {
                type: 'user_message',
                content: `Kullanıcı videoyu durdurdu. Bölüm: ${sectionTitle}. Zaman: ${Math.floor(currentTime)}s. Son overlay: ${ovId || 'yok'}.`,
              };
              try { wsRef.current?.send(JSON.stringify(payload)); } catch {}
              // Otomatik mesajları akışta göstermiyoruz
              openChatWindow();
            }}
            onEnded={() => {
              setIsPlaying(false);
              // Video bittiğinde LLM'e bilgi gönder
              const sectionTitle = currentSection?.title || '';
              const payload = {
                type: 'user_message',
                content: `Kullanıcı bölümü tamamladı. Bölüm: ${sectionTitle}.`,
              };
              try { wsRef.current?.send(JSON.stringify(payload)); } catch {}
              // Otomatik mesajları akışta göstermiyoruz
              openChatWindow();
            }}
          />

          {/* Overlays */}
          <div className="absolute inset-0 pointer-events-none">
            <OverlayManager
              overlays={overlays as any}
              currentTime={currentTime}
              isPaused={!isPlaying}
              pausedOverlayId={pausedByOverlayId}
              onAction={async (action, value) => {
                if (action === 'frame_set' && value) {
                  setCurrentFrame(value);
                  
                  // If it's a custom frame, load the frame configuration
                  if (value === 'custom') {
                    // Find the overlay that triggered this frame change
                    const frameOverlay = overlays.find(ov => 
                      ov.type === 'frame_set' && 
                      ov.frame === 'custom' && 
                      currentTime >= ov.time_stamp
                    );
                    
                    if (frameOverlay?.frame_config_id) {
                      try {
                        const frameConfig = await api.getFrameConfig(frameOverlay.frame_config_id);
                        setCurrentFrameConfig(frameConfig);
                      } catch (error) {
                        console.error('Error loading frame config:', error);
                        setCurrentFrameConfig(null);
                      }
                    }
                  } else {
                    setCurrentFrameConfig(null);
                  }
                }
                if (action === 'pause_video' || action === 'pause_video_overlay') {
                  // Overlay kaynaklı duraklatma: onPause içinde LLM'e mesaj göndermeyi bastır
                  suppressNextPauseRef.current = true;
                  setIsPlaying(false);
                  setOverlayPaused(true);
                  if (value) setPausedByOverlayId(String(value));
                }
                if (action === 'resume_video' || action === 'resume_video_overlay') {
                  if (value && pausedByOverlayId && String(value) !== pausedByOverlayId) return;
                  setOverlayPaused(false);
                  setPausedByOverlayId(null);
                  setModalContentOverlay(null);
                  setIsPlaying(true);
                  // Video tekrar oynarken chat penceresini gizle
                  setChatOpen(false);
                }
                if (action === 'show_fullscreen_content' && value) {
                  const ov = overlays.find(o => o.id === value);
                  if (ov) {
                    const fullscreenOverlay: any = {
                      ...(ov as any),
                      type: 'content',
                      position: (ov as any).position && (ov as any).position.startsWith('fullscreen') ? (ov as any).position : 'fullscreen_dark'
                    };
                    setModalContentOverlay(fullscreenOverlay);
                  }
                }
                if (action === 'overlay_visible' && value) {
                  lastOverlayIdRef.current = String(value);
                }
              }}
            />
          </div>

          {modalContentOverlay && (
            <div className="absolute inset-0 pointer-events-none">
              <OverlayComponent
                overlay={modalContentOverlay as any}
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
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="text-white text-sm font-medium">Sohbet</div>
                    <div className={`flex items-center gap-1 ${liveMode ? 'text-emerald-400' : 'text-gray-500'}`}>
                      <span className={`w-2 h-2 rounded-full ${liveMode ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`}></span>
                      <span className="text-[11px]">{liveMode ? 'Canlı' : 'Pasif'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const next = !liveMode;
                        setLiveMode(next);
                        if (next) {
                          // Start mic capture
                          try {
                            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                            const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                            mediaRecorderRef.current = rec;
                            audioChunksRef.current = [];
                            rec.ondataavailable = (e) => {
                              if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
                            };
                            rec.onstop = async () => {
                              try {
                                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                                audioChunksRef.current = [];
                                // Send to STT
                                const form = new FormData();
                                form.append('audio_file', blob, 'audio.webm');
                                const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
                                const resp = await fetch(`${apiBase}/chat/stt`, { method: 'POST', body: form });
                                if (resp.ok) {
                                  const data = await resp.json();
                                  const text = (data && data.text) || '';
                                  if (text) {
                                    // Send transcript to LLM
                                    try { wsRef.current?.send(JSON.stringify({ type: 'user_message', content: text })); } catch {}
                                    setChatMessages(m => [...m, { type: 'user', content: text, ts: Date.now() }]);
                                    openChatWindow();
                                  }
                                }
                              } catch {}
                            };
                            rec.start(2000); // gather chunks every 2s
                            openChatWindow();
                          } catch (err) {
                            console.error('Mic error', err);
                            setLiveMode(false);
                          }
                        } else {
                          try {
                            const rec = mediaRecorderRef.current;
                            if (rec && rec.state !== 'inactive') rec.stop();
                            mediaRecorderRef.current = null;
                          } catch {}
                        }
                      }}
                      className={`px-2 py-1.5 rounded text-sm flex items-center gap-1 ${liveMode ? 'bg-emerald-600 text-white' : 'bg-gray-700/40 text-gray-300 hover:text-white'}`}
                      title={liveMode ? 'Canlı mod açık' : 'Canlı mod kapalı'}
                    >
                      <Radio size={16} />
                      <span>{liveMode ? 'Canlı' : 'Kapalı'}</span>
                    </button>
                    <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white text-sm">Kapat</button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden grid grid-cols-3 gap-0 min-h-0">
                  <div className="col-span-2 flex flex-col min-h-0">
                    <div ref={messagesScrollRef} className="flex-1 overflow-y-auto p-2 space-y-2">
                      {chatMessages.map((m, i) => (
                        <div key={i} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`${m.type === 'user' ? 'bg-purple-600' : 'bg-gray-700'} text-white text-sm px-3 py-2 rounded-lg max-w-[75%] whitespace-pre-wrap`}>{m.content}</div>
                        </div>
                      ))}
                    </div>
                    <div className="p-2 border-t border-gray-700 flex items-center gap-2 sticky bottom-0 bg-gray-900/95">
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
                        title="Gönder"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                                     <div className="col-span-1 border-l border-gray-700 p-2 text-sm text-gray-300 flex flex-col gap-3 overflow-y-auto">
                     <div>
                       <div className="font-medium text-white mb-2">Hazır Mesajlar</div>
                       <div className="flex flex-col gap-1">
                         {chatSuggestions.length === 0 && (
                           <div className="text-gray-500">Öneri yok</div>
                         )}
                         {chatSuggestions.map((s, i) => (
                           <button
                             key={i}
                             onClick={() => sendUserMessage(s)}
                             className="text-left px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-white/90"
                           >
                             {s}
                           </button>
                         ))}
                       </div>
                     </div>
                     <div>
                       <div className="font-medium text-white mb-2">Önerilen Atlama Noktaları</div>
                       <div className="flex flex-col gap-1">
                         {(overlaySuggestions?.length ?? 0) === 0 && (
                           <div className="text-gray-500">Öneri yok</div>
                         )}
                         {overlaySuggestions.map((ov, i) => (
                           <button
                             key={i}
                             onClick={() => {
                               if (typeof ov.time_seconds === 'number') {
                                 handleSeek(ov.time_seconds);
                                 setIsPlaying(true);
                               }
                             }}
                             className="text-left px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-white/90"
                           >
                             {ov.caption || 'Zamana atla'}{typeof ov.time_seconds === 'number' ? ` · ${Math.floor(ov.time_seconds)}s` : ''}
                           </button>
                         ))}
                       </div>
                     </div>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-3">
          <button
            onClick={() => setIsPlaying(p => !p)}
            className="p-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
            title={isPlaying ? 'Durdur' : 'Oynat'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          {/* Ses kontrolü */}
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
            max={duration ?? Math.max(30, Math.ceil(currentTime) + 1)}
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
    </div>
  );
});
