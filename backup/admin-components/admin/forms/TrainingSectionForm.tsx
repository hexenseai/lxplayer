"use client";
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input, Label } from '@lxplayer/ui';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { TrainingSection, Asset } from '@/lib/api';
import { api } from '@/lib/api';

const Schema = z.object({ 
  title: z.string().min(1, "Başlık gereklidir"), 
  description: z.string().optional(),
  script: z.string().optional(),
  duration: z.number().min(1, "Süre 1 saniyeden fazla olmalıdır").optional(),
  video_object: z.string().optional(),
  asset_id: z.string().optional(),
  order_index: z.number().min(1, "Sıra numarası 1'den küçük olamaz").optional(),
  type: z.string().default("video"),
  language: z.string().optional(),
  target_audience: z.string().optional()
});

type FormValues = z.infer<typeof Schema>;

interface TrainingSectionFormProps {
  trainingId: string;
  initialSection?: TrainingSection;
  onDone?: () => void;
  initialType?: 'video' | 'llm_task';
}

export function TrainingSectionForm({ trainingId, initialSection, onDone, initialType }: TrainingSectionFormProps) {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedObject, setUploadedObject] = useState<string | undefined>(initialSection?.video_object || undefined);
  const [uploadMsg, setUploadMsg] = useState<string | undefined>(undefined);
  const [heygenBusy, setHeygenBusy] = useState(false);
  const [heygenError, setHeygenError] = useState<string | null>(null);
  const [heygenAvatarId, setHeygenAvatarId] = useState('');
  const [heygenVoiceId, setHeygenVoiceId] = useState('');
  const [heygenSize, setHeygenSize] = useState('1280x720');

  const defaultValues = initialSection ? { 
    title: initialSection.title, 
    description: initialSection.description ?? undefined,
    script: initialSection.script ?? undefined,
    duration: initialSection.duration ?? undefined,
    video_object: (initialSection as any).video_object ?? undefined,
    asset_id: initialSection.asset_id ?? undefined,
    order_index: initialSection.order_index ?? undefined,
    type: (initialSection as any).type ?? "video",
    language: initialSection.language ?? "TR",
    target_audience: initialSection.target_audience ?? "Genel"
  } : {
    type: initialType ?? "video"
  };

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setError, setValue, watch } = useForm<FormValues>({ 
    resolver: zodResolver(Schema), 
    defaultValues 
  });

  const watchedAssetId = watch('asset_id');
  const sectionType = watch('type');

  // Watch for asset_id changes and update video_object automatically
  useEffect(() => {
    if (watchedAssetId && assets.length > 0) {
      const selectedAsset = assets.find(asset => asset.id === watchedAssetId);
      console.log('🎥 Asset ID changed, found asset:', selectedAsset);
      if (selectedAsset && selectedAsset.kind === 'video') {
        setValue('video_object', selectedAsset.uri);
        console.log('🎥 Auto-updated video_object to:', selectedAsset.uri);
      }
    } else if (!watchedAssetId) {
      setValue('video_object', undefined as any);
      console.log('🎥 Asset ID cleared, video_object cleared');
    }
  }, [watchedAssetId, assets, setValue]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      setUploadMsg(undefined);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const fileNameSafe = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const uuid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}`;
      const objectName = `training-videos/${trainingId}/${uuid}-${fileNameSafe}`;
      const presignRes = await fetch(`${base}/uploads/presign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          object_name: objectName, 
          content_type: file.type || undefined,
          title: file.name,
          description: undefined
        }),
      });
      if (!presignRes.ok) {
        const errorText = await presignRes.text();
        throw new Error(`Presign başarısız: ${presignRes.status} - ${errorText}`);
      }
      const { put_url } = await presignRes.json();
      const putRes = await fetch(put_url, { method: 'PUT', body: file, headers: file.type ? { 'Content-Type': file.type } : undefined });
      if (!putRes.ok) {
        const errorText = await putRes.text();
        throw new Error(`Yükleme başarısız: ${putRes.status} - ${errorText}`);
      }
      setUploadedObject(objectName);
      setValue('video_object', objectName);
      // Seçili asset'i temizle (tercihen video_object kullanılacak)
      setValue('asset_id', undefined as any);
      setUploadMsg('Video başarıyla yüklendi');
    } catch (err) {
      console.error('Video yükleme hatası:', err);
      setUploadMsg('Video yükleme hatası');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const assetsData = await api.listAssets();
        setAssets(assetsData);
      } catch (error) {
        console.error('Assets yüklenirken hata:', error);
      } finally {
        setIsLoadingAssets(false);
      }
    };
    loadAssets();
  }, []);

  const onSubmit = async (values: FormValues) => {
    try {
      const isUpdate = Boolean(initialSection?.id);
      
      // Ensure video_object is set if asset_id is selected
      if (values.asset_id && !values.video_object) {
        const selectedAsset = assets.find(asset => asset.id === values.asset_id);
        if (selectedAsset && selectedAsset.kind === 'video') {
          values.video_object = selectedAsset.uri;
          console.log('🎥 Final check: Set video_object to:', selectedAsset.uri);
        }
      }
      
      console.log('🎥 Submitting form with values:', values);
      
      if (isUpdate) {
        await api.updateTrainingSection(trainingId, initialSection!.id, {
          ...values,
          order_index: values.order_index ?? initialSection?.order_index ?? 0
        });
      } else {
        await api.createTrainingSection(trainingId, {
          ...values,
          order_index: values.order_index ?? 0
        });
      }
      
      reset();
      router.refresh();
      onDone?.();
    } catch (error) {
      console.error('Form gönderilirken hata:', error);
      setError('title', { type: 'manual', message: 'Bir hata oluştu' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 max-w-2xl">
      <div>
        <Label htmlFor="title">Bölüm Başlığı *</Label>
        <Input 
          id="title" 
          {...register('title')} 
          placeholder="Bölüm başlığını girin" 
        />
        {errors.title && <p className="text-red-600 text-xs mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <Label htmlFor="type">Bölüm Türü *</Label>
        <select 
          id="type" 
          {...register('type')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="video">📹 Video Bölümü</option>
          <option value="llm_task">🤖 LLM Görevi</option>
        </select>
      </div>

      <div>
        <Label htmlFor="description">
          {sectionType === 'llm_task' ? 'Görev Açıklaması' : 'Tanıtım Metni'}
        </Label>
        <textarea 
          id="description" 
          {...register('description')} 
          placeholder={sectionType === 'llm_task' ? 'LLM görevinin açıklamasını yazın' : 'Bölüm hakkında tanıtım metni yazın'}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
        />
      </div>

      {sectionType === 'video' && (
        <div>
          <Label htmlFor="script">Konuşma Metni</Label>
          <textarea 
            id="script" 
            {...register('script')} 
            placeholder="Video için konuşma metnini yazın"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={5}
          />
        </div>
      )}

      {sectionType === 'video' && (
        <>
          <div>
            <Label htmlFor="video_file">Video Yükle (MinIO)</Label>
            <input id="video_file" type="file" accept="video/*" onChange={handleFileChange} className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50" />
            {isUploading && <p className="text-sm text-gray-500 mt-1">Yükleniyor...</p>}
            {uploadedObject && (
              <p className="text-xs text-green-700 mt-1">Yüklendi: {uploadedObject}</p>
            )}
            {uploadMsg && <p className="text-xs mt-1">{uploadMsg}</p>}
          </div>

          {/* HeyGen inline generator */}
          <div className="border rounded p-3 space-y-2">
            <div className="text-sm font-semibold">HeyGen ile Oluştur</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="hg_avatar">Avatar ID</Label>
                <input id="hg_avatar" value={heygenAvatarId} onChange={(e) => setHeygenAvatarId(e.target.value)} className="w-full border rounded px-2 py-1" placeholder="avatar_id" />
              </div>
              <div>
                <Label htmlFor="hg_voice">Voice ID</Label>
                <input id="hg_voice" value={heygenVoiceId} onChange={(e) => setHeygenVoiceId(e.target.value)} className="w-full border rounded px-2 py-1" placeholder="voice_id (opsiyonel)" />
              </div>
              <div>
                <Label htmlFor="hg_size">Boyut</Label>
                <select id="hg_size" value={heygenSize} onChange={(e) => setHeygenSize(e.target.value)} className="w-full border rounded px-2 py-1">
                  {['1280x720','1920x1080'].map(s => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
            </div>
            <div className="text-xs text-gray-600">Konuşma metni olarak yukarıdaki "Konuşma Metni" alanı kullanılacaktır.</div>
            {heygenError && <div className="text-xs text-red-600">{heygenError}</div>}
            <div>
              <button
                type="button"
                disabled={heygenBusy}
                onClick={async () => {
                  try {
                    setHeygenBusy(true);
                    setHeygenError(null);
                    const [wStr, hStr] = heygenSize.split('x');
                    const width = parseInt(wStr, 10);
                    const height = parseInt(hStr, 10);
                    const prompt = (watch('script') as any) || watch('title') || 'Konuşma metni';
                    const res: any = await api.generateVideo({ provider: 'heygen', model: 'v2', prompt, width, height, avatar_id: heygenAvatarId || undefined, voice_id: heygenVoiceId || undefined });
                    if ('detail' in res) throw new Error(res.detail);
                    // Create asset and set asset_id to form
                    const created = await api.createAsset({ title: watch('title') || 'HeyGen Video', kind: 'video', uri: (res as any).uri! });
                    setValue('asset_id', created.id);
                    // Video yüklendiyse video_object alanını temizle
                    setValue('video_object', undefined as any);
                    alert('HeyGen videosu oluşturuldu ve seçildi. Kaydet ile bölüme eklenir.');
                  } catch (e: any) {
                    setHeygenError(e?.message || 'HeyGen hatası');
                  } finally {
                    setHeygenBusy(false);
                  }
                }}
                className={`px-3 py-1.5 text-sm rounded text-white ${heygenBusy ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'}`}
              >
                {heygenBusy ? 'Üretiliyor...' : 'HeyGen ile Oluştur ve Seç'}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="video_object">Video Object ID (otomatik doldurulur)</Label>
            <Input 
              id="video_object" 
              {...register('video_object')} 
              placeholder="Video asset seçildiğinde otomatik doldurulur"
              readOnly
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">Bu alan video asset seçildiğinde otomatik olarak doldurulur.</p>
          </div>
        </>
      )}

      {sectionType === 'video' && (
        <div>
          <Label htmlFor="duration">Süre (saniye)</Label>
          <Input 
            id="duration" 
            type="number" 
            {...register('duration', { valueAsNumber: true })} 
            placeholder="Video süresini saniye cinsinden girin"
            min="1"
          />
          {errors.duration && <p className="text-red-600 text-xs mt-1">{errors.duration.message}</p>}
        </div>
      )}

      {sectionType === 'video' && (
          <div>
            <Label htmlFor="asset_id">Var Olan İçerikten Seç (opsiyonel)</Label>
            {isLoadingAssets ? (
              <div className="text-gray-500 text-sm">Videolar yükleniyor...</div>
            ) : (
              <select 
                id="asset_id" 
                {...register('asset_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Video seçin</option>
                {assets
                  .filter(asset => asset.kind === 'video')
                  .map(asset => (
                    <option key={asset.id} value={asset.id}>
                      {asset.title}
                    </option>
                  ))
                }
              </select>
            )}
            <p className="text-xs text-gray-500 mt-1">Yüklenen video önceliklidir. Seçili içerik sadece yükleme yapılmadıysa kullanılır.</p>
          </div>
      )}

      {sectionType === 'llm_task' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="language">Dil</Label>
            <select 
              id="language" 
              {...register('language')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="TR">🇹🇷 Türkçe</option>
              <option value="EN">🇺🇸 English</option>
              <option value="DE">🇩🇪 Deutsch</option>
              <option value="FR">🇫🇷 Français</option>
              <option value="ES">🇪🇸 Español</option>
            </select>
          </div>
          <div>
            <Label htmlFor="target_audience">Hedef Kitle</Label>
            <select 
              id="target_audience" 
              {...register('target_audience')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Genel">👥 Genel</option>
              <option value="Öğrenci">🎓 Öğrenci</option>
              <option value="Profesyonel">💼 Profesyonel</option>
              <option value="Uzman">🔬 Uzman</option>
              <option value="Başlangıç">🌱 Başlangıç</option>
              <option value="Orta">📈 Orta</option>
              <option value="İleri">🚀 İleri</option>
            </select>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="order_index">Sıra Numarası</Label>
        <Input 
          id="order_index" 
          type="number" 
          {...register('order_index', { valueAsNumber: true })} 
          placeholder="Bölümün sıra numarasını girin (1, 2, 3...)"
          min="1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Boş bırakırsanız otomatik olarak en sona eklenir
        </p>
        {errors.order_index && <p className="text-red-600 text-xs mt-1">{errors.order_index.message}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <button 
          type="button" 
          onClick={onDone}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
        >
          İptal
        </button>
        <button 
          disabled={isSubmitting} 
          type="submit" 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Kaydediliyor...' : (initialSection ? 'Güncelle' : 'Kaydet')}
        </button>
      </div>
    </form>
  );
}
