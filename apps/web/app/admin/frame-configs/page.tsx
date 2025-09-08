"use client";
import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { api, GlobalFrameConfig } from '@/lib/api';

export default function GlobalFrameConfigsPage() {
  const { user, loading: userLoading, isSuperAdmin, isAdmin } = useUser();
  const router = useRouter();
  const [globalFrameConfigs, setGlobalFrameConfigs] = useState<GlobalFrameConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<GlobalFrameConfig | null>(null);

  // Router redirect removed - now rendered within dashboard

  useEffect(() => {
    if (isSuperAdmin || isAdmin) {
      loadGlobalFrameConfigs();
    }
  }, [isSuperAdmin, isAdmin]);

  const loadGlobalFrameConfigs = async () => {
    try {
      setLoading(true);
      const configs = await api.listGlobalFrameConfigs();
      setGlobalFrameConfigs(configs);
    } catch (error) {
      console.error('Error loading global frame configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConfig = async (formData: FormData) => {
    try {
      const data = {
        name: formData.get('name') as string,
        description: formData.get('description') as string || undefined,
        object_position_x: parseFloat(formData.get('object_position_x') as string) || 50.0,
        object_position_y: parseFloat(formData.get('object_position_y') as string) || 50.0,
        scale: parseFloat(formData.get('scale') as string) || 1.0,
        transform_origin_x: parseFloat(formData.get('transform_origin_x') as string) || 50.0,
        transform_origin_y: parseFloat(formData.get('transform_origin_y') as string) || 50.0,
        transition_duration: parseFloat(formData.get('transition_duration') as string) || 0.8,
        transition_easing: formData.get('transition_easing') as string || 'cubic-bezier(0.4, 0, 0.2, 1)',
        is_active: formData.get('is_active') === 'on',
      };

      await api.createGlobalFrameConfig(data);
      setShowCreateForm(false);
      loadGlobalFrameConfigs();
    } catch (error) {
      console.error('Error creating global frame config:', error);
    }
  };

  const handleUpdateConfig = async (formData: FormData) => {
    if (!editingConfig) return;

    try {
      const data = {
        name: formData.get('name') as string,
        description: formData.get('description') as string || undefined,
        object_position_x: parseFloat(formData.get('object_position_x') as string) || 50.0,
        object_position_y: parseFloat(formData.get('object_position_y') as string) || 50.0,
        scale: parseFloat(formData.get('scale') as string) || 1.0,
        transform_origin_x: parseFloat(formData.get('transform_origin_x') as string) || 50.0,
        transform_origin_y: parseFloat(formData.get('transform_origin_y') as string) || 50.0,
        transition_duration: parseFloat(formData.get('transition_duration') as string) || 0.8,
        transition_easing: formData.get('transition_easing') as string || 'cubic-bezier(0.4, 0, 0.2, 1)',
        is_active: formData.get('is_active') === 'on',
      };

      await api.updateGlobalFrameConfig(editingConfig.id, data);
      setEditingConfig(null);
      loadGlobalFrameConfigs();
    } catch (error) {
      console.error('Error updating global frame config:', error);
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm('Bu frame konfigürasyonunu silmek istediğinizden emin misiniz?')) return;

    try {
      await api.deleteGlobalFrameConfig(configId);
      loadGlobalFrameConfigs();
    } catch (error) {
      console.error('Error deleting global frame config:', error);
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Frame Konfigürasyonları</h1>
            <p className="text-gray-600">
              {isSuperAdmin 
                ? 'Global frame konfigürasyonlarını yönetin'
                : 'Frame konfigürasyonlarını görüntüleyin'
              }
            </p>
          </div>
          {isSuperAdmin && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Yeni Konfigürasyon Ekle
            </button>
          )}
        </div>
      </div>

      {/* Create Config Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Yeni Frame Konfigürasyonu Ekle</h2>
            <form action={handleCreateConfig} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Object Position X (%)</label>
                  <input
                    type="number"
                    name="object_position_x"
                    defaultValue={50.0}
                    min={0}
                    max={100}
                    step={0.1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Object Position Y (%)</label>
                  <input
                    type="number"
                    name="object_position_y"
                    defaultValue={50.0}
                    min={0}
                    max={100}
                    step={0.1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scale</label>
                <input
                  type="number"
                  name="scale"
                  defaultValue={1.0}
                  min={0.1}
                  max={5.0}
                  step={0.1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transform Origin X (%)</label>
                  <input
                    type="number"
                    name="transform_origin_x"
                    defaultValue={50.0}
                    min={0}
                    max={100}
                    step={0.1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transform Origin Y (%)</label>
                  <input
                    type="number"
                    name="transform_origin_y"
                    defaultValue={50.0}
                    min={0}
                    max={100}
                    step={0.1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transition Duration (s)</label>
                  <input
                    type="number"
                    name="transition_duration"
                    defaultValue={0.8}
                    min={0}
                    max={10}
                    step={0.1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transition Easing</label>
                  <input
                    type="text"
                    name="transition_easing"
                    defaultValue="cubic-bezier(0.4, 0, 0.2, 1)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">Aktif</label>
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

      {/* Edit Config Modal */}
      {editingConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Frame Konfigürasyonunu Düzenle</h2>
            <form action={handleUpdateConfig} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingConfig.name}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <textarea
                  name="description"
                  defaultValue={editingConfig.description || ''}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Object Position X (%)</label>
                  <input
                    type="number"
                    name="object_position_x"
                    defaultValue={editingConfig.object_position_x}
                    min={0}
                    max={100}
                    step={0.1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Object Position Y (%)</label>
                  <input
                    type="number"
                    name="object_position_y"
                    defaultValue={editingConfig.object_position_y}
                    min={0}
                    max={100}
                    step={0.1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scale</label>
                <input
                  type="number"
                  name="scale"
                  defaultValue={editingConfig.scale}
                  min={0.1}
                  max={5.0}
                  step={0.1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transform Origin X (%)</label>
                  <input
                    type="number"
                    name="transform_origin_x"
                    defaultValue={editingConfig.transform_origin_x}
                    min={0}
                    max={100}
                    step={0.1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transform Origin Y (%)</label>
                  <input
                    type="number"
                    name="transform_origin_y"
                    defaultValue={editingConfig.transform_origin_y}
                    min={0}
                    max={100}
                    step={0.1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transition Duration (s)</label>
                  <input
                    type="number"
                    name="transition_duration"
                    defaultValue={editingConfig.transition_duration}
                    min={0}
                    max={10}
                    step={0.1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transition Easing</label>
                  <input
                    type="text"
                    name="transition_easing"
                    defaultValue={editingConfig.transition_easing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={editingConfig.is_active}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">Aktif</label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingConfig(null)}
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

      {/* Configs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {globalFrameConfigs.map((config) => (
          <div key={config.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{config.name}</h3>
                {config.description && (
                  <p className="text-sm text-gray-600">{config.description}</p>
                )}
              </div>
              <div className="flex space-x-2">
                {isSuperAdmin && (
                  <>
                    <button
                      onClick={() => setEditingConfig(config)}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDeleteConfig(config.id)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      Sil
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Position:</span>
                <span>{config.object_position_x}%, {config.object_position_y}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Scale:</span>
                <span>{config.scale}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Duration:</span>
                <span>{config.transition_duration}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Durum:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  config.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {config.is_active ? 'Aktif' : 'Pasif'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {globalFrameConfigs.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Henüz frame konfigürasyonu yok
            </h3>
            <p className="text-gray-600">
              İlk konfigürasyonu ekleyerek başlayın
            </p>
          </div>
        </div>
      )}
    </div>
  );
}