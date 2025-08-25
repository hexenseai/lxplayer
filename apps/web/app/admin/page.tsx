import { AdminNav } from '@/components/admin/AdminNav';
import Link from 'next/link';

export default function AdminPage() {
  const adminPages = [
    { 
      href: '/admin/organizations', 
      label: 'Firma Profili', 
      description: 'Firma bilgilerini düzenleyin',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    { 
      href: '/admin/users', 
      label: 'Kullanıcılar', 
      description: 'Kullanıcı hesaplarını yönetin',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      )
    },
    { 
      href: '/admin/trainings', 
      label: 'Eğitimler', 
      description: 'Eğitim programlarını ve bölümlerini yönetin',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    { 
      href: '/admin/assets', 
      label: 'İçerikler', 
      description: 'Video, resim, ses ve doküman içeriklerini yönetin',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
        </svg>
      )
    },
    { 
      href: '/admin/styles', 
      label: 'Stiller', 
      description: 'Overlay stilleri ve görsel ayarları yönetin',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
        </svg>
      )
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <AdminNav />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Yönetim Paneli
          </h1>
          <p className="text-lg text-muted-foreground">
            Sistem yönetimi ve içerik kontrolü için gerekli araçlar
          </p>
        </div>
        
        {/* Admin Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-12">
          {adminPages.map((page) => (
            <Link
              key={page.href}
              href={page.href as any}
              className="card group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="card-content">
                <div className="flex items-start space-x-4">
                  <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 group-hover:bg-primary-200 transition-colors">
                    {page.icon}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary-600 transition-colors">
                      {page.label}
                    </h2>
                    <p className="text-muted-foreground mb-4">
                      {page.description}
                    </p>
                    <div className="flex items-center text-primary-600 text-sm font-medium group-hover:text-primary-700 transition-colors">
                      Yönet
                      <svg className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        {/* Info Section */}
        <div className="card bg-gradient-to-r from-primary-50 to-accent-50 border-primary-200">
          <div className="card-content">
            <div className="flex items-start space-x-4">
              <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary-900 mb-2">
                  Yönetim Paneli Hakkında
                </h3>
                <p className="text-primary-800">
                  Bu yönetim paneli ile sistemdeki tüm verileri yönetebilirsiniz. 
                  Kullanıcılar, firmalar, içerikler ve eğitimler için CRUD işlemleri yapabilirsiniz.
                  Her bölüm için detaylı yönetim araçları mevcuttur.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
