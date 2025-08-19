"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserBar } from '@/components/UserBar';

export function Navbar() {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/auth');
  const isPlayerPage = pathname.startsWith('/player');

  if (isAuthPage || isPlayerPage) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative h-8 w-8">
              <img
                src="/logo.png"
                alt="LXPlayer Logo"
                className="h-8 w-8 object-contain"
              />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              LXPlayer
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === '/' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Ana Sayfa
            </Link>
            <Link 
              href="/library" 
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === '/library' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Kütüphane
            </Link>
            <Link 
              href="/studio" 
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname.startsWith('/studio') ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Studio
            </Link>
          </nav>
        </div>
        
        <UserBar />
      </div>
    </header>
  );
}
