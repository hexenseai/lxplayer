"use client";

import React, { useState, useRef, useEffect } from 'react';

interface HtmlEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  title?: string;
}

export function HtmlEditorModal({ isOpen, onClose, value, onChange, title = "HTML Editörü" }: HtmlEditorModalProps) {
  const [currentValue, setCurrentValue] = useState(value);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showTableCreator, setShowTableCreator] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateContent();
  };

  const insertTable = () => {
    let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%;">';
    for (let i = 0; i < tableRows; i++) {
      tableHTML += '<tr>';
      for (let j = 0; j < tableCols; j++) {
        tableHTML += '<td style="padding: 8px; border: 1px solid #ddd;">Hücre</td>';
      }
      tableHTML += '</tr>';
    }
    tableHTML += '</table>';
    
    execCommand('insertHTML', tableHTML);
    setShowTableCreator(false);
  };

  const insertImage = () => {
    const url = prompt('Resim URL\'sini girin:');
    if (url) {
      const width = prompt('Genişlik (px):', '300');
      const height = prompt('Yükseklik (px):', '200');
      const imgHTML = `<img src="${url}" style="max-width: ${width}px; max-height: ${height}px;" alt="Resim">`;
      execCommand('insertHTML', imgHTML);
    }
  };

  const insertLink = () => {
    const url = prompt('Link URL\'sini girin:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const setFontColor = (color: string) => {
    execCommand('foreColor', color);
    setShowColorPicker(false);
  };

  const setBackgroundColor = (color: string) => {
    execCommand('hiliteColor', color);
    setShowColorPicker(false);
  };

  const setFontSize = (size: string) => {
    execCommand('fontSize', size);
    setShowFontSize(false);
  };

  const updateContent = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setCurrentValue(newContent);
      onChange(newContent);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/html') || e.clipboardData.getData('text');
    document.execCommand('insertHTML', false, text);
    updateContent();
  };

  const handleSave = () => {
    onChange(currentValue);
    onClose();
  };

  const handleCancel = () => {
    setCurrentValue(value); // Reset to original value
    onClose();
  };

  if (!isOpen) return null;

  const colors = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
    '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
    '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
    '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#a4c2f4', '#b4a7d6', '#d5a6bd'
  ];

  const fontSizes = ['1', '2', '3', '4', '5', '6', '7'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Kaydet
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold ml-2"
            >
              ×
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border-b bg-gray-50 p-2">
          <div className="flex flex-wrap gap-1 items-center">
            {/* Text Formatting */}
            <div className="flex gap-1 border-r pr-2">
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
              <button
                type="button"
                onClick={() => execCommand('strikeThrough')}
                className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
                title="Üstü Çizili"
              >
                <s>S</s>
              </button>
            </div>

            {/* Headings */}
            <div className="flex gap-1 border-r pr-2">
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
            </div>

            {/* Lists */}
            <div className="flex gap-1 border-r pr-2">
              <button
                type="button"
                onClick={() => execCommand('insertUnorderedList')}
                className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
                title="Madde İşaretli Liste"
              >
                •
              </button>
              <button
                type="button"
                onClick={() => execCommand('insertOrderedList')}
                className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
                title="Numaralı Liste"
              >
                1.
              </button>
            </div>

            {/* Font Size */}
            <div className="relative border-r pr-2">
              <button
                type="button"
                onClick={() => setShowFontSize(!showFontSize)}
                className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
                title="Font Boyutu"
              >
                Aa
              </button>
              {showFontSize && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-10">
                  {fontSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setFontSize(size)}
                      className="block w-full px-3 py-1 text-sm hover:bg-gray-100 text-left"
                    >
                      Boyut {size}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Colors */}
            <div className="relative border-r pr-2">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
                title="Renk"
              >
                🎨
              </button>
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-10 p-2">
                  <div className="grid grid-cols-10 gap-1">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFontColor(color)}
                        className="w-6 h-6 border rounded"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <button
                      onClick={() => setBackgroundColor('#ffff00')}
                      className="w-full px-2 py-1 text-xs bg-yellow-200 rounded hover:bg-yellow-300"
                    >
                      Arka Plan Sarı
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Alignment */}
            <div className="flex gap-1 border-r pr-2">
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

            {/* Links and Images */}
            <div className="flex gap-1 border-r pr-2">
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
            </div>

            {/* Table */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTableCreator(!showTableCreator)}
                className="px-2 py-1 text-sm border rounded hover:bg-gray-200"
                title="Tablo Ekle"
              >
                📊
              </button>
              {showTableCreator && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-10 p-3">
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600">Satır:</label>
                      <input
                        type="number"
                        value={tableRows}
                        onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 text-sm border rounded"
                        min="1"
                        max="10"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Sütun:</label>
                      <input
                        type="number"
                        value={tableCols}
                        onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 text-sm border rounded"
                        min="1"
                        max="10"
                      />
                    </div>
                    <button
                      onClick={insertTable}
                      className="w-full px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Tablo Ekle
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 p-4">
          <div
            ref={editorRef}
            contentEditable
            className="w-full h-full border border-gray-300 rounded p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent overflow-auto"
            onInput={updateContent}
            onPaste={handlePaste}
            onBlur={updateContent}
            dangerouslySetInnerHTML={{ __html: currentValue }}
            style={{ 
              fontFamily: 'Arial, sans-serif',
              fontSize: '14px',
              lineHeight: '1.6'
            }}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <p className="text-xs text-gray-500">
            HTML içeriğinizi düzenleyin. Renk, font, tablo ve diğer formatlamaları kullanabilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
}
