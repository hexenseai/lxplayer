"use client";
import { api, Company, User as UserT, Training, CompanyTraining } from '@/lib/api';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function AdminUsersPage() {
  const { user, loading: userLoading, isSuperAdmin, isAdmin } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<UserT[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [userTrainings, setUserTrainings] = useState<{[userId: string]: CompanyTraining[]}>({});
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserT | null>(null);

  // Router redirect removed - now rendered within dashboard

  useEffect(() => {
    if (isSuperAdmin || isAdmin) {
      fetchData();
    }
  }, [isSuperAdmin, isAdmin, userLoading]);

  const fetchData = async () => {
    try {
      // Kullanıcı rolüne göre verileri al
      let usersData = [], companiesData = [], trainingsData = [];
      
      if (isSuperAdmin) {
        // Süper admin tüm verileri görebilir
        // API çağrılarını ayrı ayrı yap, biri başarısız olsa bile diğerleri devam etsin
        try {
          usersData = await api.listUsers();
        } catch (error) {
          console.error('Users API Error:', error);
        }
        
        try {
          companiesData = await api.listCompanies();
        } catch (error) {
          console.error('Companies API Error:', error);
        }
        
        // Trainings API geçici olarak devre dışı - CORS hatası
        // TODO: Backend'deki /trainings API'si düzeltildikten sonra aktif edilecek
        trainingsData = [];
      } else if (isAdmin) {
        // Admin sadece kendi firmasındaki verileri görebilir
        // API çağrılarını ayrı ayrı yap, biri başarısız olsa bile diğerleri devam etsin
        try {
          usersData = await api.listUsers();
        } catch (error) {
          console.error('Users API Error:', error);
        }
        
        try {
          companiesData = await api.listCompanies();
        } catch (error) {
          console.error('Companies API Error:', error);
        }
        
        // Trainings API geçici olarak devre dışı - CORS hatası
        // TODO: Backend'deki /trainings API'si düzeltildikten sonra aktif edilecek
        trainingsData = [];
        // API zaten firma bazlı filtreleme yapıyor
      }
      
      setUsers(usersData);
      setCompanies(companiesData);
      setTrainings(trainingsData);

      // Her kullanıcı için eğitimleri al - geçici olarak devre dışı
      // TODO: Backend'deki /trainings API'si düzeltildikten sonra aktif edilecek
      const userTrainingsData: {[userId: string]: CompanyTraining[]} = {};
      for (const user of usersData) {
        userTrainingsData[user.id] = []; // Boş array olarak ayarla
      }
      setUserTrainings(userTrainingsData);
    } catch (error) {
      console.error('API Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (formData: FormData) => {
    try {
      const data = {
        email: formData.get('email') as string,
        username: formData.get('username') as string || undefined,
        full_name: formData.get('full_name') as string || undefined,
        company_id: formData.get('company_id') as string || undefined,
        role: formData.get('role') as string || 'User',
        department: formData.get('department') as string || undefined,
        password: formData.get('password') as string || undefined,
      };

      // Admin kullanıcı sadece kendi firmasına kullanıcı ekleyebilir
      if (isAdmin && !isSuperAdmin) {
        data.company_id = user?.company_id;
        data.role = 'User'; // Admin sadece User tipinde kullanıcı oluşturabilir
      }

      await api.createUser(data);
      setShowCreateForm(false);
      fetchData();
    } catch (error) {
      console.error('Error creating user:', error);
      
      // API hatasını parse et
      let errorMessage = 'Kullanıcı oluşturulurken hata oluştu';
      if (error instanceof Error) {
        if (error.message.includes('Email already exists')) {
          errorMessage = 'Bu email adresi zaten kullanılıyor. Lütfen farklı bir email adresi seçin.';
        } else if (error.message.includes('409')) {
          errorMessage = 'Bu email adresi zaten kullanılıyor. Lütfen farklı bir email adresi seçin.';
        }
      }
      
      alert(errorMessage);
    }
  };

  const handleUpdateUser = async (formData: FormData) => {
    if (!editingUser) return;

    try {
      const data: any = {
        email: formData.get('email') as string || undefined,
        username: formData.get('username') as string || undefined,
        full_name: formData.get('full_name') as string || undefined,
        company_id: formData.get('company_id') as string || undefined,
        role: formData.get('role') as string || 'User',
        department: formData.get('department') as string || undefined,
        password: formData.get('password') as string || undefined,
      };

      // Email adresi değiştirilmediyse undefined yap
      const newEmail = formData.get('email') as string;
      console.log('Current email:', editingUser.email);
      console.log('New email:', newEmail);
      console.log('Emails are same:', newEmail === editingUser.email);
      
      if (newEmail === editingUser.email) {
        data.email = undefined;
        console.log('Email not changed, setting to undefined');
      } else {
        console.log('Email changed, keeping new email');
      }

      // Admin kullanıcı sadece kendi firmasındaki kullanıcıları güncelleyebilir
      if (isAdmin && !isSuperAdmin) {
        data.company_id = user?.company_id;
        data.role = 'User'; // Admin sadece User tipinde kullanıcı güncelleyebilir
      }

      await api.updateUser(editingUser.id, data);
      setEditingUser(null);
      fetchData();
    } catch (error) {
      console.error('Error updating user:', error);
      
      // API hatasını parse et
      let errorMessage = 'Kullanıcı güncellenirken hata oluştu';
      if (error instanceof Error) {
        console.log('Error message:', error.message);
        if (error.message.includes('Email already exists') || error.message.includes('409')) {
          errorMessage = 'Bu email adresi zaten kullanılıyor. Lütfen farklı bir email adresi seçin.';
        } else if (error.message.includes('400')) {
          errorMessage = 'Geçersiz veri. Lütfen tüm alanları doğru şekilde doldurun.';
        } else if (error.message.includes('403')) {
          errorMessage = 'Bu işlem için yetkiniz bulunmuyor.';
        } else if (error.message.includes('404')) {
          errorMessage = 'Kullanıcı bulunamadı.';
        } else if (error.message.includes('500')) {
          errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
        }
      }
      
      alert(errorMessage);
    }
  };

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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {isSuperAdmin ? 'Kullanıcı Yönetimi' : 'Firma Kullanıcıları'}
          </h1>
          <p className="text-slate-600">
            {isSuperAdmin 
              ? 'Sistem kullanıcılarını görüntüleyin, yönetin ve eğitim atayın'
              : 'Firma kullanıcılarını görüntüleyin ve yönetin'
            }
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.href = '/?tab=user-interactions'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Etkileşim Listesi
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Yeni Kullanıcı Ekle
          </button>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Yeni Kullanıcı Ekle</h2>
            <form action={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-posta *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı Adı</label>
                  <input
                    type="text"
                    name="username"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
                <input
                  type="text"
                  name="full_name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {isSuperAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Firma</label>
                    <select
                      name="company_id"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Firma Seçin</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                    <select
                      name="role"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="User">User</option>
                      <option value="Admin">Admin</option>
                      <option value="SuperAdmin">SuperAdmin</option>
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Departman</label>
                <input
                  type="text"
                  name="department"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Şifre *</label>
                <input
                  type="password"
                  name="password"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
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

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Kullanıcıyı Düzenle</h2>
            <form action={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-posta *</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingUser.email}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı Adı</label>
                  <input
                    type="text"
                    name="username"
                    defaultValue={editingUser.username || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
                <input
                  type="text"
                  name="full_name"
                  defaultValue={editingUser.full_name || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {isSuperAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Firma</label>
                    <select
                      name="company_id"
                      defaultValue={editingUser.company_id || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Firma Seçin</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                    <select
                      name="role"
                      defaultValue={editingUser.role || 'User'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="User">User</option>
                      <option value="Admin">Admin</option>
                      <option value="SuperAdmin">SuperAdmin</option>
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Departman</label>
                <input
                  type="text"
                  name="department"
                  defaultValue={editingUser.department || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Şifre (Boş bırakırsanız değişmez)</label>
                <input
                  type="password"
                  name="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
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

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ad Soyad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Departman
                </th>
                {isSuperAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Firma
                  </th>
                )}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-700">
                          {u.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{u.email}</div>
                        {u.username && (
                          <div className="text-sm text-gray-500">{u.username}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {u.full_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.role === 'SuperAdmin' 
                        ? 'bg-red-100 text-red-800' 
                        : u.role === 'Admin'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {u.department || '-'}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {companies.find((c) => c.id === u.company_id)?.name ?? '-'}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        {expandedUser === u.id ? 'Gizle' : 'Eğitimler'}
                      </button>
                      <button
                        onClick={() => setEditingUser(u)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Eğitimler Bölümü */}
      {users.map((u) => (
        expandedUser === u.id && (
          <div key={`trainings-${u.id}`} className="mt-6 bg-blue-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800">Kullanıcı Eğitimleri</h3>
              </div>
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
        )
      ))}

      {users.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Henüz kullanıcı yok
            </h3>
            <p className="text-gray-600">
              İlk kullanıcıyı ekleyerek başlayın
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
