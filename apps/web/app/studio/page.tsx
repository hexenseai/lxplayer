'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { api, Training as TrainingT, TrainingSection } from '@/lib/api';
import { TrainingSectionForm } from './components/TrainingSectionForm';
import FlowEditor from './components/FlowEditor';
import { TrainingForm } from '@/components/admin/forms/TrainingForm';
import { LANGUAGES, TARGET_AUDIENCES } from '@/lib/constants';

export default function StudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trainingId = searchParams.get('trainingId');
  const { user, loading: userLoading, isSuperAdmin, isAdmin } = useUser();
  
  const [trainings, setTrainings] = useState<TrainingT[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedTraining, setSelectedTraining] = useState<TrainingT | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateSectionForm, setShowCreateSectionForm] = useState(false);
  const [showFlowEditor, setShowFlowEditor] = useState(false);
  const [showTrainingEditModal, setShowTrainingEditModal] = useState(false);
  const [editingTraining, setEditingTraining] = useState<TrainingT | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [systemTrainings, setSystemTrainings] = useState<TrainingT[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [showCreateTrainingModal, setShowCreateTrainingModal] = useState(false);

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
        duration: parseInt(formData.get('duration') as string) || 1,
        video_object: formData.get('video_object') as string || undefined,
        asset_id: formData.get('asset_id') as string || undefined,
        order_index: parseInt(formData.get('order_index') as string) || sections.length + 1,
        type: formData.get('type') as string || 'video',
        agent_id: formData.get('agent_id') as string || undefined,
        language: formData.get('language') as string || 'TR',
        target_audience: formData.get('target_audience') as string || 'Genel',
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
        type: (section as any).type || 'video',
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
          caption: overlay.caption || undefined,
          content_id: overlay.content_id || undefined,
          style_id: overlay.style_id || undefined,
          frame: overlay.frame || undefined,
          animation: overlay.animation || undefined,
          duration: overlay.duration,
          position: overlay.position || undefined,
          icon: overlay.icon || undefined,
          pause_on_show: overlay.pause_on_show || undefined,
          frame_config_id: overlay.frame_config_id || undefined
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

  const handleEditTraining = async (training: TrainingT) => {
    try {
      // Always fetch fresh data when opening the modal
      const freshTraining = await api.getTraining(training.id);
      setEditingTraining(freshTraining);
      setShowTrainingEditModal(true);
    } catch (error) {
      console.error('Error loading training data:', error);
      // Fallback to the training data we have
      setEditingTraining(training);
      setShowTrainingEditModal(true);
    }
  };

  const handleTrainingEditComplete = () => {
    setShowTrainingEditModal(false);
    setEditingTraining(null);
    loadTrainings(); // Reload trainings to get updated data
  };

  const loadSystemTrainings = async () => {
    try {
      setImportLoading(true);
      const data = await api.listSystemTrainings();
      setSystemTrainings(data);
    } catch (error) {
      console.error('Error loading system trainings:', error);
      alert(`Sistem eğitimleri yüklenirken hata oluştu: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportTraining = async (sourceTrainingId: string) => {
    try {
      setImportLoading(true);
      const result = await api.copyTraining(sourceTrainingId);
      
      alert(`Eğitim başarıyla kopyalandı! ${result.sections_copied} bölüm, ${result.overlays_copied} overlay, ${result.assets_copied} asset ve ${result.styles_copied} stil kopyalandı.`);
      
      setShowImportModal(false);
      loadTrainings();
    } catch (error) {
      console.error('Error importing training:', error);
      alert('Eğitim kopyalanırken hata oluştu!');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCreateTrainingComplete = () => {
    setShowCreateTrainingModal(false);
    loadTrainings(); // Reload trainings to show the new one
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
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (selectedTraining.access_code) {
                    const userId = user?.id || 'anonymous';
                    window.open(`/player/${selectedTraining.access_code}?userId=${userId}`, '_blank');
                  } else {
                    alert('Bu eğitimin access code\'u yok. Lütfen önce access code oluşturun.');
                  }
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Interactive Player'da Aç
              </button>
              <button
                onClick={() => setShowFlowEditor(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Akış Düzenle
              </button>
              <button
                onClick={() => setShowCreateSectionForm(true)}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Yeni Bölüm Ekle
              </button>
            </div>
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

        {/* Flow Editor Modal */}
        {showFlowEditor && selectedTraining && (
          <FlowEditor
            trainingId={selectedTraining.id}
            onClose={() => setShowFlowEditor(false)}
          />
        )}

        {/* Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            <div key={section.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {(section as any).type === 'llm_task' ? '🤖' : '📹'} {section.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Bölüm #{section.order_index} • {(section as any).type === 'llm_task' ? 'LLM Görevi' : 'Video Bölümü'}
                  </p>
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
                {/* Video bölümleri için süre bilgisi */}
                {(section as any).type !== 'llm_task' && section.duration && section.duration > 0 && (
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

                {/* Video bölümleri için asset bilgileri */}
                {(section as any).type !== 'llm_task' && section.asset_id && (
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Video:</span> {section.asset_id.substring(0, 8)}...
                  </div>
                )}
                {(section as any).type !== 'llm_task' && section.audio_asset_id && (
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
          <div className="flex gap-3">
            {(isAdmin || isSuperAdmin) && (
              <button
                onClick={() => {
                  setShowImportModal(true);
                  loadSystemTrainings();
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                İçeri Aktar
              </button>
            )}
            <button
              onClick={() => setShowCreateTrainingModal(true)}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Yeni Eğitim Ekle
            </button>
          </div>
        </div>
      </div>

      {/* Trainings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trainings.map((training) => (
          <div key={training.id} className="group relative bg-white rounded-xl border border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
            {/* Header with gradient background */}
            <div className="relative bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 p-6 border-b border-gray-100">
              {/* Company Badge */}
              <div className="absolute top-4 right-4">
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full text-xs font-medium text-gray-600 shadow-sm">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {(training as any).company?.display_name || 'Sistem Eğitimi'}
                </div>
              </div>
              
              {/* Training Icon and Title */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {training.title}
                  </h3>
                  {training.description && (
                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                      {training.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Training Details */}
              <div className="space-y-3 mb-6">
                {/* Avatar Info */}
                {training.avatar && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="flex-shrink-0 w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Avatar:</span>
                      <span className="ml-1">{training.avatar.name}</span>
                    </div>
                  </div>
                )}
                
                {!training.avatar && training.avatar_id && (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <span>Avatar bulunamadı</span>
                  </div>
                )}

                {!training.avatar && !training.avatar_id && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span>Avatar seçilmemiş</span>
                  </div>
                )}

                {/* Technical Details */}
                <div className="flex flex-wrap gap-2">
                  {training.flow_id && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Flow ID
                    </div>
                  )}
                  {training.ai_flow && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-md">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI Flow
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleTrainingSelect(training)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Bölümleri Yönet
                  </button>
                  
                  <button
                    onClick={() => handleEditTraining(training)}
                    className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Düzenle
                  </button>
                </div>
                
                <div className="text-xs text-gray-400 font-mono">
                  ID: {training.id.substring(0, 8)}...
                </div>
              </div>
            </div>

            {/* Hover Effect Overlay */}
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-200 rounded-xl pointer-events-none transition-all duration-300"></div>
          </div>
        ))}
      </div>

      {trainings.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">Henüz eğitim yok</div>
          <button
            onClick={() => setShowCreateTrainingModal(true)}
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
              onClick={() => setShowCreateTrainingModal(true)}
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

      {/* Training Edit Modal */}
      {showTrainingEditModal && editingTraining && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Eğitimi Düzenle</h2>
              <button
                onClick={() => setShowTrainingEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <TrainingForm 
              initialTraining={editingTraining} 
              onDone={handleTrainingEditComplete}
            />
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold">Sistem Eğitimlerini İçeri Aktar</h2>
                <p className="text-gray-600 text-sm mt-1">
                  SuperAdmin eğitimlerini seçin ve şirketinize kopyalayın
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {importLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Yükleniyor...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {systemTrainings.map((training) => (
                  <div key={training.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="mb-3">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        📚 {training.title}
                      </h3>
                      {training.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {training.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="mb-3 space-y-1">
                      {training.avatar && (
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <div className="w-3 h-3 bg-pink-100 rounded-full flex items-center justify-center">
                            <svg className="w-2 h-2 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <span>Avatar: {training.avatar.name}</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        ID: {training.id.substring(0, 8)}...
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleImportTraining(training.id)}
                      disabled={importLoading}
                      className="w-full bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {importLoading ? 'Kopyalanıyor...' : 'Kopyala'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!importLoading && systemTrainings.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">Sistem eğitimi bulunamadı</div>
                <p className="text-sm text-gray-400">
                  SuperAdmin tarafından oluşturulmuş eğitimler burada görünecek
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Training Modal */}
      {showCreateTrainingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Yeni Eğitim Oluştur</h2>
              <button
                onClick={() => setShowCreateTrainingModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <TrainingForm 
              onDone={handleCreateTrainingComplete}
            />
          </div>
        </div>
      )}
    </div>
  );
}
