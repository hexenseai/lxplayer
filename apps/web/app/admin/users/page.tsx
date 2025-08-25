"use client";
import { api, Organization, User as UserT, Training, CompanyTraining } from '@/lib/api';
import { AdminNav } from '@/components/admin/AdminNav';
import { Drawer } from '@/components/admin/Drawer';
import { UserForm } from '@/components/admin/forms/UserForm';
import { AddTrainingToUserForm } from '@/components/admin/forms/AddTrainingToUserForm';
import { CompanyTrainingForm } from '@/components/admin/forms/CompanyTrainingForm';
import { useState, useEffect } from 'react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserT[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [userTrainings, setUserTrainings] = useState<{[userId: string]: CompanyTraining[]}>({});
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, orgsData, trainingsData] = await Promise.all([
          api.listUsers(),
          api.listOrganizations(),
          api.listTrainings(),
        ]);
        setUsers(usersData);
        setOrgs(orgsData);
        setTrainings(trainingsData);

        // Her kullanıcı için eğitimleri al
        const userTrainingsData: {[userId: string]: CompanyTraining[]} = {};
        for (const user of usersData) {
          try {
            const userTrainings = await api.listUserTrainings(user.id);
            userTrainingsData[user.id] = userTrainings;
          } catch (error) {
            console.error(`Error fetching trainings for user ${user.id}:`, error);
            userTrainingsData[user.id] = [];
          }
        }
        setUserTrainings(userTrainingsData);
      } catch (error) {
        console.error('API Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDelete = async (userId: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await api.deleteUser(userId);
      setUsers(users.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Delete error:', error);
      alert('Kullanıcı silinirken bir hata oluştu');
    }
  };

  const handleTrainingAdded = async (userId: string) => {
    try {
      const userTrainings = await api.listUserTrainings(userId);
      setUserTrainings(prev => ({
        ...prev,
        [userId]: userTrainings
      }));
    } catch (error) {
      console.error('Error refreshing user trainings:', error);
    }
  };

  const handleTrainingDeleted = async (userId: string, trainingId: string) => {
    try {
      await api.deleteUserTraining(userId, trainingId);
      setUserTrainings(prev => ({
        ...prev,
        [userId]: prev[userId]?.filter(t => t.id !== trainingId) || []
      }));
    } catch (error) {
      console.error('Error deleting user training:', error);
      alert('Eğitim silinirken bir hata oluştu');
    }
  };
  
  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <AdminNav />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </main>
    );
  }
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <AdminNav />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Kullanıcı Yönetimi
            </h1>
            <p className="text-muted-foreground">
              Sistem kullanıcılarını görüntüleyin, yönetin ve eğitim atayın
            </p>
          </div>
          <Drawer buttonLabel="Yeni Kullanıcı Ekle" title="Yeni Kullanıcı">
            <UserForm orgs={orgs} />
          </Drawer>
        </div>

        {/* Users Table */}
        <div className="space-y-6">
          {users.map((u, index) => (
            <div key={u.id} className="card">
              <div className="card-content p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 font-medium text-muted-foreground">Email</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Kullanıcı Adı</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Ad Soyad</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Görev</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Departman</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Firma</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className={`border-b transition-colors hover:bg-muted/30 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary-700">
                                {u.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{u.email}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm">{u.username}</td>
                        <td className="p-4 font-medium">{u.full_name}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            u.role === 'admin' 
                              ? 'bg-primary-100 text-primary-800' 
                              : 'bg-secondary-100 text-secondary-800'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{u.department || '-'}</td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {orgs.find((o) => o.id === u.organization_id)?.name ?? '-'}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                              className="btn btn-outline btn-sm"
                            >
                              {expandedUser === u.id ? 'Gizle' : 'Eğitimler'}
                            </button>
                            <Drawer buttonLabel="Düzenle" title="Kullanıcıyı Düzenle">
                              <UserForm orgs={orgs} initialUser={u as any} />
                            </Drawer>
                            <button 
                              type="button"
                              className="btn btn-destructive btn-sm"
                              onClick={() => handleDelete(u.id)}
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Eğitimler Bölümü */}
                {expandedUser === u.id && (
                  <div className="border-t bg-blue-50 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <h3 className="font-semibold text-gray-800">Kullanıcı Eğitimleri</h3>
                      </div>
                      <Drawer buttonLabel="Eğitim Ekle" title="Kullanıcıya Eğitim Ekle">
                        <AddTrainingToUserForm 
                          userId={u.id} 
                          trainings={trainings}
                          onTrainingAdded={() => handleTrainingAdded(u.id)}
                        />
                      </Drawer>
                    </div>

                    {/* Eğitimler Tablosu */}
                    {userTrainings[u.id]?.length > 0 ? (
                      <div className="bg-white border border-blue-200 rounded-lg overflow-hidden">
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
                              {userTrainings[u.id].map((ct) => {
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
                                            userId={u.id} 
                                            companyTraining={ct} 
                                            trainings={trainings}
                                            onTrainingUpdated={() => handleTrainingAdded(u.id)}
                                          />
                                        </Drawer>
                                        <button 
                                          onClick={() => handleTrainingDeleted(u.id, ct.id)}
                                          className="border border-red-200 rounded px-2 py-1 text-red-700 hover:bg-red-50 text-sm transition-colors"
                                        >
                                          Sil
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        Bu kullanıcıya henüz eğitim atanmamış.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {users.length === 0 && (
          <div className="card">
            <div className="card-content">
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Henüz kullanıcı yok
                </h3>
                <p className="text-muted-foreground">
                  İlk kullanıcıyı ekleyerek başlayın
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
