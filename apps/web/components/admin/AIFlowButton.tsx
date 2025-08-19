'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import AIFlowEditor from './ai-flow/AIFlowEditor';

interface AIFlowButtonProps {
  trainingId: string;
}

export default function AIFlowButton({ trainingId }: AIFlowButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [initialFlow, setInitialFlow] = useState<any>(null);

  const handleOpen = async () => {
    setIsLoading(true);
    try {
      // Training'den mevcut AI flow'u al (eğer varsa)
      const training = await api.getTraining(trainingId);
      if (training.ai_flow) {
        try {
          const flow = JSON.parse(training.ai_flow);
          setInitialFlow(flow);
        } catch (error) {
          console.error('AI Flow parse hatası:', error);
          setInitialFlow(null);
        }
      } else {
        setInitialFlow(null);
      }
      setIsOpen(true);
    } catch (error) {
      console.error('Training yüklenirken hata:', error);
      setIsOpen(true); // Hata olsa bile editörü aç
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (flow: { nodes: any[]; edges: any[] }) => {
    try {
      // Önce mevcut training verilerini al
      const training = await api.getTraining(trainingId);
      
      // Training'e AI flow'u kaydet (mevcut verilerle birlikte)
      await api.updateTraining(trainingId, {
        title: training.title,
        description: training.description,
        flow_id: training.flow_id,
        ai_flow: JSON.stringify(flow)
      });
      setIsOpen(false);
    } catch (error) {
      console.error('AI Flow kaydedilirken hata:', error);
      alert('AI Flow kaydedilirken hata oluştu');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={isLoading}
        className="border rounded px-3 py-2 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {isLoading ? 'Yükleniyor...' : 'Akışı Düzenle'}
      </button>

      {isOpen && (
        <AIFlowEditor
          trainingId={trainingId}
          initialFlow={initialFlow}
          onSave={handleSave}
          onClose={handleClose}
        />
      )}
    </>
  );
}
