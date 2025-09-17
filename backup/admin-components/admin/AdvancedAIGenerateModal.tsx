'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface AIGenerateModalProps {
  onClose: () => void;
  onSuccess: (assetId: string) => void;
}

interface GeneratedContent {
  uri: string;
  content_type: string;
  prompt: string;
  provider: string;
  model: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
}

const PLATFORMS = {
  image: [
    { value: 'openai', label: 'OpenAI DALL-E', models: ['dall-e-3', 'dall-e-2'] },
    { value: 'google', label: 'Google Imagen', models: ['imagen-3.0-fast', 'imagen-3.0', 'imagen-3.0-generate-002'] },
    { value: 'luma', label: 'Luma AI', models: ['photon-1'] },
  ],
  video: [
    { value: 'luma', label: 'Luma AI', models: ['ray-1-6', 'ray-2', 'ray-flash-2'] },
    { value: 'heygen', label: 'HeyGen', models: ['v2', 'v1'] },
  ]
};

const OUTPUT_SIZES = {
  image: [
    { value: '1024x1024', label: '1024x1024 (Square)' },
    { value: '1536x1024', label: '1536x1024 (Landscape)' },
    { value: '1024x1536', label: '1024x1536 (Portrait)' },
    { value: '1920x1080', label: '1920x1080 (Full HD)' },
  ],
  video: [
    { value: '1280x720', label: '1280x720 (HD)' },
    { value: '1920x1080', label: '1920x1080 (Full HD)' },
    { value: '1024x1024', label: '1024x1024 (Square)' },
  ]
};

export function AdvancedAIGenerateModal({ onClose, onSuccess }: AIGenerateModalProps) {
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [size, setSize] = useState('');
  const [duration, setDuration] = useState(10);
  const [avatarId, setAvatarId] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [title, setTitle] = useState('');

  const currentPlatforms = PLATFORMS[activeTab];
  const currentSizes = OUTPUT_SIZES[activeTab];

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const platform = currentPlatforms.find(p => p.value === newProvider);
    if (platform && platform.models.length > 0) {
      setModel(platform.models[0]);
    } else {
      setModel('');
    }
    // Provider değiştiğinde generated content'i temizle
    setGeneratedContent(null);
    setTitle('');
    setError(null);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Prompt alanı boş olamaz');
      return;
    }

    if (!provider || !model) {
      setError('Platform ve model seçimi yapın');
      return;
    }

    if (activeTab === 'video' && provider === 'heygen' && !avatarId.trim()) {
      setError('HeyGen için Avatar ID gereklidir');
      return;
    }

    setBusy(true);
    setError(null);
    
    try {
      const [wStr, hStr] = size.split('x');
      const width = parseInt(wStr, 10);
      const height = parseInt(hStr, 10);
      
      let result;
      
      if (activeTab === 'image') {
        result = await api.generateImage({
          provider,
          model,
          prompt,
          width,
          height
        });
      } else {
        result = await api.generateVideo({
          provider,
          model,
          prompt,
          width,
          height,
          duration_seconds: duration,
          avatar_id: avatarId || undefined,
          voice_id: voiceId || undefined
        });
      }
      
      if ('detail' in result) {
        throw new Error(result.detail);
      }
      
      // Temp olarak kaydet
      setGeneratedContent({
        uri: result.uri,
        content_type: result.content_type,
        prompt,
        provider,
        model,
        width,
        height,
        duration_seconds: activeTab === 'video' ? duration : undefined
      });
      
      // Otomatik başlık oluştur
      const autoTitle = prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt;
      setTitle(autoTitle);
      
    } catch (e: any) {
      setError(e?.message || 'AI içerik oluşturma hatası');
    } finally {
      setBusy(false);
    }
  };

  const handleAddToAssets = async () => {
    if (!generatedContent || !title.trim()) {
      setError('Başlık alanı boş olamaz');
      return;
    }

    setBusy(true);
    setError(null);
    
    try {
      const created = await api.createAsset({
        title: title,
        kind: activeTab,
        uri: generatedContent.uri,
        description: `AI ile üretildi. Prompt: ${generatedContent.prompt}`
      });
      
      onSuccess(created.id);
      onClose();
      
    } catch (e: any) {
      setError(e?.message || 'Asset oluşturma hatası');
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerate = () => {
    setGeneratedContent(null);
    setTitle('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-semibold">AI İçerik Üret</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Left Panel - Controls */}
          <div className="w-1/2 p-6 border-r overflow-y-auto">
            {/* Tabs */}
            <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => {
                  setActiveTab('image');
                  // Sekme değiştiğinde state'i temizle
                  setProvider('');
                  setModel('');
                  setGeneratedContent(null);
                  setTitle('');
                  setError(null);
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'image'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🖼️ Görsel
              </button>
              <button
                onClick={() => {
                  setActiveTab('video');
                  // Sekme değiştiğinde state'i temizle
                  setProvider('');
                  setModel('');
                  setGeneratedContent(null);
                  setTitle('');
                  setError(null);
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'video'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🎥 Video
              </button>
            </div>

            {/* Platform Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform
              </label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Platform seçin</option>
                {currentPlatforms.map((platform) => (
                  <option key={platform.value} value={platform.value}>
                    {platform.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Selection */}
            {provider && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Model seçin</option>
                  {currentPlatforms.find(p => p.value === provider)?.models.map((modelOption) => (
                    <option key={modelOption} value={modelOption}>
                      {modelOption}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Output Size */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Çıktı Boyutu
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Boyut seçin</option>
                {currentSizes.map((sizeOption) => (
                  <option key={sizeOption.value} value={sizeOption.value}>
                    {sizeOption.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Video specific options */}
            {activeTab === 'video' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Süre (saniye)
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 10)}
                    min="1"
                    max="60"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {provider === 'heygen' && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Avatar ID *
                      </label>
                      <input
                        type="text"
                        value={avatarId}
                        onChange={(e) => setAvatarId(e.target.value)}
                        placeholder="Avatar kimliği (zorunlu)"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voice ID
                      </label>
                      <input
                        type="text"
                        value={voiceId}
                        onChange={(e) => setVoiceId(e.target.value)}
                        placeholder="Ses kimliği (opsiyonel)"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {/* Prompt */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt *
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                placeholder="İçerik için prompt yazın..."
                required
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={
                busy || 
                !prompt.trim() || 
                !provider || 
                !model || 
                !size ||
                (activeTab === 'video' && provider === 'heygen' && !avatarId.trim())
              }
              className={`w-full py-3 rounded-md text-white font-medium transition-colors ${
                busy || 
                !prompt.trim() || 
                !provider || 
                !model || 
                !size ||
                (activeTab === 'video' && provider === 'heygen' && !avatarId.trim())
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
              }`}
            >
              {busy ? 'Üretiliyor...' : 'İçerik Üret'}
            </button>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
                <div className="text-red-800 text-sm">{error}</div>
              </div>
            )}
          </div>

          {/* Right Panel - Preview */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <h4 className="text-lg font-semibold mb-4">Önizleme</h4>
            
            {generatedContent ? (
              <div className="space-y-4">
                {/* Preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  {activeTab === 'image' ? (
                    <img
                      src={generatedContent.uri}
                      alt="Generated content"
                      className="w-full h-auto rounded-lg"
                    />
                  ) : (
                    <video
                      src={generatedContent.uri}
                      controls
                      className="w-full h-auto rounded-lg"
                    />
                  )}
                </div>

                {/* Content Info */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h5 className="font-medium text-blue-900 mb-2">Üretim Bilgileri</h5>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div><strong>Platform:</strong> {generatedContent.provider}</div>
                    <div><strong>Model:</strong> {generatedContent.model}</div>
                    <div><strong>Boyut:</strong> {generatedContent.width}x{generatedContent.height}</div>
                    {generatedContent.duration_seconds && (
                      <div><strong>Süre:</strong> {generatedContent.duration_seconds}s</div>
                    )}
                    <div><strong>Prompt:</strong> {generatedContent.prompt}</div>
                  </div>
                </div>

                {/* Title Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Başlık *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="İçerik başlığı"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={handleRegenerate}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Yeniden Üret
                  </button>
                  <button
                    onClick={handleAddToAssets}
                    disabled={busy || !title.trim()}
                    className={`flex-1 py-2 px-4 rounded-md text-white font-medium transition-colors ${
                      busy || !title.trim()
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {busy ? 'Ekleniyor...' : 'İçeriklere Ekle'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">
                    {activeTab === 'image' ? '🖼️' : '🎥'}
                  </div>
                  <p>İçerik üretmek için sol paneldeki ayarları yapın</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
