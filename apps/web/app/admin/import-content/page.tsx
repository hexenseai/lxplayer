"use client";

import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ImportContent from '@/components/admin/ImportContent';

export default function ImportContentPage() {
  const { user, loading, isSuperAdmin, isAdmin } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isSuperAdmin && !isAdmin) {
      router.push('/');
    }
  }, [loading, isSuperAdmin, isAdmin, router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin && !isAdmin) {
    return null;
  }

  return <ImportContent />;
}
