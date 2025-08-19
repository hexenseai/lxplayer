'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, type TrainingSection, type Overlay as OverlayT } from '@/lib/api';
import { Overlay as OverlayType } from '@/lib/types';
import { VideoFrame } from '@/components/player/VideoFrame';
import { OverlayManager, OverlayComponent } from '@/components/player/Overlay';
import OverlaysList from '@/components/admin/OverlaysList';

function buildVideoUrl(section: TrainingSection): string | undefined {
  const cdn = process.env.NEXT_PUBLIC_CDN_URL || 'http://localhost:9000/lxplayer';
  const videoObject = (section as any).video_object as string | undefined;
  if (videoObject && videoObject.length > 0) {
    if (videoObject.startsWith('http')) return videoObject;
    return `${cdn}/${encodeURIComponent(videoObject)}`;
  }
  const asset = section.asset;
  if (asset && asset.kind === 'video') {
    if (asset.uri.startsWith('http')) return asset.uri;
    return `${cdn}/${encodeURIComponent(asset.uri)}`;
  }
  return undefined;
}

export default function SectionPreviewPage() {
  const params = useParams() as { trainingId: string; sectionId: string };
  const { trainingId, sectionId } = params;
  const leftPlayerRef = useRef<any>(null);
  const rightPlayerRef = useRef<any>(null);
  const [section, setSection] = useState<TrainingSection | null>(null);
  const [overlays, setOverlays] = useState<OverlayT[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [rightFrame, setRightFrame] = useState<string>('wide');
  const [overlayPaused, setOverlayPaused] = useState<boolean>(false);
  const [pausedByOverlayId, setPausedByOverlayId] = useState<string | null>(null);
  const [modalContentOverlay, setModalContentOverlay] = useState<OverlayType | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const sec = await api.getTrainingSection(trainingId, sectionId);
        setSection(sec);
        // Use section duration if available
        if (sec.duration) setDuration(sec.duration);
        const ovs = await api.listSectionOverlays(trainingId, sectionId);
        setOverlays(ovs);
      } catch (e) {
        console.error('Preview load error:', e);
      }
    };
    load();
  }, [trainingId, sectionId]);

  const videoUrl = useMemo(() => (section ? buildVideoUrl(section) : undefined), [section]);

  const handlePlayPause = () => {
    setIsPlaying((p) => !p);
  };

  const handleSeek = (value: number) => {
    setCurrentTime(value);
    if (leftPlayerRef.current) leftPlayerRef.current.seekTo(value);
    if (rightPlayerRef.current) rightPlayerRef.current.seekTo(value);
  };

  const handleTimeUpdate = (t: number) => {
    // Drive both players from left player's time updates to stay in sync
    setCurrentTime(t);
    if (rightPlayerRef.current) rightPlayerRef.current.seekTo(t);
  };

  // Ensure only one player has audible audio (left original). Right preview is muted.
  useEffect(() => {
    // set volumes when video changes or refs are ready
    const setVolumes = () => {
      try {
        leftPlayerRef.current?.setVolume(1);
        rightPlayerRef.current?.setVolume(0);
      } catch {}
    };
    setVolumes();
    // also set again shortly after mount to catch late ref readiness
    const timer = setTimeout(setVolumes, 300);
    return () => clearTimeout(timer);
  }, [videoUrl]);

  if (!section) {
    return (
      <div className="p-6">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Bölüm Önizleme</h1>
          <p className="text-sm text-gray-600">{section.title}</p>
        </div>
        <Link href={`/admin/trainings`} className="px-3 py-1.5 text-sm border rounded">Geri</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Original video */}
        <div className="bg-white border rounded-lg p-3">
          <div className="text-sm font-medium mb-2">Orijinal Video</div>
          <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
            <VideoFrame
              ref={leftPlayerRef}
              videoUrl={videoUrl}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            {overlayPaused && (
              <button
                onClick={() => { setIsPlaying(true); setOverlayPaused(false); }}
                className="absolute bottom-3 right-3 z-50 px-3 py-1.5 text-sm bg-white/90 text-black rounded shadow"
              >
                ▶ Oynat
              </button>
            )}
          </div>
        </div>

        {/* Right: Overlay-rendered video */}
        <div className="bg-white border rounded-lg p-3">
          <div className="text-sm font-medium mb-2">Overlay Önizleme</div>
          <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
            <VideoFrame
              ref={rightPlayerRef}
              videoUrl={videoUrl}
              currentTime={currentTime}
              isPlaying={isPlaying}
              frame={rightFrame}
              onTimeUpdate={() => { /* driven by left */ }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            {/* Overlays layer */}
            <div className="absolute inset-0 pointer-events-none">
              <OverlayManager
                overlays={overlays as any}
                currentTime={currentTime}
                isPaused={!isPlaying}
                pausedOverlayId={pausedByOverlayId}
                onAction={(action, value) => {
                  if (action === 'frame_set' && value) {
                    setRightFrame(value);
                  }
                  if (action === 'pause_video') {
                    setIsPlaying(false);
                    setOverlayPaused(true);
                    if (value) setPausedByOverlayId(String(value));
                  }
                  if (action === 'resume_video') {
                    if (value && pausedByOverlayId && String(value) !== pausedByOverlayId) return;
                    setOverlayPaused(false);
                    setPausedByOverlayId(null);
                    setModalContentOverlay(null);
                    setIsPlaying(true);
                  }
                  if (action === 'show_fullscreen_content' && value) {
                    const ov = overlays.find(o => o.id === value);
                    if (ov) {
                      const fullscreenOverlay: OverlayType = {
                        ...(ov as any),
                        type: 'content',
                        position: (ov as any).position && (ov as any).position.startsWith('fullscreen') ? (ov as any).position : 'fullscreen_dark'
                      } as any;
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
            {/* Resume button only in preview (right player) */}
            {overlayPaused && (
              <button
                onClick={() => { setIsPlaying(true); setOverlayPaused(false); setPausedByOverlayId(null); setModalContentOverlay(null); }}
                className="absolute bottom-3 right-3 z-50 px-3 py-1.5 text-sm bg-white/90 text-black rounded shadow pointer-events-auto"
              >
                ▶ Oynat
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 bg-white border rounded-lg p-3">
        <button
          onClick={handlePlayPause}
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
        <div className="text-xs text-gray-600 w-24 text-right">
          {Math.floor(currentTime)}s {duration ? `/ ${duration}s` : ''}
        </div>
      </div>

      {/* Overlay CRUD panel below controls */}
      <div className="bg-white border rounded-lg p-3">
        <div className="text-sm font-medium mb-2">Overlay'ler</div>
        <OverlaysList
          trainingId={trainingId}
          sectionId={sectionId}
          onChanged={(data) => setOverlays(data)}
        />
      </div>
    </div>
  );
}


