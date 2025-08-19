"use client";
import { api, Organization, User as UserT } from '@/lib/api';
import { AdminNav } from '@/components/admin/AdminNav';
import { Drawer } from '@/components/admin/Drawer';
import { UserForm } from '@/components/admin/forms/UserForm';
import { useState, useEffect } from 'react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserT[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, orgsData] = await Promise.all([
          api.listUsers(),
          api.listOrganizations(),
        ]);
        setUsers(usersData);
        setOrgs(orgsData);
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
              Sistem kullanıcılarını görüntüleyin ve yönetin
            </p>
          </div>
          <Drawer buttonLabel="Yeni Kullanıcı Ekle" title="Yeni Kullanıcı">
            <UserForm orgs={orgs} />
          </Drawer>
        </div>

        {/* Users Table */}
        <div className="card">
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
                  {users.map((u, index) => (
                    <tr key={u.id} className={`border-b transition-colors hover:bg-muted/30 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
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
                  ))}
                </tbody>
              </table>
            </div>
            
            {users.length === 0 && (
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
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
