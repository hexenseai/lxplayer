'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { api } from '@/lib/api';
import { Button } from '@lxplayer/ui';
import { User, Shield, Edit, Trash2, Plus, Crown } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  company_id?: string;
  created_at: string;
  updated_at: string;
}

export default function UsersPage() {
  const { user, isSuperAdmin, isAdmin } = useUser();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  useEffect(() => {
    if (isSuperAdmin || isAdmin) {
      loadUsers();
    }
  }, [isSuperAdmin, isAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.listUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;

    try {
      await api.deleteUser(userId);
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Kullanıcı silinirken hata oluştu');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'SuperAdmin':
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'Admin':
        return <Shield className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SuperAdmin':
        return 'bg-yellow-100 text-yellow-800';
      case 'Admin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <span className="ml-2">Kullanıcılar yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kullanıcılar</h1>
          <p className="text-gray-600">Sistem kullanıcılarını yönetin</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Yeni Kullanıcı
        </Button>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((userData) => (
          <div key={userData.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-gray-900">{userData.name}</h3>
                  <p className="text-sm text-gray-500">{userData.email}</p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingUser(userData)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                {userData.role !== 'SuperAdmin' && (
                  <button
                    onClick={() => handleDeleteUser(userData.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(userData.role)}`}>
                {getRoleIcon(userData.role)}
                {userData.role}
              </span>
            </div>
            
            <div className="text-xs text-gray-500">
              <p>Oluşturulma: {new Date(userData.created_at).toLocaleDateString('tr-TR')}</p>
              <p>ID: {userData.id.substring(0, 8)}...</p>
            </div>
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz kullanıcı yok</h3>
          <p className="text-gray-600 mb-4">İlk kullanıcıyı oluşturun</p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Kullanıcı Oluştur
          </Button>
        </div>
      )}

      {/* Create/Edit Form Modal - Simplified */}
      {(showCreateForm || editingUser) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
              </h3>
              <p className="text-gray-600 mb-4">
                Kullanıcı yönetimi özellikleri Studio'da geliştirilmektedir.
              </p>
              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingUser(null);
                  }}
                  className="flex-1"
                >
                  Kapat
                </Button>
                <Button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingUser(null);
                    loadUsers();
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
    </div>
  );
}
