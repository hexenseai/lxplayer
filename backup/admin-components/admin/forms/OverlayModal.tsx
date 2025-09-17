'use client';

import { useState } from 'react';
import OverlayForm from './OverlayForm';

interface OverlayModalProps {
  trainingId: string;
  sectionId: string;
  overlayId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTimeStamp?: number;
}

export default function OverlayModal({ trainingId, sectionId, overlayId, isOpen, onClose, onSuccess, initialTimeStamp }: OverlayModalProps) {
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
                  {overlayId ? 'Overlay Düzenle' : 'Yeni Overlay Ekle'}
                </h3>
                <OverlayForm
                  trainingId={trainingId}
                  sectionId={sectionId}
                  overlayId={overlayId}
                  onSuccess={handleSuccess}
                  onCancel={onClose}
                  initialTimeStamp={initialTimeStamp}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
