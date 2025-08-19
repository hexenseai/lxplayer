import { api, Training as TrainingT } from '@/lib/api';
import { AdminNav } from '@/components/admin/AdminNav';
import { TrainingForm } from '@/components/admin/forms/TrainingForm';
import { TrainingSectionsList } from '@/components/admin/TrainingSectionsList';
import { DeleteTrainingButton } from '@/components/admin/DeleteTrainingButton';
import { Drawer } from '@/components/admin/Drawer';
import TrainingDetails from '@/components/admin/TrainingDetails';
import Link from 'next/link';



export default async function AdminTrainingsPage() {
  let trainings: TrainingT[] = [];
  try {
    trainings = await api.listTrainings();
  } catch (error) {
    console.error('API Error:', error);
  }
  return (
    <main className="p-0">
      <AdminNav />
      <div className="p-8 space-y-6">
        {/* Page Header with Green Theme */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-emerald-900">Eğitimler</h1>
                <p className="text-emerald-600 text-sm">Eğitim içerikleri, bölümler ve overlay'ler</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/admin/styles" 
                className="text-sm text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1"
              >
                <span>Stil Yönetimi</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Drawer buttonLabel="Yeni Eğitim Ekle" title="Yeni Eğitim">
                <TrainingForm />
              </Drawer>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {trainings.map((t) => (
            <div key={t.id} className="bg-white border border-emerald-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <TrainingDetails training={t} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
