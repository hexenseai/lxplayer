'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface HeyGenModalProps {
  trainingId: string;
  sectionId: string;
  script: string;
  title: string;
  onClose: () => void;
  onSuccess: (assetId: string) => void;
}

export function HeyGenModal({ trainingId, sectionId, script, title, onClose, onSuccess }: HeyGenModalProps) {
  const [voiceId, setVoiceId] = useState('');
  const [avatarId, setAvatarId] = useState('');
  const [size, setSize] = useState('1280x720');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!script.trim()) {
      setError('Script alanı boş olamaz');
      return;
    }

    setBusy(true);
    setError(null);
    
    try {
      const [wStr, hStr] = size.split('x');
      const width = parseInt(wStr, 10);
      const height = parseInt(hStr, 10);
      
      // HeyGen ile video oluştur
      const res: any = await api.generateVideo({ 
        provider: 'heygen', 
        model: 'v2', 
        prompt: script, 
        width, 
        height, 
        avatar_id: avatarId || undefined, 
        voice_id: voiceId || undefined 
      });
      
      if ('detail' in res) {
        throw new Error(res.detail);
      }
      
      // Asset oluştur
      const created = await api.createAsset({ 
        title: title || 'HeyGen Video', 
        kind: 'video', 
        uri: (res as any).uri! 
      });
      
      // Section'ı güncelle (sadece mevcut section'lar için)
      if (sectionId !== "new") {
        await api.updateTrainingSection(trainingId, sectionId, {
          asset_id: created.id
        });
      }
      
      onSuccess(created.id);
      onClose();
      
    } catch (e: any) {
      setError(e?.message || 'HeyGen video oluşturma hatası');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Script'ten Video Oluştur</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>
        
        <div className="text-sm text-gray-600">
          Bölüm script'i kullanılarak HeyGen ile video oluşturulacak. Avatar ve ses kimliğini girin.
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Avatar ID *
            </label>
            <input 
              value={avatarId} 
              onChange={(e) => setAvatarId(e.target.value)} 
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="avatar_id" 
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voice ID
            </label>
            <input 
              value={voiceId} 
              onChange={(e) => setVoiceId(e.target.value)} 
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="voice_id (opsiyonel)" 
            />
          </div>
          
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Video Boyutu
            </label>
            <select 
              value={size} 
              onChange={(e) => setSize(e.target.value)} 
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1280x720">1280x720 (HD)</option>
              <option value="1920x1080">1920x1080 (Full HD)</option>
            </select>
          </div>
        </div>
        
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}
        
        <div className="flex justify-end gap-3 pt-4">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Vazgeç
          </button>
          <button 
            onClick={handleGenerate} 
            disabled={busy || !avatarId.trim()} 
            className={`px-4 py-2 text-sm rounded-md text-white transition-colors ${
              busy || !avatarId.trim() 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {busy ? 'Video Oluşturuluyor...' : 'Video Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
}
