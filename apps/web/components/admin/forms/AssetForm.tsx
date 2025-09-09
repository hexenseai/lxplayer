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

    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

    try {
      // Mevcut asset'i güncelleme durumu
      if (initialAsset?.id) {
        console.log('🔄 Mevcut asset güncelleniyor:', initialAsset.id);
        console.log('📤 Gönderilen veriler:', values);
        
        // Company ID'yi ekle (SuperAdmin için)
        const updateData = { ...values };
        if (typeof window !== 'undefined') {
          const user = JSON.parse(localStorage.getItem('lx_user') || '{}');
          console.log('👤 User from localStorage (lx_user):', user);
          if (user.role === 'SuperAdmin') {
            // SuperAdmin için kendi company_id'sini gönder
            updateData.company_id = user.company_id;
            console.log('🏢 SuperAdmin - Using user company_id:', user.company_id);
          } else {
            updateData.company_id = user.company_id;
            console.log('🏢 Admin - Using user company_id:', user.company_id);
          }
        }
        
        console.log('📤 Final update data:', updateData);
        
        // Authorization header'ını ekle
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        const token = localStorage.getItem('token');
        if (token) {
          headers['authorization'] = `Bearer ${token}`;
        }
        
        const res = await fetch(`${base}/assets/${initialAsset.id}`, { 
          method: 'PUT', 
          headers,
          body: JSON.stringify(updateData) 
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
        
        // Company ID'yi ekle
        const createData = { ...values };
        if (typeof window !== 'undefined') {
          const user = JSON.parse(localStorage.getItem('lx_user') || '{}');
          if (user.role === 'SuperAdmin') {
            // SuperAdmin için company_id opsiyonel
            createData.company_id = createData.company_id || user.company_id;
          } else {
            // Admin için kendi company_id'si
            createData.company_id = user.company_id;
          }
        }
        
        // Authorization header'ını ekle
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        const token = localStorage.getItem('token');
        if (token) {
          headers['authorization'] = `Bearer ${token}`;
        }
        
        const res = await fetch(`${base}/assets`, { 
          method: 'POST', 
          headers,
          body: JSON.stringify(createData) 
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

    // Dosya boyutu kontrolü (1GB)
    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (file.size > maxSize) {
      alert('Dosya boyutu 1GB\'dan büyük olamaz!');
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
      
      // XMLHttpRequest ile progress tracking
      const xhr = new XMLHttpRequest();
      
      // Progress event
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 80) + 10; // 10-90 arası
          setUploadProgress(progress);
          setUploadMsg(`Yükleniyor... ${Math.round((event.loaded / event.total) * 100)}%`);
        }
      });
      
      // Promise wrapper
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.ontimeout = () => reject(new Error('Upload timeout'));
      });
      
      xhr.open('POST', `${base}/uploads/upload-file`);
      xhr.timeout = 1800000; // 30 dakika timeout
      
      // Authentication header ekle
      const token = localStorage.getItem('token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      console.log('📤 XMLHttpRequest gönderiliyor:', {
        url: `${base}/uploads/upload-file`,
        method: 'POST',
        hasToken: !!token,
        formDataKeys: Array.from(formData.keys())
      });
      
      xhr.send(formData);
      
      const uploadData = await uploadPromise as any;
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
    <div className="space-y-6">
      {/* Dosya Yükleme Bölümü */}
      <div className="border-b pb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">📁 Dosya Yükle</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="file">Dosya Seç</Label>
            <input 
              id="file" 
              type="file" 
              onChange={onFileChange} 
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
            />
            {uploadMsg && (
              <p className={`text-sm mt-2 ${uploading ? 'text-blue-600' : 'text-green-700'}`}>
                {uploadMsg}
              </p>
            )}
            {uploading && (
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600">
            <p>Desteklenen formatlar:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li><strong>Video:</strong> MP4, AVI, MOV, MKV, WebM</li>
              <li><strong>Resim:</strong> JPG, PNG, GIF, WebP, SVG</li>
              <li><strong>Ses:</strong> MP3, WAV, OGG, AAC, FLAC</li>
              <li><strong>Doküman:</strong> HTML, TXT, PDF</li>
            </ul>
          </div>
        </div>
      </div>

      {/* HTML İçerik Oluştur Butonu */}
      <div className="border-b pb-6">
        <button
          type="button"
          onClick={createHtmlAsset}
          className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
        >
          📝 Hızlı HTML İçerik Oluştur
        </button>
        <p className="text-xs text-gray-500 mt-1 text-center">
          Basit HTML içerik oluşturmak için bu butonu kullanın
        </p>
      </div>

      {/* Manuel Form Alanları */}
      <div className="border-b pb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">📝 Manuel Bilgi Girişi</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="title">Başlık *</Label>
            <Input 
              id="title" 
              {...register('title')} 
              placeholder="İçerik başlığı" 
              className="w-full"
            />
            {errors.title && <p className="text-red-600 text-xs mt-1">{errors.title.message as any}</p>}
          </div>
          
          <div>
            <Label htmlFor="description">Açıklama</Label>
            <textarea 
              id="description" 
              {...register('description')} 
              placeholder="İçerik açıklaması (opsiyonel)" 
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:ring-gray-900 min-h-[80px] resize-y"
            />
          </div>
          
          <div>
            <Label htmlFor="kind">Tür *</Label>
            <select 
              id="kind" 
              {...register('kind')} 
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:ring-gray-900"
            >
              <option value="">Tür seçin</option>
              <option value="video">🎥 Video</option>
              <option value="image">🖼️ Resim</option>
              <option value="audio">🎵 Ses</option>
              <option value="doc">📄 Doküman</option>
            </select>
          </div>
        
          {/* Koşullu Alanlar */}
          {watchedKind && (
            <>
              {/* URI alanı - doc tipi için gizle */}
              {watchedKind !== 'doc' && (
                <div>
                  <Label htmlFor="uri">URI/URL *</Label>
                  <Input 
                    id="uri" 
                    {...register('uri')} 
                    placeholder="https://example.com/file.mp4 veya assets/uuid_filename.ext" 
                    readOnly={fileUploaded || !!initialAsset}
                    className={`w-full ${fileUploaded || !!initialAsset ? 'bg-gray-50' : ''}`}
                  />
                  {errors.uri && <p className="text-red-600 text-xs mt-1">{errors.uri.message as any}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    {fileUploaded 
                      ? '✅ Dosya seçildi, URI otomatik olarak ayarlandı' 
                      : initialAsset 
                        ? '📁 Mevcut dosya URI\'si' 
                        : '💡 Dosya seçin veya URI\'yi manuel olarak girin'
                    }
                  </p>
                </div>
              )}

              {/* HTML İçerik - Sadece doc türü için göster */}
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
                    <div className="border rounded p-2 bg-gray-50 text-sm text-gray-600 mb-2">
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
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:ring-gray-900 min-h-[120px] resize-y"
                  />
                </div>
              )}
            </>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button 
              disabled={isSubmitting || uploading} 
              type="submit" 
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? '📤 Yükleniyor...' : uploadedAssetId ? '✅ Kaydedildi!' : '💾 Kaydet'}
            </button>
          </div>
          
          {/* Hata mesajları */}
          {errors.title?.type === 'manual' && (
            <div className="text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded-md">
              {errors.title.message}
            </div>
          )}
        </form>
      </div>

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
