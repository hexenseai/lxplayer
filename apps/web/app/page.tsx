import Link from 'next/link';
import { api } from '@/lib/api';
import { CompanyUserSection } from '@/components/CompanyUserSection';

export default async function HomePage() {
  const companyTrainings = await api.listCompanyTrainings().catch(() => []);
  
  return (
    <>
      <CompanyUserSection />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="relative h-32 w-32">
                <img
                  src="/logo.png"
                  alt="LXPlayer Logo"
                  className="h-32 w-32 object-contain"
                />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              <span className="bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                LXPlayer
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Yapay zeka destekli interaktif eğitim platformu ile öğrenme deneyiminizi geliştirin
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/library" 
                className="btn btn-primary btn-lg"
              >
                Kütüphaneyi Keşfet
              </Link>
              <Link 
                href="/studio" 
                className="btn btn-outline btn-lg"
              >
                Studio'ya Git
              </Link>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-accent-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Firma Eğitimleri
          </h2>
          <p className="text-lg text-muted-foreground">
            Şirketiniz için özel olarak hazırlanmış eğitim içeriklerini keşfedin
          </p>
        </div>

        {companyTrainings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companyTrainings.map((ct) => (
              <div key={ct.id} className="card group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="card-header">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="card-title text-lg mb-2">
                        {ct.training?.title || 'Bilinmeyen Eğitim'}
                      </h3>
                      <p className="card-description line-clamp-2">
                        {ct.training?.description || 'Açıklama bulunmuyor'}
                      </p>
                    </div>
                    <div className="ml-4">
                      <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
                        <svg className="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="card-content">
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {ct.organization?.name || 'Bilinmeyen Firma'}
                    </div>
                    
                    <div className="flex items-center text-sm text-muted-foreground">
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      <code className="bg-secondary-100 px-2 py-1 rounded text-xs font-mono">
                        {ct.access_code}
                      </code>
                    </div>
                  </div>
                </div>
                
                <div className="card-footer">
                  <div className="flex gap-2 w-full">
                    <Link 
                      className="btn btn-outline btn-sm flex-1" 
                      href={`/trainings/${ct.training_id}?access_code=${ct.access_code}`}
                    >
                      Detay
                    </Link>
                    <Link 
                      className="btn btn-primary btn-sm flex-1" 
                      href={`/player/${ct.access_code}`}
                    >
                      Oynat
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-secondary-100 rounded-full flex items-center justify-center mb-6">
              <svg className="h-12 w-12 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Henüz eğitim içeriği yok
            </h3>
            <p className="text-muted-foreground mb-6">
              Admin panelinden eğitim içerikleri ekleyebilirsiniz.
            </p>
            <Link href="/admin" className="btn btn-primary">
              Admin Paneline Git
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
