'use client';

import { useState, useEffect } from 'react';
import { api, GlobalFrameConfig } from '@/lib/api';
import GlobalFrameConfigModal from '@/components/admin/forms/GlobalFrameConfigModal';

export default function GlobalFrameConfigsPage() {
  const [globalFrameConfigs, setGlobalFrameConfigs] = useState<GlobalFrameConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGlobalConfigId, setEditingGlobalConfigId] = useState<string | undefined>(undefined);

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

  useEffect(() => {
    loadGlobalFrameConfigs();
  }, []);

  const handleCreateNew = () => {
    setEditingGlobalConfigId(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (globalConfigId: string) => {
    setEditingGlobalConfigId(globalConfigId);
    setIsModalOpen(true);
  };

  const handleDelete = async (globalConfigId: string) => {
    if (!confirm('Bu global frame konfigürasyonunu silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await api.deleteGlobalFrameConfig(globalConfigId);
      await loadGlobalFrameConfigs();
    } catch (error) {
      console.error('Error deleting global frame config:', error);
      alert('Global frame konfigürasyonu silinirken hata oluştu');
    }
  };

  const handleModalSuccess = () => {
    loadGlobalFrameConfigs();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Global Frame Konfigürasyonları</h1>
          <p className="text-gray-600 mt-1">Tüm bölümler için kullanılabilir varsayılan frame ayarları</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Yeni Global Frame Konfigürasyonu
        </button>
      </div>

      {globalFrameConfigs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz global frame konfigürasyonu yok</h3>
          <p className="text-gray-500 mb-4">
            Global frame konfigürasyonları tüm bölümler için kullanılabilir varsayılan ayarlardır. 
            Bu ayarlar bölüm özelinde kopyalanıp özelleştirilebilir.
          </p>
          <button
            onClick={handleCreateNew}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            İlk Global Frame Konfigürasyonunu Oluştur
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {globalFrameConfigs.map((config) => (
            <div key={config.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{config.name}</h3>
                    {!config.is_active && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        Pasif
                      </span>
                    )}
                  </div>
                  {config.description && (
                    <p className="text-gray-600 mb-3">{config.description}</p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Pozisyon:</span>
                      <div className="font-medium">
                        X: {config.object_position_x}%, Y: {config.object_position_y}%
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Zoom:</span>
                      <div className="font-medium">{config.scale}x</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Transform Origin:</span>
                      <div className="font-medium">
                        X: {config.transform_origin_x}%, Y: {config.transform_origin_y}%
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Geçiş:</span>
                      <div className="font-medium">{config.transition_duration}s</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(config.id)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDelete(config.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <GlobalFrameConfigModal
        globalConfigId={editingGlobalConfigId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
