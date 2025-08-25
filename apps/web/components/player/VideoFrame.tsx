'use client';
import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import ReactPlayer from 'react-player';
import { VideoFrameProps } from '@/lib/types';

export const VideoFrame = forwardRef<any, VideoFrameProps>(({
  videoUrl,
  currentTime,
  isPlaying,
  frame = 'wide',
  frameConfig,
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded
}, ref) => {
  const playerRef = useRef<ReactPlayer>(null);
  const [isReady, setIsReady] = useState(false);
  const [volume, setVolumeState] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useImperativeHandle(ref, () => ({
    setVolume: (volume: number) => {
      setVolumeState(volume);
    },
    seekTo: (time: number) => {
      if (playerRef.current && isReady) {
        playerRef.current.seekTo(time, 'seconds');
      }
    },
    setFrame: (newFrame: string) => {
      console.log('Manual frame change requested:', newFrame);
      // This will be handled by the parent component through props
    }
  }));

  useEffect(() => {
    if (playerRef.current && isReady) {
      const player = playerRef.current;
      const currentPlayerTime = player.getCurrentTime();
      
      if (Math.abs(currentPlayerTime - currentTime) > 1) {
        player.seekTo(currentTime, 'seconds');
      }
    }
  }, [currentTime, isReady]);

  // Log frame changes for debugging and handle transitions
  useEffect(() => {
    console.log('VideoFrame: Frame changed to:', frame);
    const transitionDuration = frameConfig?.transition_duration || 0.8;
    if (frame !== 'wide') {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, transitionDuration * 1000); // Convert to milliseconds
      return () => clearTimeout(timer);
    } else {
      setIsTransitioning(false);
    }
  }, [frame, frameConfig]);

  const getFrameStyles = () => {
    const transitionDuration = frameConfig?.transition_duration || 0.8;
    const transitionEasing = frameConfig?.transition_easing || 'cubic-bezier(0.4, 0, 0.2, 1)';
    
    const baseStyles: React.CSSProperties = {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transition: `all ${transitionDuration}s ${transitionEasing}`,
      transformOrigin: 'center center'
    };

    // If we have a custom frame configuration, use it
    if (frame === 'custom' && frameConfig) {
      return {
        ...baseStyles,
        objectPosition: `${frameConfig.object_position_x}% ${frameConfig.object_position_y}%`,
        transform: `scale(${frameConfig.scale})`,
        transformOrigin: `${frameConfig.transform_origin_x}% ${frameConfig.transform_origin_y}%`
      };
    }

    switch (frame) {
      case 'wide':
        return {
          ...baseStyles,
          objectPosition: 'center center',
          transform: 'scale(1.0)'
        };
      case 'face_left':
        return {
          ...baseStyles,
          objectPosition: 'left center',
          transform: 'scale(1.4)',
          transformOrigin: '20% 50%'
        };
      case 'face_right':
        return {
          ...baseStyles,
          objectPosition: 'right center',
          transform: 'scale(1.4)',
          transformOrigin: '80% 50%'
        };
      case 'face_middle':
        return {
          ...baseStyles,
          objectPosition: 'center center',
          transform: 'scale(1.6)'
        };
      case 'face_close':
        return {
          ...baseStyles,
          objectPosition: 'center center',
          transform: 'scale(2.0)'
        };
      default:
        return {
          ...baseStyles,
          objectPosition: 'center center',
          transform: 'scale(1.0)'
        };
    }
  };

  const handleReady = () => {
    setIsReady(true);
  };

  const handleProgress = (state: { playedSeconds: number }) => {
    onTimeUpdate(state.playedSeconds);
  };

  const handlePlay = () => {
    onPlay();
  };

  const handlePause = () => {
    onPause();
  };

  const handleEnded = () => {
    onEnded();
  };

  if (!videoUrl) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Video yüklenemedi</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
             <ReactPlayer
         ref={playerRef}
         url={videoUrl}
         width="100%"
         height="100%"
         playing={isPlaying}
         controls={false}
         muted={false}
         volume={volume}
         onReady={handleReady}
         onProgress={handleProgress}
         onPlay={handlePlay}
         onPause={handlePause}
         onEnded={handleEnded}
         style={getFrameStyles()}
         config={{
           file: {
             attributes: {
               style: getFrameStyles()
             }
           }
         }}
       />
      
      {/* Video üzerinde frame indicator */}
      {frame !== 'wide' && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm font-medium backdrop-blur-sm border border-white border-opacity-20">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="capitalize">{frame.replace('_', ' ')}</span>
          </div>
        </div>
      )}
      
      {/* Frame transition indicator */}
      {isTransitioning && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-50 animate-pulse"></div>
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm border border-white border-opacity-30">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
              <span>Odaklanıyor...</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Loading indicator */}
      {!isReady && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
});
