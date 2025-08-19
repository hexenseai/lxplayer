'use client';
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Overlay as OverlayType, OverlayComponentProps } from '@/lib/types';
import * as LucideIcons from 'lucide-react';

export function OverlayRoot({ children }: { children: React.ReactNode }) {
  return <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">{children}</div>;
}

export function OverlayComponent({ overlay, onAction, onButtonClick, isVisible, isInPositionContainer = false, isSticky = false }: OverlayComponentProps & { 
  isInPositionContainer?: boolean;
  onButtonClick?: (buttonData: any) => void;
  isSticky?: boolean;
}) {
  const [isActive, setIsActive] = useState(false);
  const [styleData, setStyleData] = useState<any>(null);

  useEffect(() => {
    if (isVisible) {
      setIsActive(true);
      // frame_set tipi için duration kontrolü yapma, sürekli aktif kal
      // pause_on_show ile sticky görünümde ise süreyi göz ardı et
      if (overlay.type !== 'frame_set' && overlay.duration && !isSticky) {
        const timer = setTimeout(() => {
          setIsActive(false);
        }, overlay.duration * 1000);
        return () => clearTimeout(timer);
      }
    } else {
      setIsActive(false);
    }
  }, [isVisible, overlay.duration, overlay.type, isSticky]);

  // Pause/resume callbacks for base player when pause_on_show is enabled
  useEffect(() => {
    if (!overlay.pause_on_show) return;
    if (isVisible) {
      onAction?.('pause_video_overlay', overlay.id);
    } else {
      onAction?.('resume_video_overlay', overlay.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  // Load style data when overlay changes
  useEffect(() => {
    const loadStyle = async () => {
      if (overlay.style_id) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/styles/${overlay.style_id}`);
          if (response.ok) {
            const style = await response.json();
            setStyleData(style);
          }
        } catch (error) {
          console.error('Error loading style:', error);
        }
      } else {
        setStyleData(null);
      }
    };

    loadStyle();
  }, [overlay.style_id]);

  // Pozisyon stilleri artık OverlayManager'da yönetiliyor
  const getPositionStyles = () => {
    // If overlay is fullscreen, ensure the child fills container
    if (overlay.position === 'fullscreen') {
      return { position: 'absolute', inset: 0, width: '100%', height: '100%' } as React.CSSProperties;
    }
    return {}; // Pozisyon container içinde olduğunda pozisyon stilleri gerekmez
  };

  const getAnimationProps = () => {
    const animations = {
      'fade_in': {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.5 }
      },
      'slide_in_left': {
        initial: { x: '-100%', opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: '-100%', opacity: 0 },
        transition: { duration: 0.5, ease: 'easeOut' }
      },
      'slide_in_right': {
        initial: { x: '100%', opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: '100%', opacity: 0 },
        transition: { duration: 0.5, ease: 'easeOut' }
      },
      'scale_in': {
        initial: { scale: 0, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0, opacity: 0 },
        transition: { duration: 0.5, ease: 'easeOut' }
      }
    };
    return animations[overlay.animation || 'fade_in'] || animations['fade_in'];
  };

  const getStyles = () => {
    // Use responsive, proportional units (em/%/vw) so overlays scale with player size
    const baseStyles: React.CSSProperties = {
      padding: '0.75em 1em',
      borderRadius: '0.75em',
      boxShadow: '0 0.5em 1.5em rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(0.75em)',
      border: '0.125em solid rgba(255, 255, 255, 0.2)',
      // Font size scales with viewport width but stays in a sensible range
      fontSize: 'min(1.6vw, 18px)',
      fontWeight: '600',
      textAlign: 'center',
      wordWrap: 'break-word',
      whiteSpace: 'pre-wrap',
      overflowWrap: 'anywhere',
      wordBreak: 'break-word',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      minWidth: '10em',
      width: 'max-content',
      maxWidth: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    };
    
    if (!styleData) return baseStyles;
    
    try {
      const customStyles = JSON.parse(styleData.style_json);
      
      // Opacity değerlerini CSS'e uygula
      const processedStyles = { ...customStyles };
      
      // Background color opacity
      if (customStyles.backgroundColor && customStyles.backgroundColorOpacity) {
        const opacity = parseInt(customStyles.backgroundColorOpacity) / 100;
        const color = customStyles.backgroundColor;
        processedStyles.backgroundColor = color.startsWith('rgba') 
          ? color.replace(/[\d.]+\)$/, `${opacity})`)
          : color.startsWith('rgb')
          ? color.replace('rgb', 'rgba').replace(')', `, ${opacity})`)
          : hexToRgba(color, opacity);
      }
      
      // Border color opacity
      if (customStyles.borderColor && customStyles.borderColorOpacity) {
        const opacity = parseInt(customStyles.borderColorOpacity) / 100;
        const color = customStyles.borderColor;
        processedStyles.borderColor = color.startsWith('rgba') 
          ? color.replace(/[\d.]+\)$/, `${opacity})`)
          : color.startsWith('rgb')
          ? color.replace('rgb', 'rgba').replace(')', `, ${opacity})`)
          : hexToRgba(color, opacity);
      }
      
      return { ...baseStyles, ...processedStyles };
    } catch (error) {
      console.error('Error parsing overlay style:', error);
      return baseStyles;
    }
  };

  const hexToRgba = (hex: string, opacity: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const handleClick = () => {
    if (overlay.type === 'button_message' || overlay.type === 'button_link') {
      // Button tıklamasını handle et
      if (onButtonClick) {
        onButtonClick({
          id: overlay.id,
          type: overlay.type,
          text: overlay.caption,
          content_id: overlay.content_id,
          style_id: overlay.style_id
        });
      }
      
      // Eski onAction'ı da çağır (geriye uyumluluk için)
      if (onAction) {
        onAction('button_click', {
          id: overlay.id,
          type: overlay.type,
          text: overlay.caption
        });
      }
    }
  };

  const renderOverlayContent = () => {
    // Icon bileşenini al
    const IconComponent = overlay.icon ? (LucideIcons as any)[overlay.icon] : null;
    const resolveAssetUri = (uri: string | undefined): string | undefined => {
      if (!uri) return undefined;
      if (/^(https?:)?\/\//i.test(uri) || /^data:/i.test(uri) || /^blob:/i.test(uri)) return uri;
      const cdn = process.env.NEXT_PUBLIC_CDN_URL || 'http://localhost:9000/lxplayer';
      // Use encodeURI to preserve path separators while encoding spaces and unsafe chars
      return encodeURI(`${cdn}/${uri}`);
    };

    const rewriteHtmlAssetUrls = (html: string): string => {
      const cdn = (process.env.NEXT_PUBLIC_CDN_URL || 'http://localhost:9000/lxplayer').replace(/\/$/, '');
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const cdnOrigin = cdn.split('/').slice(0, 3).join('/'); // http://host:port
      const cdnPathPrefix = cdn.replace(cdnOrigin, '').replace(/^\//, ''); // lxplayer
      return html.replace(/\s(src|href)=("|')([^"']+)(\2)/gi, (_m, attr, quote, url, endQuote) => {
        // data:, blob: bırak
        if (/^data:/i.test(url) || /^blob:/i.test(url)) {
          return ` ${attr}=${quote}${url}${endQuote}`;
        }
        // Absolute CDN URL ise redirect'e çevir
        if (/^https?:\/\//i.test(url)) {
          try {
            const u = new URL(url);
            const origin = `${u.protocol}//${u.host}`;
            if (origin === cdnOrigin) {
              // /lxplayer/objectpath...(optional query)
              let objectPath = u.pathname.replace(/^\//, '');
              if (cdnPathPrefix && objectPath.startsWith(cdnPathPrefix + '/')) {
                objectPath = objectPath.slice(cdnPathPrefix.length + 1);
              }
              // Decode once to turn %2F into '/'
              try { objectPath = decodeURIComponent(objectPath); } catch {}
              const redirect = `${api}/uploads/presign-get-object/${encodeURI(objectPath)}`;
              return ` ${attr}=${quote}${redirect}${endQuote}`;
            }
          } catch {}
          return ` ${attr}=${quote}${url}${endQuote}`;
        }
        // Relatif yol ise redirect'e çevir
        const redirect = `${api}/uploads/presign-get-object/${encodeURI(url)}`;
        return ` ${attr}=${quote}${redirect}${endQuote}`;
      });
    };

    const renderWithIcon = (content: React.ReactNode) => {
      if (!IconComponent) return content;
      
      return (
        <div className="flex items-center space-x-2">
          <IconComponent className="w-4 h-4 flex-shrink-0" />
          <span>{content}</span>
        </div>
      );
    };

    switch (overlay.type) {
      case 'label':
        return renderWithIcon(overlay.caption);
      
      case 'button_link': {
        const raw = overlay.caption || '';
        const [labelPart, urlPart] = raw.split('|');
        const label = (labelPart || '').trim();
        const url = (urlPart || '').trim();
        // If URL provided after '|', render as anchor opening in new tab
        if (url) {
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors cursor-pointer inline-flex items-center"
            >
              {renderWithIcon(label || url)}
            </a>
          );
        }
        // Fallback to button behavior if no URL provided
        return (
          <button
            onClick={handleClick}
            className="transition-colors cursor-pointer"
          >
            {renderWithIcon(label || raw)}
          </button>
        );
      }
      case 'button_content': {
        const label = (overlay.caption || 'Button Content').trim();
        return (
          <button
            onClick={() => {
              // Pause video and request fullscreen content display
              onAction?.('pause_video', overlay.id);
              onAction?.('show_fullscreen_content', overlay.id);
            }}
            className="transition-colors cursor-pointer"
          >
            {renderWithIcon(label || 'Button Content')}
          </button>
        );
      }
      case 'button_message':
        return (
          <button
            onClick={handleClick}
            className="transition-colors cursor-pointer"
          >
            {renderWithIcon(overlay.caption)}
          </button>
        );
      
      case 'content':
        if (overlay.content_asset) {
          const isFullscreenAuto = overlay.position === 'fullscreen';
          const isFullscreenCover = overlay.position === 'fullscreen_cover';
          const isFullscreenDark = overlay.position === 'fullscreen_dark';
          const isFullscreen = isFullscreenAuto || isFullscreenCover || isFullscreenDark;
          const src = resolveAssetUri(overlay.content_asset.uri);
          if (overlay.content_asset.kind === 'image') {
            return (
              <img
                src={src}
                alt={overlay.content_asset.title || ''}
                className={isFullscreenCover ? 'w-full h-full object-cover' : isFullscreen ? 'w-full h-full object-contain' : 'max-w-full h-auto'}
              />
            );
          } else if (overlay.content_asset.kind === 'video') {
            return (
              <video
                src={src}
                className={isFullscreenCover ? 'w-full h-full object-cover' : isFullscreen ? 'w-full h-full object-contain' : 'max-w-full h-auto'}
                controls={false}
                autoPlay
                playsInline
                preload="auto"
              />
            );
          } else if (overlay.content_asset.kind === 'doc' || overlay.content_asset.kind === 'html' || overlay.content_asset.kind === 'pdf') {
            return (
              overlay.content_asset.html_content ? (
                <div className={isFullscreen ? 'w-full h-full overflow-auto bg-white' : 'bg-white max-w-full'} style={isFullscreen ? {} : { width: '80vw', height: '60vh' }}>
                  <div dangerouslySetInnerHTML={{ __html: rewriteHtmlAssetUrls(overlay.content_asset.html_content || '') }} />
                </div>
              ) : (
                <iframe
                  src={src}
                  className={isFullscreen ? 'w-full h-full' : 'max-w-full'}
                  style={isFullscreen ? {} : { width: '80vw', height: '60vh' }}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              )
            );
          }
        }
        // İçerik yoksa ve caption varsa göster; başlığı kutuda gereksiz göstermemek için yoksa boş döndür.
        return overlay.caption ? renderWithIcon(overlay.caption) : null;
      
      default:
        return renderWithIcon(overlay.caption);
    }
  };

  // frame_set tipi için hiçbir şey render etme, sadece action'ı tetikle
  const frameFiredRef = useRef(false);
  useEffect(() => {
    if (overlay.type !== 'frame_set') return;
    if (isActive && !frameFiredRef.current) {
      frameFiredRef.current = true;
      onAction?.('frame_set', overlay.frame);
    }
    if (!isActive) {
      frameFiredRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, overlay.type, overlay.frame]);
  if (overlay.type === 'frame_set') {
    return null;
  }

  if (!isActive) return null;

  const contentStyles = getStyles();
  
  return (
    <AnimatePresence>
      <motion.div
        className={`${isInPositionContainer ? 'relative mb-2 pointer-events-auto' : 'absolute pointer-events-auto'} ${overlay.position?.startsWith('fullscreen') ? 'inset-0' : ''}`}
        style={
          isInPositionContainer
            ? ((overlay.position === 'fullscreen' || overlay.position === 'fullscreen_cover' || overlay.position === 'fullscreen_dark')
                ? { position: 'absolute', inset: 0, width: '100%', height: '100%', padding: 0, border: 'none', borderRadius: 0, boxShadow: 'none', backdropFilter: 'none', backgroundColor: 'transparent' }
                : { ...contentStyles, display: 'block', width: 'fit-content', maxWidth: '100%' })
            : { ...getPositionStyles(), ...contentStyles }
        }
        {...getAnimationProps()}
      >
        {(overlay.position === 'fullscreen_dark') && (
          <div className="absolute inset-0 bg-black/85 z-10" />
        )}
        {overlay.position === 'fullscreen_dark' ? (
          <div className="relative z-20 w-full h-full">
            {renderOverlayContent()}
          </div>
        ) : (
          renderOverlayContent()
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export function OverlayManager({ 
  overlays, 
  currentTime, 
  onAction,
  onButtonClick,
  isPaused,
  pausedOverlayId
}: { 
  overlays: OverlayType[]; 
  currentTime: number; 
  onAction?: (action: string, value?: any) => void;
  onButtonClick?: (buttonData: any) => void;
  isPaused?: boolean;
  pausedOverlayId?: string | null;
}) {
  const [activeOverlays, setActiveOverlays] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newActiveOverlays = new Set<string>();
    
    overlays.forEach(overlay => {
      if (overlay.type === 'frame_set') {
        // frame_set overlay'leri sürekli aktif kalır, sadece başlangıç zamanını kontrol et
        if (currentTime >= overlay.time_stamp) {
          newActiveOverlays.add(overlay.id);
          console.log('Frame set overlay activated:', overlay.frame, 'at time:', currentTime);
        }
      } else {
        // Diğer overlay'ler için normal zamanlama
        const startTime = overlay.time_stamp;
        const endTime = startTime + (overlay.duration || 3); // Varsayılan 3 saniye
        
        // If overlay pauses the video, keep it visible while paused by that overlay
        const sticky = overlay.pause_on_show && isPaused && pausedOverlayId === overlay.id;
        if ((currentTime >= startTime && currentTime <= endTime) || sticky) {
          newActiveOverlays.add(overlay.id);
        }
      }
    });
    
    setActiveOverlays(newActiveOverlays);
  }, [currentTime, overlays]);

  // Pozisyonları grupla
  const overlaysByPosition = overlays.reduce((acc, overlay) => {
    const position = overlay.position || 'bottom_middle';
    if (!acc[position]) {
      acc[position] = [];
    }
    acc[position].push(overlay);
    return acc;
  }, {} as Record<string, typeof overlays>);
  
  return (
    <OverlayRoot>
      {/* Pozisyon container'ları */}
      {Object.entries(overlaysByPosition).map(([position, positionOverlays]) => (
        <div
          key={position}
          className="absolute"
          style={{ ...getPositionStyles(position), display: 'flex', flexDirection: 'column', gap: '0.5em', alignItems: position.includes('left') ? 'flex-start' : position.includes('right') ? 'flex-end' : 'center' }}
        >
          {/* Bu pozisyondaki aktif overlay'ler - fullscreen tek overlay'i kaplasın */}
          {positionOverlays.map(overlay => {
            const isVisible = activeOverlays.has(overlay.id);
            const sticky = overlay.pause_on_show && isPaused && pausedOverlayId === overlay.id;
            return (
              <OverlayComponent
                key={overlay.id}
                overlay={overlay}
                isVisible={isVisible}
                isSticky={sticky}
                onAction={onAction}
                onButtonClick={onButtonClick}
                isInPositionContainer={true}
              />
            );
          })}
        </div>
      ))}
    </OverlayRoot>
  );
}

// Pozisyon stillerini döndüren yardımcı fonksiyon
function getPositionStyles(position: string): React.CSSProperties {
  const positions: Record<string, React.CSSProperties> = {
    'fullscreen': {
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%'
    },
    'fullscreen_cover': {
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%'
    },
    'fullscreen_dark': {
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%'
    },
    'left_half_content': {
      left: '5%',
      top: '50%',
      transform: 'translateY(-50%)',
      
    },
    'right_half_content': {
      right: '5%',
      top: '50%',
      transform: 'translateY(-50%)',
      
    },
    'left_content': {
      left: '5%',
      top: '50%',
      transform: 'translateY(-50%)',
      
    },
    'right_content': {
      right: '5%',
      top: '50%',
      transform: 'translateY(-50%)',
      
    },
    'buttom_left': {
      bottom: '10%',
      left: '5%',
      
    },
    'bottom_middle': {
      bottom: '10%',
      left: '50%',
      transform: 'translateX(-50%)',
      
    },
    'bottom_right': {
      bottom: '10%',
      right: '5%',
      
    },
    'bottom_face': {
      bottom: '10%',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '30%'
    },
    'top_left': {
      top: '10%',
      left: '5%',
      
    },
    'top_middle': {
      top: '10%',
      left: '50%',
      transform: 'translateX(-50%)',
      
    },
    'top_right': {
      top: '10%',
      right: '5%',
      
    },
    'center': {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      
    }
  };
  return positions[position] || positions['bottom_middle'];
}
