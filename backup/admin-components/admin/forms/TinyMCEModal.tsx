'use client';

import React, { useState, useEffect } from 'react';
import { TinyMCEEditorComponent } from './TinyMCEEditor';

interface TinyMCEModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  title?: string;
}

export function TinyMCEModal({ isOpen, onClose, value, onChange, title = "HTML İçerik Editörü" }: TinyMCEModalProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSave = () => {
    onChange(localValue);
    onClose();
  };

  const handleCancel = () => {
    setLocalValue(value); // Değişiklikleri iptal et
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">{title}</h2>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Kaydet
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              İptal
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0">
              <TinyMCEEditorComponent
                value={localValue}
                onChange={setLocalValue}
                placeholder="İçeriğinizi buraya yazın... Resim yüklemek için toolbar'daki resim butonunu kullanın."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>HTML içerik: {localValue.length} karakter</span>
            <div className="flex gap-2">
              <button
                onClick={() => setLocalValue('')}
                className="text-red-600 hover:text-red-800"
              >
                Temizle
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
