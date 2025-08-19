'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import StyleEditor from './StyleEditor';

const styleSchema = z.object({
  name: z.string().min(1, 'Stil adı gereklidir'),
  description: z.string().optional(),
  style_json: z.string().min(1, 'Stil ayarları gereklidir'),
});

type StyleFormData = z.infer<typeof styleSchema>;

interface StyleFormProps {
  onDone?: () => void;
}

export function StyleForm({ onDone }: StyleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [styleJson, setStyleJson] = useState('{}');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<StyleFormData>({
    resolver: zodResolver(styleSchema),
    defaultValues: {
      name: '',
      description: '',
      style_json: '{}',
    },
  });

  // Update form's style_json field when styleJson state changes
  const handleStyleChange = (value: string) => {
    setStyleJson(value);
    setValue('style_json', value);
  };

  const onSubmit = async (data: StyleFormData) => {
    setIsSubmitting(true);
    try {
      await api.createStyle({
        name: data.name,
        description: data.description,
        style_json: styleJson,
      });
      
      // Reset form
      setValue('name', '');
      setValue('description', '');
      setValue('style_json', '{}');
      setStyleJson('{}');
      
      // Close drawer
      if (onDone) {
        onDone();
      }
    } catch (error) {
      console.error('Error creating style:', error);
      alert('Stil oluşturulurken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Stil Adı *
        </label>
        <input
          type="text"
          {...register('name')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Örn: Başlık Stili"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Açıklama
        </label>
        <textarea
          {...register('description')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Bu stilin ne için kullanıldığını açıklayın"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Stil Ayarları
        </label>
        <StyleEditor value={styleJson} onChange={handleStyleChange} />
        {errors.style_json && (
          <p className="mt-1 text-sm text-red-600">{errors.style_json.message}</p>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => onDone && onDone()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}
