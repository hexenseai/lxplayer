'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { UsageReportsPage } from './UsageReportsPage';
import StudioPage from '@/app/studio/page';
import StudioAssetsPage from '@/app/studio/assets/page';
import CompaniesPage from '@/app/admin/companies/page';
import UsersPage from '@/app/admin/users/page';
import StylesPage from '@/app/admin/styles/page';
import FrameConfigsPage from '@/app/admin/frame-configs/page';
import AvatarsPage from '@/app/admin/avatars/page';

interface DashboardContentProps {
  activePage: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

export function DashboardContent({ activePage, isSuperAdmin, isAdmin }: DashboardContentProps) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTrainings: 0,
    totalAssets: 0,
    totalStyles: 0,
    totalAvatars: 0,
    recentTrainings: []
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Use the new statistics endpoint
        const statistics = await api.getDashboardStatistics();
        
        setStats({
          totalUsers: statistics.totalUsers,
          totalTrainings: statistics.totalTrainings,
          totalAssets: statistics.totalAssets,
          totalStyles: statistics.totalStyles,
          totalAvatars: statistics.totalAvatars,
          recentTrainings: [] // TODO: Add recent trainings if needed
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        // Fallback to individual API calls if statistics endpoint fails
        try {
          const users = await api.listUsers().catch(() => []);
          const trainings = await api.listTrainings().catch(() => []);
          const assets = await api.listAssets().catch(() => []);
          const styles = await api.listStyles().catch(() => []);
          const avatars = await api.listAvatars().catch(() => []);
          
          setStats({
            totalUsers: users.length,
            totalTrainings: trainings.length,
            totalAssets: assets.length,
            totalStyles: styles.length,
            totalAvatars: avatars.length,
            recentTrainings: []
          });
        } catch (fallbackError) {
          console.error('Fallback stats fetch also failed:', fallbackError);
        }
      }
    };

    if (activePage === 'dashboard') {
      fetchStats();
    }
  }, [activePage]);

  const renderDashboard = () => (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Hoş geldiniz! İşte sisteminizin genel durumu.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Toplam Kullanıcı</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Toplam Eğitim</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTrainings}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Toplam İçerik</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAssets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Toplam Stil</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStyles}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-pink-100">
              <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Toplam Avatar</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAvatars}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hızlı İşlemler</h3>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.href = '/admin/trainings'}
              className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-gray-700">Yeni Eğitim Ekle</span>
            </button>
            
            <button 
              onClick={() => window.location.href = '/admin/assets'}
              className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-gray-700">İçerik Yükle</span>
            </button>
            
            <button 
              onClick={() => window.location.href = '/admin/styles'}
              className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-gray-700">Stil Tanımla</span>
            </button>
            
            <button 
              onClick={() => window.location.href = '/admin/frame-configs'}
              className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-gray-700">Frame Ayarları</span>
            </button>
            
            <button 
              onClick={() => window.location.href = '/admin/avatars'}
              className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-gray-700">Avatar Oluştur</span>
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Son Eklenen Eğitimler</h3>
          <div className="space-y-3">
            {stats.recentTrainings.length > 0 ? (
              stats.recentTrainings.map((training: any) => (
                <div key={training.id} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{training.title}</p>
                    <p className="text-xs text-gray-500">{training.description || 'Açıklama yok'}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Henüz eğitim eklenmemiş</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return renderDashboard();
      case 'trainings':
        return <StudioPage />;
      case 'assets':
        return <StudioAssetsPage />;
      case 'companies':
        return <CompaniesPage />;
      case 'users':
        return <UsersPage />;
      case 'styles':
        return <StylesPage />;
      case 'frame-configs':
        return <FrameConfigsPage />;
      case 'avatars':
        return <AvatarsPage />;
      case 'usage-reports':
        return <UsageReportsPage />;
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderPage()}
    </div>
  );
}
