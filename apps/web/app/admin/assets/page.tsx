"use client";

import { api, Asset as AssetT } from '@/lib/api';
import { AdminNav } from '@/components/admin/AdminNav';
import { AssetForm } from '@/components/admin/forms/AssetForm';
import { Drawer } from '@/components/admin/Drawer';
import { VideoPreview } from '@/components/admin/VideoPreview';
import { DeleteAssetButton } from '@/components/admin/DeleteAssetButton';
import { HtmlPreviewButton } from '@/components/admin/HtmlPreviewButton';
import { HtmlPreviewModal, useHtmlPreviewModal } from '@/components/admin/HtmlPreviewModal';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminAssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<AssetT[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, htmlContent, title, openModal, closeModal } = useHtmlPreviewModal();
  
  const cdn = process.env.NEXT_PUBLIC_CDN_URL || 'http://localhost:9000/lxplayer';
  
  useEffect(() => {
    const loadAssets = async () => {
      try {
        const assetsData = await api.listAssets();
        setAssets(assetsData);
      } catch (error) {
        console.error('API Error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadAssets();
  }, []);
  
  const getKindLabel = (kind: string) => {
    const labels = {
      'video': 'Video',
      'image': 'Resim',
      'audio': 'Ses',
      'doc': 'Doküman'
    };
    return labels[kind as keyof typeof labels] || kind;
  };

  const getKindBadgeColor = (kind: string) => {
    const colors = {
      'video': 'bg-blue-100 text-blue-800',
      'image': 'bg-green-100 text-green-800',
      'audio': 'bg-purple-100 text-purple-800',
      'doc': 'bg-gray-100 text-gray-800'
    };
    return colors[kind as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <main className="p-0">
        <AdminNav />
        <div className="p-8">
          <div className="text-center">Yükleniyor...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-0">
      <AdminNav />
      <div className="p-8 space-y-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">AI İçerik Oluştur</h2>
          <Generator onGenerated={() => router.refresh()} />
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">İçerikler</h1>
          <Drawer buttonLabel="Yeni İçerik Ekle" title="Yeni İçerik">
            <AssetForm onDone={() => router.refresh()} />
          </Drawer>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İçerik
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tür
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URI
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Önizleme
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900">
                          {asset.title}
                        </div>
                        {asset.description && (
                          <div className="text-sm text-gray-500 mt-1 max-w-xs truncate">
                            {asset.description}
                          </div>
                        )}
                        {asset.html_content && (
                          <div className="text-xs text-blue-600 mt-1">
                            📝 HTML içerik mevcut
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getKindBadgeColor(asset.kind)}`}>
                        {getKindLabel(asset.kind)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {asset.uri.length > 30 ? `${asset.uri.substring(0, 30)}...` : asset.uri}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {asset.kind === 'video' ? (
                        <VideoPreview uri={asset.uri} title={asset.title} />
                      ) : asset.kind === 'doc' && asset.html_content ? (
                        <HtmlPreviewButton 
                          htmlContent={asset.html_content} 
                          title={asset.title} 
                        />
                      ) : (
                        <a
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          href={`${cdn}/${encodeURIComponent(asset.uri)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Önizle
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <Drawer buttonLabel="Düzenle" title="İçeriği Düzenle">
                          <AssetForm initialAsset={asset as any} onDone={() => router.refresh()} />
                        </Drawer>
                        <DeleteAssetButton assetId={asset.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {assets.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-sm">
                Henüz içerik eklenmemiş. Yeni içerik eklemek için yukarıdaki butonu kullanın.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HTML Preview Modal */}
      <HtmlPreviewModal
        isOpen={isOpen}
        htmlContent={htmlContent}
        title={title}
        onClose={closeModal}
      />
    </main>
  );
}

function Generator({ onGenerated }: { onGenerated: () => void }) {
  const [tab, setTab] = useState<'image' | 'video'>('image');
  const [provider, setProvider] = useState<'openai' | 'google' | 'luma'>('google');
  const [model, setModel] = useState<string>('imagen-3.0-fast');
  const [prompt, setPrompt] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [resultUri, setResultUri] = useState<string | null>(null);
  const [size, setSize] = useState<string>('1920x1080');
  const cdn = process.env.NEXT_PUBLIC_CDN_URL || 'http://localhost:9000/lxplayer';

  const imageModels: Record<'openai' | 'google' | 'luma', string[]> = {
    openai: ['gpt-image-1'],
    google: ['imagen-3.0', 'imagen-3.0-fast'],
    luma: ['photon-1', 'photon-flash-1'],
  };
  const videoModels: Record<'openai' | 'google' | 'luma', string[]> = {
    openai: ['unavailable'],
    google: ['unavailable'],
    luma: ['ray-1-6', 'ray-2', 'ray-flash-2'],
  };

  // Size options per provider/model (image)
  const imageSizesByProvider: Record<'openai' | 'google' | 'luma', string[]> = {
    openai: ['1024x1024', '1536x1024', '1024x1536'],
    google: ['1280x720', '1920x1080', '2560x1440', '3840x2160'],
    luma:   ['1280x720', '1920x1080', '2560x1440', '3840x2160'],
  };

  // Size options for video (placeholder)
  const videoSizes: string[] = ['1280x720', '1920x1080'];

  const commonTags = [
    'photorealistic', 'cinematic lighting', 'ultra-detailed', 'soft focus',
    'studio light', 'high contrast', 'vibrant colors', 'minimalist', 'flat design',
  ];

  const selectedModels = (tab === 'image' ? (imageModels as any)[provider] : (videoModels as any)[provider]) ?? [];

  useEffect(() => {
    // enforce provider defaults per tab
    if (tab === 'video' && provider !== 'luma') {
      setProvider('luma');
      setModel('ray-1-6');
      setSize('1920x1080');
      return;
    }
    setModel(selectedModels[0] || '');
    // reset default size when provider/tab changes
    if (tab === 'image') {
      setSize((provider === 'google' || provider === 'luma') ? '1920x1080' : '1536x1024');
    } else {
      setSize('1920x1080');
    }
  }, [provider, tab]);

  // Ensure model is always valid for current provider/tab
  useEffect(() => {
    if (selectedModels.length > 0 && !selectedModels.includes(model)) {
      setModel(selectedModels[0]);
    }
  }, [selectedModels]);

  const toggleTag = (t: string) => {
    setTags((cur) => (cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t]));
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    setResultUri(null);
    try {
      const [wStr, hStr] = size.split('x');
      const width = parseInt(wStr, 10);
      const height = parseInt(hStr, 10);
      if (tab === 'image') {
        const res = await api.generateImage({ provider, model, prompt, tags, width, height });
        setResultUri(res.uri);
      } else {
        const res: any = await api.generateVideo({ provider, model, prompt, tags, width, height, duration_seconds: 5 });
        if ('detail' in res) {
          alert(res.detail);
        } else if ((res as any).uri) {
          setResultUri((res as any).uri);
        }
      }
    } catch (e: any) {
      alert(e?.message || 'Oluşturma sırasında hata oluştu');
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async () => {
    if (!resultUri) return;
    const title = prompt.split('\n')[0].slice(0, 60) || (tab === 'image' ? 'AI Image' : 'AI Video');
    try {
      const kind = tab === 'image' ? 'image' : 'video';
      await api.createAsset({ title, kind, uri: resultUri });
      onGenerated();
      setPrompt('');
      setTags([]);
      setResultUri(null);
    } catch (e: any) {
      alert(e?.message || 'İçeriğe eklenirken hata oluştu');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button className={`px-3 py-1 rounded ${tab === 'image' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={() => setTab('image')}>Görsel</button>
        <button className={`px-3 py-1 rounded ${tab === 'video' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={() => setTab('video')}>Video</button>
      </div>

      <div className={`grid grid-cols-1 ${resultUri ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-4`}>
        {/* Left: controls, prompt, tags, actions */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <label className="text-sm">Sağlayıcı</label>
            <select className="border rounded px-2 py-1" value={provider} onChange={(e) => setProvider(e.target.value as any)}>
              {tab === 'image' && (
                <>
                  <option value="openai">OpenAI</option>
                  <option value="google">Google AI</option>
                  <option value="luma">Luma</option>
                </>
              )}
              {tab === 'video' && (
                <option value="luma">Luma</option>
              )}
            </select>
            <label className="text-sm">Model</label>
            <select className="border rounded px-2 py-1" value={model} onChange={(e) => setModel(e.target.value)}>
              {(selectedModels || []).map((m: string) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <label className="text-sm">Boyut</label>
            <select className="border rounded px-2 py-1" value={size} onChange={(e) => setSize(e.target.value)}>
              {(tab === 'image' ? imageSizesByProvider[provider] : videoSizes).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <textarea
              className="w-full border rounded p-2 min-h-[180px]"
              placeholder="Prompt yazın..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div>
            <div className="text-sm mb-1">Hazır Etiketler</div>
            <div className="flex flex-wrap gap-2">
              {['photorealistic','cinematic lighting','ultra-detailed','soft focus','studio light','high contrast','vibrant colors','minimalist','flat design'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`text-xs px-2 py-1 rounded border ${tags.includes(t) ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white'}`}
                  onClick={() => toggleTag(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className={`px-4 py-2 rounded ${busy ? 'bg-gray-300' : 'bg-green-600 text-white'}`}
              disabled={busy}
              onClick={handleGenerate}
            >
              {busy ? 'Oluşturuluyor...' : 'Generate'}
            </button>
            <button
              className={`px-4 py-2 rounded ${!resultUri ? 'bg-gray-300' : 'bg-blue-600 text-white'}`}
              disabled={!resultUri}
              onClick={handleAdd}
            >
              Ekle
            </button>
          </div>
        </div>

        {/* Right: preview */}
        {resultUri && (
          <div className="p-3 border rounded bg-gray-50">
            <div className="text-sm font-medium mb-2">Önizleme</div>
            {tab === 'image' ? (
              <div className="relative w-full aspect-video bg-white border rounded overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Generated preview"
                  src={`${cdn}/${encodeURIComponent(resultUri)}`}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-full">
                <video className="w-full rounded border" controls>
                  <source src={`${cdn}/${encodeURIComponent(resultUri)}`} />
                </video>
              </div>
            )}
            <div className="text-xs text-gray-600 mt-2 break-all">{resultUri}</div>
          </div>
        )}
      </div>
    </div>
  );
}
