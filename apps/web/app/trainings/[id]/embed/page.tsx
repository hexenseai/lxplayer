'use client';
import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export default function EmbedPlayer({ params }: { params: { id: string } }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

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

  return (
    <div className="w-full h-full bg-black">
      <video ref={videoRef} className="w-full h-full" controls autoPlay />
    </div>
  );
}
