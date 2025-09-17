'use client';

import React, { useEffect, useRef, useState } from 'react';

interface CKEditor5Props {
  value: string;
  onChange: (data: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CKEditor5Component({ value, onChange, placeholder, disabled }: CKEditor5Props) {
  const editorRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [CKEditor, setCKEditor] = useState<any>(null);
  const [ClassicEditor, setClassicEditor] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
    
    // Dynamic import only on client side
    const loadEditor = async () => {
      try {
        const [ckEditorModule, classicEditorModule] = await Promise.all([
          import('@ckeditor/ckeditor5-react'),
          import('@ckeditor/ckeditor5-build-classic')
        ]);
        
        setCKEditor(() => ckEditorModule.CKEditor);
        setClassicEditor(() => classicEditorModule.default);
      } catch (error) {
        console.error('Error loading CKEditor:', error);
      }
    };

    loadEditor();
  }, []);

  // MinIO image upload adapter
  const uploadAdapter = (loader: any) => {
    return {
      upload: () => {
        return new Promise((resolve, reject) => {
          const file = loader.file;
          
          // Dosya adını URL-safe hale getir
          const safeFileName = file.name
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/_{2,}/g, '_')
            .replace(/^_|_$/g, '');
          
          const objectName = `editor-images/${(globalThis.crypto?.randomUUID?.() || Date.now().toString())}_${safeFileName}`;
          
          // Presign URL al
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          
          fetch(`${baseUrl}/uploads/presign`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ 
              object_name: objectName, 
              content_type: file.type || 'image/jpeg',
              title: file.name,
              description: 'CKEditor image upload'
            }),
          })
          .then(response => {
            if (!response.ok) {
              throw new Error(`Presign başarısız: ${response.status}`);
            }
            return response.json();
          })
          .then(presignData => {
            const { put_url } = presignData;
            
            // Dosyayı yükle
            return fetch(put_url, { 
              method: 'PUT', 
              body: file
            });
          })
          .then(putResponse => {
            if (!putResponse.ok) {
              throw new Error(`Yükleme başarısız: ${putResponse.status}`);
            }
            
            // Presigned GET URL al
            return fetch(`${baseUrl}/uploads/presign-get`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ 
                object_name: objectName
              }),
            });
          })
          .then(getUrlResponse => {
            if (!getUrlResponse.ok) {
              throw new Error(`GET URL başarısız: ${getUrlResponse.status}`);
            }
            return getUrlResponse.json();
          })
          .then(getUrlData => {
            const imageUrl = getUrlData.get_url;
            resolve({
              default: imageUrl
            });
          })
          .catch(error => {
            console.error('Image upload error:', error);
            reject(error);
          });
        });
      },
      abort: () => {
        // Upload iptal edildi
      }
    };
  };

  const handleReady = (editor: any) => {
    editorRef.current = editor;
    setIsReady(true);
    
    // Custom upload adapter'ı ekle
    editor.plugins.get('FileRepository').createUploadAdapter = uploadAdapter;
  };

  const handleChange = (event: any, editor: any) => {
    const data = editor.getData();
    onChange(data);
  };

  const handleBlur = (event: any, editor: any) => {
    // Blur event'inde de değişiklikleri kaydet
    const data = editor.getData();
    onChange(data);
  };

  const handleFocus = (event: any, editor: any) => {
    // Focus event'i
  };

  // Client-side rendering kontrolü
  if (!isMounted || !CKEditor || !ClassicEditor) {
    return (
      <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
        <div className="text-center text-gray-500">
          Editor yükleniyor...
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="border border-gray-300 rounded-md">
        <CKEditor
          editor={ClassicEditor}
          data={value}
          onReady={handleReady}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          config={{
            placeholder: placeholder || 'İçeriğinizi buraya yazın...',
            toolbar: {
              items: [
                'heading',
                '|',
                'bold',
                'italic',
                'underline',
                'strikethrough',
                '|',
                'link',
                'bulletedList',
                'numberedList',
                '|',
                'outdent',
                'indent',
                '|',
                'imageUpload',
                'blockQuote',
                'insertTable',
                '|',
                'undo',
                'redo',
                '|',
                'alignment',
                'fontSize',
                'fontFamily',
                'fontColor',
                'fontBackgroundColor',
                '|',
                'horizontalLine',
                'specialCharacters',
                '|',
                'sourceEditing'
              ]
            },
            language: 'tr',
            image: {
              toolbar: [
                'imageTextAlternative',
                'toggleImageCaption',
                'imageStyle:inline',
                'imageStyle:block',
                'imageStyle:side',
                'resizeImage'
              ]
            },
            table: {
              contentToolbar: [
                'tableColumn',
                'tableRow',
                'mergeTableCells'
              ]
            },
            heading: {
              options: [
                { model: 'paragraph', title: 'Paragraf', class: 'ck-heading_paragraph' },
                { model: 'heading1', view: 'h1', title: 'Başlık 1', class: 'ck-heading_heading1' },
                { model: 'heading2', view: 'h2', title: 'Başlık 2', class: 'ck-heading_heading2' },
                { model: 'heading3', view: 'h3', title: 'Başlık 3', class: 'ck-heading_heading3' },
                { model: 'heading4', view: 'h4', title: 'Başlık 4', class: 'ck-heading_heading4' }
              ]
            }
          }}
        />
        
        {/* Karakter sayısı */}
        <div className="px-2 py-1 bg-gray-50 border-t text-xs text-gray-500">
          {value.length} karakter
        </div>
      </div>
    );
  } catch (error) {
    console.error('CKEditor render error:', error);
    return (
      <div className="border border-red-300 rounded-md p-4 bg-red-50">
        <div className="text-center text-red-600">
          Editor yüklenirken hata oluştu. Lütfen sayfayı yenileyin.
        </div>
      </div>
    );
  }
}
