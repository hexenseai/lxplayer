'use client';

import React, { useMemo, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';

interface TinyMCEEditorProps {
  value: string;
  onChange: (data: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TinyMCEEditorComponent({ value, onChange, placeholder, disabled }: TinyMCEEditorProps) {
  const editorRef = useRef<any>(null);
  
  // Debug: API key'in yüklenip yüklenmediğini kontrol et
  console.log('TinyMCE API Key loaded:', !!process.env.NEXT_PUBLIC_TINYMCE_API_KEY);
  console.log('TinyMCE API Key length:', process.env.NEXT_PUBLIC_TINYMCE_API_KEY?.length || 0);

  const rewriteHtmlAssetUrls = (html: string): string => {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const cdn = (process.env.NEXT_PUBLIC_CDN_URL || 'http://yodea.hexense.ai:9000/lxplayer').replace(/\/$/, '');
    const cdnOrigin = cdn.split('/').slice(0, 3).join('/');
    const cdnPathPrefix = cdn.replace(cdnOrigin, '').replace(/^\//, '');
    return (html || '').replace(/\s(src|href)=("|')([^"']+)(\2)/gi, (_m, attr, quote, url, endQuote) => {
      if (!url) return ` ${attr}=${quote}${url}${endQuote}`;
      if (/^data:/i.test(url) || /^blob:/i.test(url)) return ` ${attr}=${quote}${url}${endQuote}`;
      if (/^https?:\/\//i.test(url)) {
        try {
          const u = new URL(url);
          const origin = `${u.protocol}//${u.host}`;
          if (origin === cdnOrigin) {
            let objectPath = u.pathname.replace(/^\//, '');
            if (cdnPathPrefix && objectPath.startsWith(cdnPathPrefix + '/')) {
              objectPath = objectPath.slice(cdnPathPrefix.length + 1);
            }
            try { objectPath = decodeURIComponent(objectPath); } catch {}
            const redirect = `${api}/uploads/presign-get-object/${encodeURI(objectPath)}`;
            return ` ${attr}=${quote}${redirect}${endQuote}`;
          }
        } catch {}
        return ` ${attr}=${quote}${url}${endQuote}`;
      }
      const redirect = `${api}/uploads/presign-get-object/${encodeURI(url)}`;
      return ` ${attr}=${quote}${redirect}${endQuote}`;
    });
  };

  const processedValue = useMemo(() => rewriteHtmlAssetUrls(value || ''), [value]);

  const handleImageUpload = async (blobInfo: any, progress: any, failure: any) => {
    try {
      const file = blobInfo.blob();
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
          description: 'TinyMCE image upload'
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

      // HTML içine kalıcı bir URL döndür: API redirect, her istekte taze presign sağlar
      const redirectUrl = `${baseUrl}/uploads/presign-get-object/${encodeURIComponent(objectName)}`;
      return redirectUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      failure('Resim yükleme hatası: ' + error);
    }
  };

  // API key - environment variable'dan al
  const apiKey = process.env.NEXT_PUBLIC_TINYMCE_API_KEY;

  // API key kontrolü
  if (!apiKey) {
    console.error('TinyMCE API key bulunamadı. Lütfen NEXT_PUBLIC_TINYMCE_API_KEY environment variable\'ını ayarlayın.');
    return (
      <div className="border border-gray-300 rounded-md p-4 bg-red-50 text-red-700">
        <p>TinyMCE API key yapılandırılmamış. Lütfen NEXT_PUBLIC_TINYMCE_API_KEY environment variable'ını ayarlayın.</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-300 rounded-md">
      <Editor
        apiKey={apiKey}
        onInit={(evt: any, editor: any) => editorRef.current = editor}
        value={processedValue}
        onEditorChange={(content: string) => onChange(content)}
        init={{
          height: 600,
          menubar: true,
          // Core editing features
          plugins: [
            'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 'link', 'lists', 'media', 'searchreplace', 'table', 'visualblocks', 'wordcount',
            // Premium features (trial)
            'checklist', 'mediaembed', 'casechange', 'formatpainter', 'pageembed', 'a11ychecker', 'tinymcespellchecker', 'permanentpen', 'powerpaste', 'advtable', 'advcode', 'advtemplate', 'ai', 'uploadcare', 'mentions', 'tinycomments', 'tableofcontents', 'footnotes', 'mergetags', 'autocorrect', 'typography', 'inlinecss', 'markdown', 'importword', 'exportword', 'exportpdf'
          ],
          // Enhanced toolbar with premium features
          toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link media table mergetags | addcomment showcomments | spellcheckdialog a11ycheck typography uploadcare | align lineheight | checklist numlist bullist indent outdent | emoticons charmap | removeformat',
          content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
          placeholder: placeholder || 'İçeriğinizi buraya yazın...',
          // Premium features configuration
          tinycomments_mode: 'embedded',
          tinycomments_author: 'LXPlayer Editor',
          mergetags_list: [
            { value: 'First.Name', title: 'First Name' },
            { value: 'Email', title: 'Email' },
          ],
          ai_request: (request: any, respondWith: any) => respondWith.string(() => Promise.reject('AI Assistant not implemented')),
          uploadcare_public_key: '423126f79cc1d78bfbf4',
          images_upload_handler: handleImageUpload,
          images_upload_base_path: '/uploads',
          automatic_uploads: true,
          file_picker_types: 'image',
          image_title: true,
          image_description: true,
          image_dimensions: true,
          image_class_list: [
            {title: 'Responsive', value: 'img-fluid'},
            {title: 'Small', value: 'img-sm'},
            {title: 'Medium', value: 'img-md'},
            {title: 'Large', value: 'img-lg'}
          ],
          table_default_styles: {
            width: '100%',
            borderCollapse: 'collapse'
          },
          table_default_attributes: {
            border: '1'
          },
          table_class_list: [
            {title: 'None', value: ''},
            {title: 'Bordered', value: 'table-bordered'},
            {title: 'Striped', value: 'table-striped'},
            {title: 'Hover', value: 'table-hover'}
          ],
          setup: function (editor: any) {
            editor.on('init', function () {
              if (disabled) {
                editor.setMode('readonly');
              }
            });
            
            // Tablo ekleme kısayolu
            editor.addShortcut('meta+shift+t', 'Insert table', function() {
              editor.execCommand('mceInsertTable');
            });
            
            // Kod örneği ekleme
            editor.addShortcut('meta+shift+c', 'Insert code sample', function() {
              editor.execCommand('mceCodeSample');
            });
          },
          // Gelişmiş ayarlar
          paste_as_text: false,
          paste_enable_default_filters: true,
          paste_word_valid_elements: 'b,strong,i,em,h1,h2,h3,h4,h5,h6',
          paste_retain_style_properties: 'color font-size background-color',
          // Kod örnekleri için syntax highlighting
          codesample_languages: [
            {text: 'HTML/XML', value: 'markup'},
            {text: 'JavaScript', value: 'javascript'},
            {text: 'CSS', value: 'css'},
            {text: 'PHP', value: 'php'},
            {text: 'Python', value: 'python'},
            {text: 'Java', value: 'java'},
            {text: 'C', value: 'c'},
            {text: 'C++', value: 'cpp'},
            {text: 'C#', value: 'csharp'},
            {text: 'SQL', value: 'sql'},
            {text: 'JSON', value: 'json'},
            {text: 'YAML', value: 'yaml'},
            {text: 'Markdown', value: 'markdown'}
          ]
        }}
      />
    </div>
  );
}
