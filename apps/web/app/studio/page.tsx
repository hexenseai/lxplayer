'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { api, Training as TrainingT, TrainingSection } from '@/lib/api';
import { TrainingSectionForm } from '@/components/admin/forms/TrainingSectionForm';
import { LANGUAGES, TARGET_AUDIENCES } from '@/lib/constants';

export default function StudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trainingId = searchParams.get('trainingId');
  const { user, loading: userLoading, isSuperAdmin, isAdmin } = useUser();
  
  const [trainings, setTrainings] = useState<TrainingT[]>([]);
  const [sections, setSections] = useState<TrainingSection[]>([]);
  const [selectedTraining, setSelectedTraining] = useState<TrainingT | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateSectionForm, setShowCreateSectionForm] = useState(false);

  useEffect(() => {
    if (isSuperAdmin || isAdmin) {
      loadTrainings();
    }
  }, [isSuperAdmin, isAdmin]);

  useEffect(() => {
    if (trainingId && trainings.length > 0) {
      loadTrainingSections(trainingId);
      const training = trainings.find(t => t.id === trainingId);
      if (training) {
        setSelectedTraining(training);
      }
    }
  }, [trainingId, trainings]);

  const loadTrainings = async () => {
    try {
      setLoading(true);
      const data = await api.listTrainings();
      setTrainings(data);
      
      // URL'den training ID varsa, o eğitimi seç
      if (trainingId) {
        const training = data.find(t => t.id === trainingId);
        if (training) {
          setSelectedTraining(training);
          loadTrainingSections(trainingId);
        }
      }
    } catch (error) {
      console.error('Error loading trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainingSections = async (id: string) => {
    try {
      const data = await api.listTrainingSections(id);
      console.log('Loaded sections:', data);
      setSections(data);
    } catch (error) {
      console.error('Error loading training sections:', error);
    }
  };

  const handleCreateSection = async (formData: FormData) => {
    if (!selectedTraining) return;
    
    try {
      const data = {
        title: formData.get('title') as string,
        description: formData.get('description') as string || undefined,
        script: formData.get('script') as string || undefined,
        duration: parseInt(formData.get('duration') as string) || 0,
        video_object: formData.get('video_object') as string || undefined,
        asset_id: formData.get('asset_id') as string || undefined,
        order_index: parseInt(formData.get('order_index') as string) || sections.length + 1,
      };

      await api.createTrainingSection(selectedTraining.id, data);
      setShowCreateSectionForm(false);
      loadTrainingSections(selectedTraining.id);
    } catch (error) {
      console.error('Error creating section:', error);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!selectedTraining || !confirm('Bu bölümü silmek istediğinizden emin misiniz?')) return;

    try {
      await api.deleteTrainingSection(selectedTraining.id, sectionId);
      loadTrainingSections(selectedTraining.id);
    } catch (error) {
      console.error('Error deleting section:', error);
    }
  };

  const handleDuplicateSection = async (section: TrainingSection) => {
    if (!selectedTraining) return;

    try {
      // Mevcut section'ın tüm bilgilerini kopyala
      const duplicateData = {
        title: `${section.title} (Kopya)`,
        description: section.description || '',
        script: section.script || '',
        duration: section.duration || 0,
        video_object: section.video_object || '',
        asset_id: section.asset_id || '',
        order_index: sections.length + 1, // Son sıraya ekle
        language: section.language || 'TR',
        target_audience: section.target_audience || 'Genel',
        audio_asset_id: section.audio_asset_id || ''
      };

      // Yeni section'ı oluştur
      const newSection = await api.createTrainingSection(selectedTraining.id, duplicateData);
      
      // Mevcut section'ın overlay'lerini al
      const overlays = await api.listSectionOverlays(selectedTraining.id, section.id);
      
      // Overlay'leri yeni section'a kopyala
      for (const overlay of overlays) {
        const overlayData = {
          time_stamp: overlay.time_stamp,
          type: overlay.type,
          caption: overlay.caption,
          content_id: overlay.content_id,
          style_id: overlay.style_id,
          frame: overlay.frame,
          animation: overlay.animation,
          duration: overlay.duration,
          position: overlay.position,
          icon: overlay.icon,
          pause_on_show: overlay.pause_on_show,
          frame_config_id: overlay.frame_config_id
        };
        
        await api.createSectionOverlay(selectedTraining.id, newSection.id, overlayData);
      }
      
      loadTrainingSections(selectedTraining.id);
      
      const overlayCount = overlays.length;
      alert(`Bölüm başarıyla kopyalandı! ${overlayCount} overlay de kopyalandı.`);
    } catch (error) {
      console.error('Error duplicating section:', error);
      alert('Bölüm kopyalanırken hata oluştu!');
    }
  };

  const handleTrainingSelect = (training: TrainingT) => {
    setSelectedTraining(training);
    setSections([]);
    router.push(`/studio?trainingId=${training.id}`);
  };

  const handleBackToTrainings = () => {
    setSelectedTraining(null);
    setSections([]);
    router.push('/?tab=trainings');
  };

  if (userLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin && !isAdmin) {
    return null;
  }

  // Eğitim seçilmişse, bölümleri göster
  if (selectedTraining) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={handleBackToTrainings}
            className="text-primary hover:text-primary/80 text-sm font-medium mb-4"
          >
            ← Eğitimlere Dön
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedTraining.title}</h1>
              <p className="text-gray-600 mb-4">{selectedTraining.description}</p>
            </div>
            <button
              onClick={() => setShowCreateSectionForm(true)}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Yeni Bölüm Ekle
            </button>
          </div>
        </div>

        {/* Create Section Modal */}
        {showCreateSectionForm && selectedTraining && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Yeni Bölüm Ekle</h2>
              <TrainingSectionForm
                trainingId={selectedTraining.id}
                onDone={() => {
                  setShowCreateSectionForm(false);
                  loadTrainingSections(selectedTraining.id);
                }}
              />
            </div>
          </div>
        )}

        {/* Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            <div key={section.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">📖 {section.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">Bölüm #{section.order_index}</p>
                  {section.description && (
                    <p className="text-sm text-gray-600 line-clamp-3">{section.description}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => router.push(`/studio/sections/${section.id}`)}
                    className="text-blue-600 hover:text-blue-900 text-sm"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDuplicateSection(section)}
                    className="text-green-600 hover:text-green-900 text-sm"
                  >
                    Kopyala
                  </button>
                  <button
                    onClick={() => handleDeleteSection(section.id)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    Sil
                  </button>
                </div>
              </div>
              
              <div className="mb-4 space-y-2">
                {section.duration && section.duration > 0 && (
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Süre:</span> {section.duration} saniye
                  </div>
                )}
                
                {/* Dil ve Hedef Kitle */}
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Dil:</span>
                    <span className="text-gray-600">
                      {(() => {
                        const lang = section.language || 'TR';
                        const langInfo = LANGUAGES.find(l => l.code === lang);
                        return `${langInfo?.flag || '🌐'} ${langInfo?.name || lang}`;
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Hedef:</span>
                    <span className="text-gray-600">
                      {(() => {
                        const audience = section.target_audience || 'Genel';
                        const audienceInfo = TARGET_AUDIENCES.find(a => a.name === audience);
                        return `${audienceInfo?.icon || '👥'} ${audience}`;
                      })()}
                    </span>
                  </div>
                </div>

                {/* Asset bilgileri */}
                {section.asset_id && (
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Video:</span> {section.asset_id.substring(0, 8)}...
                  </div>
                )}
                {section.audio_asset_id && (
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Ses:</span> {section.audio_asset_id.substring(0, 8)}...
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  ID: {section.id.substring(0, 8)}...
                </div>
              </div>
            </div>
          ))}
        </div>

        {sections.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">Bu eğitimde henüz bölüm yok</div>
            <button
              onClick={() => setShowCreateSectionForm(true)}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              İlk Bölümü Oluştur
            </button>
          </div>
        )}
      </div>
    );
  }

  // Ana studio sayfası - eğitimleri listele
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Studio</h1>
            <p className="text-gray-600">
              Eğitim içeriklerinizi oluşturun ve yönetin
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/trainings')}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Yeni Eğitim Ekle
          </button>
        </div>
      </div>

      {/* Trainings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trainings.map((training) => (
          <div key={training.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">📚 {training.title}</h3>
                {training.description && (
                  <p className="text-sm text-gray-600 line-clamp-3">{training.description}</p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => router.push(`/admin/trainings/${training.id}` as any)}
                  className="text-blue-600 hover:text-blue-900 text-sm"
                >
                  Düzenle
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              {training.flow_id && (
                <div className="text-xs text-gray-500 mb-1">
                  Flow ID: {training.flow_id}
                </div>
              )}
              {training.ai_flow && (
                <div className="text-xs text-gray-500 mb-1">
                  AI Flow: {training.ai_flow.length > 50 ? `${training.ai_flow.substring(0, 50)}...` : training.ai_flow}
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <button
                onClick={() => handleTrainingSelect(training)}
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                Bölümleri Yönet →
              </button>
              <div className="text-xs text-gray-500">
                ID: {training.id.substring(0, 8)}...
              </div>
            </div>
          </div>
        ))}
      </div>

      {trainings.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">Henüz eğitim yok</div>
          <button
            onClick={() => router.push('/admin/trainings')}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            İlk Eğitimi Oluştur
          </button>
        </div>
      )}

      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Hızlı Başlangıç</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Yeni bir eğitim oluşturun</span>
            <button
              onClick={() => router.push('/admin/trainings')}
              className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90"
            >
              Eğitim Oluştur
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>Eğitim bölümlerini düzenleyin</span>
            <button
              onClick={() => router.push('/studio/assets')}
              className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90"
            >
              Bölümler
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span>Medya dosyalarınızı yükleyin</span>
            <button
              onClick={() => router.push('/studio/assets')}
              className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90"
            >
              Dosya Yükle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
