'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Overlay } from '@/lib/api';
import { formatTime } from '@/lib/utils';

interface OverlayTimelineProps {
  overlays: Overlay[];
  duration: number;
  currentTime: number;
  onTimeClick: (time: number) => void;
  onOverlayClick: (overlay: Overlay) => void;
  onOverlayDelete: (overlayId: string) => void;
  className?: string;
}

export default function OverlayTimeline({
  overlays,
  duration,
  currentTime,
  onTimeClick,
  onOverlayClick,
  onOverlayDelete,
  className = ''
}: OverlayTimelineProps) {
  // Zoom and pan state
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = normal, 2 = 2x zoom, etc.
  const [panOffset, setPanOffset] = useState(0); // pixels
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const [hoveredOverlay, setHoveredOverlay] = useState<Overlay | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Calculate visible time range based on zoom and pan
  const visibleDuration = duration / zoomLevel;
  const panTimeOffset = (panOffset / (timelineRef.current?.clientWidth || 1)) * visibleDuration;
  const visibleStartTime = Math.max(0, panTimeOffset);
  const visibleEndTime = Math.min(duration, visibleStartTime + visibleDuration);

  // Calculate time markers based on duration and zoom
  const getTimeMarkers = () => {
    const baseInterval = duration <= 60 ? 5 : duration <= 300 ? 10 : 30;
    const interval = Math.max(1, Math.round(baseInterval / zoomLevel));
    const markers = [];
    
    for (let time = Math.floor(visibleStartTime / interval) * interval; 
         time <= visibleEndTime; 
         time += interval) {
      if (time >= 0 && time <= duration) {
        markers.push(time);
      }
    }
    
    return markers;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const clickedTime = visibleStartTime + (percentage * visibleDuration);
    
    onTimeClick(Math.max(0, Math.min(duration, clickedTime)));
  };

  const handleOverlayClick = (e: React.MouseEvent, overlay: Overlay) => {
    e.stopPropagation();
    onOverlayClick(overlay);
  };

  const handleOverlayDoubleClick = (e: React.MouseEvent, overlay: Overlay) => {
    e.stopPropagation();
    onTimeClick(overlay.time_stamp);
  };

  const handleOverlayMouseEnter = (e: React.MouseEvent, overlay: Overlay) => {
    setHoveredOverlay(overlay);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
    setShowTooltip(true);
  };

  const handleOverlayMouseLeave = () => {
    setHoveredOverlay(null);
    setShowTooltip(false);
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(10, prev * 1.5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.1, prev / 1.5));
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
    setPanOffset(0);
  };

  // Pan controls
  const handlePanLeft = () => {
    const panAmount = visibleDuration * 0.2; // Pan 20% of visible duration
    setPanOffset(prev => Math.max(0, prev - (panAmount / duration) * (timelineRef.current?.clientWidth || 1)));
  };

  const handlePanRight = () => {
    const panAmount = visibleDuration * 0.2; // Pan 20% of visible duration
    const maxPan = (duration - visibleDuration) / duration * (timelineRef.current?.clientWidth || 1);
    setPanOffset(prev => Math.min(maxPan, prev + (panAmount / duration) * (timelineRef.current?.clientWidth || 1)));
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoomLevel(prev => Math.max(0.1, Math.min(10, prev * zoomFactor)));
    } else {
      // Pan with shift+wheel or just wheel
      const panAmount = e.deltaY * 0.5;
      setPanOffset(prev => {
        const newOffset = prev + panAmount;
        const maxPan = (duration - visibleDuration) / duration * (timelineRef.current?.clientWidth || 1);
        return Math.max(0, Math.min(maxPan, newOffset));
      });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== timelineRef.current) return;
      
      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          handleZoomReset();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePanLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handlePanRight();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mouse drag pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart(e.clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart;
      setPanOffset(prev => {
        const newOffset = prev - deltaX;
        const maxPan = (duration - visibleDuration) / duration * (timelineRef.current?.clientWidth || 1);
        return Math.max(0, Math.min(maxPan, newOffset));
      });
      setDragStart(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset pan when zoom changes to keep current time visible
  useEffect(() => {
    if (timelineRef.current) {
      const currentTimePercentage = currentTime / duration;
      const newPanOffset = (currentTimePercentage * duration - visibleDuration / 2) / duration * timelineRef.current.clientWidth;
      const maxPan = (duration - visibleDuration) / duration * timelineRef.current.clientWidth;
      setPanOffset(Math.max(0, Math.min(maxPan, newPanOffset)));
    }
  }, [zoomLevel, currentTime, duration, visibleDuration]);

  const getOverlayTypeColor = (type: string) => {
    switch (type) {
      case 'frame_set': return 'bg-blue-500';
      case 'button_link': return 'bg-green-500';
      case 'button_message': return 'bg-yellow-500';
      case 'button_content': return 'bg-purple-500';
      case 'label': return 'bg-orange-500';
      case 'content': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getOverlayTypeIcon = (type: string) => {
    switch (type) {
      case 'frame_set': return '🎬';
      case 'button_link': return '🔗';
      case 'button_message': return '💬';
      case 'button_content': return '📄';
      case 'label': return '🏷️';
      case 'content': return '📋';
      default: return '●';
    }
  };

  // Filter overlays that are visible in current view
  const visibleOverlays = overlays.filter(overlay => 
    overlay.time_stamp >= visibleStartTime && overlay.time_stamp <= visibleEndTime
  );

  return (
    <div className={`relative ${className}`}>
      {/* Timeline Header with Controls */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-700">Overlay Timeline</h3>
          <div className="text-xs text-gray-500">
            {formatTime(visibleStartTime)} - {formatTime(visibleEndTime)} / {formatTime(duration)}
          </div>
        </div>
        
                 {/* Zoom and Pan Controls */}
         <div className="flex items-center gap-1 bg-white border rounded px-2 py-1">
           <button
             onClick={handleZoomOut}
             className="p-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
             title="Zoom Out (-)"
           >
             🔍-
           </button>
           <span className="text-xs text-gray-700 min-w-[40px] text-center font-medium">
             {Math.round(zoomLevel * 100)}%
           </span>
           <button
             onClick={handleZoomIn}
             className="p-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
             title="Zoom In (+)"
           >
             🔍+
           </button>
           <button
             onClick={handleZoomReset}
             className="p-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
             title="Reset Zoom (0)"
           >
             🔄
           </button>
           <div className="w-px h-4 bg-gray-300 mx-1"></div>
           <button
             onClick={handlePanLeft}
             className="p-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
             title="Pan Left (←)"
           >
             ◀
           </button>
           <button
             onClick={handlePanRight}
             className="p-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
             title="Pan Right (→)"
           >
             ▶
           </button>
         </div>
      </div>

      {/* Timeline Container */}
      <div className="relative bg-gray-100 rounded-lg p-2">
        {/* Timeline Track */}
        <div
          ref={timelineRef}
          className="relative h-8 bg-white rounded border cursor-pointer select-none"
          onClick={handleTimelineClick}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {/* Current Time Indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
            style={{ 
              left: `${((currentTime - visibleStartTime) / visibleDuration) * 100}%`,
              transform: 'translateX(-50%)'
            }}
          />

          {/* Time Markers */}
          {getTimeMarkers().map((time) => {
            const position = ((time - visibleStartTime) / visibleDuration) * 100;
            return (
              <div
                key={time}
                className="absolute top-0 bottom-0 w-px bg-gray-300"
                style={{ left: `${position}%` }}
              >
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
                  {formatTime(time)}
                </div>
              </div>
            );
          })}

          {/* Overlay Markers */}
          {visibleOverlays.map((overlay) => {
            const position = ((overlay.time_stamp - visibleStartTime) / visibleDuration) * 100;
            return (
              <div
                key={overlay.id}
                className="absolute top-1 bottom-1 w-4 transform -translate-x-1/2 cursor-pointer group"
                style={{ left: `${position}%` }}
                onClick={(e) => handleOverlayClick(e, overlay)}
                onDoubleClick={(e) => handleOverlayDoubleClick(e, overlay)}
                onMouseEnter={(e) => handleOverlayMouseEnter(e, overlay)}
                onMouseLeave={handleOverlayMouseLeave}
              >
                {/* Overlay Marker */}
                <div
                  className={`w-4 h-6 rounded-sm ${getOverlayTypeColor(overlay.type)} 
                    shadow-md hover:shadow-lg transition-all duration-200
                    flex items-center justify-center text-white text-xs font-bold
                    group-hover:scale-110 cursor-pointer`}
                  title={`${overlay.type} - ${overlay.caption || 'No caption'} (Tıkla: Düzenle, Çift tıkla: Zamana git)`}
                >
                  {getOverlayTypeIcon(overlay.type)}
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOverlayDelete(overlay.id);
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full 
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200
                    flex items-center justify-center text-xs hover:bg-red-600"
                  title="Sil"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        {/* Click Hint */}
        <div className="text-xs text-gray-500 mt-1 text-center">
          Timeline'e tıklayarak yeni overlay ekleyin • Overlay'lere çift tıklayarak o zamana git • 
          Fare tekerleği ile zoom/pan • Sürükleyerek pan yap • +/- zoom, 0 reset, ←→ pan
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && hoveredOverlay && (
        <div
          className="fixed z-50 bg-black text-white text-xs rounded-lg p-2 shadow-lg max-w-xs"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="font-medium mb-1">
            {formatTime(hoveredOverlay.time_stamp)} - {hoveredOverlay.type}
          </div>
          {hoveredOverlay.caption && (
            <div className="mb-1">{hoveredOverlay.caption}</div>
          )}
          {hoveredOverlay.position && (
            <div className="text-gray-300">Pozisyon: {hoveredOverlay.position}</div>
          )}
          {hoveredOverlay.frame && (
            <div className="text-gray-300">Frame: {hoveredOverlay.frame}</div>
          )}
          {hoveredOverlay.duration && (
            <div className="text-gray-300">Süre: {hoveredOverlay.duration}s</div>
          )}
        </div>
      )}
    </div>
  );
}
