'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { api } from '@/lib/api';
import { Button } from '@lxplayer/ui';
import { Palette, Edit, Trash2, Plus, Eye } from 'lucide-react';

interface Style {
  id: string;
  name: string;
  description?: string;
  style_json: string;
  company_id?: string;
  created_at: string;
  updated_at: string;
}

export default function StylesPage() {
  const { user, isSuperAdmin, isAdmin } = useUser();
  const [styles, setStyles] = useState<Style[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStyle, setEditingStyle] = useState<Style | null>(null);
  const [previewStyle, setPreviewStyle] = useState<Style | null>(null);

  useEffect(() => {
    if (isSuperAdmin || isAdmin) {
      loadStyles();
    }
  }, [isSuperAdmin, isAdmin]);

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

  const handleDeleteStyle = async (styleId: string) => {
    if (!confirm('Bu stili silmek istediğinizden emin misiniz?')) return;

    try {
      await api.deleteStyle(styleId);
      loadStyles();
    } catch (error) {
      console.error('Error deleting style:', error);
      alert('Stil silinirken hata oluştu');
    }
  };

  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Yetkisiz Erişim</h2>
          <p className="text-gray-600">Bu sayfaya erişim için Admin yetkisi gereklidir.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Stiller yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stiller</h1>
          <p className="text-gray-600">Overlay ve UI stillerini yönetin</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Yeni Stil
        </Button>
      </div>

      {/* Styles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {styles.map((style) => (
          <div key={style.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Palette className="w-5 h-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-gray-900">{style.name}</h3>
                  {style.description && (
                    <p className="text-sm text-gray-500">{style.description}</p>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setPreviewStyle(style)}
                  className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingStyle(style)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteStyle(style.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              <p>Oluşturulma: {new Date(style.created_at).toLocaleDateString('tr-TR')}</p>
              <p>ID: {style.id.substring(0, 8)}...</p>
            </div>
          </div>
        ))}
      </div>

      {styles.length === 0 && (
        <div className="text-center py-12">
          <Palette className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz stil yok</h3>
          <p className="text-gray-600 mb-4">İlk stili oluşturun</p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Stil Oluştur
          </Button>
        </div>
      )}

      {/* Create/Edit Form Modal - Simplified */}
      {(showCreateForm || editingStyle) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingStyle ? 'Stil Düzenle' : 'Yeni Stil'}
              </h3>
              <p className="text-gray-600 mb-4">
                Stil editörü özellikleri Studio'da geliştirilmektedir.
              </p>
              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingStyle(null);
                  }}
                  className="flex-1"
                >
                  Kapat
                </Button>
                <Button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingStyle(null);
                    loadStyles();
                  }}
                  className="flex-1"
                >
                  Tamam
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewStyle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Stil Önizleme: {previewStyle.name}</h3>
            </div>
            <div className="p-6 overflow-y-auto">
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                {JSON.stringify(JSON.parse(previewStyle.style_json), null, 2)}
              </pre>
            </div>
            <div className="p-6 border-t">
              <Button onClick={() => setPreviewStyle(null)} className="w-full">
                Kapat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
