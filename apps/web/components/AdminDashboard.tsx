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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const logout = () => {
    document.cookie = 'lx_token=; Max-Age=0; path=/';
    localStorage.removeItem('lx_user');
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header removed */}
      
      <div className="flex">
        {/* Left Navbar */}
        <AdminLeftNavbar 
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
          activePage={activePage}
          onPageChange={setActivePage}
          onLogout={logout}
          onCollapseChange={setIsSidebarCollapsed}
        />
        
        {/* Main Content */}
        <main className={`flex-1 pt-4 transition-all duration-300 ${
          isSidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}>
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
