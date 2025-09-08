'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@lxplayer/ui';
import { Button } from '@lxplayer/ui';
import { api, Training } from '@/lib/api';

export default function NewSectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trainingId = searchParams.get('trainingId');
  
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    script: '',
    duration: 0,
    video_object: '',
    asset_id: '',
    order_index: 1
  });

  useEffect(() => {
    if (trainingId) {
      loadTraining();
    } else {
      setLoading(false);
    }
  }, [trainingId]);

  const loadTraining = async () => {
    try {
      const trainings = await api.listTrainings();
      const foundTraining = trainings.find(t => t.id === trainingId);
      if (foundTraining) {
        setTraining(foundTraining);
        
        // Yeni bölüm için sıra numarasını belirle
        try {
          const sections = await api.listTrainingSections(trainingId!);
          const maxOrder = sections.reduce((max, section) => Math.max(max, section.order_index), 0);
          setFormData(prev => ({ ...prev, order_index: maxOrder + 1 }));
        } catch (error) {
          // Bölüm yoksa 1'den başla
          setFormData(prev => ({ ...prev, order_index: 1 }));
        }
      }
    } catch (error) {
      console.error('Error loading training:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!trainingId || !formData.title.trim()) {
      alert('Başlık alanı zorunludur');
      return;
    }
    
    setSaving(true);
    try {
      await api.createTrainingSection(trainingId, formData);
      router.push(`/studio?trainingId=${trainingId}`);
    } catch (error) {
      console.error('Error creating section:', error);
      alert('Bölüm oluşturulurken hata oluştu');
    } finally {
      setSaving(false);
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

  if (!trainingId || !training) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">Eğitim bulunamadı</div>
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
          onClick={() => router.push(`/studio?trainingId=${trainingId}`)}
          className="mb-4"
        >
          ← Geri Dön
        </Button>
        <h1 className="text-3xl font-bold mb-2">Yeni Bölüm Oluştur</h1>
        <p className="text-gray-600">"{training.title}" eğitimi için yeni bölüm oluşturun</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Bölüm Bilgileri</CardTitle>
              <CardDescription>
                Yeni bölüm detaylarını girin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Başlık *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full p-2 border rounded-md"
                  placeholder="Bölüm başlığı"
                  required
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
                    onChange={(e) => setFormData({...formData, order_index: parseInt(e.target.value) || 1})}
                    className="w-full p-2 border rounded-md"
                    placeholder="1"
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
                disabled={saving || !formData.title.trim()}
                className="w-full"
              >
                {saving ? 'Oluşturuluyor...' : 'Bölümü Oluştur'}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => router.push(`/studio?trainingId=${trainingId}`)}
                className="w-full"
              >
                İptal
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eğitim Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                <p><strong>Eğitim:</strong> {training.title}</p>
                <p><strong>Açıklama:</strong> {training.description || 'Açıklama yok'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
