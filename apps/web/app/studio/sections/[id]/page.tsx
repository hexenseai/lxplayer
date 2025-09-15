'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@lxplayer/ui';
import { Button } from '@lxplayer/ui';
import { api, TrainingSection, Asset } from '@/lib/api';
import { AssetSelector } from '@/components/admin/AssetSelector';
import { VideoPreview } from '@/components/admin/VideoPreview';
import { TranscriptModal } from '@/components/admin/TranscriptModal';
import { DescriptionModal } from '@/components/admin/DescriptionModal';
import { HeyGenModal } from '@/components/admin/HeyGenModal';
import { LANGUAGES, TARGET_AUDIENCES } from '@/lib/constants';

export default function SectionEditPage() {
  const router = useRouter();
  const params = useParams();
  const sectionId = params.id as string;
  
  const [section, setSection] = useState<TrainingSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [generatedTranscript, setGeneratedTranscript] = useState('');
  const [generatedSrt, setGeneratedSrt] = useState('');
  const [generatedSegments, setGeneratedSegments] = useState<any[]>([]);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [showHeyGenModal, setShowHeyGenModal] = useState(false);
  const [dubbingLoading, setDubbingLoading] = useState(false);
  const [dubbingError, setDubbingError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    script: '',
    duration: 0,
    video_object: '',
    asset_id: '',
    order_index: 0,
    language: 'TR',
    target_audience: 'Genel',
    audio_asset_id: ''
  });

  useEffect(() => {
    if (sectionId) {
      loadSection();
    }
  }, [sectionId]);

  const loadSection = async () => {
    try {
      // Önce section'ı bulmak için training ID'ye ihtiyacımız var
      // Bu durumda tüm eğitimleri kontrol edelim
      const trainings = await api.listTrainings();
      let foundSection = null;
      let trainingId = null;

      for (const training of trainings) {
        try {
          const sections = await api.listTrainingSections(training.id);
          const section = sections.find(s => s.id === sectionId);
          if (section) {
            foundSection = section;
            trainingId = training.id;
            break;
          }
        } catch (error) {
          // Bu eğitimde section yok, devam et
        }
      }

      if (foundSection) {
        setSection(foundSection);
        setFormData({
          title: foundSection.title,
          description: foundSection.description || '',
          script: foundSection.script || '',
          duration: foundSection.duration || 0,
          video_object: foundSection.video_object || '',
          asset_id: foundSection.asset_id || '',
          order_index: foundSection.order_index,
          language: foundSection.language || 'TR',
          target_audience: foundSection.target_audience || 'Genel',
          audio_asset_id: foundSection.audio_asset_id || ''
        });
        
      }
    } catch (error) {
      console.error('Error loading section:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!section) return;
    
    setSaving(true);
    try {
      // Training ID'yi bul
      const trainings = await api.listTrainings();
      let trainingId = null;
      
      for (const training of trainings) {
        try {
          const sections = await api.listTrainingSections(training.id);
          const foundSection = sections.find(s => s.id === sectionId);
          if (foundSection) {
            trainingId = training.id;
            break;
          }
        } catch (error) {
          // Devam et
        }
      }

      if (trainingId) {
        console.log('🎥 Saving section with formData:', formData);
        await api.updateTrainingSection(trainingId, sectionId, formData);
        router.push(`/studio?trainingId=${trainingId}`);
      }
    } catch (error) {
      console.error('Error saving section:', error);
      alert('Bölüm kaydedilirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!section || !confirm('Bu bölümü silmek istediğinizden emin misiniz?')) return;
    
    try {
      // Training ID'yi bul
      const trainings = await api.listTrainings();
      let trainingId = null;
      
      for (const training of trainings) {
        try {
          const sections = await api.listTrainingSections(training.id);
          const foundSection = sections.find(s => s.id === sectionId);
          if (foundSection) {
            trainingId = training.id;
            break;
          }
        } catch (error) {
          // Devam et
        }
      }

      if (trainingId) {
        await api.deleteTrainingSection(trainingId, sectionId);
        router.push(`/studio?trainingId=${trainingId}`);
      }
    } catch (error) {
      console.error('Error deleting section:', error);
      alert('Bölüm silinirken hata oluştu');
    }
  };

  const handleGenerateTranscript = async () => {
    if (!section || !formData.asset_id) {
      alert('Transcript oluşturmak için önce bir video içerik seçmelisiniz.');
      return;
    }

    try {
      setTranscriptLoading(true);
      setTranscriptError(null);
      setShowTranscriptModal(true);
      
      // Training ID'yi bul
      const trainings = await api.listTrainings();
      let trainingId = null;
      
      for (const training of trainings) {
        try {
          const sections = await api.listTrainingSections(training.id);
          const foundSection = sections.find(s => s.id === sectionId);
          if (foundSection) {
            trainingId = training.id;
            break;
          }
        } catch (error) {
          // Devam et
        }
      }

      if (trainingId) {
        const result = await api.generateTranscript(trainingId, sectionId);
        console.log('API Response:', result);
        console.log('Transcript:', result.transcript);
        setGeneratedTranscript(result.transcript);
        setGeneratedSrt(result.srt || '');
        setGeneratedSegments(result.segments || []);
      } else {
        throw new Error('Training bulunamadı');
      }
    } catch (error: any) {
      console.error('Error generating transcript:', error);
      setTranscriptError(error?.message || 'Transcript oluşturulurken hata oluştu');
    } finally {
      setTranscriptLoading(false);
    }
  };

  const handleApproveTranscript = (transcript: string) => {
    setFormData({...formData, script: transcript});
    setGeneratedTranscript('');
    setGeneratedSrt('');
    setGeneratedSegments([]);
    setTranscriptError(null);
  };

  const handleGenerateDescription = async () => {
    if (!section) {
      alert('Bölüm bilgileri yüklenemedi.');
      return;
    }

    try {
      setDescriptionLoading(true);
      setDescriptionError(null);
      setShowDescriptionModal(true);
      
      // Training ID'yi bul
      const trainings = await api.listTrainings();
      let trainingId = null;
      
      for (const training of trainings) {
        try {
          const sections = await api.listTrainingSections(training.id);
          const foundSection = sections.find(s => s.id === sectionId);
          if (foundSection) {
            trainingId = training.id;
            break;
          }
        } catch (error) {
          // Devam et
        }
      }

      if (trainingId) {
        const result = await api.generateDescription(trainingId, sectionId);
        console.log('Description API Response:', result);
        console.log('Description:', result.description);
        setGeneratedDescription(result.description);
      } else {
        throw new Error('Training bulunamadı');
      }
    } catch (error: any) {
      console.error('Error generating description:', error);
      setDescriptionError(error?.message || 'Açıklama oluşturulurken hata oluştu');
    } finally {
      setDescriptionLoading(false);
    }
  };

  const handleApproveDescription = (description: string) => {
    setFormData({...formData, description: description});
    setGeneratedDescription('');
    setDescriptionError(null);
  };

  const handleHeyGenSuccess = (assetId: string) => {
    setFormData(prev => ({ ...prev, asset_id: assetId }));
    // Section'ı yeniden yükle
    loadSection();
  };

  const handleDubAudio = async () => {
    if (!section) return;
    
    setDubbingLoading(true);
    setDubbingError(null);
    
    try {
      const result = await api.dubAudio(section.training_id, section.id);
      console.log('Dubbing result:', result);
      
      // Section'ı yeniden yükle
      await loadSection();
      
      const message = result.is_srt_format 
        ? `Seslendirme başarıyla oluşturuldu! ${result.segments_count} segment işlendi, toplam süre: ${result.total_duration.toFixed(1)} saniye.`
        : 'Seslendirme başarıyla oluşturuldu ve bölüme eklendi!';
      
      alert(message);
      
    } catch (error: any) {
      console.error('Dubbing error:', error);
      setDubbingError(error?.message || 'Seslendirme oluşturma hatası');
    } finally {
      setDubbingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">Bölüm bulunamadı</div>
          <Button onClick={() => router.push('/studio')}>
            Studio'ya Dön
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => router.push(`/studio?trainingId=${section?.training_id}`)}
          className="mb-4"
        >
          ← Eğitime Dön
        </Button>
        <h1 className="text-3xl font-bold mb-2">Bölüm Düzenle</h1>
        <p className="text-gray-600">"{section.title}" bölümünü düzenleyin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Bölüm Bilgileri</CardTitle>
              <CardDescription>
                Bölüm detaylarını düzenleyin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Başlık</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full p-2 border rounded-md"
                  placeholder="Bölüm başlığı"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-2 border rounded-md h-24"
                  placeholder="Bölüm açıklaması"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Script</label>
                <textarea
                  value={formData.script}
                  onChange={(e) => setFormData({...formData, script: e.target.value})}
                  className="w-full p-2 border rounded-md h-32"
                  placeholder="Bölüm scripti"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Süre (saniye)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 0})}
                    className="w-full p-2 border rounded-md"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Sıra</label>
                  <input
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({...formData, order_index: parseInt(e.target.value) || 0})}
                    className="w-full p-2 border rounded-md"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Video Object</label>
                <input
                  type="text"
                  value={formData.video_object}
                  onChange={(e) => setFormData({...formData, video_object: e.target.value})}
                  className="w-full p-2 border rounded-md"
                  placeholder="Video object ID"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Dil</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({...formData, language: e.target.value})}
                    className="w-full p-2 border rounded-md"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Hedef Kitle</label>
                  <select
                    value={formData.target_audience}
                    onChange={(e) => setFormData({...formData, target_audience: e.target.value})}
                    className="w-full p-2 border rounded-md"
                  >
                    {TARGET_AUDIENCES.map((audience) => (
                      <option key={audience.id} value={audience.name}>
                        {audience.icon} {audience.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Video İçerik</label>
                <AssetSelector
                  selectedAssetId={formData.asset_id}
                  onAssetSelect={(asset: Asset | null) => {
                    console.log('🎥 Asset selected in Studio:', asset);
                    if (asset && asset.kind === 'video') {
                      setFormData({
                        ...formData, 
                        asset_id: asset.id,
                        video_object: asset.uri // Otomatik olarak video_object'i asset.uri ile doldur
                      });
                      console.log('🎥 Auto-updated video_object to:', asset.uri);
                    } else {
                      setFormData({
                        ...formData, 
                        asset_id: asset?.id || '',
                        video_object: '' // Asset seçimi kaldırıldığında video_object'i temizle
                      });
                      console.log('🎥 Cleared video_object');
                    }
                  }}
                  assetKind="video"
                  placeholder="Video içerik seçin"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Sadece video içerikler gösterilir. Seçilen video bölümün içeriği olarak kullanılacak.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ses Dosyası (Dublaj/Çeviri)</label>
                <AssetSelector
                  selectedAssetId={formData.audio_asset_id}
                  onAssetSelect={(asset: Asset | null) => {
                    setFormData({...formData, audio_asset_id: asset?.id || ''});
                  }}
                  assetKind="audio"
                  placeholder="Ses dosyası seçin (opsiyonel)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Video için farklı dilde seslendirme veya dublaj dosyası. Video sesini kapatıp bu ses dosyası ile oynatabilirsiniz.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Video Preview */}
          <VideoPreview 
            assetId={formData.asset_id} 
            className="mb-4"
          />
          
          <Card>
            <CardHeader>
              <CardTitle>İşlemler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="w-full"
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleGenerateTranscript}
                disabled={!formData.asset_id || transcriptLoading}
                className="w-full"
              >
                {transcriptLoading ? 'Transcript Oluşturuluyor...' : 'Transcript Oluştur'}
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleGenerateDescription}
                disabled={descriptionLoading || !formData.title.trim()}
                className="w-full"
              >
                {descriptionLoading ? 'Açıklama Oluşturuluyor...' : 'Açıklama Oluştur'}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setShowHeyGenModal(true)}
                disabled={!formData.script.trim()}
                className="w-full bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
              >
                Script'ten Video Oluştur
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleDubAudio}
                disabled={!formData.script.trim() || dubbingLoading}
                className="w-full bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                {dubbingLoading ? 'Seslendirme Oluşturuluyor...' : 'Farklı Bir Dilde Seslendir'}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => router.push(`/studio/sections/${sectionId}/overlays`)}
                className="w-full"
              >
                Overlay'leri Yönet
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => router.push(`/studio/sections/${sectionId}/frame-configs`)}
                className="w-full"
              >
                Frame Config'leri
              </Button>
              
              {dubbingError && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {dubbingError}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tehlikeli İşlemler</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                variant="destructive"
                onClick={handleDelete}
                className="w-full"
              >
                Bölümü Sil
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transcript Modal */}
      <TranscriptModal
        isOpen={showTranscriptModal}
        onClose={() => {
          setShowTranscriptModal(false);
          setGeneratedTranscript('');
          setGeneratedSrt('');
          setGeneratedSegments([]);
          setTranscriptError(null);
        }}
        onApprove={handleApproveTranscript}
        transcript={generatedTranscript}
        srt={generatedSrt}
        segments={generatedSegments}
        loading={transcriptLoading}
        error={transcriptError}
      />

      {/* Description Modal */}
      <DescriptionModal
        isOpen={showDescriptionModal}
        onClose={() => {
          setShowDescriptionModal(false);
          setGeneratedDescription('');
          setDescriptionError(null);
        }}
        onApprove={handleApproveDescription}
        description={generatedDescription}
        loading={descriptionLoading}
        error={descriptionError}
      />

      {/* HeyGen Modal */}
      {showHeyGenModal && section && (
        <HeyGenModal
          trainingId={section.training_id}
          sectionId={section.id}
          script={formData.script}
          title={formData.title}
          onClose={() => setShowHeyGenModal(false)}
          onSuccess={handleHeyGenSuccess}
        />
      )}
    </div>
  );
}
