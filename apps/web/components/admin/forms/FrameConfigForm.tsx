'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, FrameConfig } from '@/lib/api';

const frameConfigSchema = z.object({
  name: z.string().min(1, 'İsim gereklidir'),
  description: z.string().optional(),
  object_position_x: z.number().min(0).max(100),
  object_position_y: z.number().min(0).max(100),
  scale: z.number().min(0.1).max(5.0),
  transform_origin_x: z.number().min(0).max(100),
  transform_origin_y: z.number().min(0).max(100),
  transition_duration: z.number().min(0.1).max(3.0),
  transition_easing: z.string(),
  is_default: z.boolean().optional(),
});

type FrameConfigFormData = z.infer<typeof frameConfigSchema>;

interface FrameConfigFormProps {
  sectionId: string;
  frameConfigId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function FrameConfigForm({ sectionId, frameConfigId, onSuccess, onCancel }: FrameConfigFormProps) {
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState<FrameConfigFormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FrameConfigFormData>({
    resolver: zodResolver(frameConfigSchema),
    defaultValues: {
      object_position_x: 50,
      object_position_y: 50,
      scale: 1.0,
      transform_origin_x: 50,
      transform_origin_y: 50,
      transition_duration: 0.8,
      transition_easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      is_default: false,
    }
  });

  useEffect(() => {
    // Load existing frame config data if editing
    const loadFrameConfig = async () => {
      if (frameConfigId) {
        try {
          const frameConfig = await api.getFrameConfig(frameConfigId);
          const data: FrameConfigFormData = {
            name: frameConfig.name,
            description: frameConfig.description || undefined,
            object_position_x: frameConfig.object_position_x,
            object_position_y: frameConfig.object_position_y,
            scale: frameConfig.scale,
            transform_origin_x: frameConfig.transform_origin_x,
            transform_origin_y: frameConfig.transform_origin_y,
            transition_duration: frameConfig.transition_duration,
            transition_easing: frameConfig.transition_easing,
            is_default: frameConfig.is_default,
          };
          setInitialData(data);
          
          // Set form values
          Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined) {
              setValue(key as keyof FrameConfigFormData, value);
            }
          });
        } catch (error) {
          console.error('Error loading frame config:', error);
        }
      }
    };

    loadFrameConfig();
  }, [frameConfigId, setValue]);

  const onSubmit = async (data: FrameConfigFormData) => {
    setLoading(true);
    try {
      if (frameConfigId) {
        await api.updateFrameConfig(frameConfigId, data);
      } else {
        await api.createFrameConfig(sectionId, data);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving frame config:', error);
      alert('Frame konfigürasyonu kaydedilirken hata oluştu');
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
          placeholder="Frame konfigürasyonu hakkında açıklama..."
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
          id="is_default"
          {...register('is_default')}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label htmlFor="is_default" className="text-sm text-gray-700">
          Bu bölüm için varsayılan frame konfigürasyonu yap
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
          {loading ? 'Kaydediliyor...' : frameConfigId ? 'Güncelle' : 'Oluştur'}
        </button>
      </div>
    </form>
  );
}
