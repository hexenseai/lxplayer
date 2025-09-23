import React from 'react';
import { 
  MessageCircle, 
  Link, 
  FileText, 
  Play, 
  Square, 
  Zap,
  Info,
  AlertCircle,
  CheckCircle,
  Star
} from 'lucide-react';

interface Overlay {
  id: string;
  time_stamp: number;
  type: 'frame_set' | 'button_link' | 'button_message' | 'button_content' | 'label' | 'content' | 'llm_interaction';
  caption?: string;
  icon?: string;
  pause_on_show?: boolean;
}

interface OverlayProgressBarProps {
  currentTime: number;
  duration: number;
  overlays: Overlay[];
  onSeek: (time: number) => void;
  className?: string;
}

// Overlay type to icon mapping
const getOverlayIcon = (overlay: Overlay) => {
  // If overlay has a custom icon, use it
  if (overlay.icon) {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      'message-circle': MessageCircle,
      'link': Link,
      'file-text': FileText,
      'play': Play,
      'square': Square,
      'zap': Zap,
      'info': Info,
      'alert-circle': AlertCircle,
      'check-circle': CheckCircle,
      'star': Star,
    };
    return iconMap[overlay.icon] || MessageCircle;
  }

  // Default icons based on overlay type
  switch (overlay.type) {
    case 'button_message':
    case 'llm_interaction':
      return MessageCircle;
    case 'button_link':
      return Link;
    case 'button_content':
    case 'content':
      return FileText;
    case 'frame_set':
      return Square;
    case 'label':
      return Info;
    default:
      return MessageCircle;
  }
};

// Overlay type to color mapping
const getOverlayColor = (overlay: Overlay) => {
  switch (overlay.type) {
    case 'button_message':
    case 'llm_interaction':
      return 'bg-blue-500 border-blue-400';
    case 'button_link':
      return 'bg-green-500 border-green-400';
    case 'button_content':
    case 'content':
      return 'bg-purple-500 border-purple-400';
    case 'frame_set':
      return 'bg-orange-500 border-orange-400';
    case 'label':
      return 'bg-gray-500 border-gray-400';
    default:
      return 'bg-blue-500 border-blue-400';
  }
};

export function OverlayProgressBar({ 
  currentTime, 
  duration, 
  overlays, 
  onSeek, 
  className = '' 
}: OverlayProgressBarProps) {
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercentage = clickX / rect.width;
    const newTime = clickPercentage * duration;
    onSeek(Math.max(0, Math.min(duration, newTime)));
  };

  // Sort overlays by timestamp
  const sortedOverlays = [...overlays].sort((a, b) => a.time_stamp - b.time_stamp);

  return (
    <div className={`relative ${className}`}>
      {/* Progress bar background */}
      <div 
        className="w-full h-2 bg-gray-600 rounded-full cursor-pointer relative overflow-hidden"
        onClick={handleClick}
      >
        {/* Progress fill */}
        <div 
          className="h-full bg-blue-500 rounded-full transition-all duration-100"
          style={{ width: `${progressPercentage}%` }}
        />
        
        {/* Overlay indicators */}
        {sortedOverlays.map((overlay) => {
          const overlayPosition = duration > 0 ? (overlay.time_stamp / duration) * 100 : 0;
          const IconComponent = getOverlayIcon(overlay);
          const colorClass = getOverlayColor(overlay);
          
          return (
            <div
              key={overlay.id}
              className={`absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 ${colorClass} cursor-pointer hover:scale-110 transition-transform duration-200 group`}
              style={{ left: `${overlayPosition}%` }}
              title={`${overlay.caption || overlay.type} - ${overlay.time_stamp}s`}
            >
              <IconComponent 
                size={8} 
                className="text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" 
              />
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black bg-opacity-80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                {overlay.caption || overlay.type}
                <br />
                {overlay.time_stamp}s
                {overlay.pause_on_show && (
                  <>
                    <br />
                    <span className="text-yellow-400">⏸️ Pause</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Time labels */}
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>0s</span>
        <span>{Math.floor(duration)}s</span>
      </div>
    </div>
  );
}
