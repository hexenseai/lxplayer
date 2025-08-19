"use client";
import React, { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { VideoFrame } from './player/VideoFrame';
import { OverlayManager, OverlayComponent } from './player/Overlay';
import { api, type TrainingSection, type Overlay as OverlayT, type CompanyTraining } from '@/lib/api';

interface InteractivePlayerProps {
  accessCode: string;
}

function buildVideoUrl(section: TrainingSection | null): string | undefined {
  if (!section) return undefined;
  const cdn = process.env.NEXT_PUBLIC_CDN_URL || 'http://localhost:9000/lxplayer';
  const videoObject = (section as any).video_object as string | undefined;
  if (videoObject && videoObject.length > 0) {
    if (videoObject.startsWith('http')) return videoObject;
    return `${cdn}/${encodeURIComponent(videoObject)}`;
  }
  const asset = section.asset as TrainingSection['asset'];
  if (asset && asset.kind === 'video') {
    if (asset.uri.startsWith('http')) return asset.uri;
    return `${cdn}/${encodeURIComponent(asset.uri)}`;
  }
  return undefined;
}

export const InteractivePlayer = forwardRef<any, InteractivePlayerProps>(({ accessCode }, ref) => {
  const playerRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectTimerRef = useRef<any>(null);
  const wsDidOpenRef = useRef(false);
  const wsUnmountedRef = useRef(false);

  const [companyTraining, setCompanyTraining] = useState<CompanyTraining | null>(null);
  const [trainingTitle, setTrainingTitle] = useState<string>('');
  const [sections, setSections] = useState<TrainingSection[]>([]);
  const [currentSection, setCurrentSection] = useState<TrainingSection | null>(null);
  const [overlays, setOverlays] = useState<OverlayT[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [currentFrame, setCurrentFrame] = useState<string>('wide');
  const [overlayPaused, setOverlayPaused] = useState<boolean>(false);
  const [pausedByOverlayId, setPausedByOverlayId] = useState<string | null>(null);
  const [modalContentOverlay, setModalContentOverlay] = useState<any | null>(null);

  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => playerRef.current?.seekTo(time),
    setFrame: (frame: string) => setCurrentFrame(frame)
  }));

  useEffect(() => {
    const load = async () => {
      try {
        const cts = await api.listCompanyTrainings();
        const ct = cts.find(c => c.access_code === accessCode) || null;
        setCompanyTraining(ct || null);
        if (!ct) return;

        setTrainingTitle(ct.training?.title || '');
        const secs = await api.listTrainingSections(ct.training_id);
        // sort by order_index just in case
        const sorted = [...secs].sort((a, b) => a.order_index - b.order_index);
        setSections(sorted);
        const first = sorted[0] || null;
        setCurrentSection(first);
        if (first?.duration) setDuration(first.duration);
        if (first) {
          const ovs = await api.listSectionOverlays(first.training_id, first.id);
          setOverlays(ovs);
        }
      } catch (e) {
        console.error('InteractivePlayer load error:', e);
      }
    };
    load();
    // Open chat websocket on mount
    const openSocket = () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const wsUrl = apiBase.replace(/^http/i, 'ws') + '/chat/ws';
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        wsDidOpenRef.current = false;
        ws.onopen = () => {
          wsDidOpenRef.current = true;
          if (wsUnmountedRef.current) return;
          // optional init context
          const ctx = { accessCode };
          ws.send(JSON.stringify({ type: 'init', context: ctx }));
        };
        ws.onmessage = (ev) => {
          if (wsUnmountedRef.current) return;
          try {
            const data = JSON.parse(ev.data);
            if (data.type === 'assistant_message') {
              console.log('[chat] assistant:', data.content);
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
  }, [accessCode]);

  // When section changes, fetch its overlays
  useEffect(() => {
    const fetchOverlays = async () => {
      if (!currentSection) return;
      try {
        const ovs = await api.listSectionOverlays(currentSection.training_id, currentSection.id);
        setOverlays(ovs);
      } catch (e) {
        console.error('Overlay fetch error:', e);
      }
    };
    fetchOverlays();
    setCurrentTime(0);
    setCurrentFrame('wide');
    setOverlayPaused(false);
    setPausedByOverlayId(null);
    setModalContentOverlay(null);
  }, [currentSection]);

  const videoUrl = useMemo(() => buildVideoUrl(currentSection), [currentSection]);

  const handleTimeUpdate = (t: number) => {
    setCurrentTime(t);
  };

  const handleSeek = (value: number) => {
    setCurrentTime(value);
    playerRef.current?.seekTo(value);
  };

  if (!companyTraining || !currentSection) {
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
                  onClick={() => {
                    const idx = sections.findIndex(s => s.id === currentSection.id);
                    if (idx > 0) setCurrentSection(sections[idx - 1]);
                  }}
                  className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded"
                >Önceki</button>
                <button
                  onClick={() => {
                    const idx = sections.findIndex(s => s.id === currentSection.id);
                    if (idx < sections.length - 1) setCurrentSection(sections[idx + 1]);
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
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />

          {/* Overlays */}
          <div className="absolute inset-0 pointer-events-none">
            <OverlayManager
              overlays={overlays as any}
              currentTime={currentTime}
              isPaused={!isPlaying}
              pausedOverlayId={pausedByOverlayId}
              onAction={(action, value) => {
                if (action === 'frame_set' && value) {
                  setCurrentFrame(value);
                }
                if (action === 'pause_video' || action === 'pause_video_overlay') {
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
              ▶ Oynat
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-3">
          <button
            onClick={() => setIsPlaying(p => !p)}
            className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded"
          >
            {isPlaying ? 'Durdur' : 'Oynat'}
          </button>
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
