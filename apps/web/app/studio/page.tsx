'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { api, Training as TrainingT, TrainingSection } from '@/lib/api';
import { TrainingSectionForm } from './components/TrainingSectionForm';
import FlowEditor from './components/FlowEditor';
import { TrainingForm } from '@/components/admin/forms/TrainingForm';
import { LANGUAGES, TARGET_AUDIENCES } from '@/lib/constants';
import EvaluationCriteriaList from '@/components/admin/EvaluationCriteriaList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@lxplayer/ui';

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
  const [activeTab, setActiveTab] = useState('sections');

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
      
      let trainingsData = [];
      
      if (isSuperAdmin) {
        // SuperAdmin tüm eğitimleri görebilir
        trainingsData = await api.listTrainings();
      } else if (isAdmin && user?.company_id) {
        // Admin hem kendi firmasına kopyalanmış hem de atanmış eğitimleri görebilir
        
        // 1. Kendi firmasına kopyalanmış eğitimleri al (Training.company_id = user.company_id)
        const copiedTrainings = await api.listTrainings();
        
        // 2. Kendi firmasına atanmış eğitimleri al (CompanyTraining tablosundan)
        const companyTrainings = await api.listCompanyTrainings(user.company_id);
        const assignedTrainings = companyTrainings
          .filter(ct => ct.training)
          .map(ct => ({
            ...ct.training,
            access_code: ct.access_code,
            expectations: ct.expectations,
            // Bu eğitim atanmış bir eğitim olduğunu belirt
            is_assigned: true,
            company_assignment: ct.company
          }));
        
        // 3. İki listeyi birleştir (duplicate'leri kaldır)
        const allTrainings = [...copiedTrainings, ...assignedTrainings];
        trainingsData = allTrainings.filter((training, index, self) => 
          index === self.findIndex(t => t.id === training.id)
        );
      } else {
        trainingsData = [];
      }
      
      // Her eğitim için bölüm sayısını hesapla
      const trainingsWithSectionCount = await Promise.all(
        trainingsData.map(async (training) => {
          try {
            const sections = await api.listTrainingSections(training.id);
            return {
              ...training,
              section_count: sections.length
            };
          } catch (error) {
            console.error(`Error loading sections for training ${training.id}:`, error);
            return {
              ...training,
              section_count: 0
            };
          }
        })
      );
      
      setTrainings(trainingsWithSectionCount);
      
      // URL'den training ID varsa, o eğitimi seç
      if (trainingId) {
        const training = trainingsWithSectionCount.find(t => t.id === trainingId);
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
      console.log('🔍 Loaded sections data:', data);
      // Check each section for avatar data
      data.forEach((section, index) => {
        console.log(`🔍 Section ${index}:`, section.title, 'Avatar:', (section as any).avatar);
      });
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

  const handleMoveSection = async (sectionId: string, direction: 'up' | 'down') => {
    if (!selectedTraining) return;

    try {
      const sortedSections = sections.sort((a, b) => a.order_index - b.order_index);
      const currentIndex = sortedSections.findIndex(s => s.id === sectionId);
      
      if (currentIndex === -1) return;
      
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      if (targetIndex < 0 || targetIndex >= sortedSections.length) return;
      
      // Swap order_index values
      const currentSection = sortedSections[currentIndex];
      const targetSection = sortedSections[targetIndex];
      
      const tempOrderIndex = currentSection.order_index;
      currentSection.order_index = targetSection.order_index;
      targetSection.order_index = tempOrderIndex;
      
      // Update both sections
      await Promise.all([
        api.updateTrainingSection(selectedTraining.id, currentSection.id, {
          title: currentSection.title,
          description: currentSection.description || '',
          script: currentSection.script || '',
          duration: currentSection.duration || 0,
          video_object: currentSection.video_object || '',
          asset_id: currentSection.asset_id || '',
          order_index: currentSection.order_index,
          type: (currentSection as any).type || 'video',
          agent_id: (currentSection as any).agent_id || '',
          language: currentSection.language || 'TR',
          target_audience: currentSection.target_audience || 'Genel',
          audio_asset_id: currentSection.audio_asset_id || ''
        }),
        api.updateTrainingSection(selectedTraining.id, targetSection.id, {
          title: targetSection.title,
          description: targetSection.description || '',
          script: targetSection.script || '',
          duration: targetSection.duration || 0,
          video_object: targetSection.video_object || '',
          asset_id: targetSection.asset_id || '',
          order_index: targetSection.order_index,
          type: (targetSection as any).type || 'video',
          agent_id: (targetSection as any).agent_id || '',
          language: targetSection.language || 'TR',
          target_audience: targetSection.target_audience || 'Genel',
          audio_asset_id: targetSection.audio_asset_id || ''
        })
      ]);
      
      // Reload sections to reflect the changes
      loadTrainingSections(selectedTraining.id);
    } catch (error) {
      console.error('Error moving section:', error);
      alert('Bölüm taşınırken hata oluştu!');
    }
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

  const handleDeleteTraining = async (training: TrainingT) => {
    const confirmMessage = `"${training.title}" eğitimini silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz ve eğitimin tüm bölümleri, overlay'leri ve ilgili verileri silinecektir.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await api.deleteTraining(training.id);
      alert('Eğitim başarıyla silindi.');
      loadTrainings(); // Reload trainings to remove the deleted one
    } catch (error) {
      console.error('Error deleting training:', error);
      alert('Eğitim silinirken hata oluştu!');
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
          <div className="flex items-start gap-6">
            <div className="w-2/3">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{selectedTraining.title}</h1>
                {/* Company Badge */}
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm font-medium text-blue-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {(() => {
                    // Eğer atanmış bir eğitimse, atanmış olduğu firmanın adını göster
                    if ((selectedTraining as any).is_assigned) {
                      return (selectedTraining as any).company_assignment?.name || 'Atanmış Eğitim';
                    }
                    // Eğer kopyalanmış bir eğitimse, kendi firmasının adını göster
                    if ((selectedTraining as any).company?.display_name) {
                      return (selectedTraining as any).company.display_name;
                    }
                    // Sistem eğitimi
                    return 'Sistem Eğitimi';
                  })()}
                </div>
              </div>
              {/* Eğitimin Amacı */}
              {selectedTraining.description && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h2 className="text-lg font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Eğitimin Amacı
                  </h2>
                  <p className="text-blue-800 leading-relaxed">{selectedTraining.description}</p>
                </div>
              )}
            </div>
            <div className="w-1/3 flex flex-col gap-3">
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

        {/* Tabs for Sections and Evaluation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sections">Bölümler</TabsTrigger>
            <TabsTrigger value="evaluation">Değerlendirme</TabsTrigger>
          </TabsList>

          <TabsContent value="sections" className="mt-6">
            {/* Sections List - Sıra numaralarına göre sıralanmış */}
            <div className="space-y-4">
              {sections
                .sort((a, b) => a.order_index - b.order_index)
                .map((section, index) => (
                <div key={section.id} className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200">
                  {/* Section Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      {/* Sıra Numarası */}
                      <div className="flex items-center justify-center w-8 h-8 bg-primary text-white rounded-full text-sm font-semibold">
                        {section.order_index}
                      </div>
                      
                      {/* Section Başlığı ve Tipi */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          {(() => {
                            const type = (section as any).type;
                            if (type === 'llm_interaction' || type === 'llm_agent') return '🤖';
                            if (type === 'video') return '📹';
                            return '📄';
                          })()}
                          {section.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="font-medium">
                            {(() => {
                              const type = (section as any).type;
                              if (type === 'llm_interaction') return 'LLM Etkileşim';
                              if (type === 'llm_agent') return 'LLM Agent';
                              if (type === 'video') return 'Video Bölümü';
                              return 'Bölüm';
                            })()}
                          </span>
                          <span>•</span>
                          <span>
                            {(() => {
                              const lang = section.language || 'TR';
                              const langInfo = LANGUAGES.find(l => l.code === lang);
                              return `${langInfo?.flag || '🌐'} ${langInfo?.name || lang}`;
                            })()}
                          </span>
                          <span>•</span>
                          <span>
                            {(() => {
                              const audience = section.target_audience || 'Genel';
                              const audienceInfo = TARGET_AUDIENCES.find(a => a.name === audience);
                              return `${audienceInfo?.icon || '👥'} ${audience}`;
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Move Up/Down Buttons */}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveSection(section.id, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Yukarı Taşı"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMoveSection(section.id, 'down')}
                          disabled={index === sections.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Aşağı Taşı"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Main Action Buttons */}
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => router.push(`/studio/sections/${section.id}`)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDuplicateSection(section)}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                        >
                          Kopyala
                        </button>
                        {(section as any).type === 'llm_agent' && (
                          <button
                            onClick={() => router.push(`/training-test?trainingId=${selectedTraining.id}`)}
                            className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 transition-colors"
                          >
                            🧪 Test
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSection(section.id)}
                          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Section Content */}
                  <div className="p-4">
                    {(() => {
                      const type = (section as any).type;
                      
                      // LLM Interaction veya LLM Agent bölümleri
                      if (type === 'llm_interaction' || type === 'llm_agent') {
                        const avatar = (section as any).avatar;
                        console.log('🔍 Section:', section.title, 'Type:', type, 'Avatar:', avatar);
                        console.log('🔍 Selected Training Avatar ID:', selectedTraining.avatar_id);
                        return (
                          <div className="flex gap-4">
                            {/* Avatar Bilgisi */}
                            <div className="flex-shrink-0">
                              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-xl font-bold relative overflow-hidden">
                                {avatar?.image_url ? (
                                  <img 
                                    src={avatar.image_url} 
                                    alt={avatar.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  avatar?.name?.charAt(0).toUpperCase() || section.title.charAt(0).toUpperCase()
                                )}
                              </div>
                            </div>
                            
                            {/* Avatar ve Bölüm Bilgileri */}
                            <div className="flex-1">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Avatar Bilgileri - Sol Sütun */}
                                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                                  {avatar ? (
                                    <div>
                                      {/* Avatar İsmi - Başlık olarak */}
                                      <h4 className="font-semibold text-purple-900 mb-3">
                                        {avatar.name}
                                      </h4>
                                      
                                      {/* Kişilik Bilgisi */}
                                      <div>
                                        <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">Kişilik</span>
                                        <p className="text-sm text-purple-800 mt-1 leading-relaxed">{avatar.personality}</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center py-4">
                                      <svg className="w-8 h-8 text-purple-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                      <p className="text-sm text-purple-500">Avatar bilgisi bulunamadı</p>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Bölüm Açıklaması - Sağ Sütun */}
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Bölüm Açıklaması
                                  </h4>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {section.description || 'Bu bölüm için açıklama bulunmuyor.'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      // Video bölümleri
                      if (type === 'video') {
                        return (
                          <div className="space-y-3">
                            {/* Video Preview ve Bilgiler */}
                            <div className="flex gap-4">
                              {/* Video Preview */}
                              <div className="flex-shrink-0">
                                <div className="w-24 h-16 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                                  {(section as any).asset?.uri ? (
                                    <video 
                                      src={(section as any).asset.uri}
                                      className="w-full h-full object-cover"
                                      muted
                                      preload="metadata"
                                    />
                                  ) : (
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                              
                              {/* Video Bilgileri */}
                              <div className="flex-1 space-y-2">
                                {section.description && (
                                  <p className="text-sm text-gray-700">{section.description}</p>
                                )}
                                <div className="flex gap-4 text-sm text-gray-600">
                                  {section.duration && section.duration > 0 && (
                                    <span className="flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      {section.duration} saniye
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                                    </svg>
                                    {section.asset_id ? 'Video mevcut' : 'Video yok'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h10M7 4a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2" />
                                    </svg>
                                    Overlay sayısı: {(section as any).overlay_count || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      // Diğer bölüm tipleri
                      return (
                        <div className="text-sm text-gray-600">
                          {section.description || 'Açıklama bulunmuyor'}
                        </div>
                      );
                    })()}
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
          </TabsContent>

          <TabsContent value="evaluation" className="mt-6">
            <EvaluationCriteriaList
              trainingId={selectedTraining.id}
              trainingTitle={selectedTraining.title}
            />
          </TabsContent>
        </Tabs>
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
                  {(() => {
                    // Eğer atanmış bir eğitimse, atanmış olduğu firmanın adını göster
                    if ((training as any).is_assigned) {
                      return (training as any).company_assignment?.name || 'Atanmış Eğitim';
                    }
                    // Eğer kopyalanmış bir eğitimse, kendi firmasının adını göster
                    if ((training as any).company?.display_name) {
                      return (training as any).company.display_name;
                    }
                    // Sistem eğitimi
                    return 'Sistem Eğitimi';
                  })()}
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

                {/* Bölüm Sayısı */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Bölümler:</span>
                    <span className="ml-1">{(training as any).section_count || 0} bölüm</span>
                  </div>
                </div>

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
              <div className="pt-4 border-t border-gray-100 space-y-3">
                {/* Primary Action */}
                <button
                  onClick={() => handleTrainingSelect(training)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Bölümleri Yönet
                </button>
                
                {/* Secondary Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditTraining(training)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-200"
                      title="Eğitimi Düzenle"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Düzenle
                    </button>
                    
                    <button
                      onClick={() => handleDeleteTraining(training)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-200"
                      title="Eğitimi Sil"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Sil
                    </button>
                  </div>
                  
                  <div className="text-xs text-gray-400 font-mono">
                    ID: {training.id.substring(0, 8)}...
                  </div>
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
              onDone={() => {
                setShowCreateTrainingModal(false);
                loadTrainings();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
