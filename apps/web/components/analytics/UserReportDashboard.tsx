'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Users, 
  MessageSquare, 
  Target, 
  TrendingUp,
  Calendar,
  Activity,
  BarChart3
} from 'lucide-react';

interface UserReportDashboardProps {
  userId: string;
  trainingId: string;
  showTrainingAnalytics?: boolean;
}

export function UserReportDashboard({ 
  userId, 
  trainingId, 
  showTrainingAnalytics = false 
}: UserReportDashboardProps) {
  const [userReport, setUserReport] = useState<any>(null);
  const [trainingAnalytics, setTrainingAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [userId, trainingId, showTrainingAnalytics]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (showTrainingAnalytics) {
        // Fetch training analytics
        const analytics = await api.getTrainingAnalytics(trainingId);
        setTrainingAnalytics(analytics);
      } else {
        // Fetch user report
        const report = await api.getUserReport(userId, trainingId);
        setUserReport(report);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}s ${minutes}d`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Report Section */}
      {!showTrainingAnalytics && userReport && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-6"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Kullanıcı Raporu</h2>
          
          {/* User Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Toplam Süre</p>
                  <p className="text-2xl font-bold">{formatDuration(userReport.total_time_spent)}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Tamamlanan Bölümler</p>
                  <p className="text-2xl font-bold">{userReport.sections_completed}</p>
                </div>
                <Target className="h-8 w-8 text-green-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Toplam Etkileşim</p>
                  <p className="text-2xl font-bold">{userReport.total_interactions}</p>
                </div>
                <Activity className="h-8 w-8 text-purple-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Sohbet Mesajları</p>
                  <p className="text-2xl font-bold">{userReport.chat_messages_count}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-orange-200" />
              </div>
            </div>
          </div>

          {/* Detailed Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Oturum Bilgileri</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Toplam Oturum:</span>
                  <span className="font-semibold">{userReport.total_sessions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ortalama Oturum Süresi:</span>
                  <span className="font-semibold">{formatDuration(userReport.average_session_duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Son Erişim:</span>
                  <span className="font-semibold">{formatDate(userReport.last_accessed)}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">İlerleme Bilgileri</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tamamlanan Bölümler:</span>
                  <span className="font-semibold">{userReport.sections_completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Toplam Etkileşim:</span>
                  <span className="font-semibold">{userReport.total_interactions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sohbet Mesajları:</span>
                  <span className="font-semibold">{userReport.chat_messages_count}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Training Analytics Section */}
      {showTrainingAnalytics && trainingAnalytics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-lg p-6"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Eğitim Analitikleri (Son 30 Gün)</h2>
          
          {/* Training Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm">Toplam Kullanıcı</p>
                  <p className="text-2xl font-bold">{trainingAnalytics.total_users}</p>
                </div>
                <Users className="h-8 w-8 text-indigo-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Aktif Kullanıcı</p>
                  <p className="text-2xl font-bold">{trainingAnalytics.active_users}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-rose-500 to-rose-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-rose-100 text-sm">Tamamlayan</p>
                  <p className="text-2xl font-bold">{trainingAnalytics.completed_users}</p>
                </div>
                <Target className="h-8 w-8 text-rose-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm">Ortalama Süre</p>
                  <p className="text-2xl font-bold">{formatDuration(trainingAnalytics.average_completion_time)}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-200" />
              </div>
            </div>
          </div>

          {/* Charts Placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Etkileşim Dağılımı</h3>
              <div className="h-48 flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 mb-2">📊 Interaction Distribution Chart</p>
                  <p className="text-sm text-gray-500">Chart will be displayed here when recharts is installed</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Sohbet: {trainingAnalytics.interaction_stats?.chat_interactions || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Navigasyon: {trainingAnalytics.interaction_stats?.navigation_interactions || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Video: {trainingAnalytics.interaction_stats?.video_interactions || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Overlay: {trainingAnalytics.interaction_stats?.overlay_interactions || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Genel İstatistikler</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Toplam Etkileşim:</span>
                  <span className="font-semibold">{trainingAnalytics.interaction_stats?.total_interactions || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ortalama Etkileşim/Kullanıcı:</span>
                  <span className="font-semibold">{trainingAnalytics.interaction_stats?.average_interactions_per_user || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">En Aktif Kullanıcı:</span>
                  <span className="font-semibold">{trainingAnalytics.most_active_user?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Son Güncelleme:</span>
                  <span className="font-semibold">{formatDate(trainingAnalytics.last_updated)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}