'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, GlobalFrameConfig } from '@/lib/api';

const globalFrameConfigSchema = z.object({
  name: z.string().min(1, 'İsim gereklidir'),
  description: z.string().optional(),
  object_position_x: z.number().min(0).max(100),
  object_position_y: z.number().min(0).max(100),
  scale: z.number().min(0.1).max(5.0),
  transform_origin_x: z.number().min(0).max(100),
  transform_origin_y: z.number().min(0).max(100),
  transition_duration: z.number().min(0.1).max(3.0),
  transition_easing: z.string(),
  is_active: z.boolean().optional(),
});

type GlobalFrameConfigFormData = z.infer<typeof globalFrameConfigSchema>;

interface GlobalFrameConfigFormProps {
  globalConfigId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function GlobalFrameConfigForm({ globalConfigId, onSuccess, onCancel }: GlobalFrameConfigFormProps) {
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState<GlobalFrameConfigFormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<GlobalFrameConfigFormData>({
    resolver: zodResolver(globalFrameConfigSchema),
    defaultValues: {
      object_position_x: 50,
      object_position_y: 50,
      scale: 1.0,
      transform_origin_x: 50,
      transform_origin_y: 50,
      transition_duration: 0.8,
      transition_easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      is_active: true,
    }
  });

  useEffect(() => {
    // Load existing global frame config data if editing
    const loadGlobalFrameConfig = async () => {
      if (globalConfigId) {
        try {
          const globalConfig = await api.getGlobalFrameConfig(globalConfigId);
          const data: GlobalFrameConfigFormData = {
            name: globalConfig.name,
            description: globalConfig.description || undefined,
            object_position_x: globalConfig.object_position_x,
            object_position_y: globalConfig.object_position_y,
            scale: globalConfig.scale,
            transform_origin_x: globalConfig.transform_origin_x,
            transform_origin_y: globalConfig.transform_origin_y,
            transition_duration: globalConfig.transition_duration,
            transition_easing: globalConfig.transition_easing,
            is_active: globalConfig.is_active,
          };
          setInitialData(data);
          
          // Set form values
          Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined) {
              setValue(key as keyof GlobalFrameConfigFormData, value);
            }
          });
        } catch (error) {
          console.error('Error loading global frame config:', error);
        }
      }
    };

    loadGlobalFrameConfig();
  }, [globalConfigId, setValue]);

  const onSubmit = async (data: GlobalFrameConfigFormData) => {
    setLoading(true);
    try {
      if (globalConfigId) {
        await api.updateGlobalFrameConfig(globalConfigId, data);
      } else {
        await api.createGlobalFrameConfig(data);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving global frame config:', error);
      alert('Global frame konfigürasyonu kaydedilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const watchedValues = watch();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Frame Adı *
        </label>
        <input
          type="text"
          {...register('name')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Örn: Yakın Yüz, Sol Taraf..."
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Açıklama (Opsiyonel)
        </label>
        <textarea
          {...register('description')}
          rows={2}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Global frame konfigürasyonu hakkında açıklama..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Obje Pozisyonu X (%)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            {...register('object_position_x', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.object_position_x && (
            <p className="mt-1 text-sm text-red-600">{errors.object_position_x.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Obje Pozisyonu Y (%)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            {...register('object_position_y', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.object_position_y && (
            <p className="mt-1 text-sm text-red-600">{errors.object_position_y.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Zoom Oranı (Scale)
        </label>
        <input
          type="number"
          step="0.1"
          min="0.1"
          max="5.0"
          {...register('scale', { valueAsNumber: true })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.scale && (
          <p className="mt-1 text-sm text-red-600">{errors.scale.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          1.0 = normal boyut, 2.0 = 2x büyütme, 0.5 = yarı boyut
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Transform Origin X (%)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            {...register('transform_origin_x', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.transform_origin_x && (
            <p className="mt-1 text-sm text-red-600">{errors.transform_origin_x.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Transform Origin Y (%)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            {...register('transform_origin_y', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.transform_origin_y && (
            <p className="mt-1 text-sm text-red-600">{errors.transform_origin_y.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Geçiş Süresi (saniye)
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="3.0"
            {...register('transition_duration', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.transition_duration && (
            <p className="mt-1 text-sm text-red-600">{errors.transition_duration.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Geçiş Easing
          </label>
          <select
            {...register('transition_easing')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="cubic-bezier(0.4, 0, 0.2, 1)">Smooth (Varsayılan)</option>
            <option value="ease">Ease</option>
            <option value="ease-in">Ease In</option>
            <option value="ease-out">Ease Out</option>
            <option value="ease-in-out">Ease In Out</option>
            <option value="linear">Linear</option>
            <option value="cubic-bezier(0.68, -0.55, 0.265, 1.55)">Bounce</option>
            <option value="cubic-bezier(0.175, 0.885, 0.32, 1.275)">Elastic</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          {...register('is_active')}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label htmlFor="is_active" className="text-sm text-gray-700">
          Bu global frame konfigürasyonunu aktif tut
        </label>
      </div>

      {/* Preview */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Önizleme</h4>
        <div className="relative w-full h-32 bg-gray-200 rounded overflow-hidden">
          <div
            className="absolute w-16 h-16 bg-blue-500 rounded"
            style={{
              left: `${watchedValues.object_position_x || 50}%`,
              top: `${watchedValues.object_position_y || 50}%`,
              transform: `scale(${watchedValues.scale || 1})`,
              transformOrigin: `${watchedValues.transform_origin_x || 50}% ${watchedValues.transform_origin_y || 50}%`,
              transition: `all ${watchedValues.transition_duration || 0.8}s ${watchedValues.transition_easing || 'cubic-bezier(0.4, 0, 0.2, 1)'}`,
            }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Mavi kare: Video içeriği, Pozisyon: ({watchedValues.object_position_x || 50}%, {watchedValues.object_position_y || 50}%), 
          Zoom: {watchedValues.scale || 1}x
        </p>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Kaydediliyor...' : globalConfigId ? 'Güncelle' : 'Oluştur'}
        </button>
      </div>
    </form>
  );
}
