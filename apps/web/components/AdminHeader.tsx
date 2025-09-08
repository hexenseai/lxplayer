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
          <div className="relative h-8 w-8">
            <img
              src="/logo.png"
              alt="LXPlayer Logo"
              className="h-8 w-8 object-contain"
            />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
            LXPlayer Studio
          </span>
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
