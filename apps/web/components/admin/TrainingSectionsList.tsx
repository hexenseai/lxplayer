"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrainingSectionModal } from './forms/TrainingSectionModal';
import OverlaysList from './OverlaysList';
import type { TrainingSection, Overlay } from '@/lib/api';
import { api } from '@/lib/api';

interface TrainingSectionsListProps {
  trainingId: string;
}

export function TrainingSectionsList({ trainingId }: TrainingSectionsListProps) {
  const router = useRouter();
  const [sections, setSections] = useState<TrainingSection[]>([]);
  const [overlays, setOverlays] = useState<Record<string, Overlay[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<TrainingSection | undefined>();

  useEffect(() => {
    loadSections();
  }, [trainingId]);

  const loadSections = async () => {
    try {
      setIsLoading(true);
      const sectionsData = await api.listTrainingSections(trainingId);
      // Section'ları order_index'e göre sırala
      const sortedSections = sectionsData.sort((a, b) => a.order_index - b.order_index);
      setSections(sortedSections);
      
      // Load overlays for each section
      const overlaysData: Record<string, Overlay[]> = {};
      for (const section of sectionsData) {
        try {
          const sectionOverlays = await api.listSectionOverlays(trainingId, section.id);
          overlaysData[section.id] = sectionOverlays;
        } catch (error) {
          console.error(`Overlays for section ${section.id} yüklenirken hata:`, error);
          overlaysData[section.id] = [];
        }
      }
      setOverlays(overlaysData);
    } catch (error) {
      console.error('Bölümler yüklenirken hata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSection = () => {
    setEditingSection(undefined);
    setIsModalOpen(true);
  };

  const handleEditSection = (section: TrainingSection) => {
    setEditingSection(section);
    setIsModalOpen(true);
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Bu bölümü ve tüm overlay\'lerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    try {
      await api.deleteTrainingSection(trainingId, sectionId);
      router.refresh();
      loadSections();
    } catch (error) {
      console.error('Bölüm silinirken hata:', error);
      alert('Bölüm silinirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingSection(undefined);
    loadSections();
  };

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-emerald-600">Bölümler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Green Theme */}
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-900">Eğitim Bölümleri</h3>
              <p className="text-emerald-600 text-sm">Bölümler ve overlay yönetimi</p>
            </div>
          </div>
          <button
            onClick={handleAddSection}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Yeni Bölüm Ekle
          </button>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-700 mb-2">Henüz bölüm eklenmemiş</h4>
          <p className="text-gray-500 mb-4">Yeni bölüm eklemek için yukarıdaki butonu kullanın.</p>
          <button
            onClick={handleAddSection}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            İlk Bölümü Ekle
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {sections.map((section) => (
            <div
              key={section.id}
              className="bg-white border border-emerald-200 rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sol taraf - Section bilgileri */}
                <div className="lg:col-span-2 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full font-bold text-sm border-2 border-emerald-200">
                        {section.order_index}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-emerald-900">{section.title}</h4>
                        {section.description && (
                          <p className="text-emerald-600 text-sm mt-1">{section.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditSection(section)}
                        className="px-3 py-1.5 text-sm bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors border border-emerald-200"
                      >
                        Düzenle
                      </button>
                      <HeyGenButton trainingId={trainingId} section={section} onDone={loadSections} />
                      <a
                        href={`/admin/trainings/${trainingId}/sections/${section.id}/preview`}
                        className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors border border-blue-200"
                      >
                        Önizleme
                      </a>
                      <button
                        onClick={() => handleDeleteSection(section.id)}
                        className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors border border-red-200"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                      <span className="font-semibold text-emerald-700">Süre:</span>
                      <div className="text-emerald-900">{formatDuration(section.duration)}</div>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                      <span className="font-semibold text-emerald-700">Video:</span>
                      <div className="text-emerald-900">{section.asset?.title || 'Seçilmemiş'}</div>
                    </div>
                  </div>
                  
                  {section.script && (
                    <div className="mb-4 bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <span className="text-sm font-semibold text-gray-700">Konuşma Metni:</span>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-3">
                        {section.script}
                      </p>
                    </div>
                  )}
                  
                  {/* Overlays Summary */}
                  {overlays[section.id] && overlays[section.id].length > 0 && (
                    <div className="mb-4 bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                      <span className="text-sm font-semibold text-emerald-700">Overlay'ler ({overlays[section.id].length}):</span>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {overlays[section.id].map((overlay) => (
                          <div key={overlay.id} className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded border border-emerald-200">
                            {overlay.type} ({overlay.time_stamp}s)
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Overlays Management */}
                  <div className="pt-4 border-t border-emerald-200">
                    <OverlaysList trainingId={trainingId} sectionId={section.id} />
                  </div>
                </div>
                
                {/* Sağ taraf - Video Preview */}
                <div className="lg:col-span-1 p-6 bg-emerald-50 rounded-r-xl">
                  <h5 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Video Önizleme
                  </h5>
                  {section.asset ? (
                    <div className="space-y-3">
                      <div className="aspect-video bg-emerald-200 rounded-lg overflow-hidden border border-emerald-300">
                        {section.asset.kind === 'video' ? (
                          <video
                            className="w-full h-full object-cover"
                            controls
                            preload="metadata"
                          >
                            <source src={`${process.env.NEXT_PUBLIC_CDN_URL || 'http://localhost:9000/lxplayer'}/${encodeURIComponent(section.asset.uri)}`} type="video/mp4" />
                            Video oynatılamıyor.
                          </video>
                        ) : section.asset.kind === 'image' ? (
                          <img
                            src={`${process.env.NEXT_PUBLIC_CDN_URL || 'http://localhost:9000/lxplayer'}/${encodeURIComponent(section.asset.uri)}`}
                            alt={section.asset.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-emerald-500">
                            <div className="text-center">
                              <div className="text-2xl mb-2">📄</div>
                              <div className="text-sm">{section.asset.kind}</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-emerald-700 space-y-1">
                        <div><strong>Başlık:</strong> {section.asset.title}</div>
                        <div><strong>Tür:</strong> {section.asset.kind}</div>
                        {section.duration && (
                          <div><strong>Süre:</strong> {formatDuration(section.duration)}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video bg-emerald-100 rounded-lg flex items-center justify-center border border-emerald-200">
                      <div className="text-center text-emerald-500">
                        <div className="text-3xl mb-2">🎥</div>
                        <div className="text-sm">Video seçilmemiş</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <TrainingSectionModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        trainingId={trainingId}
        initialSection={editingSection}
      />
    </div>
  );
}

function HeyGenButton({ trainingId, section, onDone }: { trainingId: string; section: TrainingSection; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors border border-purple-200"
      >
        HeyGen ile Üret
      </button>
      {open && (
        <HeyGenModal trainingId={trainingId} section={section} onClose={() => setOpen(false)} onDone={onDone} />
      )}
    </>
  );
}

function HeyGenModal({ trainingId, section, onClose, onDone }: { trainingId: string; section: TrainingSection; onClose: () => void; onDone: () => void }) {
  const [avatarId, setAvatarId] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [size, setSize] = useState('1280x720');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setBusy(true);
    setError(null);
    try {
      const [wStr, hStr] = size.split('x');
      const width = parseInt(wStr, 10);
      const height = parseInt(hStr, 10);
      const prompt = section.script || section.title || 'Konuşma metni';
      const res: any = await api.generateVideo({ provider: 'heygen', model: 'v2', prompt, width, height, avatar_id: avatarId || undefined, voice_id: voiceId || undefined });
      if ('detail' in res) throw new Error(res.detail);
      const created = await api.createAsset({ title: section.title || 'HeyGen Video', kind: 'video', uri: (res as any).uri! });
      await api.updateTrainingSection(trainingId, section.id, {
        title: section.title,
        description: section.description || undefined,
        script: section.script || undefined,
        duration: section.duration || undefined,
        video_object: section.video_object || undefined,
        asset_id: created.id,
        order_index: section.order_index,
      });
      onDone();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Hata');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">HeyGen ile Video Üret</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="text-sm text-gray-600">Bölüm konuşma metni kullanılacak. Avatar ve ses kimliğini girin.</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">Avatar ID</label>
            <input value={avatarId} onChange={(e) => setAvatarId(e.target.value)} className="w-full border rounded px-2 py-1" placeholder="avatar_id" />
          </div>
          <div>
            <label className="text-xs text-gray-600">Voice ID</label>
            <input value={voiceId} onChange={(e) => setVoiceId(e.target.value)} className="w-full border rounded px-2 py-1" placeholder="voice_id (opsiyonel)" />
          </div>
          <div>
            <label className="text-xs text-gray-600">Boyut</label>
            <select value={size} onChange={(e) => setSize(e.target.value)} className="w-full border rounded px-2 py-1">
              {['1280x720','1920x1080'].map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm border rounded">Vazgeç</button>
          <button onClick={handleGenerate} disabled={busy} className={`px-3 py-1.5 text-sm rounded text-white ${busy ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'}`}>{busy ? 'Üretiliyor...' : 'Üret ve Ekle'}</button>
        </div>
      </div>
    </div>
  );
}
