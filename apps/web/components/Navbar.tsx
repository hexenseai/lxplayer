"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserBar } from '@/components/UserBar';

export function Navbar() {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/auth');
  const isPlayerPage = pathname.startsWith('/player');
  const isAdminPage = pathname.startsWith('/admin');

  if (isAuthPage || isPlayerPage || isAdminPage) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">LX</span>
            </div>
            <span className="text-xl font-bold text-gray-900">LXPlayer</span>
          </Link>
          
          {/* Navigation links removed */}
        </div>
        
        <UserBar />
      </div>
    </header>
  );
}
