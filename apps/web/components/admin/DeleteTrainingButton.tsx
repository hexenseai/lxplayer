"use client";
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface DeleteTrainingButtonProps {
  trainingId: string;
  trainingTitle: string;
}

export function DeleteTrainingButton({ trainingId, trainingTitle }: DeleteTrainingButtonProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`"${trainingTitle}" eğitimini ve tüm bölümlerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      return;
    }

    try {
      await api.deleteTraining(trainingId);
      router.refresh();
    } catch (error) {
      console.error('Training silinirken hata:', error);
      alert('Eğitim silinirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  return (
    <button 
      onClick={handleDelete}
      className="border rounded px-3 py-1 text-red-700 hover:bg-red-50"
    >
      Eğitimi Sil
    </button>
  );
}
