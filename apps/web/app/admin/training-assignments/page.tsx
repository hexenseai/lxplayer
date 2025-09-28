"use client";
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useUser } from '@/hooks/useUser';

interface Company {
  id: string;
  name: string;
  description?: string;
}

interface Training {
  id: string;
  title: string;
  description?: string;
  assigned: boolean;
}

interface CompanyTraining {
  id: string;
  company_id: string | null; // Allow null to handle orphaned records
  training_id: string;
  expectations?: string;
  access_code: string;
  training?: {
    id: string;
    title: string;
    description?: string;
  } | null;
  company?: {
    id: string;
    name: string;
    description?: string;
  } | null;
}

export default function TrainingAssignmentsPage() {
  const { user, loading: userLoading, isSuperAdmin } = useUser();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [companyTrainings, setCompanyTrainings] = useState<CompanyTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<string>('');
  const [expectations, setExpectations] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [isSuperAdmin, userLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching training assignment data...');
      
      // Fetch companies, system trainings, and current assignments
      const [companiesData, trainingsData, assignmentsData] = await Promise.all([
        api.listCompanies(),
        api.listSystemTrainings(),
        api.listCompanyTrainings()
      ]);
      
      console.log('📊 Companies data:', companiesData);
      console.log('📚 Trainings data:', trainingsData);
      console.log('🎯 Assignments data:', assignmentsData);
      
      // Filter out orphaned records (those with null company_id or missing training/company data)
      const validAssignments = assignmentsData.filter(assignment => 
        assignment.company_id && 
        assignment.training && 
        assignment.company
      );
      
      console.log(`🔍 Filtered out ${assignmentsData.length - validAssignments.length} orphaned assignments`);
      
      setCompanies(companiesData);
      setTrainings(trainingsData);
      setCompanyTrainings(validAssignments);
      
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      alert(`Veri yüklenirken hata oluştu: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTraining = async () => {
    if (!selectedCompany || !selectedTraining) return;
    
    try {
      setAssigning(true);
      await api.assignTrainingToCompany(selectedCompany, selectedTraining, expectations);
      
      // Refresh data
      await fetchData();
      
      // Reset form
      setSelectedCompany('');
      setSelectedTraining('');
      setExpectations('');
      setShowAssignModal(false);
      
      alert('Eğitim başarıyla atandı!');
    } catch (error) {
      console.error('Error assigning training:', error);
      alert('Eğitim atanırken bir hata oluştu');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (companyTrainingId: string) => {
    if (!confirm('Bu eğitim atamasını kaldırmak istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      await api.removeTrainingFromCompany(companyTrainingId);
      await fetchData();
      alert('Eğitim ataması kaldırıldı!');
    } catch (error) {
      console.error('Error removing assignment:', error);
      alert('Eğitim ataması kaldırılırken bir hata oluştu');
    }
  };

  const filteredTrainings = selectedCompany 
    ? trainings.filter(t => !companyTrainings.some(ct => ct.company_id === selectedCompany && ct.training_id === t.id))
    : trainings;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <p>Bu sayfaya erişim yetkiniz yok.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Eğitim Atamaları</h1>
        <p className="text-slate-600">Firmalara eğitim atayın ve yönetin</p>
      </div>

      {/* Assign Training Button */}
      <div className="mb-6">
        <button
          onClick={() => {
            setShowAssignModal(true);
            // Modal açıldığında verileri yeniden yükle
            fetchData();
          }}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Yeni Eğitim Ata
        </button>
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Mevcut Atamalar ({companyTrainings.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Firma
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Eğitim
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Beklentiler
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Access Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companyTrainings.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {assignment.company?.name || 'Bilinmeyen Firma'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {assignment.training?.title || 'Bilinmeyen Eğitim'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {assignment.expectations || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {assignment.access_code}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                      onClick={() => handleRemoveAssignment(assignment.id)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                    >
                      Kaldır
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {companyTrainings.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz atama yok</h3>
            <p className="mt-1 text-sm text-gray-500">
              İlk eğitim atamasını yapmak için yukarıdaki butonu kullanın.
            </p>
          </div>
        )}
      </div>

      {/* Assign Training Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Eğitim Ata</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Firma *</label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Firma seçin</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                {companies.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Firma bulunamadı. Önce firma ekleyin.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Eğitim *</label>
                <select
                  value={selectedTraining}
                  onChange={(e) => setSelectedTraining(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Eğitim seçin</option>
                  {filteredTrainings.map(training => (
                    <option key={training.id} value={training.id}>
                      {training.title}
                    </option>
                  ))}
                </select>
                {filteredTrainings.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    {selectedCompany 
                      ? 'Bu firmaya atanabilir eğitim bulunamadı.' 
                      : 'Sistem eğitimi bulunamadı. Önce sistem eğitimi oluşturun.'
                    }
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beklentiler</label>
                <textarea
                  value={expectations}
                  onChange={(e) => setExpectations(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Bu eğitim için beklentilerinizi yazın..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                disabled={assigning}
              >
                İptal
              </button>
              <button
                onClick={handleAssignTraining}
                disabled={!selectedCompany || !selectedTraining || assigning}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigning ? 'Atanıyor...' : 'Ata'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
