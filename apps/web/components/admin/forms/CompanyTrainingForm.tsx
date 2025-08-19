"use client";
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Label } from '@lxplayer/ui';
import { api, CompanyTraining, Training } from '@/lib/api';

const Schema = z.object({
  training_id: z.string().min(1, 'Eğitim seçilmelidir'),
  expectations: z.string().optional(),
});

type FormValues = z.infer<typeof Schema>;

interface CompanyTrainingFormProps {
  orgId: string;
  companyTraining: CompanyTraining;
  trainings: Training[];
  onDone?: () => void;
}

export function CompanyTrainingForm({ orgId, companyTraining, trainings, onDone }: CompanyTrainingFormProps) {
  const router = useRouter();
  const defaultValues = {
    training_id: companyTraining.training_id,
    expectations: companyTraining.expectations ?? '',
  };
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues,
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await api.updateCompanyTraining(orgId, companyTraining.id, values);
      router.refresh();
      onDone?.();
    } catch (error) {
      setError('training_id', { type: 'manual', message: 'Güncelleme başarısız' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 max-w-md">
      <div>
        <Label htmlFor="training_id">Eğitim</Label>
        <select 
          id="training_id" 
          {...register('training_id')} 
          className="w-full border rounded px-3 py-2"
        >
          {trainings.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
        {errors.training_id && <p className="text-red-600 text-xs mt-1">{errors.training_id.message}</p>}
      </div>
      
      <div>
        <Label htmlFor="expectations">Firma Beklentileri</Label>
        <textarea 
          id="expectations" 
          {...register('expectations')} 
          placeholder="Firma beklentilerini buraya yazın..."
          rows={4}
          className="w-full border rounded px-3 py-2 resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          Firma için özel beklentiler, hedefler veya notlar ekleyebilirsiniz.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <button 
          disabled={isSubmitting} 
          type="submit" 
          className="border rounded px-3 py-2 bg-blue-600 text-white hover:bg-blue-700"
        >
          Güncelle
        </button>
      </div>
    </form>
  );
}
