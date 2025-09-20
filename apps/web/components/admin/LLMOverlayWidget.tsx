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

interface LLMResponse {
  success: boolean;
  message: string;
  actions: Array<{
    action: string;
    overlay_id?: string;
    time_stamp?: number;
    type?: string;
    caption?: string;
  }>;
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
  const [lastResponse, setLastResponse] = useState<LLMResponse | null>(null);
  const [showResponse, setShowResponse] = useState(false);

  // Check if section script is in SRT format
  const isSRTFormat = section?.script && section.script.includes('-->');
  const hasScript = section?.script && section.script.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setLastResponse(null);

    try {
      const response = await api.llmManageOverlays(
        trainingId, 
        sectionId, 
        prompt.trim(),
        hasScript ? section!.script : undefined
      );
      
      setLastResponse(response);
      setShowResponse(true);
      
      // If successful, refresh overlays and clear prompt
      if (response.success) {
        onOverlaysChanged();
        setPrompt('');
      }
      
    } catch (error) {
      console.error('LLM overlay management error:', error);
      setLastResponse({
        success: false,
        message: `Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        actions: [],
        warnings: []
      });
      setShowResponse(true);
    } finally {
      setIsLoading(false);
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
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Overlay komutunuzu yazın... Örn: '10. saniyede dikkat yazısı ekle' veya 'önemli noktalara vurgu ekle'"
            className="w-full p-3 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            disabled={isLoading}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {isLoading ? 'İşleniyor...' : 'Uygula'}
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

      {/* Response Display */}
      {showResponse && lastResponse && (
        <div className="mt-4 p-3 rounded-md border">
          <div className="flex items-center justify-between mb-2">
            <div className={`text-sm font-medium ${lastResponse.success ? 'text-green-700' : 'text-red-700'}`}>
              {lastResponse.success ? '✅ Başarılı' : '❌ Hata'}
            </div>
            <button
              onClick={() => setShowResponse(false)}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          </div>
          
          <div className="text-sm text-gray-700 mb-2">
            {lastResponse.message}
          </div>

          {/* Actions Summary */}
          {lastResponse.actions.length > 0 && (
            <div className="text-xs text-gray-600 mb-2">
              <div className="font-medium mb-1">Gerçekleştirilen İşlemler:</div>
              <ul className="list-disc list-inside space-y-1">
                {lastResponse.actions.map((action, index) => (
                  <li key={index}>
                    {action.action === 'create' && `${action.time_stamp}s'de ${action.type} oluşturuldu: "${action.caption}"`}
                    {action.action === 'update' && `Overlay güncellendi: ${action.overlay_id}`}
                    {action.action === 'delete' && `Overlay silindi: ${action.overlay_id}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {lastResponse.warnings.length > 0 && (
            <div className="text-xs text-orange-600">
              <div className="font-medium mb-1">Uyarılar:</div>
              <ul className="list-disc list-inside space-y-1">
                {lastResponse.warnings.map((warning, index) => (
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
