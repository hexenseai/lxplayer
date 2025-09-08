"use client";

import { api, Organization as OrgT } from '@/lib/api';
import { AdminNav } from '@/components/admin/AdminNav';
import { OrganizationForm } from '@/components/admin/forms/OrganizationForm';
import { Drawer } from '@/components/admin/Drawer';
import { useState, useEffect } from 'react';

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<OrgT[]>([]);
  const [backendOnline, setBackendOnline] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Önce backend'in çalışıp çalışmadığını kontrol et
        await api.healthCheck();
        setBackendOnline(true);
        
        // Kullanıcı bilgilerini al
        try {
          const user = await api.getCurrentUser();
          setCurrentUser(user);
          console.log('Current user:', user);
        } catch (error) {
          console.error('User info error:', error);
        }
        
        // Kullanıcı rolüne göre organizasyonları al
        if (currentUser?.role === 'SuperAdmin') {
          // Süper admin tüm organizasyonları görebilir
          console.log('Loading all organizations for SuperAdmin...');
          const allOrgs = await api.listOrganizations();
          console.log('All organizations:', allOrgs);
          setOrgs(allOrgs);
        } else {
          // Admin ve User sadece kendi organizasyonlarını görebilir
          if (currentUser?.organization_id) {
            const userOrg = await api.getOrganization(currentUser.organization_id);
            if (userOrg) {
              setOrgs([userOrg]);
            }
          }
        }
      } catch (error) {
        console.error('API Error:', error);
        // Backend çalışmıyorsa boş array'ler kullan
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser?.role, currentUser?.organization_id]);

  // İlk organizasyonu al
  const currentOrg = orgs.length > 0 ? orgs[0] : null;

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
      <div className="p-8 space-y-8">
        {/* Page Header with Blue Theme */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-indigo-900">Firma Profili</h1>
                <p className="text-indigo-600 text-sm">Firma bilgilerini düzenleyin</p>
              </div>
            </div>
                         {(currentUser?.role === 'SuperAdmin' || !currentOrg) && (
               <Drawer buttonLabel="Firma Oluştur" title="Yeni Firma">
                 <OrganizationForm />
               </Drawer>
             )}
          </div>
        </div>

        {!backendOnline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Backend Bağlantısı Yok
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Backend server çalışmıyor. Lütfen backend'i başlatın:</p>
                  <code className="mt-1 block bg-yellow-100 px-2 py-1 rounded text-xs">
                    cd apps/api && py -m uvicorn app.main:app --reload --port 8000
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info */}
        {currentUser && (
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-2">Debug Info:</h3>
            <p>Role: {currentUser.role}</p>
            <p>Organization ID: {currentUser.organization_id || 'None'}</p>
            <p>Organizations loaded: {orgs.length}</p>
          </div>
        )}

        <div className="space-y-8">
          {orgs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orgs.map((org) => (
                <div key={org.id} className="bg-white border border-indigo-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  {/* Firma Başlığı - Blue Header */}
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200 rounded-t-xl p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-indigo-900">{org.name}</h2>
                          <p className="text-indigo-600 text-sm">{org.business_topic}</p>
                        </div>
                      </div>
                                             <div className="flex items-center gap-2">
                         <Drawer buttonLabel="Düzenle" title="Firmayı Düzenle">
                           <OrganizationForm initialOrganization={org as any} />
                         </Drawer>
                         {currentUser?.role === 'SuperAdmin' && (
                           <button
                             onClick={async () => {
                               if (confirm('Bu firmayı silmek istediğinizden emin misiniz?')) {
                                 try {
                                   await api.deleteOrganization(org.id);
                                   // Reload data
                                   window.location.reload();
                                 } catch (error) {
                                   console.error('Error deleting organization:', error);
                                   alert('Firma silinirken hata oluştu');
                                 }
                               }
                             }}
                             className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                           >
                             Sil
                           </button>
                         )}
                       </div>
                    </div>
                  </div>

                  {/* Firma Bilgileri */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-800 mb-2">Firma Adı</h3>
                        <p className="text-gray-600">{org.name}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-800 mb-2">İş Konusu</h3>
                        <p className="text-gray-600">{org.business_topic || 'Belirtilmemiş'}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-medium text-blue-900 mb-1 text-sm">Portal Bilgisi</h4>
                          <p className="text-blue-800 text-xs">
                            Bu portal {org.name} firması için özel olarak kurulmuştur.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Henüz Firma Oluşturulmamış
              </h3>
              <p className="text-gray-600 mb-4">
                Portal kullanımı için önce firma bilgilerini oluşturmanız gerekiyor.
              </p>
              <Drawer buttonLabel="Firma Oluştur" title="Yeni Firma">
                <OrganizationForm />
              </Drawer>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

