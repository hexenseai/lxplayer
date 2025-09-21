'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { TrainingSection } from '@/lib/api';

interface LLMOverlayWidgetProps {
  trainingId: string;
  sectionId: string;
  section: TrainingSection | null;
  onOverlaysChanged: () => void; // Callback to refresh overlays
}

interface LLMAction {
  action: string;
  overlay_id?: string;
  time_stamp?: number;
  type?: string;
  caption?: string;
  position?: string;
  animation?: string;
  duration?: number;
  pause_on_show?: boolean;
  frame?: string;
  style_id?: string;
  frame_config_id?: string;
}

interface LLMResponse {
  success: boolean;
  message: string;
  actions: LLMAction[];
  warnings: string[];
}

export function LLMOverlayWidget({ 
  trainingId, 
  sectionId, 
  section,
  onOverlaysChanged 
}: LLMOverlayWidgetProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [previewResponse, setPreviewResponse] = useState<LLMResponse | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Check if section script is in SRT format
  const isSRTFormat = section?.script && section.script.includes('-->');
  const hasScript = section?.script && section.script.trim().length > 0;

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setPreviewResponse(null);

    try {
      const response = await api.llmPreviewOverlays(
        trainingId, 
        sectionId, 
        prompt.trim(),
        hasScript ? section!.script : undefined
      );
      
      setPreviewResponse(response);
      setShowPreview(true);
      
    } catch (error) {
      console.error('LLM overlay preview error:', error);
      setPreviewResponse({
        success: false,
        message: `Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        actions: [],
        warnings: []
      });
      setShowPreview(true);
    } finally {
      setIsLoading(false);
    }
  };

  const executeActions = async () => {
    if (!previewResponse?.actions.length || isExecuting) return;

    setIsExecuting(true);
    
    try {
      // Execute actions one by one using normal overlay endpoints
      let successCount = 0;
      let errorCount = 0;

      for (const action of previewResponse.actions) {
        try {
          if (action.action === 'create') {
            await api.createSectionOverlay(trainingId, sectionId, {
              time_stamp: action.time_stamp || 0,
              type: action.type || 'label',
              caption: action.caption,
              position: action.position,
              animation: action.animation,
              pause_on_show: action.pause_on_show || false,
              frame: action.frame,
              style_id: action.style_id,
              frame_config_id: action.frame_config_id
            });
            successCount++;
          } else if (action.action === 'delete' && action.overlay_id) {
            await api.deleteSectionOverlay(trainingId, sectionId, action.overlay_id);
            successCount++;
          } else if (action.action === 'update' && action.overlay_id) {
            await api.updateSectionOverlay(trainingId, sectionId, action.overlay_id, {
              time_stamp: action.time_stamp,
              type: action.type,
              caption: action.caption,
              position: action.position,
              animation: action.animation,
              pause_on_show: action.pause_on_show,
              frame: action.frame,
              style_id: action.style_id,
              frame_config_id: action.frame_config_id
            });
            successCount++;
          }
        } catch (error) {
          console.error('Action execution error:', error);
          errorCount++;
        }
      }

      // Update preview response with execution results
      setPreviewResponse({
        ...previewResponse,
        message: `${successCount} aksiyon başarıyla yürütüldü${errorCount > 0 ? `, ${errorCount} hata` : ''}`,
        success: successCount > 0
      });

      // Refresh overlays and clear form if successful
      if (successCount > 0) {
        onOverlaysChanged();
        setPrompt('');
        setShowPreview(false);
        setPreviewResponse(null);
      }

    } catch (error) {
      console.error('Execute actions error:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  const examples = [
    "5. saniyede 'Dikkat!' yazısı ekle",
    "Script'te 'önemli' kelimesi geçen yerlere vurgu ekle",
    "10-15 saniye arası overlay'leri sil",
    "25. saniyedeki konuyu maddeleyerek sağ tarafa yaz",
    "Kırmızı stille uyarı mesajı ekle",
    "Yakın çekim frame'i ile başlık ekle",
    "Tüm overlay'leri temizle"
  ];

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <h3 className="text-sm font-semibold text-gray-800">AI Overlay Yöneticisi</h3>
      </div>

      {/* Script Status */}
      <div className="mb-3 p-2 rounded-md text-xs">
        {!hasScript ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-2 rounded">
            ⚠️ Bölümde script yok. Script eklerseniz AI daha akıllı overlay'ler oluşturabilir.
          </div>
        ) : !isSRTFormat ? (
          <div className="bg-orange-50 border border-orange-200 text-orange-700 p-2 rounded">
            ⚠️ Script SRT formatında değil. Zaman etiketli script için "Script Oluştur" butonunu kullanın.
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 text-green-700 p-2 rounded">
            ✅ SRT formatında script mevcut. AI zaman bilgilerini kullanabilir.
          </div>
        )}
      </div>

      {/* Prompt Form */}
      <form onSubmit={handlePreview} className="space-y-3">
        <div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Overlay komutunuzu yazın... Örn: '10. saniyede dikkat yazısı ekle' veya 'önemli noktalara vurgu ekle'"
            className="w-full p-3 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            disabled={isLoading || isExecuting}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading || isExecuting}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {isLoading ? 'Analiz Ediliyor...' : 'Önizle'}
          </button>

          <div className="text-xs text-gray-500">
            {prompt.length}/500
          </div>
        </div>
      </form>

      {/* Example Commands */}
      <div className="mt-4">
        <div className="text-xs font-medium text-gray-600 mb-2">Örnek Komutlar:</div>
        <div className="flex flex-wrap gap-1">
          {examples.map((example, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(example)}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
              disabled={isLoading}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Preview Display */}
      {showPreview && previewResponse && (
        <div className="mt-4 p-4 rounded-md border bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className={`text-sm font-medium ${previewResponse.success ? 'text-blue-700' : 'text-red-700'}`}>
              {previewResponse.success ? '🔍 Önizleme' : '❌ Hata'}
            </div>
            <button
              onClick={() => setShowPreview(false)}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          </div>
          
          <div className="text-sm text-gray-700 mb-3">
            {previewResponse.message}
          </div>

          {/* Actions Preview */}
          {previewResponse.success && previewResponse.actions.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-medium text-gray-700 mb-2">Yapılacak İşlemler ({previewResponse.actions.length} adet):</div>
              <div className="space-y-2">
                {previewResponse.actions.map((action, index) => (
                  <div key={index} className="bg-white p-3 rounded border text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        action.action === 'create' ? 'bg-green-100 text-green-700' :
                        action.action === 'update' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {action.action === 'create' ? '➕ Oluştur' :
                         action.action === 'update' ? '✏️ Güncelle' :
                         '🗑️ Sil'}
                      </span>
                      {action.time_stamp && (
                        <span className="text-gray-500">{action.time_stamp}s</span>
                      )}
                    </div>
                    
                    <div className="text-gray-700">
                      {action.action === 'create' && (
                        <>
                          <div><strong>Tür:</strong> {action.type}</div>
                          {action.caption && <div><strong>Metin:</strong> "{action.caption}"</div>}
                          {action.position && <div><strong>Konum:</strong> {action.position}</div>}
                          {action.animation && <div><strong>Animasyon:</strong> {action.animation}</div>}
                          {action.duration && <div><strong>Süre:</strong> {action.duration}s</div>}
                        </>
                      )}
                      {action.action === 'delete' && (
                        <div><strong>Silinecek ID:</strong> {action.overlay_id}</div>
                      )}
                      {action.action === 'update' && (
                        <div><strong>Güncellenecek ID:</strong> {action.overlay_id}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Execute Button */}
              <div className="mt-4 flex justify-center">
                <button
                  onClick={executeActions}
                  disabled={isExecuting}
                  className="px-6 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isExecuting && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {isExecuting ? 'Yürütülüyor...' : '✅ Yürüt'}
                </button>
              </div>
            </div>
          )}

          {/* Warnings */}
          {previewResponse.warnings.length > 0 && (
            <div className="text-xs text-orange-600">
              <div className="font-medium mb-1">Uyarılar:</div>
              <ul className="list-disc list-inside space-y-1">
                {previewResponse.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
