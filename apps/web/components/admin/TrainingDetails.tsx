'use client';

import { useState } from 'react';
import { Training as TrainingT } from '@/lib/api';
import { TrainingForm } from './forms/TrainingForm';
import { TrainingSectionsList } from './TrainingSectionsList';
import { DeleteTrainingButton } from './DeleteTrainingButton';
import { Drawer } from './Drawer';
import AIFlowButton from './AIFlowButton';

interface TrainingDetailsProps {
  training: TrainingT;
}

export default function TrainingDetails({ training }: TrainingDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div>
      {/* Header with Green Theme */}
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-200 rounded-t-xl p-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-900">{training.title}</h2>
              {training.description && (
                <p className="text-emerald-600 text-sm mt-1">{training.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors border border-emerald-200"
            >
              {isExpanded ? (
                <>
                  <span>Gizle</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </>
              ) : (
                <>
                  <span>Detayları Göster</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>
            <Drawer buttonLabel="Eğitimi Düzenle" title="Eğitimi Düzenle">
              <TrainingForm initialTraining={training as any} />
            </Drawer>
            <AIFlowButton trainingId={training.id} />
            <DeleteTrainingButton trainingId={training.id} trainingTitle={training.title} />
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="p-6">
          <TrainingSectionsList trainingId={training.id} />
        </div>
      )}
    </div>
  );
}
