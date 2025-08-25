'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, Asset, FrameConfig } from '@/lib/api';
import { StyleSelector } from './StyleSelector';
import { IconSelector } from './IconSelector';

const overlaySchema = z.object({
  time_stamp: z.number().min(0, 'Zaman damgası 0 veya daha büyük olmalı'),
  type: z.enum(['frame_set', 'button_link', 'button_message', 'button_content', 'label', 'content'], {
    required_error: 'Tip seçiniz'
  }),
  caption: z.string().optional(),
  content_id: z.string().optional(),
  style_id: z.string().optional(),
  icon_style_id: z.string().optional(), // Yeni: Icon için ayrı stil
  frame: z.string().optional(),
  animation: z.string().optional(),
  duration: z.number().min(0.1, 'Süre en az 0.1 saniye olmalı').max(10, 'Süre en fazla 10 saniye olabilir').optional(),
  position: z.string().optional(),
  icon: z.string().optional(),
  pause_on_show: z.boolean().optional(),
  frame_config_id: z.string().optional(),
});

type OverlayFormData = z.infer<typeof overlaySchema>;

interface OverlayFormProps {
  trainingId: string;
  sectionId: string;
  overlayId?: string;
  onSuccess: () => void;
  onCancel: () => void;
  initialTimeStamp?: number;
}

export default function OverlayForm({ trainingId, sectionId, overlayId, onSuccess, onCancel, initialTimeStamp }: OverlayFormProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [frameConfigs, setFrameConfigs] = useState<FrameConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState<OverlayFormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<OverlayFormData>({
    resolver: zodResolver(overlaySchema),
  });

  const selectedType = watch('type');

  useEffect(() => {
    // Load assets for content selection
    const loadAssets = async () => {
      try {
        const assetsData = await api.listAssets();
        setAssets(assetsData);
      } catch (error) {
        console.error('Error loading assets:', error);
      }
    };

    // Load frame configurations for this section
    const loadFrameConfigs = async () => {
      try {
        const frameConfigsData = await api.listSectionFrameConfigs(sectionId);
        setFrameConfigs(frameConfigsData);
      } catch (error) {
        console.error('Error loading frame configs:', error);
      }
    };

    // Load existing overlay data if editing
    const loadOverlay = async () => {
      if (overlayId) {
        try {
          const overlay = await api.getSectionOverlay(trainingId, sectionId, overlayId);
          const data: OverlayFormData = {
            time_stamp: overlay.time_stamp,
            type: overlay.type as any,
            caption: overlay.caption || undefined,
            content_id: overlay.content_id || undefined,
            style_id: overlay.style_id || undefined,
            icon_style_id: (overlay as any).icon_style_id || undefined,
            frame: overlay.frame as any,
            animation: overlay.animation || undefined,
            duration: overlay.duration || undefined,
            position: overlay.position as any,
            icon: overlay.icon || undefined,
            pause_on_show: (overlay as any).pause_on_show ?? undefined,
            frame_config_id: (overlay as any).frame_config_id || undefined,
          };
          setInitialData(data);
          
          // Set form values
          Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined) {
              setValue(key as keyof OverlayFormData, value);
            }
          });
        } catch (error) {
          console.error('Error loading overlay:', error);
        }
      }
    };

    loadAssets();
    loadFrameConfigs();
    loadOverlay();
  }, [overlayId, trainingId, sectionId, setValue]);

  // Set initial time stamp if provided and not editing
  useEffect(() => {
    if (initialTimeStamp !== undefined && !overlayId) {
      setValue('time_stamp', initialTimeStamp);
    }
  }, [initialTimeStamp, overlayId, setValue]);

  const onSubmit = async (data: OverlayFormData) => {
    setLoading(true);
    try {
      // Prepare submit data with proper defaults
      const submitData = {
        ...data,
        animation: data.animation && data.animation !== '' ? data.animation : null,
        duration: data.duration || null,
      };
      
      if (overlayId) {
        await api.updateSectionOverlay(trainingId, sectionId, overlayId, submitData);
      } else {
        await api.createSectionOverlay(trainingId, sectionId, submitData);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving overlay:', error);
      alert('Overlay kaydedilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Type seçimine göre hangi alanların gösterileceğini belirle
  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'frame_set':
        return {
          title: 'Frame Set',
          description: 'Video frame\'ini değiştirir (zoom, pozisyon)',
          showFields: ['frame', 'frame_config_id'],
          requiredFields: ['frame']
        };
      case 'button_link':
        return {
          title: 'Button Link',
          description: 'Tıklanabilir link butonu',
          showFields: ['caption', 'icon', 'icon_style_id', 'style_id', 'position', 'animation', 'duration', 'pause_on_show'],
          requiredFields: ['caption']
        };
      case 'button_message':
        return {
          title: 'Button Message',
          description: 'Mesaj gösteren buton',
          showFields: ['caption', 'icon', 'icon_style_id', 'style_id', 'position', 'animation', 'duration', 'pause_on_show'],
          requiredFields: ['caption']
        };
      case 'button_content':
        return {
          title: 'Button Content',
          description: 'İçerik gösteren buton',
          showFields: ['caption', 'icon', 'icon_style_id', 'style_id', 'content_id', 'position', 'animation', 'duration', 'pause_on_show'],
          requiredFields: ['caption', 'content_id']
        };
      case 'label':
        return {
          title: 'Label',
          description: 'Basit metin etiketi',
          showFields: ['caption', 'icon', 'icon_style_id', 'style_id', 'position', 'animation', 'duration'],
          requiredFields: ['caption']
        };
      case 'content':
        return {
          title: 'Content',
          description: 'Tam içerik gösterimi',
          showFields: ['caption', 'content_id', 'style_id', 'position', 'animation', 'duration', 'pause_on_show'],
          requiredFields: ['content_id']
        };
      default:
        return {
          title: 'Seçiniz',
          description: 'Overlay tipini seçin',
          showFields: [],
          requiredFields: []
        };
    }
  };

  const typeInfo = getTypeInfo(selectedType);
  const showField = (fieldName: string) => typeInfo.showFields.includes(fieldName);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Temel Bilgiler */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Temel Bilgiler</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Zaman Damgası (saniye) *
            </label>
            <input
              type="number"
              step="0.1"
              {...register('time_stamp', { valueAsNumber: true })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="0"
            />
            {errors.time_stamp && (
              <p className="mt-1 text-sm text-red-600">{errors.time_stamp.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Overlay Tipi *
            </label>
            <select
              {...register('type')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Tip seçiniz</option>
              <option value="frame_set">🎬 Frame Set</option>
              <option value="button_link">🔗 Button Link</option>
              <option value="button_message">💬 Button Message</option>
              <option value="button_content">📄 Button Content</option>
              <option value="label">🏷️ Label</option>
              <option value="content">📋 Content</option>
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
            )}
            {selectedType && (
              <p className="mt-1 text-xs text-gray-500">{typeInfo.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tip Seçimine Göre Dinamik Alanlar */}
      {selectedType && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{typeInfo.title} Ayarları</h3>
          
          <div className="space-y-4">
            {/* Caption - Label ve Button'lar için */}
            {showField('caption') && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Başlık {typeInfo.requiredFields.includes('caption') ? '*' : '(Opsiyonel)'}
                </label>
                <textarea
                  {...register('caption')}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Overlay başlığı..."
                />
                {errors.caption && (
                  <p className="mt-1 text-sm text-red-600">{errors.caption.message}</p>
                )}
              </div>
            )}

            {/* Icon - Label ve Button'lar için */}
            {showField('icon') && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Icon (Opsiyonel)
                </label>
                <IconSelector
                  value={watch('icon') || ''}
                  onChange={(value) => setValue('icon', value)}
                  placeholder="Icon seçiniz (opsiyonel)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Icon seçerseniz, aşağıda icon için ayrı stil belirleyebilirsiniz.
                </p>
              </div>
            )}

            {/* Icon Stil - Icon seçilmişse */}
            {showField('icon_style_id') && watch('icon') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon Stili (Opsiyonel)
                </label>
                <StyleSelector
                  value={watch('icon_style_id') || ''}
                  onChange={(value) => setValue('icon_style_id', value)}
                  placeholder="Icon için özel stil seçiniz"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Icon için özel stil seçmezseniz, genel stil kullanılır.
                </p>
              </div>
            )}

            {/* Content Asset - Content ve Button Content için */}
            {showField('content_id') && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  İçerik Asset'i {typeInfo.requiredFields.includes('content_id') ? '*' : '(Opsiyonel)'}
                </label>
                <select
                  {...register('content_id')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Asset seçiniz</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.title} ({asset.kind})
                    </option>
                  ))}
                </select>
                {errors.content_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.content_id.message}</p>
                )}
              </div>
            )}

            {/* Frame - Frame Set için */}
            {showField('frame') && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Frame {typeInfo.requiredFields.includes('frame') ? '*' : '(Opsiyonel)'}
                </label>
                <select
                  {...register('frame')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Frame seçiniz</option>
                  <option value="wide">Wide</option>
                  <option value="face_left">Face Left</option>
                  <option value="face_right">Face Right</option>
                  <option value="face_middle">Face Middle</option>
                  <option value="face_close">Face Close</option>
                  <option value="custom">Özel Frame Konfigürasyonu</option>
                </select>
                {errors.frame && (
                  <p className="mt-1 text-sm text-red-600">{errors.frame.message}</p>
                )}
              </div>
            )}

            {/* Frame Config - Custom frame seçilmişse */}
            {showField('frame_config_id') && watch('frame') === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Frame Konfigürasyonu Seçin
                </label>
                <select
                  {...register('frame_config_id')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Frame konfigürasyonu seçiniz</option>
                  {frameConfigs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name} {config.is_default ? '(Varsayılan)' : ''}
                    </option>
                  ))}
                </select>
                {errors.frame_config_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.frame_config_id.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Özel frame konfigürasyonları için önce bölüm ayarlarından frame konfigürasyonu oluşturmanız gerekir.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Görünüm ve Davranış Ayarları */}
      {selectedType && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Görünüm ve Davranış</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pozisyon */}
            {showField('position') && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Pozisyon (Opsiyonel)
                </label>
                <select
                  {...register('position')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Pozisyon seçiniz</option>
                  <option value="left_half_content">Left Half Content</option>
                  <option value="right_half_content">Right Half Content</option>
                  <option value="left_content">Left Content</option>
                  <option value="right_content">Right Content</option>
                  <option value="buttom_left">Bottom Left</option>
                  <option value="bottom_middle">Bottom Middle</option>
                  <option value="bottom_right">Bottom Right</option>
                  <option value="bottom_face">Bottom Face</option>
                  <option value="top_left">Top Left</option>
                  <option value="top_middle">Top Middle</option>
                  <option value="top_right">Top Right</option>
                  <option value="center">Center</option>
                  <option value="fullscreen">Fullscreen (auto-fit)</option>
                  <option value="fullscreen_cover">Fullscreen (cover/crop)</option>
                  <option value="fullscreen_dark">Fullscreen (dark background)</option>
                </select>
                {errors.position && (
                  <p className="mt-1 text-sm text-red-600">{errors.position.message}</p>
                )}
              </div>
            )}

            {/* Animasyon */}
            {showField('animation') && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Animasyon (Opsiyonel)
                </label>
                <select
                  {...register('animation')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Animasyon seçiniz</option>
                  <option value="fade_in">Opaklık 0'dan 100'e belirme</option>
                  <option value="slide_in_left">Soldan belirerek girme</option>
                  <option value="slide_in_right">Sağdan belirerek girme</option>
                  <option value="scale_in">Küçükten büyüyerek ve belirerek gözükme</option>
                </select>
                {errors.animation && (
                  <p className="mt-1 text-sm text-red-600">{errors.animation.message}</p>
                )}
              </div>
            )}

            {/* Süre */}
            {showField('duration') && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Süre (saniye - Opsiyonel)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  {...register('duration', { valueAsNumber: true })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="2"
                />
                {errors.duration && (
                  <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
                )}
              </div>
            )}

            {/* Pause on Show */}
            {showField('pause_on_show') && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pause_on_show"
                  {...register('pause_on_show')}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="pause_on_show" className="text-sm text-gray-700">
                  Bu overlay görünürken videoyu durdur
                </label>
              </div>
            )}
          </div>

          {/* Genel Stil */}
          {showField('style_id') && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Genel Stil (Opsiyonel)
              </label>
              <StyleSelector
                value={watch('style_id') || ''}
                onChange={(value) => setValue('style_id', value)}
                placeholder="Bir stil seçiniz (opsiyonel)"
              />
              {errors.style_id && (
                <p className="mt-1 text-sm text-red-600">{errors.style_id.message}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Form Butonları */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
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
          {loading ? 'Kaydediliyor...' : overlayId ? 'Güncelle' : 'Oluştur'}
        </button>
      </div>
    </form>
  );
}
