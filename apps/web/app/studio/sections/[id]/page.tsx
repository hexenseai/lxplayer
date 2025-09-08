'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@lxplayer/ui';
import { Button } from '@lxplayer/ui';
import { api, TrainingSection } from '@/lib/api';

export default function SectionEditPage() {
  const router = useRouter();
  const params = useParams();
  const sectionId = params.id as string;
  
  const [section, setSection] = useState<TrainingSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    script: '',
    duration: 0,
    video_object: '',
    asset_id: '',
    order_index: 0
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
          order_index: foundSection.order_index
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
          onClick={() => router.back()}
          className="mb-4"
        >
          ← Geri Dön
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

              <div>
                <label className="block text-sm font-medium mb-2">Asset ID</label>
                <input
                  type="text"
                  value={formData.asset_id}
                  onChange={(e) => setFormData({...formData, asset_id: e.target.value})}
                  className="w-full p-2 border rounded-md"
                  placeholder="Asset ID"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
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
    </div>
  );
}
