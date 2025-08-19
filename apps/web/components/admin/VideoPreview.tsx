"use client";
import { useState } from 'react';

interface VideoPreviewProps {
  uri: string;
  title: string;
}

export function VideoPreview({ uri, title }: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const cdn = process.env.NEXT_PUBLIC_CDN_URL || 'http://localhost:9000/lxplayer';
  const videoUrl = `${cdn}/${encodeURIComponent(uri)}`;

  return (
    <div className="space-y-2">
      {!isPlaying ? (
        <div className="relative w-64 h-36 bg-gray-100 border rounded flex items-center justify-center cursor-pointer" onClick={() => setIsPlaying(true)}>
          <div className="text-center">
            <div className="text-4xl mb-2">▶️</div>
            <div className="text-sm text-gray-600">{title}</div>
            <div className="text-xs text-gray-500">Tıklayın oynatmak için</div>
          </div>
        </div>
      ) : (
        <div className="w-64">
          <video 
            className="w-full rounded border" 
            controls 
            autoPlay
            onEnded={() => setIsPlaying(false)}
          >
            <source src={videoUrl} type="video/mp4" />
            Tarayıcınız video oynatmayı desteklemiyor.
          </video>
        </div>
      )}
      <a 
        href={videoUrl} 
        target="_blank" 
        rel="noreferrer" 
        className="text-xs text-blue-600 hover:underline block"
      >
        Yeni sekmede aç
      </a>
    </div>
  );
}
