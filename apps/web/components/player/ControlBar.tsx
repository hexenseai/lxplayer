'use client';
import React from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  Subtitles, 
  Settings, 
  Send,
  Menu
} from 'lucide-react';
import { ControlBarProps } from '@/lib/types';

export function ControlBar({
  onTogglePlay,
  onVolumeChange,
  onToggleMute,
  onToggleMicrophone,
  onToggleSubtitles,
  onSettings,
  onSendMessage,
  isPlaying,
  volume,
  isMuted,
  isMicrophoneActive,
  showSubtitles,
  currentMessage,
  onMessageChange
}: ControlBarProps) {
  const handleSendMessage = () => {
    if (currentMessage.trim()) {
      onSendMessage(currentMessage.trim());
      onMessageChange('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 bg-opacity-95 backdrop-blur-sm border-t border-gray-700 z-30">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Sol taraf - Flow steps butonu */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {/* Flow steps modal'ı aç */}}
            className="p-2 text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Flow Steps"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Orta - Mesaj input ve gönder */}
        <div className="flex-1 max-w-2xl mx-4">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Mesajınızı yazın..."
              className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none placeholder-gray-400"
            />
            <button
              onClick={handleSendMessage}
              disabled={!currentMessage.trim()}
              className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              title="Gönder"
            >
              <Send size={18} />
            </button>
          </div>
        </div>

        {/* Sağ taraf - Kontroller */}
        <div className="flex items-center space-x-2">
          {/* Ses kontrolü */}
          <div className="flex items-center space-x-1">
            <button
              onClick={onToggleMute}
              className="p-2 text-white hover:bg-gray-700 rounded-lg transition-colors"
              title={isMuted ? "Sesi Aç" : "Sesi Kapat"}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            {!isMuted && (
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                title="Ses Seviyesi"
              />
            )}
          </div>

          {/* Mikrofon */}
          <button
            onClick={onToggleMicrophone}
            className={`p-2 rounded-lg transition-colors ${
              isMicrophoneActive 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'text-white hover:bg-gray-700'
            }`}
            title={isMicrophoneActive ? "Mikrofonu Kapat" : "Mikrofonu Aç"}
          >
            {isMicrophoneActive ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Alt yazı */}
          <button
            onClick={onToggleSubtitles}
            className={`p-2 rounded-lg transition-colors ${
              showSubtitles 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'text-white hover:bg-gray-700'
            }`}
            title={showSubtitles ? "Alt Yazıyı Kapat" : "Alt Yazıyı Aç"}
          >
            <Subtitles size={20} />
          </button>

          {/* Ayarlar */}
          <button
            onClick={onSettings}
            className="p-2 text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Ayarlar"
          >
            <Settings size={20} />
          </button>

          {/* Logo */}
          <div className="ml-4">
            <img 
              src="/logo.png" 
              alt="LXPlayer" 
              className="h-8 w-auto"
            />
          </div>
        </div>
      </div>

      {/* Custom slider styles */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}
