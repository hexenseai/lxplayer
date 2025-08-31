"use client";
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input, Label } from '@lxplayer/ui';
import { useRouter } from 'next/navigation';
import type { Asset } from '@/lib/api';
import React, { useState } from 'react';
import { HtmlEditorModal } from './HtmlEditorModal';
import { CKEditorComponent } from './CKEditor';
import { TinyMCEEditorComponent } from './TinyMCEEditor';
import { TinyMCEModal } from './TinyMCEModal';

const Schema = z.object({ 
  title: z.string().min(1), 
  description: z.string().optional(), 
  kind: z.enum(['video','image','audio','doc']), 
  uri: z.string().optional(),
  html_content: z.string().optional()
});

type FormValues = z.infer<typeof Schema>;

export function AssetForm({ initialAsset, onDone }: { initialAsset?: Asset; onDone?: () => void }) {
  const router = useRouter();
  const defaultValues = initialAsset ? { 
    title: initialAsset.title, 
    description: initialAsset.description ?? undefined, 
    kind: initialAsset.kind as any, 
    uri: initialAsset.uri,
    html_content: initialAsset.html_content ?? undefined
  } : undefined;
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setError, setValue, watch } = useForm<FormValues>({ 
    resolver: zodResolver(Schema), 
    defaultValues 
  });

  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [fileUploaded, setFileUploaded] = useState(false);
  const [uploadedAssetId, setUploadedAssetId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showHtmlEditor, setShowHtmlEditor] = React.useState(false);
  const [showTinyMCEModal, setShowTinyMCEModal] = React.useState(false);

  const watchedKind = watch('kind');
  const watchedHtmlContent = watch('html_content');

  const onSubmit = async (values: FormValues) => {
    // Eğer yeni dosya yüklendiyse, asset zaten oluşturulmuş olacak
    if (uploadedAssetId) {
      console.log('✅ Asset zaten yükleme sırasında oluşturuldu:', uploadedAssetId);
      reset();
      setFileUploaded(false);
      setUploadMsg('');
      setUploadedAssetId(null);
      setShowHtmlEditor(false);
      setShowTinyMCEModal(false);
      router.refresh();
      onDone?.();
      return;
    }

    // Doc tipi için otomatik URI oluştur
    if (values.kind === 'doc' && !values.uri) {
      const objectName = `html/${(globalThis.crypto?.randomUUID?.() || Date.now().toString())}_${values.title.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
      values.uri = objectName;
    }

    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    try {
      // Mevcut asset'i güncelleme durumu
      if (initialAsset?.id) {
        console.log('🔄 Mevcut asset güncelleniyor:', initialAsset.id);
        const res = await fetch(`${base}/assets/${initialAsset.id}`, { 
          method: 'PUT', 
          headers: { 'content-type': 'application/json' }, 
          body: JSON.stringify(values) 
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ Güncelleme hatası:', { status: res.status, error: errorText });
          setError('title', { type: 'manual', message: `Güncelleme hatası: ${res.status}` });
          return;
        }
        
        console.log('✅ Asset başarıyla güncellendi');
      } else {
        // Yeni asset oluşturma durumu
        console.log('🆕 Yeni asset oluşturuluyor:', values);
        const res = await fetch(`${base}/assets`, { 
          method: 'POST', 
          headers: { 'content-type': 'application/json' }, 
          body: JSON.stringify(values) 
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ Oluşturma hatası:', { status: res.status, error: errorText });
          setError('title', { type: 'manual', message: `Oluşturma hatası: ${res.status}` });
          return;
        }
        
        const newAsset = await res.json();
        console.log('✅ Yeni asset başarıyla oluşturuldu:', newAsset);
      }
      
      reset();
      setShowHtmlEditor(false);
      setShowTinyMCEModal(false);
      router.refresh();
      onDone?.();
      
    } catch (error: any) {
      console.error('❌ Form gönderme hatası:', error);
      setError('title', { type: 'manual', message: `Hata: ${error?.message || 'Bilinmeyen hata'}` });
    }
  };

  const createHtmlAsset = async () => {
    const title = prompt('HTML içeriği için başlık girin:');
    if (!title) return;

    const htmlContent = prompt('HTML içeriğini girin (basit HTML etiketleri kullanabilirsiniz):');
    if (!htmlContent) return;

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const objectName = `html/${(globalThis.crypto?.randomUUID?.() || Date.now().toString())}_${title.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
      
      // Presign URL al ve asset oluştur
      const presignRes = await fetch(`${base}/uploads/presign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          object_name: objectName, 
          content_type: 'text/html',
          title: title,
          description: 'HTML içerik'
        }),
      });
      
      if (!presignRes.ok) {
        throw new Error(`Presign başarısız: ${presignRes.status}`);
      }
      
      const presignData = await presignRes.json();
      const { put_url, asset_id } = presignData;
      
      // HTML içeriğini yükle
      const putRes = await fetch(put_url, { 
        method: 'PUT', 
        body: htmlContent, 
        headers: { 'Content-Type': 'text/html' } 
      });
      
      if (!putRes.ok) {
        throw new Error(`Yükleme başarısız: ${putRes.status}`);
      }

      // Asset'i güncelle (HTML içeriği ekle)
      const updateRes = await fetch(`${base}/assets/${asset_id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: title,
          kind: 'doc',
          uri: objectName,
          description: 'HTML içerik',
          html_content: htmlContent
        })
      });

      if (!updateRes.ok) {
        throw new Error(`Güncelleme başarısız: ${updateRes.status}`);
      }

      alert('HTML içerik başarıyla oluşturuldu!');
      router.refresh();
      onDone?.();
      
    } catch (err: any) {
      console.error('❌ HTML içerik oluşturma hatası:', err);
      alert(`HTML içerik oluşturma hatası: ${err?.message || 'Bilinmeyen hata'}`);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Dosya boyutu kontrolü (500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      alert('Dosya boyutu 500MB\'dan büyük olamaz!');
      return;
    }

    // Dosya adını URL-safe hale getir
    const safeFileName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');

    // Dosya seçildiğinde hemen form alanlarını doldur
    const objectName = `assets/${(globalThis.crypto?.randomUUID?.() || Date.now().toString())}_${safeFileName}`;
    setValue('uri', objectName, { shouldValidate: true });
    
    // Dosya türünü otomatik belirle
    const extension = file.name.split('.').pop()?.toLowerCase();
    let kind = 'doc';
    if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(extension || '')) {
      kind = 'video';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      kind = 'image';
    } else if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(extension || '')) {
      kind = 'audio';
    }
    setValue('kind', kind as any);
    
    // Başlığı dosya adından otomatik doldur (uzantısız)
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    setValue('title', fileNameWithoutExt);
    
    setFileUploaded(true);
    setUploadMsg('Dosya seçildi - Yükleniyor...');
    setUploadProgress(0);
    
    // Dosya yükleme işlemini arka planda yap
    setUploading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      console.log('🚀 Dosya yükleme başlıyor:', { objectName, fileType: file.type, fileSize: file.size });
      
      // Backend üzerinden dosya yükle
      console.log('📤 Dosya backend üzerinden yükleniyor...');
      setUploadProgress(10);
      setUploadMsg('Dosya yükleniyor...');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', fileNameWithoutExt);
      formData.append('description', watch('description') || '');
      
      const uploadRes = await fetch(`${base}/uploads/upload-file`, {
        method: 'POST',
        body: formData
      });
      
      console.log('📤 Upload response:', { status: uploadRes.status, ok: uploadRes.ok });
      
      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error('❌ Upload hatası:', { status: uploadRes.status, error: errorText });
        throw new Error(`Yükleme başarısız: ${uploadRes.status} - ${errorText}`);
      }
      
      const uploadData = await uploadRes.json();
      console.log('✅ Upload başarılı:', uploadData);
      
      setUploadProgress(100);
      setUploadMsg(`Dosya başarıyla yüklendi! Asset ID: ${uploadData.asset_id}`);
      setUploadedAssetId(uploadData.asset_id);
      
    } catch (err: any) {
      console.error('❌ Dosya yükleme hatası:', err);
      setUploadMsg(`Yükleme hatası: ${err?.message || 'Bilinmeyen hata'}`);
      setUploadedAssetId(null);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* HTML İçerik Oluştur Butonu */}
      <div className="border-b pb-4">
        <button
          type="button"
          onClick={createHtmlAsset}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          📝 Hızlı HTML İçerik Oluştur
        </button>
        <p className="text-xs text-gray-500 mt-1 text-center">
          Basit HTML içerik oluşturmak için bu butonu kullanın
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-3 max-w-md">
        <div>
          <Label htmlFor="file">Dosya</Label>
          <input id="file" type="file" onChange={onFileChange} className="mt-1 block w-full text-sm" />
          {uploadMsg && <p className={`text-xs mt-1 ${uploading ? 'text-gray-600' : 'text-green-700'}`}>{uploadMsg}</p>}
          {uploading && (
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="title">Başlık</Label>
          <Input id="title" {...register('title')} placeholder="başlık" />
          {errors.title && <p className="text-red-600 text-xs mt-1">{errors.title.message as any}</p>}
        </div>
        <div>
          <Label htmlFor="description">Açıklama</Label>
          <textarea 
            id="description" 
            {...register('description')} 
            placeholder="kısa açıklama" 
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:ring-gray-900 min-h-[80px] resize-y"
          />
        </div>
        <div>
          <Label htmlFor="kind">Tür</Label>
          <select id="kind" {...register('kind')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:ring-gray-900">
            <option value="video">video</option>
            <option value="image">image</option>
            <option value="audio">audio</option>
            <option value="doc">doc</option>
          </select>
        </div>
        
        {/* TinyMCE Modal - Sadece doc türü için göster */}
        {watchedKind === 'doc' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>HTML İçerik</Label>
              <button
                type="button"
                onClick={() => setShowTinyMCEModal(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                🎨 TinyMCE ile Düzenle
              </button>
            </div>
            {watchedHtmlContent && (
              <div className="border rounded p-2 bg-gray-50 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>HTML içerik mevcut ({watchedHtmlContent.length} karakter)</span>
                  <button
                    type="button"
                    onClick={() => setValue('html_content', '')}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Temizle
                  </button>
                </div>
              </div>
            )}
            <textarea
              {...register('html_content')}
              placeholder="HTML içeriğinizi buraya yazın veya TinyMCE ile düzenleyin..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:ring-gray-900 min-h-[100px] resize-y"
            />
          </div>
        )}
        
        {/* URI alanı - doc tipi için gizle */}
        {watchedKind !== 'doc' && (
          <div>
            <Label htmlFor="uri">URI (object path) *</Label>
            <Input 
              id="uri" 
              {...register('uri')} 
              placeholder="assets/uuid_filename.ext" 
              readOnly={fileUploaded || !!initialAsset}
              className={fileUploaded || !!initialAsset ? 'bg-gray-50' : ''}
            />
            {errors.uri && <p className="text-red-600 text-xs mt-1">{errors.uri.message as any}</p>}
            <p className="text-xs text-gray-500 mt-1">
              {fileUploaded 
                ? 'Dosya seçildi, URI otomatik olarak ayarlandı' 
                : initialAsset 
                  ? 'Mevcut dosya URI\'si' 
                  : 'Dosya seçin veya URI\'yi manuel olarak girin'
              }
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button 
            disabled={isSubmitting || uploading} 
            type="submit" 
            className="border rounded px-3 py-2 disabled:opacity-50"
          >
            {uploading ? 'Yükleniyor...' : uploadedAssetId ? 'Kaydedildi!' : 'Kaydet'}
          </button>
        </div>
        
        {/* Hata mesajları */}
        {errors.title?.type === 'manual' && (
          <div className="text-red-600 text-sm p-2 bg-red-50 border border-red-200 rounded">
            {errors.title.message}
          </div>
        )}
      </form>

      {/* HTML Editor Modal */}
      <HtmlEditorModal
        isOpen={showHtmlEditor}
        onClose={() => setShowHtmlEditor(false)}
        value={watchedHtmlContent || ''}
        onChange={(value) => setValue('html_content', value)}
        title="HTML İçerik Editörü"
      />

      {/* TinyMCE Modal */}
      <TinyMCEModal
        isOpen={showTinyMCEModal}
        onClose={() => setShowTinyMCEModal(false)}
        value={watchedHtmlContent || ''}
        onChange={(value) => setValue('html_content', value)}
        title="TinyMCE HTML İçerik Editörü"
      />

    </div>
  );
}
