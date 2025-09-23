import React, { useState } from 'react';
import { OverlayProgressBar } from './OverlayProgressBar';

// Demo overlays with different types and timestamps
const demoOverlays = [
  {
    id: 'demo-1',
    time_stamp: 5,
    type: 'button_message' as const,
    caption: 'Welcome Message',
    pause_on_show: false
  },
  {
    id: 'demo-2',
    time_stamp: 15,
    type: 'button_link' as const,
    caption: 'External Resource',
    pause_on_show: true
  },
  {
    id: 'demo-3',
    time_stamp: 25,
    type: 'content' as const,
    caption: 'Important Content',
    pause_on_show: false
  },
  {
    id: 'demo-4',
    time_stamp: 35,
    type: 'frame_set' as const,
    caption: 'Frame Change',
    pause_on_show: false
  },
  {
    id: 'demo-5',
    time_stamp: 45,
    type: 'label' as const,
    caption: 'Information Label',
    pause_on_show: false
  },
  {
    id: 'demo-6',
    time_stamp: 55,
    type: 'llm_interaction' as const,
    caption: 'AI Chat',
    pause_on_show: true
  }
];

export function OverlayProgressBarDemo() {
  const [currentTime, setCurrentTime] = useState(0);
  const duration = 60; // 60 seconds demo

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    console.log(`Seeking to: ${time}s`);
  };

  return (
    <div className="p-6 bg-gray-900 text-white">
      <h2 className="text-xl font-bold mb-4">Overlay Progress Bar Demo</h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-300 mb-2">
          Current Time: {Math.floor(currentTime)}s / {duration}s
        </p>
        <p className="text-xs text-gray-400">
          Click on the progress bar to seek. Hover over overlay indicators to see details.
        </p>
      </div>

      <div className="mb-6">
        <OverlayProgressBar
          currentTime={currentTime}
          duration={duration}
          overlays={demoOverlays}
          onSeek={handleSeek}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <h3 className="font-semibold mb-2">Overlay Types & Colors:</h3>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Message/Chat (Blue)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Link (Green)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>Content (Purple)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span>Frame Set (Orange)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span>Label (Gray)</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Demo Overlays:</h3>
          <div className="space-y-1 text-xs">
            {demoOverlays.map((overlay) => (
              <div key={overlay.id} className="flex justify-between">
                <span>{overlay.caption}</span>
                <span className="text-gray-400">{overlay.time_stamp}s</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
