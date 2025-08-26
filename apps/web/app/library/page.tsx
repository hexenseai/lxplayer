import Link from 'next/link';
import { api } from '@/lib/api';
import { CompanyUserSection } from '@/components/CompanyUserSection';
import { ScormDownloadButton } from '@/components/admin/ScormDownloadButton';

export default async function LibraryPage() {
  const trainings = await api
    .listTrainings()
    .catch(() => []);
    
  return (
    <>
      <CompanyUserSection />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-accent-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="relative h-20 w-20">
                <img
                  src="/logo.png"
                  alt="LXPlayer Logo"
                  className="h-20 w-20 object-contain"
                />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Eğitim Kütüphanesi
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Geniş eğitim içerikleri koleksiyonunu keşfedin ve öğrenme yolculuğunuza başlayın
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {trainings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainings.map((t) => (
              <div key={t.id} className="card group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="card-header">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="card-title text-lg mb-2">
                        {t.title}
                      </h3>
                      <p className="card-description line-clamp-3">
                        {t.description || 'Açıklama bulunmuyor'}
                      </p>
                    </div>
                    <div className="ml-4">
                      <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                        <svg className="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="card-footer">
                  <div className="flex gap-2">
                    <Link 
                      className="btn btn-primary flex-1" 
                      href={`/trainings/${t.id}`}
                    >
                      Detayları Görüntüle
                      <svg className="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <ScormDownloadButton trainingId={t.id} trainingTitle={t.title} />
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
              Kütüphanede henüz eğitim içeriği bulunmuyor.
            </p>
            <Link href="/admin/trainings" className="btn btn-primary">
              Eğitim Ekle
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
