'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, FrameConfig, GlobalFrameConfig } from '@/lib/api';
import FrameConfigModal from '../../../components/FrameConfigModal';

export default function FrameConfigsPage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const sectionId = params.id;
  const [frameConfigs, setFrameConfigs] = useState<FrameConfig[]>([]);
  const [globalFrameConfigs, setGlobalFrameConfigs] = useState<GlobalFrameConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFrameConfigId, setEditingFrameConfigId] = useState<string | undefined>(undefined);
  const [creatingDefaults, setCreatingDefaults] = useState(false);

  const loadFrameConfigs = async () => {
    try {
      setLoading(true);
      const [configs, globalConfigs] = await Promise.all([
        api.listSectionFrameConfigs(sectionId),
        api.listGlobalFrameConfigs()
      ]);
      setFrameConfigs(configs);
      setGlobalFrameConfigs(globalConfigs);
    } catch (error) {
      console.error('Error loading frame configs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFrameConfigs();
  }, [sectionId]);

  const handleCreateNew = () => {
    setEditingFrameConfigId(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (frameConfigId: string) => {
    setEditingFrameConfigId(frameConfigId);
    setIsModalOpen(true);
  };

  const handleDelete = async (frameConfigId: string) => {
    if (!confirm('Bu frame konfigürasyonunu silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await api.deleteFrameConfig(frameConfigId);
      await loadFrameConfigs();
    } catch (error) {
      console.error('Error deleting frame config:', error);
      alert('Frame konfigürasyonu silinirken hata oluştu');
    }
  };

  const handleCopyFromGlobal = async (globalConfigId: string) => {
    try {
      await api.copyFrameConfigFromGlobal(sectionId, globalConfigId);
      await loadFrameConfigs();
      alert('Global frame konfigürasyonu başarıyla kopyalandı!');
    } catch (error) {
      console.error('Error copying from global config:', error);
      alert('Global frame konfigürasyonu kopyalanırken hata oluştu');
    }
  };

  const handleCreateDefaults = async () => {
    if (!confirm('Tüm aktif global frame konfigürasyonlarını bu bölüme kopyalamak istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setCreatingDefaults(true);
      const activeGlobalConfigs = globalFrameConfigs.filter(config => config.is_active);
      
      for (const globalConfig of activeGlobalConfigs) {
        await api.copyFrameConfigFromGlobal(sectionId, globalConfig.id);
      }
      
      await loadFrameConfigs();
      alert(`${activeGlobalConfigs.length} global frame konfigürasyonu başarıyla kopyalandı!`);
    } catch (error) {
      console.error('Error creating defaults:', error);
      alert('Varsayılan konfigürasyonlar oluşturulurken hata oluştu');
    } finally {
      setCreatingDefaults(false);
    }
  };

  const handleModalSuccess = () => {
    loadFrameConfigs();
  };

  if (loading) {
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => router.push(`/studio/sections/${sectionId}`)}
          className="text-primary hover:text-primary/80 text-sm font-medium mb-4"
        >
          ← Bölüm Düzenleme Formuna Dön
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Frame Konfigürasyonları</h1>
            <p className="text-gray-600 mb-4">Bu bölüm için özel frame ayarları</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateNew}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Yeni Frame Konfigürasyonu
            </button>
            <a
              href="/admin/frame-configs"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Global Ayarlar
            </a>
          </div>
        </div>
      </div>

      {/* Global Frame Configurations Section */}
      {globalFrameConfigs.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Global Frame Konfigürasyonlarından Kopyala</h2>
            <button
              onClick={handleCreateDefaults}
              disabled={creatingDefaults || globalFrameConfigs.filter(c => c.is_active).length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {creatingDefaults ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Varsayılan Oluştur
                </>
              )}
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Tüm aktif global frame konfigürasyonlarını bu bölüme kopyalamak için "Varsayılan Oluştur" butonunu kullanın, 
            veya tek tek kopyalamak için aşağıdaki kartlardan birini seçin.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalFrameConfigs.map((globalConfig) => (
              <div key={globalConfig.id} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-medium text-gray-900">{globalConfig.name}</h3>
                  {!globalConfig.is_active && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                      Pasif
                    </span>
                  )}
                </div>
                {globalConfig.description && (
                  <p className="text-xs text-gray-600 mb-3">{globalConfig.description}</p>
                )}
                <div className="text-xs text-gray-500 space-y-1 mb-3">
                  <div>Pozisyon: X: {globalConfig.object_position_x}%, Y: {globalConfig.object_position_y}%</div>
                  <div>Zoom: {globalConfig.scale}x</div>
                  <div>Geçiş: {globalConfig.transition_duration}s</div>
                </div>
                <button
                  onClick={() => handleCopyFromGlobal(globalConfig.id)}
                  disabled={!globalConfig.is_active}
                  className="w-full px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Bu Ayarları Kopyala
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Frame Configurations */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bu Bölümün Frame Konfigürasyonları</h2>
        {frameConfigs.length > 0 && (
          <p className="text-sm text-gray-600 mb-4">
            Bu bölüm için özel frame konfigürasyonları mevcut. Bu ayarlar global ayarları geçersiz kılar.
          </p>
        )}
      </div>

      {frameConfigs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz frame konfigürasyonu yok</h3>
          <p className="text-gray-500 mb-4">
            Bu bölüm için özel frame konfigürasyonları oluşturarak video odak ve zoom ayarlarını özelleştirebilirsiniz.
            Yukarıdaki global konfigürasyonlardan kopyalayabilir veya yeni bir tane oluşturabilirsiniz.
          </p>
          <button
            onClick={handleCreateNew}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            İlk Frame Konfigürasyonunu Oluştur
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {frameConfigs.map((config) => (
            <div key={config.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{config.name}</h3>
                    {config.is_default && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Varsayılan
                      </span>
                    )}
                    {config.global_config_id && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        Global'den Kopya
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

      <FrameConfigModal
        sectionId={sectionId}
        frameConfigId={editingFrameConfigId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
