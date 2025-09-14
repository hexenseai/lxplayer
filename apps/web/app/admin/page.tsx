"use client";
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user, loading, isSuperAdmin, isAdmin } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isSuperAdmin && !isAdmin) {
      router.push('/');
    }
  }, [loading, isSuperAdmin, isAdmin, router]);

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isSuperAdmin ? 'Süper Admin Dashboard' : 'Admin Dashboard'}
        </h1>
        <p className="text-gray-600">
          {isSuperAdmin 
            ? 'Sistem yönetimi ve tüm firmaların genel kontrolü'
            : `${user?.company_id ? 'Firma yönetimi ve kullanıcı kontrolü' : 'Kullanıcı yönetimi'}`
          }
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isSuperAdmin && (
          <>
            <Link href="/admin/companies" className="group">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">Firmalar</h3>
                </div>
                <p className="text-gray-600 text-sm">
                  Tüm firmaları yönetin, yeni firma ekleyin ve mevcut firmaları düzenleyin.
                </p>
              </div>
            </Link>

            <Link href="/admin/users" className="group">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">Kullanıcılar</h3>
                </div>
                <p className="text-gray-600 text-sm">
                  Süper admin ve admin kullanıcılarını yönetin.
                </p>
              </div>
            </Link>
          </>
        )}

        {isAdmin && (
          <Link href="/admin/company-profile" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 ml-3">Firma Profili</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Firma bilgilerinizi görüntüleyin ve güncelleyin.
              </p>
            </div>
          </Link>
        )}

        {isAdmin && (
          <Link href="/admin/users" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 ml-3">Kullanıcılar</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Firma kullanıcılarını yönetin.
              </p>
            </div>
          </Link>
        )}

        <Link href="/admin/styles" className="group">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Stiller</h3>
            </div>
            <p className="text-gray-600 text-sm">
              {isSuperAdmin 
                ? 'Sistem stillerini yönetin ve yeni stiller oluşturun.'
                : 'Stilleri görüntüleyin ve firmanıza özel stiller oluşturun.'
              }
            </p>
          </div>
        </Link>

        <Link href="/admin/frame-configs" className="group">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Frame Konfigürasyonları</h3>
            </div>
            <p className="text-gray-600 text-sm">
              {isSuperAdmin 
                ? 'Global frame konfigürasyonlarını yönetin.'
                : 'Frame konfigürasyonlarını görüntüleyin ve kullanın.'
              }
            </p>
          </div>
        </Link>

        <Link href="/admin/avatars" className="group">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-pink-100 rounded-lg">
                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Avatarlar</h3>
            </div>
            <p className="text-gray-600 text-sm">
              {isSuperAdmin 
                ? 'Sistem avatarlarını yönetin ve yeni avatarlar oluşturun.'
                : 'Avatarları görüntüleyin ve firmanıza özel avatarlar oluşturun.'
              }
            </p>
          </div>
        </Link>

        <Link href="/admin/assets" className="group">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">İçerikler</h3>
            </div>
            <p className="text-gray-600 text-sm">
              {isSuperAdmin 
                ? 'Sistem içeriklerini yönetin.'
                : 'İçerikleri görüntüleyin ve firmanıza özel içerikler oluşturun.'
              }
            </p>
          </div>
        </Link>

        <Link href="/admin/trainings" className="group">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-teal-100 rounded-lg">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Eğitimler</h3>
            </div>
            <p className="text-gray-600 text-sm">
              {isSuperAdmin 
                ? 'Sistem eğitimlerini yönetin.'
                : 'Eğitimleri görüntüleyin ve firmanıza özel eğitimler oluşturun.'
              }
            </p>
          </div>
        </Link>

        {isAdmin && (
          <Link href="/admin/import-content" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 ml-3">İçerik İmport Et</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Sistem firmasından varsayılan stiller, frame config'ler ve diğer içerikleri firmanıza import edin.
              </p>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}