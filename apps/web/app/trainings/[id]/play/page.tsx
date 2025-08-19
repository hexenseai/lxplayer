'use client';
import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

export default function PlayerPage({ params }: { params: { id: string } }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const source = `${process.env.NEXT_PUBLIC_CDN_URL ?? ''}/hls/${params.id}.m3u8`;
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(source);
      hls.attachMedia(video);
      return () => hls.destroy();
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source;
    }
  }, [params.id]);

  const play = () => videoRef.current?.play().then(() => setIsPlaying(true));
  const pause = () => videoRef.current?.pause().then(() => setIsPlaying(false));
  const seek = (sec: number) => { if (videoRef.current) videoRef.current.currentTime = sec; };

  return (
    <main className="p-0">
      <div className="relative w-full max-w-5xl mx-auto">
        <video ref={videoRef} className="w-full bg-black" controls={false} />
        <div className="absolute inset-0 pointer-events-none" id="overlay-root" />
      </div>
      <div className="max-w-5xl mx-auto p-4 flex items-center gap-2">
        <button onClick={play} className="px-3 py-1.5 border rounded">Play</button>
        <button onClick={pause} className="px-3 py-1.5 border rounded">Pause</button>
        <button onClick={() => seek(0)} className="px-3 py-1.5 border rounded">Başa Sar</button>
      </div>
    </main>
  );
}
