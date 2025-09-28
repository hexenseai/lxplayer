"use client";

import React, { useState, useEffect } from 'react';
import { CompanyUserSection } from '@/components/CompanyUserSection';
import { Button } from '@lxplayer/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@lxplayer/ui';
import { Badge } from '@lxplayer/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@lxplayer/ui';
import { 
  Target, 
  FileText, 
  BarChart3, 
  Settings,
  Loader2,
  AlertCircle,
  Plus
} from 'lucide-react';
import EvaluationCriteriaList from '@/components/admin/EvaluationCriteriaList';
import { api } from '@/lib/api';

interface Training {
  id: string;
  title: string;
  description?: string;
  company_id?: string;
}

export default function StudioTrainingEditor({ params }: { params: { id: string } }) {
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Eğitimi yükle
  const loadTraining = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTraining(params.id);
      setTraining(data);
    } catch (err) {
      setError('Eğitim yüklenirken hata oluştu');
      console.error('Training load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTraining();
  }, [params.id]);

  if (loading) {
    return (
      <>
        <CompanyUserSection />
        <main className="p-8">
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </main>
      </>
    );
  }

  if (error || !training) {
    return (
      <>
        <CompanyUserSection />
        <main className="p-8">
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Eğitim yüklenemedi</h3>
            <p className="text-muted-foreground text-center">
              {error || 'Eğitim bulunamadı'}
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <CompanyUserSection />
      <main className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Studio: {training.title}</h1>
            <p className="text-muted-foreground">
              Eğitim düzenleme ve yönetim paneli
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Studio
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="sections">Bölümler</TabsTrigger>
            <TabsTrigger value="evaluation">Değerlendirme</TabsTrigger>
            <TabsTrigger value="settings">Ayarlar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Eğitim Bilgileri</CardTitle>
                <CardDescription>
                  Bu eğitimin temel bilgileri ve istatistikleri
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold">Başlık:</h3>
                  <p className="text-muted-foreground">{training.title}</p>
                </div>
                {training.description && (
                  <div>
                    <h3 className="font-semibold">Açıklama:</h3>
                    <p className="text-muted-foreground">{training.description}</p>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold">Eğitim ID:</h3>
                  <p className="text-muted-foreground font-mono text-sm">{training.id}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sections" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Eğitim Bölümleri</CardTitle>
                <CardDescription>
                  Bu eğitimin bölümlerini yönetin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Bölüm yönetimi burada olacak. (Mevcut bölüm sistemi entegre edilecek)
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evaluation" className="mt-6">
            <EvaluationCriteriaList
              trainingId={params.id}
              trainingTitle={training.title}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Eğitim Ayarları</CardTitle>
                <CardDescription>
                  Bu eğitimin genel ayarları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Eğitim ayarları burada olacak.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
