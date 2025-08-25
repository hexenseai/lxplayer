import Link from 'next/link';
import { api, Training, CompanyTraining } from '@/lib/api';
import { CompanyUserSection } from '@/components/CompanyUserSection';

interface TrainingDetailProps {
  params: { 
    id: string;
  };
  searchParams: {
    access_code?: string;
  };
}

export default async function TrainingDetail({ params, searchParams }: TrainingDetailProps) {
  const training: Training | null = await api.getTraining(params.id).catch(() => null);
  const accessCode = searchParams.access_code;
  
  if (!training) {
    return (
      <>
        <CompanyUserSection />
        <main className="p-8"><h1 className="text-xl font-semibold">Bulunamadı</h1></main>
      </>
    );
  }

  // Get company training info if access_code is provided
  let companyTraining: CompanyTraining | null = null;
  if (accessCode) {
    try {
      const companyTrainings = await api.listCompanyTrainings();
      companyTraining = companyTrainings.find(ct => ct.access_code === accessCode) || null;
    } catch (error) {
      console.error('Error fetching company training:', error);
    }
  }
  
  // Get all sections
  const sections = await api.listTrainingSections(params.id).catch(() => []);
  
  return (
    <>
      <CompanyUserSection />
      <main className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{training.title}</h1>
            <p className="text-gray-600">{training.description}</p>
            {companyTraining && (
              <div className="mt-2 text-sm text-gray-500">
                <strong>Firma:</strong> {companyTraining.organization?.name || 'Bilinmeyen Firma'}
                {companyTraining.access_code && (
                  <span className="ml-4">
                    <strong>Access Code:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{companyTraining.access_code}</code>
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-3 text-sm">
            {companyTraining?.access_code && (
              <Link 
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                href={`/player/${companyTraining.access_code}?userId=${companyTraining.id}`}
              >
                InteractivePlayer'ı Başlat
              </Link>
            )}
            <Link className="underline" href={`/trainings/${training.id}/embed`}>Embed</Link>
          </div>
        </div>

        {/* Training Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Training Details */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Eğitim Bilgileri</h2>
            <div className="space-y-4">
              <div>
                <strong>Başlık:</strong> {training.title}
              </div>
              <div>
                <strong>Açıklama:</strong> {training.description}
              </div>
              {companyTraining && (
                <>
                  <div>
                    <strong>Firma:</strong> {companyTraining.organization?.name || 'Bilinmeyen Firma'}
                  </div>
                  <div>
                    <strong>Access Code:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{companyTraining.access_code}</code>
                  </div>
                  {companyTraining.expectations && (
                    <div>
                      <strong>Beklentiler:</strong> {companyTraining.expectations}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Side - Sections */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Bölümler ({sections.length})</h2>
            {sections.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📚</div>
                <p className="text-gray-600">Henüz bölüm eklenmemiş</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sections.map((section, index) => (
                  <div key={section.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900">{section.title}</div>
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        Bölüm {index + 1}
                      </div>
                    </div>
                    {section.description && (
                      <div className="text-sm text-gray-600 mb-2">{section.description}</div>
                    )}
                    {section.duration && (
                      <div className="text-xs text-gray-500">
                        Süre: {Math.floor(section.duration / 60)}:{(section.duration % 60).toString().padStart(2, '0')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Interactive Player Info */}
        {companyTraining?.access_code && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-blue-800">İnteraktif Oynatıcı</h2>
            <div className="flex items-center justify-between">
              <div className="text-blue-700">
                <p>Bu eğitim için InteractivePlayer kullanılabilir.</p>
                <p className="text-sm mt-1">AI destekli video oynatma, sohbet ve overlay sistemi ile eğitim deneyimi.</p>
              </div>
              <Link 
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                href={`/player/${companyTraining.access_code}?userId=${companyTraining.id}`}
              >
                InteractivePlayer'ı Başlat
              </Link>
            </div>
          </div>
        )}

        {!companyTraining?.access_code && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-yellow-800">İnteraktif Oynatıcı</h2>
            <div className="text-yellow-700">
              <p>InteractivePlayer için access code gerekli.</p>
              <p className="text-sm mt-1">
                URL'ye <code className="bg-yellow-100 px-2 py-1 rounded">?access_code=TEST123</code> parametresi ekleyin.
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
