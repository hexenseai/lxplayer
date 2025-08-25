'use client';

import { useState, useEffect } from 'react';
import { api, Overlay } from '@/lib/api';
import { formatTime } from '@/lib/utils';
import OverlayModal from './forms/OverlayModal';

interface OverlaysListProps {
  trainingId: string;
  sectionId: string;
  onChanged?: (overlays: Overlay[]) => void;
}

export default function OverlaysList({ trainingId, sectionId, onChanged }: OverlaysListProps) {
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOverlayId, setEditingOverlayId] = useState<string | undefined>();

  const loadOverlays = async () => {
    try {
      setLoading(true);
      const data = await api.listSectionOverlays(trainingId, sectionId);
      setOverlays(data);
      onChanged?.(data);
    } catch (error) {
      console.error('Error loading overlays:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverlays();
  }, [trainingId, sectionId]);

  const handleAddOverlay = () => {
    setEditingOverlayId(undefined);
    setIsModalOpen(true);
  };

  const handleEditOverlay = (overlayId: string) => {
    setEditingOverlayId(overlayId);
    setIsModalOpen(true);
  };

  const handleDeleteOverlay = async (overlayId: string) => {
    if (!confirm('Bu overlay\'i silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await api.deleteSectionOverlay(trainingId, sectionId, overlayId);
      await loadOverlays();
    } catch (error) {
      console.error('Error deleting overlay:', error);
      alert('Overlay silinirken hata oluştu');
    }
  };

  const handleModalSuccess = () => {
    loadOverlays();
  };



  if (loading) {
    return <div className="text-center py-4">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-medium text-gray-900">Overlay'ler</h4>
        <button
          onClick={handleAddOverlay}
          className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Overlay Ekle
        </button>
      </div>

      {overlays.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Bu section için henüz overlay eklenmemiş.
        </div>
      ) : (
        <div className="space-y-3">
          {overlays.map((overlay) => (
            <div
              key={overlay.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {formatTime(overlay.time_stamp)}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {overlay.type}
                    </span>
                    {overlay.frame && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {overlay.frame}
                      </span>
                    )}
                    {overlay.position && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {overlay.position}
                      </span>
                    )}
                  </div>
                  
                  {overlay.caption && (
                    <p className="text-sm text-gray-600 mb-2">{overlay.caption}</p>
                  )}
                  
                  {overlay.content_asset && (
                    <p className="text-xs text-gray-500">
                      İçerik: {overlay.content_asset.title}
                    </p>
                  )}
                  
                  {overlay.animation && (
                    <p className="text-xs text-gray-500">
                      Animasyon: {overlay.animation}
                    </p>
                  )}
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleEditOverlay(overlay.id)}
                    className="text-sm text-indigo-600 hover:text-indigo-900"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDeleteOverlay(overlay.id)}
                    className="text-sm text-red-600 hover:text-red-900"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <OverlayModal
        trainingId={trainingId}
        sectionId={sectionId}
        overlayId={editingOverlayId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
