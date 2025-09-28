"use client";
import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { api, Style as StyleT } from '@/lib/api';
import StylePreview from '@/components/admin/StylePreview';
import StyleBuilder from '@/components/admin/StyleBuilder';

export default function AdminStylesPage() {
  const { user, loading: userLoading, isSuperAdmin, isAdmin } = useUser();
  const router = useRouter();
  const [styles, setStyles] = useState<StyleT[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStyle, setEditingStyle] = useState<StyleT | null>(null);
  const [createStyleJson, setCreateStyleJson] = useState('{}');
  const [editStyleJson, setEditStyleJson] = useState('{}');

  // Router redirect removed - now rendered within dashboard

  useEffect(() => {
    if (isSuperAdmin || isAdmin) {
      loadStyles();
    }
  }, [isSuperAdmin, isAdmin]);

  useEffect(() => {
    if (editingStyle) {
      setEditStyleJson(editingStyle.style_json);
    } else {
      setEditStyleJson('{}');
    }
  }, [editingStyle]);

  const loadStyles = async () => {
    try {
      setLoading(true);
      const data = await api.listStyles();
      setStyles(data);
    } catch (error) {
      console.error('Error loading styles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStyle = async (formData: FormData) => {
    try {
      const data = {
        name: formData.get('name') as string,
        description: formData.get('description') as string || undefined,
        style_json: createStyleJson,
      };

      await api.createStyle(data);
      setShowCreateForm(false);
      setCreateStyleJson('{}');
      loadStyles();
      alert('Stil başarıyla oluşturuldu!');
    } catch (error) {
      console.error('Error creating style:', error);
      let errorMessage = 'Stil oluşturulurken hata oluştu';
      if (error instanceof Error) {
        if (error.message.includes('already exists') || error.message.includes('400')) {
          errorMessage = 'Bu isimde bir stil zaten mevcut. Lütfen farklı bir isim seçin.';
        } else if (error.message.includes('403')) {
          errorMessage = 'Bu işlem için yetkiniz bulunmuyor.';
        } else if (error.message.includes('500')) {
          errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
        }
      }
      alert(errorMessage);
    }
  };

  const handleUpdateStyle = async (formData: FormData) => {
    if (!editingStyle) return;

    try {
      const data = {
        name: formData.get('name') as string,
        description: formData.get('description') as string || undefined,
        style_json: editStyleJson,
        company_id: isSuperAdmin ? (formData.get('company_id') as string || undefined) : user?.company_id,
      };

      await api.updateStyle(editingStyle.id, data);
      setEditingStyle(null);
      setEditStyleJson('{}');
      loadStyles();
    } catch (error) {
      console.error('Error updating style:', error);
    }
  };

  const handleDeleteStyle = async (styleId: string) => {
    if (!confirm('Bu stili silmek istediğinizden emin misiniz?')) return;

    try {
      await api.deleteStyle(styleId);
      loadStyles();
    } catch (error) {
      console.error('Error deleting style:', error);
    }
  };

  const handleSeedStyles = async () => {
    try {
      const result = await api.seedDefaultStyles();
      loadStyles();
      alert(result.message || 'Varsayılan stiller başarıyla oluşturuldu!');
    } catch (error) {
      console.error('Error seeding styles:', error);
      let errorMessage = 'Varsayılan stiller oluşturulurken hata oluştu';
      if (error instanceof Error) {
        if (error.message.includes('403')) {
          errorMessage = 'Bu işlem için yetkiniz bulunmuyor. Sadece SuperAdmin varsayılan stiller oluşturabilir.';
        } else if (error.message.includes('405')) {
          errorMessage = 'Bu endpoint mevcut değil. Lütfen backend\'i kontrol edin.';
        } else if (error.message.includes('500')) {
          errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
        }
      }
      alert(errorMessage);
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Stil Yönetimi</h1>
            <p className="text-slate-600">
              {isSuperAdmin 
                ? 'Sistem stillerini yönetin ve yeni stiller oluşturun'
                : 'Stilleri görüntüleyin ve firmanıza özel stiller oluşturun'
              }
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleSeedStyles}
              className="bg-slate-500 text-white px-4 py-2 rounded-lg hover:bg-slate-600 transition-colors"
            >
              Varsayılan Stilleri Yükle
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Yeni Stil Ekle
            </button>
          </div>
        </div>
      </div>

      {/* Create Style Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Yeni Stil Ekle</h2>
            <form action={handleCreateStyle} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stil Adı *</label>
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
                  
                  {/* Style Builder */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stil Oluşturucu</label>
                    <StyleBuilder 
                      onStyleChange={setCreateStyleJson}
                    />
                  </div>
                </div>

                {/* Right Column - JSON Editor and Preview */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stil JSON *</label>
                    <textarea
                      name="style_json"
                      value={createStyleJson}
                      onChange={(e) => setCreateStyleJson(e.target.value)}
                      rows={12}
                      required
                      placeholder='{"color": "#000000", "fontSize": "16px", ...}'
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    />
                  </div>
                  
                  {/* Live Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Canlı Önizleme</label>
                    <StylePreview styleJson={createStyleJson} styleName="Yeni Stil" />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateStyleJson('{}');
                  }}
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

      {/* Edit Style Modal */}
      {editingStyle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Stili Düzenle</h2>
            <form action={handleUpdateStyle} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stil Adı *</label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editingStyle.name}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                    <textarea
                      name="description"
                      defaultValue={editingStyle.description || ''}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  {/* Style Builder */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stil Oluşturucu</label>
                    <StyleBuilder 
                      initialStyleJson={editingStyle?.style_json}
                      onStyleChange={setEditStyleJson}
                    />
                  </div>
                </div>

                {/* Right Column - JSON Editor and Preview */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stil JSON *</label>
                    <textarea
                      name="style_json"
                      value={editStyleJson}
                      onChange={(e) => setEditStyleJson(e.target.value)}
                      rows={12}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    />
                  </div>
                  
                  {/* Live Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Canlı Önizleme</label>
                    <StylePreview styleJson={editStyleJson} styleName={editingStyle.name} />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setEditingStyle(null);
                    setEditStyleJson('{}');
                  }}
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

      {/* Styles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {styles.map((style) => (
          <div key={style.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{style.name}</h3>
                {style.description && (
                  <p className="text-sm text-gray-600">{style.description}</p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingStyle(style)}
                  className="text-blue-600 hover:text-blue-900 text-sm"
                >
                  Düzenle
                </button>
                <button
                  onClick={() => handleDeleteStyle(style.id)}
                  className="text-red-600 hover:text-red-900 text-sm"
                >
                  Sil
                </button>
              </div>
            </div>
            
            {/* Style Preview */}
            <div className="mb-4">
              <StylePreview styleJson={style.style_json} styleName={style.name} />
            </div>
            
            <div className="text-xs text-gray-500">
              Oluşturulma: {new Date(style.created_at).toLocaleDateString('tr-TR')}
            </div>
          </div>
        ))}
      </div>

      {styles.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Henüz stil yok
            </h3>
            <p className="text-gray-600">
              İlk stili ekleyerek başlayın
            </p>
          </div>
        </div>
      )}
    </div>
  );
}