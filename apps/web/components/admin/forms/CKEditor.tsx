'use client';

import React, { useState } from 'react';

interface CKEditorProps {
  value: string;
  onChange: (data: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CKEditorComponent({ value, onChange, placeholder, disabled }: CKEditorProps) {
  const [isPreview, setIsPreview] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Dosya adını URL-safe hale getir
      const safeFileName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '');
      
      const objectName = `editor-images/${(globalThis.crypto?.randomUUID?.() || Date.now().toString())}_${safeFileName}`;
      
      // Presign URL al
      const presignRes = await fetch(`${baseUrl}/uploads/presign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          object_name: objectName, 
          content_type: file.type || 'image/jpeg',
          title: file.name,
          description: 'HTML Editor image upload'
        }),
      });
      
      if (!presignRes.ok) {
        throw new Error(`Presign başarısız: ${presignRes.status}`);
      }
      
      const presignData = await presignRes.json();
      const { put_url } = presignData;
      
      // Dosyayı yükle
      const putRes = await fetch(put_url, { 
        method: 'PUT', 
        body: file
      });
      
      if (!putRes.ok) {
        throw new Error(`Yükleme başarısız: ${putRes.status}`);
      }

      // Presigned GET URL al
      const getUrlRes = await fetch(`${baseUrl}/uploads/presign-get`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          object_name: objectName
        }),
      });
      
      if (!getUrlRes.ok) {
        throw new Error(`GET URL başarısız: ${getUrlRes.status}`);
      }
      
      const getUrlData = await getUrlRes.json();
      const imageUrl = getUrlData.get_url;

      // Resim HTML'ini ekle
      const imageHtml = `<img src="${imageUrl}" alt="${file.name}" style="max-width: 100%; height: auto;" />`;
      const newValue = value + imageHtml;
      onChange(newValue);
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Resim yükleme hatası: ' + error);
    }
  };

  const insertTag = (tag: string) => {
    const textarea = document.getElementById('html-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let newText = '';
    switch (tag) {
      case 'bold':
        newText = `<strong>${selectedText}</strong>`;
        break;
      case 'italic':
        newText = `<em>${selectedText}</em>`;
        break;
      case 'link':
        const url = prompt('Link URL\'sini girin:');
        if (url) {
          newText = `<a href="${url}" target="_blank">${selectedText || url}</a>`;
        } else {
          return;
        }
        break;
      case 'ul':
        newText = `<ul>\n  <li>${selectedText || 'Liste öğesi'}</li>\n</ul>`;
        break;
      case 'ol':
        newText = `<ol>\n  <li>${selectedText || 'Liste öğesi'}</li>\n</ol>`;
        break;
      case 'h1':
        newText = `<h1>${selectedText || 'Başlık 1'}</h1>`;
        break;
      case 'h2':
        newText = `<h2>${selectedText || 'Başlık 2'}</h2>`;
        break;
      case 'h3':
        newText = `<h3>${selectedText || 'Başlık 3'}</h3>`;
        break;
      case 'p':
        newText = `<p>${selectedText || 'Paragraf'}</p>`;
        break;
      case 'br':
        newText = '<br>';
        break;
      case 'hr':
        newText = '<hr>';
        break;
      default:
        newText = selectedText;
    }

    const newValue = value.substring(0, start) + newText + value.substring(end);
    onChange(newValue);
    
    // Cursor pozisyonunu ayarla
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + newText.length, start + newText.length);
    }, 0);
  };

  return (
    <div className="border border-gray-300 rounded-md">
      {/* Toolbar */}
      <div className="bg-gray-50 p-2 border-b flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => insertTag('bold')}
          className="px-2 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100"
          title="Kalın"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => insertTag('italic')}
          className="px-2 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100"
          title="İtalik"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => insertTag('link')}
          className="px-2 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100"
          title="Link"
        >
          🔗
        </button>
        <div className="w-px bg-gray-300 mx-1"></div>
        <button
          type="button"
          onClick={() => insertTag('h1')}
          className="px-2 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100"
          title="Başlık 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => insertTag('h2')}
          className="px-2 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100"
          title="Başlık 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => insertTag('h3')}
          className="px-2 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100"
          title="Başlık 3"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => insertTag('p')}
          className="px-2 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100"
          title="Paragraf"
        >
          P
        </button>
        <div className="w-px bg-gray-300 mx-1"></div>
        <button
          type="button"
          onClick={() => insertTag('ul')}
          className="px-2 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100"
          title="Sırasız Liste"
        >
          • Liste
        </button>
        <button
          type="button"
          onClick={() => insertTag('ol')}
          className="px-2 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100"
          title="Sıralı Liste"
        >
          1. Liste
        </button>
        <div className="w-px bg-gray-300 mx-1"></div>
        <button
          type="button"
          onClick={() => insertTag('br')}
          className="px-2 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100"
          title="Satır Sonu"
        >
          ↵
        </button>
        <button
          type="button"
          onClick={() => insertTag('hr')}
          className="px-2 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100"
          title="Yatay Çizgi"
        >
          ─
        </button>
        <div className="w-px bg-gray-300 mx-1"></div>
        <label className="px-2 py-1 bg-blue-500 text-white border border-blue-600 rounded text-sm hover:bg-blue-600 cursor-pointer">
          📷 Resim
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          className="px-2 py-1 bg-green-500 text-white border border-green-600 rounded text-sm hover:bg-green-600"
        >
          {isPreview ? '✏️ Düzenle' : '👁️ Önizleme'}
        </button>
      </div>

      {/* Editor/Preview */}
      <div className="p-2">
        {isPreview ? (
          <div 
            className="min-h-[200px] p-2 border border-gray-200 rounded bg-white"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        ) : (
          <textarea
            id="html-editor"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || 'HTML içeriğinizi buraya yazın...'}
            disabled={disabled}
            className="w-full min-h-[200px] p-2 border border-gray-200 rounded resize-y font-mono text-sm"
          />
        )}
      </div>

      {/* Karakter sayısı */}
      <div className="px-2 py-1 bg-gray-50 border-t text-xs text-gray-500">
        {value.length} karakter
      </div>
    </div>
  );
}
