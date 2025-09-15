'use client';

import { useState, useEffect } from 'react';
import { api, Asset } from '@/lib/api';

interface VideoPreviewProps {
  assetId?: string;
  className?: string;
}

export function VideoPreview({ assetId, className = "" }: VideoPreviewProps) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (assetId) {
      loadAsset();
    } else {
      setAsset(null);
      setError(null);
    }
  }, [assetId]);

  const loadAsset = async () => {
    if (!assetId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAsset(assetId);
      setAsset(data);
    } catch (error) {
      console.error('Error loading asset:', error);
      setError('Video yüklenirken hata oluştu');
      setAsset(null);
    } finally {
      setLoading(false);
    }
  };

  const getVideoUrl = (uri: string) => {
    // If it's already a full URL, return as is
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      return uri;
    }
    
    // If it's a MinIO object name, construct the URL
    const cdn = (process.env.NEXT_PUBLIC_CDN_URL || 'http://yodea.hexense.ai:9000/lxplayer').replace(/\/$/, '');
    return `${cdn}/${encodeURIComponent(uri)}`;
  };

  if (!assetId) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 text-center ${className}`}>
        <div className="text-gray-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">Video seçilmedi</p>
        <p className="text-xs text-gray-400 mt-1">Bir video seçin, önizleme burada görünecek</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">Video yükleniyor...</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className={`bg-red-50 rounded-lg p-4 text-center ${className}`}>
        <div className="text-red-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-red-600">{error || 'Video bulunamadı'}</p>
      </div>
    );
  }

  if (asset.kind !== 'video') {
    return (
      <div className={`bg-yellow-50 rounded-lg p-4 text-center ${className}`}>
        <div className="text-yellow-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-sm text-yellow-600">Seçilen içerik video değil</p>
        <p className="text-xs text-yellow-500 mt-1">Sadece video içerikler önizlenebilir</p>
      </div>
    );
  }

  const videoUrl = getVideoUrl(asset.uri);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 truncate" title={asset.title}>
          {asset.title}
        </h3>
        {asset.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2" title={asset.description}>
            {asset.description}
          </p>
        )}
      </div>
      
      <div className="relative">
        <video
          controls
          className="w-full h-48 object-cover"
          preload="metadata"
          onError={(e) => {
            console.error('Video load error:', e);
            setError('Video oynatılamadı');
          }}
        >
          <source src={videoUrl} type="video/mp4" />
          <source src={videoUrl} type="video/webm" />
          <source src={videoUrl} type="video/ogg" />
          Tarayıcınız video oynatmayı desteklemiyor.
        </video>
        
        {/* Video overlay with asset info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <div className="flex items-center justify-between text-white text-xs">
            <span className="bg-blue-600 px-2 py-1 rounded">Video</span>
            <span className="bg-black/50 px-2 py-1 rounded">
              ID: {asset.id.substring(0, 8)}...
            </span>
          </div>
        </div>
      </div>
      
      <div className="p-3 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Video Önizleme</span>
          <button
            onClick={loadAsset}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Yenile
          </button>
        </div>
      </div>
    </div>
  );
}