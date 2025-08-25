'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, type TrainingSection, type Overlay as OverlayT } from '@/lib/api';
import { Overlay as OverlayType } from '@/lib/types';
import { VideoFrame } from '@/components/player/VideoFrame';
import { OverlayManager, OverlayComponent } from '@/components/player/Overlay';
import OverlaysList from '@/components/admin/OverlaysList';
import OverlayTimeline from '@/components/admin/OverlayTimeline';
import OverlayModal from '@/components/admin/forms/OverlayModal';

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
  
  // Timeline and overlay management states
  const [showOverlayModal, setShowOverlayModal] = useState(false);
  const [editingOverlay, setEditingOverlay] = useState<OverlayT | null>(null);
  const [newOverlayTime, setNewOverlayTime] = useState<number | undefined>(undefined);
  
  // Transcript states
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [srtContent, setSrtContent] = useState('');
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [transcriptView, setTranscriptView] = useState<'text' | 'srt'>('text');

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

  // Transcript generation
  const handleGenerateTranscript = async () => {
    if (!section?.asset_id) {
      alert('Bu bölüm için video bulunamadı.');
      return;
    }

    setIsGeneratingTranscript(true);
    setTranscriptError(null);
    
    try {
      const result = await api.generateTranscript(trainingId, sectionId);
      setTranscript(result.transcript);
      setSrtContent(result.srt);
      setShowTranscriptModal(true);
    } catch (error: any) {
      console.error('Transcript generation error:', error);
      setTranscriptError(error.message || 'Transcript oluşturulurken bir hata oluştu.');
    } finally {
      setIsGeneratingTranscript(false);
    }
  };

  const handleConfirmTranscript = async () => {
    if (!section) return;
    
    try {
      await api.updateTrainingSection(trainingId, sectionId, {
        title: section.title,
        description: section.description || undefined,
        script: transcript,
        duration: section.duration || undefined,
        video_object: section.video_object || undefined,
        asset_id: section.asset_id || undefined,
        order_index: section.order_index,
      });
      
      // Update local section state
      setSection({ ...section, script: transcript });
      setShowTranscriptModal(false);
      setTranscript('');
    } catch (error) {
      console.error('Error updating section:', error);
      alert('Konuşma metni güncellenirken bir hata oluştu.');
    }
  };

  // Timeline event handlers
  const handleTimelineTimeClick = (time: number) => {
    // Seek to the clicked time
    handleSeek(time);
    // Open overlay modal for new overlay
    setNewOverlayTime(time);
    setEditingOverlay(null);
    setShowOverlayModal(true);
  };

  const handleTimelineOverlayClick = (overlay: OverlayT) => {
    setEditingOverlay(overlay);
    setNewOverlayTime(undefined);
    setShowOverlayModal(true);
  };

  const handleTimelineOverlayDelete = async (overlayId: string) => {
    if (!confirm('Bu overlay\'i silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await api.deleteSectionOverlay(trainingId, sectionId, overlayId);
      // Reload overlays
      const ovs = await api.listSectionOverlays(trainingId, sectionId);
      setOverlays(ovs);
    } catch (error) {
      console.error('Error deleting overlay:', error);
      alert('Overlay silinirken hata oluştu');
    }
  };

  const handleOverlayModalSuccess = async () => {
    setShowOverlayModal(false);
    setEditingOverlay(null);
    setNewOverlayTime(undefined);
    // Reload overlays
    const ovs = await api.listSectionOverlays(trainingId, sectionId);
    setOverlays(ovs);
  };

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
          <h1 className="text-xl font-semibold">Eğitim Düzenle</h1>
          <p className="text-sm text-gray-600">{section.title} - Overlay yönetimi ve önizleme</p>
        </div>
        <div className="flex items-center gap-2">
          {section.asset_id && (
            <button
              onClick={handleGenerateTranscript}
              disabled={isGeneratingTranscript}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGeneratingTranscript ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  İşleniyor...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Transcript Oluştur
                </>
              )}
            </button>
          )}
          <Link href={`/admin/trainings`} className="px-3 py-1.5 text-sm border rounded">Geri</Link>
        </div>
      </div>

      {transcriptError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-700">{transcriptError}</span>
          </div>
        </div>
      )}

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

      {/* Timeline */}
      <div className="bg-white border rounded-lg p-4">
        <OverlayTimeline
          overlays={overlays}
          duration={duration || 0}
          currentTime={currentTime}
          onTimeClick={handleTimelineTimeClick}
          onOverlayClick={handleTimelineOverlayClick}
          onOverlayDelete={handleTimelineOverlayDelete}
        />
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
        <div className="text-sm font-medium mb-2">Overlay Yönetimi</div>
        <OverlaysList
          trainingId={trainingId}
          sectionId={sectionId}
          onChanged={(data) => setOverlays(data)}
        />
      </div>

      {/* Overlay Modal */}
      <OverlayModal
        trainingId={trainingId}
        sectionId={sectionId}
        overlayId={editingOverlay?.id}
        isOpen={showOverlayModal}
        onClose={() => {
          setShowOverlayModal(false);
          setEditingOverlay(null);
          setNewOverlayTime(undefined);
        }}
        onSuccess={handleOverlayModalSuccess}
        initialTimeStamp={newOverlayTime}
      />

      {/* Transcript Modal */}
      {showTranscriptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Transcript Onayı</h3>
              <p className="text-sm text-gray-600 mt-1">
                Video sesinden çıkarılan transcript. Onaylarsanız konuşma metni alanı güncellenecektir.
              </p>
            </div>
            
            {/* View Toggle */}
            <div className="px-6 py-3 border-b bg-gray-50">
              <div className="flex gap-2">
                <button
                  onClick={() => setTranscriptView('text')}
                  className={`px-3 py-1.5 text-sm rounded ${
                    transcriptView === 'text' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white text-gray-700 border hover:bg-gray-50'
                  }`}
                >
                  Metin
                </button>
                <button
                  onClick={() => setTranscriptView('srt')}
                  className={`px-3 py-1.5 text-sm rounded ${
                    transcriptView === 'srt' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white text-gray-700 border hover:bg-gray-50'
                  }`}
                >
                  SRT (Zaman Etiketli)
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-96">
              <div className="bg-gray-50 rounded-lg p-4 border">
                {transcriptView === 'text' ? (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{transcript}</p>
                ) : (
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">{srtContent}</pre>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTranscriptModal(false);
                  setTranscript('');
                  setSrtContent('');
                }}
                className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleConfirmTranscript}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Onayla ve Güncelle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


