import { api, Organization as OrgT, Training, CompanyTraining } from '@/lib/api';
import { AdminNav } from '@/components/admin/AdminNav';
import { OrganizationForm } from '@/components/admin/forms/OrganizationForm';
import { CompanyTrainingForm } from '@/components/admin/forms/CompanyTrainingForm';
import { AddTrainingToOrgForm } from '@/components/admin/forms/AddTrainingToOrgForm';
import { Drawer } from '@/components/admin/Drawer';
import { revalidatePath } from 'next/cache';

export default async function AdminOrganizationsPage() {
  let orgs: OrgT[] = [];
  let trainings: Training[] = [];
  let backendOnline = false;
  
  try {
    // Önce backend'in çalışıp çalışmadığını kontrol et
    await api.healthCheck();
    backendOnline = true;
    
    [orgs, trainings] = await Promise.all([
      api.listOrganizations(),
      api.listTrainings(),
    ]);
  } catch (error) {
    console.error('API Error:', error);
    // Backend çalışmıyorsa boş array'ler kullan
  }

  // Her organizasyon için eğitimleri al
  const orgsWithTrainings = await Promise.all(
    orgs.map(async (org) => {
      let companyTrainings: CompanyTraining[] = [];
      try {
        companyTrainings = await api.listOrgTrainings(org.id);
      } catch (error) {
        console.error(`Error fetching trainings for org ${org.id}:`, error);
      }
      return { ...org, companyTrainings };
    })
  );

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
                <h1 className="text-2xl font-bold text-indigo-900">Firmalar</h1>
                <p className="text-indigo-600 text-sm">Firma bilgileri ve eğitim atamaları</p>
              </div>
            </div>
            <Drawer buttonLabel="Yeni Firma Ekle" title="Yeni Firma">
              <OrganizationForm />
            </Drawer>
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

        <div className="space-y-8">
          {orgsWithTrainings.map((org) => (
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
                    <Drawer buttonLabel="Firmayı Düzenle" title="Firmayı Düzenle">
                      <OrganizationForm initialOrganization={org as any} />
                    </Drawer>
                    <form action={async (fd) => {
                      'use server';
                      const id = String(fd.get('id') || '');
                      if (id) await api.deleteOrganization(id);
                      revalidatePath('/admin/organizations');
                    }}>
                      <input type="hidden" name="id" value={org.id} />
                      <button className="border border-red-200 rounded-lg px-3 py-1.5 text-red-700 hover:bg-red-50 transition-colors">Firmayı Sil</button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Eğitim Ekleme Butonu */}
              <div className="p-6 pb-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-800">Firma Eğitimleri</h3>
                  </div>
                  <Drawer buttonLabel="Yeni Eğitim Ekle" title="Firmaya Eğitim Ekle">
                    <AddTrainingToOrgForm 
                      orgId={org.id} 
                      trainings={trainings}
                    />
                  </Drawer>
                </div>

                {/* Eğitimler Tablosu */}
                {org.companyTrainings.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-blue-100 border-b border-blue-200">
                            <th className="px-4 py-3 text-left text-blue-900 font-semibold">Eğitim</th>
                            <th className="px-4 py-3 text-left text-blue-900 font-semibold">Beklentiler</th>
                            <th className="px-4 py-3 text-left text-blue-900 font-semibold">Access Code</th>
                            <th className="px-4 py-3 text-left text-blue-900 font-semibold">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody>
                          {org.companyTrainings.map((ct) => {
                            const training = trainings.find(t => t.id === ct.training_id);
                            return (
                              <tr key={ct.id} className="hover:bg-blue-100/50 border-b border-blue-200 last:border-b-0">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-900">{training?.title || 'Bilinmeyen Eğitim'}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="max-w-xs truncate text-gray-600" title={ct.expectations || ''}>
                                    {ct.expectations || '-'}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <code className="bg-blue-100 px-2 py-1 rounded text-sm font-mono text-blue-800 border border-blue-200">
                                    {ct.access_code}
                                  </code>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <Drawer buttonLabel="Düzenle" title="Eğitimi Düzenle">
                                      <CompanyTrainingForm 
                                        orgId={org.id} 
                                        companyTraining={ct} 
                                        trainings={trainings}
                                      />
                                    </Drawer>
                                    <form action={async (fd) => {
                                      'use server';
                                      const trainingId = String(fd.get('training_id') || '');
                                      if (trainingId) await api.deleteCompanyTraining(org.id, trainingId);
                                      revalidatePath('/admin/organizations');
                                    }}>
                                      <input type="hidden" name="training_id" value={ct.id} />
                                      <button className="border border-red-200 rounded px-2 py-1 text-red-700 hover:bg-red-50 text-sm transition-colors">
                                        Sil
                                      </button>
                                    </form>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {org.companyTrainings.length === 0 && (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    Bu firmaya henüz eğitim eklenmemiş.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
