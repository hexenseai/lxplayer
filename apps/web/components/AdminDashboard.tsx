'use client';

import { useState } from 'react';
import { useUser } from '@/hooks/useUser';
// import { AdminHeader } from '@/components/AdminHeader'; // Removed header
import { AdminLeftNavbar } from '@/components/AdminLeftNavbar';
import { DashboardContent } from '@/components/DashboardContent';

interface AdminDashboardProps {
  initialTab?: string | null;
}

export function AdminDashboard({ initialTab }: AdminDashboardProps) {
  const { user, isSuperAdmin, isAdmin } = useUser();
  const [activePage, setActivePage] = useState(initialTab || 'dashboard');

  const logout = () => {
    document.cookie = 'lx_token=; Max-Age=0; path=/';
    localStorage.removeItem('lx_user');
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header removed */}
      
      <div className="flex">
        {/* Left Navbar */}
        <AdminLeftNavbar 
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
          activePage={activePage}
          onPageChange={setActivePage}
          onLogout={logout}
        />
        
        {/* Main Content */}
        <main className="flex-1 ml-64 pt-4">
          <DashboardContent 
            activePage={activePage}
            isSuperAdmin={isSuperAdmin}
            isAdmin={isAdmin}
          />
        </main>
      </div>
    </div>
  );
}
