'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { api, TrainingSection } from '@/lib/api';

export default function SectionOverlaysPage() {
  const router = useRouter();
  const params = useParams();
  const sectionId = params.id as string;
  const { user, loading: userLoading, isSuperAdmin, isAdmin } = useUser();
  
  const [section, setSection] = useState<TrainingSection | null>(null);
  const [trainingId, setTrainingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Section'ı bul
      const trainings = await api.listTrainings();
      let foundSection = null;
      let foundTrainingId = null;

      for (const training of trainings) {
        try {
          const sections = await api.listTrainingSections(training.id);
          const section = sections.find(s => s.id === sectionId);
          if (section) {
            foundSection = section;
            foundTrainingId = training.id;
            break;
          }
        } catch (error) {
          // Bu eğitimde section yok, devam et
        }
      }

      if (foundSection && foundTrainingId) {
        setSection(foundSection);
        setTrainingId(foundTrainingId);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin || isAdmin) {
      loadData();
    }
  }, [isSuperAdmin, isAdmin, sectionId]);

  // Preview sayfasına yönlendir
  useEffect(() => {
    if (trainingId && sectionId) {
      router.push(`/admin/trainings/${trainingId}/sections/${sectionId}/preview`);
    }
  }, [trainingId, sectionId, router]);

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

  if (!section || !trainingId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">Bölüm bulunamadı</div>
          <button
            onClick={() => router.push('/studio')}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Studio'ya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Overlay preview sayfasına yönlendiriliyor...</p>
        </div>
      </div>
    </div>
  );
}
