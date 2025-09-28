'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { UserReportDashboard } from '@/components/analytics/UserReportDashboard';
import EvaluationReportsList from '@/components/admin/EvaluationReportsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@lxplayer/ui';
import { 
  Users, 
  BookOpen, 
  Search, 
  Filter,
  Download,
  RefreshCw,
  Calendar,
  TrendingUp,
  FileText,
  BarChart3
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
  company_id?: string;
  role: string;
}

interface Training {
  id: string;
  title: string;
  description?: string;
  company_id?: string;
}

interface TrainingCompletion {
  id: string;
  user_id: string;
  training_id: string;
  company_id: string;
  completed_at: string;
  completion_percentage: number;
  total_time_spent: number;
  total_interactions: number;
  sections_completed: number;
}

export function UsageReportsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [completions, setCompletions] = useState<TrainingCompletion[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUserReport, setShowUserReport] = useState(false);
  const [showTrainingAnalytics, setShowTrainingAnalytics] = useState(false);
  const [showCompletions, setShowCompletions] = useState(false);
  const [activeTab, setActiveTab] = useState('usage');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersData, trainingsData, completionsData] = await Promise.all([
        api.listUsers().catch(() => []),
        api.listTrainings().catch(() => []),
        api.getTrainingCompletions().catch(() => ({ completions: [], total_count: 0 }))
      ]);

      setUsers(usersData);
      setTrainings(trainingsData);
      setCompletions(completionsData.completions || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateUserReport = () => {
    if (selectedUserId && selectedTrainingId) {
      setShowUserReport(true);
      setShowTrainingAnalytics(false);
    }
  };

  const handleGenerateTrainingAnalytics = () => {
    if (selectedTrainingId) {
      setShowTrainingAnalytics(true);
      setShowUserReport(false);
      setShowCompletions(false);
    }
  };

  const handleShowCompletions = () => {
    setShowCompletions(true);
    setShowUserReport(false);
    setShowTrainingAnalytics(false);
  };

  const handleGenerateCompletionReport = () => {
    // Bu fonksiyon gelecekte geliştirilecek
    console.log('Eğitim bitirme raporu oluşturulacak');
    alert('Eğitim bitirme raporu özelliği geliştiriliyor...');
  };

  const handleRefresh = () => {
    fetchData();
    setShowUserReport(false);
    setShowTrainingAnalytics(false);
    setShowCompletions(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-2 text-gray-600">Veriler yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-red-700">Hata: {error}</span>
          <button
            onClick={handleRefresh}
            className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Raporlar</h1>
          <p className="text-gray-600 mt-1">Kullanım raporları ve değerlendirme analitikleri</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Yenile
        </button>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Kullanım Raporları
          </TabsTrigger>
          <TabsTrigger value="evaluation" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Değerlendirme Raporları
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="mt-6">

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Toplam Kullanıcı</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Toplam Eğitim</p>
              <p className="text-2xl font-bold text-gray-900">{trainings.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tamamlanan Eğitimler</p>
              <p className="text-2xl font-bold text-gray-900">{completions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Report Generation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Rapor Oluştur</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Report Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Kullanıcı Raporu</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kullanıcı Seçin
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Kullanıcı seçin...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.username || user.email} ({user.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Eğitim Seçin
              </label>
              <select
                value={selectedTrainingId}
                onChange={(e) => setSelectedTrainingId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Eğitim seçin...</option>
                {trainings.map((training) => (
                  <option key={training.id} value={training.id}>
                    {training.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleGenerateUserReport}
              disabled={!selectedUserId || !selectedTrainingId}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Users className="h-4 w-4 inline mr-2" />
              Kullanıcı Raporu Oluştur
            </button>
          </div>

          {/* Training Analytics Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Eğitim Analitikleri</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Eğitim Seçin
              </label>
              <select
                value={selectedTrainingId}
                onChange={(e) => setSelectedTrainingId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Eğitim seçin...</option>
                {trainings.map((training) => (
                  <option key={training.id} value={training.id}>
                    {training.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleGenerateTrainingAnalytics}
              disabled={!selectedTrainingId}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <TrendingUp className="h-4 w-4 inline mr-2" />
              Eğitim Analitikleri Oluştur
            </button>
          </div>
        </div>
      </div>

      {/* Training Completions Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Eğitim Bitirme Raporları</h2>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleShowCompletions}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Calendar className="h-4 w-4 inline mr-2" />
            Tamamlanan Eğitimleri Görüntüle
          </button>
          
          <button
            onClick={handleGenerateCompletionReport}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Download className="h-4 w-4 inline mr-2" />
            Eğitim Bitirme Raporu Oluştur
          </button>
        </div>
      </div>

      {/* Reports Display */}
      {showUserReport && selectedUserId && selectedTrainingId && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Kullanıcı Raporu</h2>
              <button
                onClick={() => setShowUserReport(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="p-6">
            <UserReportDashboard 
              userId={selectedUserId}
              trainingId={selectedTrainingId}
              showTrainingAnalytics={false}
            />
          </div>
        </div>
      )}

      {showTrainingAnalytics && selectedTrainingId && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Eğitim Analitikleri</h2>
              <button
                onClick={() => setShowTrainingAnalytics(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="p-6">
            <UserReportDashboard 
              userId=""
              trainingId={selectedTrainingId}
              showTrainingAnalytics={true}
            />
          </div>
        </div>
      )}

      {/* Training Completions Display */}
      {showCompletions && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Tamamlanan Eğitimler</h2>
              <button
                onClick={() => setShowCompletions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="p-6">
            {completions.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Henüz tamamlanan eğitim bulunmuyor.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kullanıcı
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Eğitim
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tamamlanma Tarihi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Süre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İlerleme
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Etkileşim
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {completions.map((completion) => {
                      const user = users.find(u => u.id === completion.user_id);
                      const training = trainings.find(t => t.id === completion.training_id);
                      
                      return (
                        <tr key={completion.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {user?.full_name || user?.username || user?.email || 'Bilinmeyen'}
                            </div>
                            <div className="text-sm text-gray-500">{user?.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {training?.title || 'Bilinmeyen Eğitim'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(completion.completed_at).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {Math.floor(completion.total_time_spent / 60)} dakika
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full" 
                                  style={{ width: `${completion.completion_percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-900">
                                {completion.completion_percentage.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {completion.total_interactions}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Hızlı İşlemler</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              // Export all user reports
              console.log('Export all user reports');
            }}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="h-5 w-5 mr-2 text-gray-600" />
            <span className="text-gray-700">Tüm Raporları Dışa Aktar</span>
          </button>

          <button
            onClick={() => {
              // View system analytics
              console.log('View system analytics');
            }}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <TrendingUp className="h-5 w-5 mr-2 text-gray-600" />
            <span className="text-gray-700">Sistem Analitikleri</span>
          </button>

          <button
            onClick={() => {
              // View recent activity
              console.log('View recent activity');
            }}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Calendar className="h-5 w-5 mr-2 text-gray-600" />
            <span className="text-gray-700">Son Aktiviteler</span>
          </button>
        </div>
      </div>

        </TabsContent>

        <TabsContent value="evaluation" className="mt-6">
          <EvaluationReportsList
            title="LLM Değerlendirme Raporları"
            showActions={true}
          />
        </TabsContent>

      </Tabs>
    </div>
  );
}
