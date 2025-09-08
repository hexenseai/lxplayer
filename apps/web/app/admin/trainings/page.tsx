"use client";
import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { api, Training as TrainingT } from '@/lib/api';
import Link from 'next/link';

export default function AdminTrainingsPage() {
  const { user, loading: userLoading, isSuperAdmin, isAdmin } = useUser();
  const router = useRouter();
  const [trainings, setTrainings] = useState<TrainingT[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTraining, setEditingTraining] = useState<TrainingT | null>(null);

  // Router redirect removed - now rendered within dashboard

  useEffect(() => {
    if (isSuperAdmin || isAdmin) {
      loadTrainings();
    }
  }, [isSuperAdmin, isAdmin]);

  const loadTrainings = async () => {
    try {
      setLoading(true);
      const data = await api.listTrainings();
      setTrainings(data);
    } catch (error) {
      console.error('Error loading trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTraining = async (formData: FormData) => {
    try {
      const data = {
        title: formData.get('title') as string,
        description: formData.get('description') as string || undefined,
        flow_id: formData.get('flow_id') as string || undefined,
        ai_flow: formData.get('ai_flow') as string || undefined,
        company_id: isSuperAdmin ? (formData.get('company_id') as string || undefined) : user?.company_id,
      };

      await api.createTraining(data);
      setShowCreateForm(false);
      loadTrainings();
    } catch (error) {
      console.error('Error creating training:', error);
    }
  };

  const handleUpdateTraining = async (formData: FormData) => {
    if (!editingTraining) return;

    try {
      const data = {
        title: formData.get('title') as string,
        description: formData.get('description') as string || undefined,
        flow_id: formData.get('flow_id') as string || undefined,
        ai_flow: formData.get('ai_flow') as string || undefined,
        company_id: isSuperAdmin ? (formData.get('company_id') as string || undefined) : user?.company_id,
      };

      await api.updateTraining(editingTraining.id, data);
      setEditingTraining(null);
      loadTrainings();
    } catch (error) {
      console.error('Error updating training:', error);
    }
  };

  const handleDeleteTraining = async (trainingId: string) => {
    if (!confirm('Bu eğitimi silmek istediğinizden emin misiniz?')) return;

    try {
      await api.deleteTraining(trainingId);
      loadTrainings();
    } catch (error) {
      console.error('Error deleting training:', error);
    }
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Eğitim Yönetimi</h1>
            <p className="text-gray-600">
              {isSuperAdmin 
                ? 'Sistem eğitimlerini yönetin ve yeni eğitimler oluşturun'
                : 'Eğitimleri görüntüleyin ve firmanıza özel eğitimler oluşturun'
              }
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Yeni Eğitim Ekle
          </button>
        </div>
      </div>

      {/* Create Training Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Yeni Eğitim Ekle</h2>
            <form action={handleCreateTraining} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Eğitim Başlığı *</label>
                <input
                  type="text"
                  name="title"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <textarea
                  name="description"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flow ID</label>
                <input
                  type="text"
                  name="flow_id"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AI Flow (JSON)</label>
                <textarea
                  name="ai_flow"
                  rows={6}
                  placeholder='{"steps": [...], "conditions": [...]}'
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Training Modal */}
      {editingTraining && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Eğitimi Düzenle</h2>
            <form action={handleUpdateTraining} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Eğitim Başlığı *</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingTraining.title}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <textarea
                  name="description"
                  defaultValue={editingTraining.description || ''}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flow ID</label>
                <input
                  type="text"
                  name="flow_id"
                  defaultValue={editingTraining.flow_id || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AI Flow (JSON)</label>
                <textarea
                  name="ai_flow"
                  defaultValue={editingTraining.ai_flow || ''}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingTraining(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                >
                  Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trainings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trainings.map((training) => (
          <div key={training.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{training.title}</h3>
                {training.description && (
                  <p className="text-sm text-gray-600 line-clamp-3">{training.description}</p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingTraining(training)}
                  className="text-blue-600 hover:text-blue-900 text-sm"
                >
                  Düzenle
                </button>
                <button
                  onClick={() => handleDeleteTraining(training.id)}
                  className="text-red-600 hover:text-red-900 text-sm"
                >
                  Sil
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
              <Link
                href={`/studio?trainingId=${training.id}`}
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                Studio'da Aç →
              </Link>
              <div className="text-xs text-gray-500">
                ID: {training.id.substring(0, 8)}...
              </div>
            </div>
          </div>
        ))}
      </div>

      {trainings.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Henüz eğitim yok
            </h3>
            <p className="text-gray-600">
              İlk eğitimi ekleyerek başlayın
            </p>
          </div>
        </div>
      )}
    </div>
  );
}