'use client';
import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AudioVisualizerProps } from '@/lib/types';

export function AudioVisualizer({ isPlaying, audioData }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bars = 20;
    const barWidth = canvas.width / bars;
    const barSpacing = 2;

    const animate = () => {
      if (!isPlaying) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#8b5cf6'; // Purple color

      for (let i = 0; i < bars; i++) {
        const height = audioData?.[i] || Math.random() * 60 + 10;
        const x = i * (barWidth + barSpacing);
        const y = canvas.height - height;

        ctx.fillRect(x, y, barWidth - barSpacing, height);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, audioData]);

  if (!isPlaying) return null;

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-20">
      <canvas
        ref={canvasRef}
        width={200}
        height={60}
        className="rounded-lg bg-black bg-opacity-20 backdrop-blur-sm"
      />
    </div>
  );
}

export function EqualizerBars({ isPlaying }: { isPlaying: boolean }) {
  const bars = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div className="flex items-end space-x-1 h-8">
      {bars.map((bar) => (
        <motion.div
          key={bar}
          className="w-1 bg-gradient-to-t from-purple-400 to-purple-600 rounded-full"
          animate={
            isPlaying
              ? {
                  height: [
                    `${Math.random() * 20 + 10}px`,
                    `${Math.random() * 30 + 15}px`,
                    `${Math.random() * 20 + 10}px`
                  ],
                  transition: {
                    duration: 0.5,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    delay: bar * 0.1
                  }
                }
              : { height: '8px' }
          }
        />
      ))}
    </div>
  );
}
