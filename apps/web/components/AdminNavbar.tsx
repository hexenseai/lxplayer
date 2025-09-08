"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserBar } from '@/components/UserBar';
import { useUser } from '@/hooks/useUser';

export function AdminNavbar() {
  const pathname = usePathname();
  const { user, isSuperAdmin, isAdmin } = useUser();
  
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/auth');
  const isPlayerPage = pathname.startsWith('/player');

  if (isAuthPage || isPlayerPage) {
    return null;
  }

  if (!isSuperAdmin && !isAdmin) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <Link href="/admin" className="flex items-center space-x-2">
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
          </Link>
          
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/admin" 
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === '/admin' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Dashboard
            </Link>
            
            {isSuperAdmin && (
              <>
                <Link 
                  href="/admin/companies" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname.startsWith('/admin/companies') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Firmalar
                </Link>
                <Link 
                  href="/admin/users" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname.startsWith('/admin/users') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Kullanıcılar
                </Link>
                <Link 
                  href="/admin/styles" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname.startsWith('/admin/styles') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Stiller
                </Link>
                <Link 
                  href="/admin/frame-configs" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname.startsWith('/admin/frame-configs') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Frame Konfigürasyonları
                </Link>
                <Link 
                  href="/admin/assets" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname.startsWith('/admin/assets') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  İçerikler
                </Link>
                <Link 
                  href="/admin/trainings" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname.startsWith('/admin/trainings') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Eğitimler
                </Link>
              </>
            )}
            
            {isAdmin && (
              <>
                <Link 
                  href="/admin/company-profile" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname.startsWith('/admin/company-profile') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Firma Profili
                </Link>
                <Link 
                  href="/admin/users" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname.startsWith('/admin/users') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Kullanıcılar
                </Link>
                <Link 
                  href="/admin/styles" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname.startsWith('/admin/styles') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Stiller
                </Link>
                <Link 
                  href="/admin/frame-configs" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname.startsWith('/admin/frame-configs') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Frame Konfigürasyonları
                </Link>
                <Link 
                  href="/admin/assets" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname.startsWith('/admin/assets') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  İçerikler
                </Link>
                <Link 
                  href="/admin/trainings" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname.startsWith('/admin/trainings') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Eğitimler
                </Link>
              </>
            )}
          </nav>
        </div>
        
        <UserBar />
      </div>
    </header>
  );
}
