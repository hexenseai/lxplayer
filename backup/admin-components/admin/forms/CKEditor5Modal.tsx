'use client';

import React, { useState, useEffect } from 'react';
import { CKEditor5Component } from './CKEditor5';

interface CKEditor5ModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  title?: string;
}

export function CKEditor5Modal({ isOpen, onClose, value, onChange, title = "CKEditor HTML İçerik Editörü" }: CKEditor5ModalProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSave = () => {
    onChange(localValue);
    onClose();
  };

  const handleCancel = () => {
    setLocalValue(value);
    onClose();
  };

  if (!isOpen) return null;

  // Client-side rendering kontrolü
  if (!isMounted) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleCancel}></div>
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Kaydet
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                İptal
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="flex-1 min-h-0">
                <CKEditor5Component
                  value={localValue}
                  onChange={setLocalValue}
                  placeholder="İçeriğinizi buraya yazın..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
