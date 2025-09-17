'use client';

import { useState, useEffect } from 'react';
import { api, Asset } from '@/lib/api';
import { Button } from '@lxplayer/ui';

interface AssetSelectorProps {
  selectedAssetId?: string;
  onAssetSelect: (asset: Asset | null) => void;
  assetKind?: 'video' | 'image' | 'audio' | 'doc';
  placeholder?: string;
  className?: string;
}

export function AssetSelector({ 
  selectedAssetId, 
  onAssetSelect, 
  assetKind = 'video',
  placeholder = "Asset seçin",
  className = ""
}: AssetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Load assets on mount if selectedAssetId is provided
  useEffect(() => {
    if (selectedAssetId && assets.length === 0) {
      loadAssets();
    }
  }, [selectedAssetId]);

  // Update selected asset when assets are loaded or selectedAssetId changes
  useEffect(() => {
    if (selectedAssetId && assets.length > 0) {
      const asset = assets.find(a => a.id === selectedAssetId);
      setSelectedAsset(asset || null);
    } else if (!selectedAssetId) {
      setSelectedAsset(null);
    }
  }, [assets, selectedAssetId]);

  // Load assets immediately on mount if we have a selectedAssetId
  useEffect(() => {
    if (selectedAssetId) {
      loadAssets();
    }
  }, []);

  // Load assets when modal opens
  useEffect(() => {
    if (isOpen && assets.length === 0) {
      loadAssets();
    }
  }, [isOpen]);

  // Filter assets based on search term and kind
  useEffect(() => {
    let filtered = assets.filter(asset => asset.kind === assetKind);
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(asset => 
        asset.title.toLowerCase().includes(term) ||
        (asset.description && asset.description.toLowerCase().includes(term))
      );
    }
    
    setFilteredAssets(filtered);
  }, [assets, searchTerm, assetKind]);

  // Set selected asset when selectedAssetId changes
  useEffect(() => {
    if (selectedAssetId && assets.length > 0) {
      const asset = assets.find(a => a.id === selectedAssetId);
      setSelectedAsset(asset || null);
    } else {
      setSelectedAsset(null);
    }
  }, [selectedAssetId, assets]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await api.listAssets();
      setAssets(data);
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssetSelect = (asset: Asset) => {
    setSelectedAsset(asset);
    onAssetSelect(asset);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedAsset(null);
    onAssetSelect(null);
  };

  const getAssetIcon = (kind: string) => {
    switch (kind) {
      case 'video':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'image':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'audio':
        return (
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const getKindLabel = (kind: string) => {
    switch (kind) {
      case 'video': return 'Video';
      case 'image': return 'Resim';
      case 'audio': return 'Ses';
      case 'doc': return 'Doküman';
      default: return kind;
    }
  };

  return (
    <div className={className}>
      {/* Asset Selector Button */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex-1 flex items-center justify-between p-2 border border-gray-300 rounded-md hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <div className="flex items-center gap-2">
            {selectedAsset ? (
              <>
                {getAssetIcon(selectedAsset.kind)}
                <span className="text-sm">{selectedAsset.title}</span>
              </>
            ) : (
              <span className="text-sm text-gray-500">{placeholder}</span>
            )}
          </div>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {selectedAsset && (
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-2 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:border-red-400"
          >
            Temizle
          </button>
        )}
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsOpen(false)}
            ></div>

            {/* Modal Panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              {/* Header */}
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {getKindLabel(assetKind)} Seçin
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Search */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder={`${getKindLabel(assetKind)} ara...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Asset List */}
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
                  {loading ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      Yükleniyor...
                    </div>
                  ) : filteredAssets.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {searchTerm ? 'Arama kriterlerinize uygun asset bulunamadı' : `${getKindLabel(assetKind)} bulunamadı`}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredAssets.map((asset) => (
                        <button
                          key={asset.id}
                          onClick={() => handleAssetSelect(asset)}
                          className="w-full p-4 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              {getAssetIcon(asset.kind)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {asset.title}
                                </p>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {getKindLabel(asset.kind)}
                                </span>
                              </div>
                              {asset.description && (
                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                  {asset.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                ID: {asset.id.substring(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
