'use client';

import { User } from '@/hooks/useUser';
import { UserBar } from '@/components/UserBar';

interface AdminHeaderProps {
  user: User | null;
}

export function AdminHeader({ user }: AdminHeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">LX</span>
          </div>
          <span className="text-xl font-bold text-gray-900">LXPlayer Studio</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-600">
          Hoş geldiniz, <span className="font-medium">{user?.full_name || user?.username}</span>
        </div>
        <UserBar />
      </div>
    </header>
  );
}
