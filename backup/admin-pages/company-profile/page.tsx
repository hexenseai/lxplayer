"use client";
import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { api, Company } from '@/lib/api';

export default function CompanyProfilePage() {
  const { user, loading, isAdmin } = useUser();
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Router redirect removed - now rendered within dashboard

  useEffect(() => {
    if (isAdmin && user?.company_id) {
      loadCompany();
    }
  }, [isAdmin, user?.company_id]);

  const loadCompany = async () => {
    if (!user?.company_id) return;

    try {
      setLoadingCompany(true);
      const data = await api.getCompany(user.company_id);
      setCompany(data);
    } catch (error) {
      console.error('Error loading company:', error);
    } finally {
      setLoadingCompany(false);
    }
  };

  const handleUpdateCompany = async (formData: FormData) => {
    if (!company) return;

    try {
      const data = {
        name: formData.get('name') as string,
        business_topic: formData.get('business_topic') as string || undefined,
        description: formData.get('description') as string || undefined,
        address: formData.get('address') as string || undefined,
        phone: formData.get('phone') as string || undefined,
        email: formData.get('email') as string || undefined,
        website: formData.get('website') as string || undefined,
      };

      await api.updateCompany(company.id, data);
      setIsEditing(false);
      loadCompany();
    } catch (error) {
      console.error('Error updating company:', error);
    }
  };

  if (loading || loadingCompany) {
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

  if (!isAdmin || !company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Firma Profili Bulunamadı</h1>
          <p className="text-gray-600">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Firma Profili</h1>
            <p className="text-gray-600">Firma bilgilerinizi görüntüleyin ve güncelleyin</p>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            {isEditing ? 'İptal' : 'Düzenle'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {isEditing ? (
          <form action={handleUpdateCompany} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Firma Adı *</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={company.name}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">İş Konusu</label>
                <input
                  type="text"
                  name="business_topic"
                  defaultValue={company.business_topic || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
              <textarea
                name="description"
                defaultValue={company.description || ''}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Adres</label>
              <textarea
                name="address"
                defaultValue={company.address || ''}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                <input
                  type="tel"
                  name="phone"
                  defaultValue={company.phone || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={company.email || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input
                  type="url"
                  name="website"
                  defaultValue={company.website || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
              >
                Kaydet
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Firma Adı</h3>
                <p className="text-gray-700">{company.name}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">İş Konusu</h3>
                <p className="text-gray-700">{company.business_topic || 'Belirtilmemiş'}</p>
              </div>
            </div>

            {company.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Açıklama</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{company.description}</p>
              </div>
            )}

            {company.address && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Adres</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{company.address}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Telefon</h3>
                <p className="text-gray-700">{company.phone || 'Belirtilmemiş'}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">E-posta</h3>
                <p className="text-gray-700">{company.email || 'Belirtilmemiş'}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Website</h3>
                <p className="text-gray-700">
                  {company.website ? (
                    <a 
                      href={company.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {company.website}
                    </a>
                  ) : (
                    'Belirtilmemiş'
                  )}
                </p>
              </div>
            </div>

            <div className="pt-6 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Oluşturulma Tarihi</h3>
                  <p className="text-gray-700">{new Date(company.created_at).toLocaleDateString('tr-TR')}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Son Güncelleme</h3>
                  <p className="text-gray-700">{new Date(company.updated_at).toLocaleDateString('tr-TR')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
