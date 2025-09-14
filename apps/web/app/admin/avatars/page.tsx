"use client";
import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Avatar {
  id: string;
  name: string;
  personality: string;
  elevenlabs_voice_id: string;
  description?: string;
  is_default: boolean;
  company_id?: string;
  created_at: string;
  updated_at: string;
}

export default function AvatarsPage() {
  const { user, loading, isSuperAdmin, isAdmin } = useUser();
  const router = useRouter();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState<Avatar | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    if (!loading && !isSuperAdmin && !isAdmin) {
      router.push('/');
    }
  }, [loading, isSuperAdmin, isAdmin, router]);

  useEffect(() => {
    if (isSuperAdmin || isAdmin) {
      fetchAvatars();
    }
  }, [isSuperAdmin, isAdmin]);

  const fetchAvatars = async () => {
    try {
      setLoadingAvatars(true);
      const avatars = await api.listAvatars();
      setAvatars(avatars);
    } catch (err: any) {
      console.error('Error fetching avatars:', err);
      setError(err.message || 'Avatarlar yüklenirken hata oluştu');
    } finally {
      setLoadingAvatars(false);
    }
  };

  const handleDelete = async (avatarId: string) => {
    if (!confirm('Bu avatarı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await api.deleteAvatar(avatarId);
      setAvatars(avatars.filter(avatar => avatar.id !== avatarId));
    } catch (err: any) {
      console.error('Error deleting avatar:', err);
      alert(err.message || 'Avatar silinirken hata oluştu');
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.exportAvatars();
      const dataStr = JSON.stringify(response, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `avatars_export_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error exporting avatars:', err);
      alert(err.message || 'Export işlemi sırasında hata oluştu');
    }
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

  if (!isSuperAdmin && !isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Avatar Yönetimi</h1>
            <p className="text-gray-600">
              {isSuperAdmin 
                ? 'Sistem avatarlarını yönetin ve yeni avatarlar oluşturun'
                : 'Firmanıza özel avatarları yönetin'
              }
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Export
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Import
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Yeni Avatar
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {loadingAvatars ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Avatarlar yükleniyor...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {avatars.map((avatar) => (
            <div key={avatar.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-pink-100 rounded-lg mr-3">
                    <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{avatar.name}</h3>
                    {avatar.is_default && (
                      <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        Varsayılan
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingAvatar(avatar)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Düzenle"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(avatar.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Sil"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Kişilik:</label>
                  <p className="text-sm text-gray-600">{avatar.personality}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">ElevenLabs Voice ID:</label>
                  <p className="text-sm text-gray-600 font-mono">{avatar.elevenlabs_voice_id}</p>
                </div>
                {avatar.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Açıklama:</label>
                    <p className="text-sm text-gray-600">{avatar.description}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {avatars.length === 0 && !loadingAvatars && (
        <div className="text-center py-12">
          <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz avatar yok</h3>
          <p className="text-gray-600 mb-4">İlk avatarınızı oluşturmak için yukarıdaki butonu kullanın.</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingAvatar) && (
        <AvatarModal
          avatar={editingAvatar}
          onClose={() => {
            setShowCreateModal(false);
            setEditingAvatar(null);
          }}
          onSave={() => {
            fetchAvatars();
            setShowCreateModal(false);
            setEditingAvatar(null);
          }}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={() => {
            fetchAvatars();
            setShowImportModal(false);
          }}
        />
      )}
    </div>
  );
}

// Avatar Modal Component
function AvatarModal({ 
  avatar, 
  onClose, 
  onSave, 
  isSuperAdmin 
}: { 
  avatar?: Avatar | null; 
  onClose: () => void; 
  onSave: () => void;
  isSuperAdmin: boolean;
}) {
  const [formData, setFormData] = useState({
    name: avatar?.name || '',
    personality: avatar?.personality || '',
    elevenlabs_voice_id: avatar?.elevenlabs_voice_id || '',
    description: avatar?.description || '',
    image_url: avatar?.image_url || '',
    is_default: avatar?.is_default || false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testingVoice, setTestingVoice] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleTestVoice = async () => {
    if (!formData.elevenlabs_voice_id) {
      setError('Lütfen önce bir voice ID girin');
      return;
    }

    if (!formData.description) {
      setError('Lütfen önce açıklama alanına test metni yazın');
      return;
    }

    setTestingVoice(true);
    setError(null);
    setAudioUrl(null);

    try {
      const response = await api.testElevenLabsVoice(formData.elevenlabs_voice_id, formData.description);
      
      // Create audio URL from base64 data
      const audioBlob = new Blob([Uint8Array.from(atob(response.audio_data), c => c.charCodeAt(0))], {
        type: response.content_type
      });
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      // Auto-play the audio
      const audio = new Audio(url);
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        setError('Ses çalarken hata oluştu');
      });
      
    } catch (err: any) {
      console.error('Error testing voice:', err);
      setError('Ses testi sırasında hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setTestingVoice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (avatar) {
        // Update existing avatar
        await api.updateAvatar(avatar.id, formData);
      } else {
        // Create new avatar
        await api.createAvatar(formData);
      }
      onSave();
    } catch (err: any) {
      console.error('Error saving avatar:', err);
      setError(err.message || 'Avatar kaydedilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {avatar ? 'Avatar Düzenle' : 'Yeni Avatar Oluştur'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Avatar Adı *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kişilik *
            </label>
            <textarea
              value={formData.personality}
              onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ElevenLabs Voice ID *
            </label>
            <input
              type="text"
              value={formData.elevenlabs_voice_id}
              onChange={(e) => setFormData({ ...formData, elevenlabs_voice_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Voice ID girin..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Avatar Görseli
            </label>
            
            {/* File Upload */}
            <div className="mb-3">
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      setLoading(true);
                      const result = await api.uploadAvatarImage(file);
                      setFormData({ ...formData, image_url: result.image_url });
                    } catch (err: any) {
                      setError(err.message || 'Dosya yüklenirken hata oluştu');
                    } finally {
                      setLoading(false);
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-gray-500 mt-1">Maksimum 5MB, sadece resim dosyaları</p>
            </div>
            
            {/* URL Input */}
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Veya URL girin: https://example.com/avatar.jpg"
            />
            
            {/* Preview */}
            {formData.image_url && (
              <div className="mt-2">
                <img 
                  src={formData.image_url} 
                  alt="Avatar Preview" 
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Açıklama
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
              placeholder="Bu metin voice test için kullanılacak..."
            />
            
            {/* Voice Test Section */}
            {formData.elevenlabs_voice_id && formData.description && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={handleTestVoice}
                    disabled={testingVoice}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testingVoice ? 'Test Ediliyor...' : '🎵 Ses Testi'}
                  </button>
                  {audioUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        const audio = new Audio(audioUrl);
                        audio.play();
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      🔄 Tekrar Çal
                    </button>
                  )}
                </div>
                {audioUrl && (
                  <div className="text-xs text-gray-600">
                    ✅ Ses testi başarılı! Avatarınız bu sesle konuşacak.
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  💡 Açıklama alanındaki metin voice test için kullanılır.
                </div>
              </div>
            )}
          </div>

          {isSuperAdmin && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="is_default" className="text-sm font-medium text-gray-700">
                Varsayılan Avatar
              </label>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : (avatar ? 'Güncelle' : 'Oluştur')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Import Modal Component
function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.avatars || !Array.isArray(data.avatars)) {
        throw new Error('Geçersiz dosya formatı');
      }

      await api.importAvatars(data.avatars);
      onImport();
    } catch (err: any) {
      console.error('Error importing avatars:', err);
      setError(err.message || 'Import işlemi sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4">Avatar Import Et</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              JSON Dosyası Seç
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="text-sm text-gray-600">
            <p>JSON dosyası şu formatta olmalıdır:</p>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
{`{
  "avatars": [
    {
      "name": "Avatar Adı",
      "personality": "Kişilik açıklaması",
      "elevenlabs_voice_id": "voice_id",
      "description": "Açıklama"
    }
  ]
}`}
            </pre>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Import Ediliyor...' : 'Import Et'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
