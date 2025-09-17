"use client";
import { api, Training, CompanyTraining } from '@/lib/api';
import { useState } from 'react';
import { revalidatePath } from 'next/cache';

interface AddTrainingToUserFormProps {
  userId: string;
  trainings: Training[];
  onTrainingAdded?: () => void;
}

export function AddTrainingToUserForm({ userId, trainings, onTrainingAdded }: AddTrainingToUserFormProps) {
  const [selectedTrainingId, setSelectedTrainingId] = useState('');
  const [expectations, setExpectations] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainingId) {
      alert('Lütfen bir eğitim seçin');
      return;
    }

    setLoading(true);
    try {
      await api.createUserTraining(userId, {
        training_id: selectedTrainingId,
        expectations: expectations || undefined,
      });
      
      setSelectedTrainingId('');
      setExpectations('');
      onTrainingAdded?.();
      
      // Form başarılı olduğunda sayfayı yenile
      window.location.reload();
    } catch (error) {
      console.error('Error adding training to user:', error);
      alert('Eğitim eklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="training" className="block text-sm font-medium text-gray-700 mb-2">
          Eğitim Seçin
        </label>
        <select
          id="training"
          value={selectedTrainingId}
          onChange={(e) => setSelectedTrainingId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          required
        >
          <option value="">Eğitim seçin...</option>
          {trainings.map((training) => (
            <option key={training.id} value={training.id}>
              {training.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="expectations" className="block text-sm font-medium text-gray-700 mb-2">
          Eğitimden Beklentiler (Opsiyonel)
        </label>
        <textarea
          id="expectations"
          value={expectations}
          onChange={(e) => setExpectations(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          placeholder="Bu eğitimden ne beklediğinizi yazın..."
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={loading || !selectedTrainingId}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Ekleniyor...' : 'Eğitim Ekle'}
        </button>
      </div>
    </form>
  );
}
