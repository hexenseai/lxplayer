"use client";
import { useState } from 'react';
import { TrainingSectionForm } from './TrainingSectionForm';
import type { TrainingSection } from '@/lib/api';

interface TrainingSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainingId: string;
  initialSection?: TrainingSection;
}

export function TrainingSectionModal({ isOpen, onClose, trainingId, initialSection }: TrainingSectionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleDone = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {initialSection ? 'Bölüm Düzenle' : 'Yeni Bölüm Ekle'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          <TrainingSectionForm
            trainingId={trainingId}
            initialSection={initialSection}
            onDone={handleDone}
          />
        </div>
      </div>
    </div>
  );
}
