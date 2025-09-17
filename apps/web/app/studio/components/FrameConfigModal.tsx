'use client';

import { useState } from 'react';
// FrameConfigForm removed - simplified modal

interface FrameConfigModalProps {
  sectionId: string;
  frameConfigId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FrameConfigModal({ sectionId, frameConfigId, isOpen, onClose, onSuccess }: FrameConfigModalProps) {
  if (!isOpen) return null;

  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {frameConfigId ? 'Frame Konfigürasyonu Düzenle' : 'Yeni Frame Konfigürasyonu Ekle'}
                </h3>
                <div className="text-gray-600 mb-4">
                  Frame konfigürasyonu özelliği Studio'da geliştirilmektedir.
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Kapat
                  </button>
                  <button
                    onClick={handleSuccess}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Tamam
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
