'use client';
import React, { useState } from 'react';
import { InteractivePlayer } from '@/components/InteractivePlayer';

export default function DemoPage() {
  const [accessCode, setAccessCode] = useState('TEST123');
  const [showPlayer, setShowPlayer] = useState(false);

  const handleStartDemo = () => {
    if (accessCode.trim()) {
      setShowPlayer(true);
    }
  };

  if (showPlayer) {
    return <InteractivePlayer accessCode={accessCode} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900 flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center p-8">
        <div className="mb-8">
          <img 
            src="/logo.png" 
            alt="LXPlayer" 
            className="h-24 w-auto mx-auto mb-6"
          />
          <h1 className="text-4xl font-bold text-white mb-4">
            InteractivePlayer Demo
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Yapay zeka destekli interaktif eğitim oynatıcısını deneyin
          </p>
        </div>

        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Demo Başlat
          </h2>
          
          <div className="mb-6">
            <label htmlFor="accessCode" className="block text-sm font-medium text-gray-300 mb-2">
              Access Code
            </label>
            <input
              id="accessCode"
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Access code girin..."
              className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none placeholder-gray-400"
            />
          </div>

          <button
            onClick={handleStartDemo}
            disabled={!accessCode.trim()}
            className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Demo'yu Başlat
          </button>

          <div className="mt-6 text-sm text-gray-400">
            <p className="mb-2">Test için kullanabileceğiniz access code:</p>
            <code className="bg-gray-700 px-2 py-1 rounded text-purple-300">TEST123</code>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 bg-opacity-30 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl mb-2">🎬</div>
            <h3 className="text-lg font-semibold text-white mb-2">Video Oynatma</h3>
            <p className="text-gray-300 text-sm">
              ReactPlayer tabanlı video oynatma ve frame-based kadraj ayarlama
            </p>
          </div>

          <div className="bg-gray-800 bg-opacity-30 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl mb-2">🤖</div>
            <h3 className="text-lg font-semibold text-white mb-2">AI Asistan</h3>
            <p className="text-gray-300 text-sm">
              OpenAI GPT-4o ile gerçek zamanlı etkileşim ve TTS desteği
            </p>
          </div>

          <div className="bg-gray-800 bg-opacity-30 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="text-lg font-semibold text-white mb-2">Overlay Sistemi</h3>
            <p className="text-gray-300 text-sm">
              Timestamp tabanlı overlay'ler ve animasyon desteği
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <h3 className="text-lg font-semibold text-white mb-4">AI Komutları</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-800 bg-opacity-30 rounded-lg p-3 border border-gray-700">
              <h4 className="font-semibold text-white mb-2">Video Kontrolü</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• "dur" / "stop" - Videoyu durdur</li>
                <li>• "başla" / "play" - Videoyu başlat</li>
                <li>• "ileri" / "next" - Sonraki bölüm</li>
                <li>• "geri" / "previous" - Önceki bölüm</li>
              </ul>
            </div>
            <div className="bg-gray-800 bg-opacity-30 rounded-lg p-3 border border-gray-700">
              <h4 className="font-semibold text-white mb-2">Overlay Kontrolü</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• "overlay göster" - Overlay'leri göster</li>
                <li>• "frame değiştir" - Kadraj değiştir</li>
                <li>• "tekrar" - Bölümü tekrarla</li>
                <li>• Herhangi bir soru sorabilirsiniz</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
