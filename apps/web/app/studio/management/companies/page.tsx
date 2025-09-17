'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { api } from '@/lib/api';
import { Button } from '@lxplayer/ui';
import { Building, Users, Edit, Trash2, Plus } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  domain?: string;
  created_at: string;
  updated_at: string;
}

export default function CompaniesPage() {
  const { user, isSuperAdmin } = useUser();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      loadCompanies();
    }
  }, [isSuperAdmin]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const data = await api.listCompanies();
      setCompanies(data);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Bu firmayı silmek istediğinizden emin misiniz?')) return;

    try {
      await api.deleteCompany(companyId);
      loadCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Firma silinirken hata oluştu');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Yetkisiz Erişim</h2>
          <p className="text-gray-600">Bu sayfaya erişim için SuperAdmin yetkisi gereklidir.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Firmalar yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Firmalar</h1>
          <p className="text-gray-600">Sistem firmalarını yönetin</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Yeni Firma
        </Button>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((company) => (
          <div key={company.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                  {company.domain && (
                    <p className="text-sm text-gray-500">{company.domain}</p>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingCompany(company)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteCompany(company.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              <p>Oluşturulma: {new Date(company.created_at).toLocaleDateString('tr-TR')}</p>
              <p>ID: {company.id.substring(0, 8)}...</p>
            </div>
          </div>
        ))}
      </div>

      {companies.length === 0 && (
        <div className="text-center py-12">
          <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz firma yok</h3>
          <p className="text-gray-600 mb-4">İlk firmayı oluşturun</p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Firma Oluştur
          </Button>
        </div>
      )}

      {/* Create/Edit Form Modal - Simplified */}
      {(showCreateForm || editingCompany) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingCompany ? 'Firma Düzenle' : 'Yeni Firma'}
              </h3>
              <p className="text-gray-600 mb-4">
                Firma yönetimi özellikleri Studio'da geliştirilmektedir.
              </p>
              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingCompany(null);
                  }}
                  className="flex-1"
                >
                  Kapat
                </Button>
                <Button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingCompany(null);
                    loadCompanies();
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
