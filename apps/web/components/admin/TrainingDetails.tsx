'use client';

import { useState, useEffect } from 'react';
import { Training as TrainingT, CompanyTraining } from '@/lib/api';
import { TrainingForm } from './forms/TrainingForm';
import { TrainingSectionsList } from './TrainingSectionsList';
import { DeleteTrainingButton } from './DeleteTrainingButton';
import { Drawer } from './Drawer';
import FlowButton from './flow/FlowButton';
import { api } from '@/lib/api';

interface TrainingDetailsProps {
  training: TrainingT;
}

export default function TrainingDetails({ training }: TrainingDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [accessCodes, setAccessCodes] = useState<CompanyTraining[]>([]);
  const [loadingAccessCodes, setLoadingAccessCodes] = useState(false);

  useEffect(() => {
    const fetchAccessCodes = async () => {
      setLoadingAccessCodes(true);
      try {
        // Bu eğitime ait tüm access code'ları al
        const allCompanyTrainings = await api.listCompanyTrainings();
        const trainingAccessCodes = allCompanyTrainings.filter(ct => ct.training_id === training.id);
        setAccessCodes(trainingAccessCodes);
      } catch (error) {
        console.error('Error fetching access codes:', error);
      } finally {
        setLoadingAccessCodes(false);
      }
    };

    if (isExpanded) {
      fetchAccessCodes();
    }
  }, [isExpanded, training.id]);

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
            <FlowButton trainingId={training.id} />
            <DeleteTrainingButton trainingId={training.id} trainingTitle={training.title} />
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Access Codes Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="font-semibold text-blue-900">Access Code'lar</h3>
            </div>
            
            {loadingAccessCodes ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : accessCodes.length > 0 ? (
              <div className="space-y-2">
                {accessCodes.map((ct) => (
                  <div key={ct.id} className="flex items-center justify-between bg-white border border-blue-200 rounded-lg p-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {ct.organization?.name || 'Bilinmeyen Firma'}
                        </span>
                        {ct.expectations && (
                          <span className="text-xs text-gray-500">
                            - {ct.expectations}
                          </span>
                        )}
                      </div>
                    </div>
                    <code className="bg-blue-100 px-2 py-1 rounded text-sm font-mono text-blue-800 border border-blue-200">
                      {ct.access_code}
                    </code>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                Bu eğitim için henüz access code oluşturulmamış.
              </div>
            )}
          </div>

          {/* Training Sections */}
          <TrainingSectionsList trainingId={training.id} />
        </div>
      )}
    </div>
  );
}
