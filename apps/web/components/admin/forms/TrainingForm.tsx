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
import { useUser } from '@/hooks/useUser';

const Schema = z.object({ 
  title: z.string().min(1), 
  description: z.string().optional(),
  avatar_id: z.string().optional(),
  access_code: z.string().optional()
});

type FormValues = z.infer<typeof Schema>;

export function TrainingForm({ initialTraining, onDone }: { initialTraining?: Training; onDone?: () => void }) {
  const router = useRouter();
  const { user } = useUser();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  
  const defaultValues = initialTraining ? { 
    title: initialTraining.title, 
    description: initialTraining.description ?? undefined,
    avatar_id: initialTraining.avatar_id ?? '',
    access_code: initialTraining.access_code ?? ''
  } : undefined;
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setError, setValue } = useForm<FormValues>({ 
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

  // Reset form when initialTraining changes
  useEffect(() => {
    if (initialTraining) {
      const newValues = {
        title: initialTraining.title,
        description: initialTraining.description ?? undefined,
        avatar_id: initialTraining.avatar_id ?? '',
        access_code: initialTraining.access_code ?? ''
      };
      console.log('🔄 Form reset values:', newValues);
      console.log('📋 Available avatars:', avatars.map(a => ({ id: a.id, name: a.name })));
      reset(newValues);
    }
  }, [initialTraining, reset, avatars]);

  const onSubmit = async (values: FormValues) => {
    try {
      const isUpdate = Boolean(initialTraining?.id);
      
      if (isUpdate) {
        // Debug: Log the training data to see what we have
        console.log('🔍 DEBUG initialTraining:', initialTraining);
        console.log('🔍 DEBUG company_id from training:', (initialTraining as any).company_id);
        console.log('🔍 DEBUG user company_id:', user?.company_id);
        
        const companyId = (initialTraining as any).company_id || user?.company_id || undefined;
        console.log('🔍 DEBUG final company_id to send:', companyId);
        
        await api.updateTraining(initialTraining!.id, {
          title: values.title,
          description: values.description || undefined,
          flow_id: initialTraining.flow_id,
          ai_flow: initialTraining.ai_flow,
          access_code: values.access_code || undefined,
          avatar_id: values.avatar_id || undefined,
          company_id: companyId
        });
      } else {
        await api.createTraining({
          title: values.title,
          description: values.description || undefined,
          avatar_id: values.avatar_id || undefined,
          access_code: values.access_code || undefined,
          company_id: user?.company_id || undefined
        });
      }
      
      reset();
      router.refresh();
      onDone?.();
    } catch (error) {
      console.error('Training save error:', error);
      setError('title', { type: 'manual', message: 'Kaydetme sırasında hata oluştu' });
    }
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
        <Label htmlFor="access_code">Access Code</Label>
        <div className="flex gap-2">
          <Input 
            id="access_code" 
            {...register('access_code')} 
            placeholder="Otomatik oluşturulacak"
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => {
              const newAccessCode = Math.random().toString(36).substring(2, 15);
              setValue('access_code', newAccessCode);
            }}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm whitespace-nowrap"
          >
            Oluştur
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Interactive Player için erişim kodu
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
