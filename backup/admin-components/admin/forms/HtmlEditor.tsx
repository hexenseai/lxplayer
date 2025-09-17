"use client";

import React, { useState, useRef } from 'react';
import { Label } from '@lxplayer/ui';

interface HtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function HtmlEditor({ value, onChange, placeholder = "HTML içeriğinizi buraya yazın..." }: HtmlEditorProps) {
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateContent();
  };

  const insertImage = () => {
    const url = prompt('Resim URL\'sini girin:');
    if (url) {
      execCommand('insertImage', url);
    }
  };

  const insertLink = () => {
    const url = prompt('Link URL\'sini girin:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const updateContent = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/html') || e.clipboardData.getData('text');
    document.execCommand('insertHTML', false, text);
    updateContent();
  };

  return (
    <div className="space-y-2">
      <Label>HTML İçerik</Label>
      
      {/* Toolbar */}
      <div className="border border-gray-300 rounded-t-md bg-gray-50 p-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
          title="Kalın"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
          title="İtalik"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
          title="Altı Çizili"
        >
          <u>U</u>
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<h1>')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
          title="Başlık 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<h2>')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
          title="Başlık 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<h3>')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
          title="Başlık 3"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<p>')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
          title="Paragraf"
        >
          P
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
          title="Madde İşaretli Liste"
        >
          • Liste
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
          title="Numaralı Liste"
        >
          1. Liste
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={insertLink}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
          title="Link Ekle"
        >
          🔗
        </button>
        <button
          type="button"
          onClick={insertImage}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
          title="Resim Ekle"
        >
          🖼️
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={() => execCommand('justifyLeft')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
          title="Sola Hizala"
        >
          ⬅️
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyCenter')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
          title="Ortala"
        >
          ↔️
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyRight')}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
          title="Sağa Hizala"
        >
          ➡️
        </button>
      </div>
      
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        className="border border-gray-300 rounded-b-md p-3 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        onInput={updateContent}
        onPaste={handlePaste}
        onBlur={updateContent}
        dangerouslySetInnerHTML={{ __html: value }}
        style={{ 
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          lineHeight: '1.5'
        }}
      />
      
      <p className="text-xs text-gray-500">
        HTML içeriğinizi düzenleyin. Resim eklemek için 🖼️ butonunu kullanın.
      </p>
    </div>
  );
}
