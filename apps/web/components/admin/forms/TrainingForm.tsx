"use client";
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input, Label } from '@lxplayer/ui';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { Training } from '@/lib/api';
import type { Avatar } from '@/lib/types';
import { api } from '@/lib/api';

const Schema = z.object({ 
  title: z.string().min(1), 
  description: z.string().optional(),
  avatar_id: z.string().optional()
});

type FormValues = z.infer<typeof Schema>;

export function TrainingForm({ initialTraining, onDone }: { initialTraining?: Training; onDone?: () => void }) {
  const router = useRouter();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  
  const defaultValues = initialTraining ? { 
    title: initialTraining.title, 
    description: initialTraining.description ?? undefined,
    avatar_id: initialTraining.avatar_id ?? undefined
  } : undefined;
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setError } = useForm<FormValues>({ 
    resolver: zodResolver(Schema), 
    defaultValues 
  });

  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const avatars = await api.listAvatars();
        setAvatars(avatars);
      } catch (error) {
        console.error('Error fetching avatars:', error);
      } finally {
        setLoadingAvatars(false);
      }
    };

    fetchAvatars();
  }, []);

  const onSubmit = async (values: FormValues) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const isUpdate = Boolean(initialTraining?.id);
    const path = isUpdate ? `${base}/trainings/${initialTraining!.id}` : `${base}/trainings`;
    const method = isUpdate ? 'PUT' : 'POST';
    const res = await fetch(path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(values) });
    if (!res.ok) {
      setError('title', { type: 'manual', message: `Hata: ${res.status}` });
      return;
    }
    reset();
    router.refresh();
    onDone?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 max-w-lg">
      <div>
        <Label htmlFor="title">Başlık *</Label>
        <Input id="title" {...register('title')} placeholder="Eğitim başlığını girin" />
        {errors.title && <p className="text-red-600 text-xs mt-1">{errors.title.message as any}</p>}
        <p className="text-xs text-gray-500 mt-1">
          Eğitimin kısa ve açıklayıcı başlığını yazın.
        </p>
      </div>
      <div>
        <Label htmlFor="description">Açıklama</Label>
        <textarea 
          id="description" 
          {...register('description')} 
          placeholder="Eğitim hakkında detaylı açıklama yazın..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          Eğitimin amacı, hedef kitlesi ve kapsamı hakkında detaylı bilgi verebilirsiniz.
        </p>
      </div>
      
      <div>
        <Label htmlFor="avatar_id">Avatar</Label>
        <select
          id="avatar_id"
          {...register('avatar_id')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Avatar seçin (opsiyonel)</option>
          {loadingAvatars ? (
            <option disabled>Avatarlar yükleniyor...</option>
          ) : (
            avatars.map((avatar) => (
              <option key={avatar.id} value={avatar.id}>
                {avatar.name} {avatar.is_default ? '(Varsayılan)' : ''}
              </option>
            ))
          )}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Eğitim için kullanılacak avatarı seçin. Avatar, eğitim sırasında AI asistanın kişiliğini belirler.
        </p>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button 
          disabled={isSubmitting} 
          type="submit" 
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}
