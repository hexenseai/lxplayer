'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface SystemContent {
  system_company: {
    id: string;
    name: string;
    description: string;
  };
  available_content: {
    styles: number;
    frame_configs: number;
    assets: number;
    trainings: number;
  };
}

interface Style {
  id: string;
  name: string;
  description: string;
  style_json: string;
  is_default: boolean;
}

interface FrameConfig {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
}

export default function ImportContent() {
  const [systemContent, setSystemContent] = useState<SystemContent | null>(null);
  const [availableStyles, setAvailableStyles] = useState<Style[]>([]);
  const [availableFrameConfigs, setAvailableFrameConfigs] = useState<FrameConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedFrameConfigs, setSelectedFrameConfigs] = useState<string[]>([]);

  useEffect(() => {
    loadSystemContent();
  }, []);

  const loadSystemContent = async () => {
    try {
      setLoading(true);
      const [content, styles, frameConfigs] = await Promise.all([
        api.get('/imports/available-content'),
        api.get('/imports/styles'),
        api.get('/imports/frame-configs')
      ]);
      
      setSystemContent(content);
      setAvailableStyles(styles);
      setAvailableFrameConfigs(frameConfigs);
    } catch (error) {
      console.error('Error loading system content:', error);
      alert('Sistem içeriği yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleStyleSelect = (styleId: string) => {
    setSelectedStyles(prev => 
      prev.includes(styleId) 
        ? prev.filter(id => id !== styleId)
        : [...prev, styleId]
    );
  };

  const handleFrameConfigSelect = (configId: string) => {
    setSelectedFrameConfigs(prev => 
      prev.includes(configId) 
        ? prev.filter(id => id !== configId)
        : [...prev, configId]
    );
  };

  const handleImportSelected = async () => {
    if (selectedStyles.length === 0 && selectedFrameConfigs.length === 0) {
      alert('Lütfen import etmek istediğiniz içerikleri seçin');
      return;
    }

    try {
      setImporting(true);
      let importedCount = 0;
      let errors: string[] = [];

      // Import selected styles
      for (const styleId of selectedStyles) {
        try {
          await api.post(`/imports/styles/${styleId}`);
          importedCount++;
        } catch (error) {
          const style = availableStyles.find(s => s.id === styleId);
          errors.push(`Stil "${style?.name}": ${error.message || 'Import hatası'}`);
        }
      }

      // Import selected frame configs
      for (const configId of selectedFrameConfigs) {
        try {
          await api.post(`/imports/frame-configs/${configId}`);
          importedCount++;
        } catch (error) {
          const config = availableFrameConfigs.find(c => c.id === configId);
          errors.push(`Frame Config "${config?.name}": ${error.message || 'Import hatası'}`);
        }
      }

      if (errors.length > 0) {
        alert(`Import tamamlandı!\n\nBaşarılı: ${importedCount}\nHatalar:\n${errors.join('\n')}`);
      } else {
        alert(`${importedCount} içerik başarıyla import edildi!`);
      }

      // Clear selections
      setSelectedStyles([]);
      setSelectedFrameConfigs([]);
      
      // Reload content
      loadSystemContent();
    } catch (error) {
      console.error('Error importing content:', error);
      alert('Import işlemi sırasında hata oluştu');
    } finally {
      setImporting(false);
    }
  };

  const handleImportAllStyles = async () => {
    if (!confirm('Tüm stilleri import etmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setImporting(true);
      const result = await api.post('/imports/styles/bulk');
      alert(`${result.imported_count} stil import edildi, ${result.skipped_count} stil atlandı`);
      loadSystemContent();
    } catch (error) {
      console.error('Error importing all styles:', error);
      alert('Stil import işlemi sırasında hata oluştu');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Sistem içeriği yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">İçerik İmport Et</h1>
        <p className="text-gray-600">
          Sistem firmasından default içerikleri kendi firmanıza import edebilirsiniz.
        </p>
      </div>

      {systemContent && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">{systemContent.system_company.name}</h3>
          <p className="text-blue-800 text-sm mb-3">{systemContent.system_company.description}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-blue-900">{systemContent.available_content.styles}</div>
              <div className="text-blue-700">Stil</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-blue-900">{systemContent.available_content.frame_configs}</div>
              <div className="text-blue-700">Frame Config</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-blue-900">{systemContent.available_content.assets}</div>
              <div className="text-blue-700">Asset</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-blue-900">{systemContent.available_content.trainings}</div>
              <div className="text-blue-700">Eğitim</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Styles Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Stiller</h3>
            <button
              onClick={handleImportAllStyles}
              disabled={importing || availableStyles.length === 0}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
            >
              Tümünü İmport Et
            </button>
          </div>
          
          {availableStyles.length === 0 ? (
            <p className="text-gray-500 text-sm">Import edilebilir stil bulunamadı</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableStyles.map((style) => (
                <label key={style.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedStyles.includes(style.id)}
                    onChange={() => handleStyleSelect(style.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">{style.name}</div>
                    {style.description && (
                      <div className="text-xs text-gray-500">{style.description}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Frame Configs Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Frame Configs</h3>
          </div>
          
          {availableFrameConfigs.length === 0 ? (
            <p className="text-gray-500 text-sm">Import edilebilir frame config bulunamadı</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableFrameConfigs.map((config) => (
                <label key={config.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedFrameConfigs.includes(config.id)}
                    onChange={() => handleFrameConfigSelect(config.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">{config.name}</div>
                    {config.description && (
                      <div className="text-xs text-gray-500">{config.description}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Import Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={handleImportSelected}
          disabled={importing || (selectedStyles.length === 0 && selectedFrameConfigs.length === 0)}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {importing ? 'İmport Ediliyor...' : `Seçilenleri İmport Et (${selectedStyles.length + selectedFrameConfigs.length})`}
        </button>
      </div>
    </div>
  );
}
