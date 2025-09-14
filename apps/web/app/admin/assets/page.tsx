"use client";
import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { api, Asset as AssetT } from '@/lib/api';
import { AssetForm } from '@/components/admin/forms/AssetForm';
import { AdvancedAIGenerateModal } from '@/components/admin/AdvancedAIGenerateModal';

export default function AdminAssetsPage() {
  const { user, loading: userLoading, isSuperAdmin, isAdmin } = useUser();
  const router = useRouter();
  const [assets, setAssets] = useState<AssetT[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetT | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [showAIGenerateModal, setShowAIGenerateModal] = useState(false);
  
  const cdn = process.env.NEXT_PUBLIC_CDN_URL || 'http://localhost:9000/lxplayer';

  // Router redirect removed - now rendered within dashboard

  useEffect(() => {
    if (isSuperAdmin || isAdmin) {
      loadAssets();
    }
  }, [isSuperAdmin, isAdmin]);

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


  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Bu içeriği silmek istediğinizden emin misiniz?')) return;

    try {
      await api.deleteAsset(assetId);
      loadAssets();
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  const handlePreviewHtml = (htmlContent: string, title: string) => {
    setPreviewHtml(htmlContent);
    setPreviewTitle(title);
  };

  const closePreview = () => {
    setPreviewHtml(null);
    setPreviewTitle('');
  };

  const handleAIGenerateSuccess = (assetId: string) => {
    // AI ile üretilen asset'i listeye ekle
    loadAssets();
    setShowAIGenerateModal(false);
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">İçerik Yönetimi</h1>
            <p className="text-gray-600">
              {isSuperAdmin 
                ? 'Sistem içeriklerini yönetin ve yeni içerikler oluşturun'
                : 'İçerikleri görüntüleyin ve firmanıza özel içerikler oluşturun'
              }
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAIGenerateModal(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>AI İçerik Üret</span>
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Yeni İçerik Ekle
            </button>
          </div>
        </div>
      </div>

      {/* Create Asset Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Yeni İçerik Ekle</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <AssetForm onDone={() => {
              setShowCreateForm(false);
              loadAssets();
            }} />
          </div>
        </div>
      )}

      {/* Edit Asset Modal */}
      {editingAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">İçeriği Düzenle</h2>
              <button
                onClick={() => setEditingAsset(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <AssetForm 
              initialAsset={editingAsset}
              onDone={() => {
                setEditingAsset(null);
                loadAssets();
              }} 
            />
          </div>
        </div>
      )}

      {/* AI Generate Modal */}
      {showAIGenerateModal && (
        <AdvancedAIGenerateModal
          onClose={() => setShowAIGenerateModal(false)}
          onSuccess={handleAIGenerateSuccess}
        />
      )}

      {/* HTML Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">HTML Önizleme - {previewTitle}</h2>
              <button
                onClick={closePreview}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div 
              className="border rounded-lg p-4 bg-gray-50"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      )}

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assets.map((asset) => (
          <div key={asset.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{asset.title}</h3>
                {asset.description && (
                  <p className="text-sm text-gray-600">{asset.description}</p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingAsset(asset)}
                  className="text-blue-600 hover:text-blue-900 text-sm"
                >
                  Düzenle
                </button>
                <button
                  onClick={() => handleDeleteAsset(asset.id)}
                  className="text-red-600 hover:text-red-900 text-sm"
                >
                  Sil
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  asset.kind === 'video' 
                    ? 'bg-red-100 text-red-800' 
                    : asset.kind === 'audio'
                    ? 'bg-blue-100 text-blue-800'
                    : asset.kind === 'image'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {asset.kind}
                </span>
              </div>
              
              {asset.kind === 'video' && (
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <video 
                    src={asset.uri.startsWith('http') ? asset.uri : `${cdn}/${asset.uri}`}
                    controls 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {asset.kind === 'image' && (
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={asset.uri.startsWith('http') ? asset.uri : `${cdn}/${asset.uri}`}
                    alt={asset.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {asset.kind === 'audio' && (
                <div className="bg-gray-100 rounded-lg p-4">
                  <audio 
                    src={asset.uri.startsWith('http') ? asset.uri : `${cdn}/${asset.uri}`}
                    controls 
                    className="w-full"
                  />
                </div>
              )}
              
              {asset.html_content && (
                <div className="mt-2">
                  <button
                    onClick={() => handlePreviewHtml(asset.html_content!, asset.title)}
                    className="text-sm text-blue-600 hover:text-blue-900"
                  >
                    HTML Önizleme
                  </button>
                </div>
              )}
            </div>
            
            <div className="text-xs text-gray-500">
              URI: {asset.uri}
            </div>
          </div>
        ))}
      </div>

      {assets.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Henüz içerik yok
            </h3>
            <p className="text-gray-600">
              İlk içeriği ekleyerek başlayın
            </p>
          </div>
        </div>
      )}
    </div>
  );
}