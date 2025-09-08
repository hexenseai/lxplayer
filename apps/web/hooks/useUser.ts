'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: 'SuperAdmin' | 'Admin' | 'User';
  company_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await api.getCurrentUser();
        setUser(currentUser);
      } catch (error: any) {
        console.error('Failed to fetch user:', error);
        // 401 hatası durumunda token'ı temizle
        if (error?.message?.includes('401')) {
          localStorage.removeItem('token');
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const isSuperAdmin = user?.role === 'SuperAdmin';
  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';

  return {
    user,
    loading,
    isSuperAdmin,
    isAdmin,
  };
}