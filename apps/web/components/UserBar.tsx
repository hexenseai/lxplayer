"use client";
import React from 'react';
import Link from 'next/link';

export function UserBar() {
  const [name, setName] = React.useState<string | null>(null);
  const [role, setRole] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    try {
      const u = localStorage.getItem('lx_user');
      if (u) {
        const obj = JSON.parse(u);
        setName(obj.full_name || obj.email || null);
        setRole(obj.role || null);
      }
    } catch {}
  }, []);

  const logout = () => {
    document.cookie = 'lx_token=; Max-Age=0; path=/';
    localStorage.removeItem('lx_user');
    window.location.href = '/login';
  };

  return (
    <div className="flex items-center space-x-4">
      <div className="hidden md:flex items-center space-x-3">
        <Link 
          className="btn btn-outline btn-sm" 
          href="/admin"
        >
          Yönetim
        </Link>
        {name && (
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-foreground">{name}</p>
              {role && (
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              )}
            </div>
          </div>
        )}
        <Link 
          className="text-sm text-muted-foreground hover:text-foreground transition-colors" 
          href="/profile"
        >
          Profil
        </Link>
      </div>
      
      <button 
        onClick={logout} 
        className="btn btn-ghost btn-sm text-muted-foreground hover:text-foreground"
      >
        Çıkış
      </button>
    </div>
  );
}
