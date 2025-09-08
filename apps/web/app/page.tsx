'use client';

import { useUser } from '@/hooks/useUser';
import { AdminDashboard } from '@/components/AdminDashboard';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, loading, isSuperAdmin, isAdmin } = useUser();

  useEffect(() => {
    if (!loading && !isSuperAdmin && !isAdmin) {
      redirect('/login');
    }
  }, [loading, isSuperAdmin, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isSuperAdmin && !isAdmin) {
    return null;
  }

  return <AdminDashboard />;
}