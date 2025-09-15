"use client";
import React, { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle, memo } from 'react';
import { VideoFrame } from './player/VideoFrame';
import { OverlayManager, OverlayComponent } from './player/Overlay';
import { api, type TrainingSection, type Overlay as OverlayT, type CompanyTraining } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Volume2, VolumeX, Send, Play, Pause } from 'lucide-react';
import { useInteractionTracking } from '@/hooks/useInteractionTracking';

interface InteractivePlayerProps {
  accessCode: string;
  userId?: string;
}

function buildVideoUrl(sectionNode: any | null): string | undefined {
  const sectionData = sectionNode?.data?.section ?? sectionNode;
  if (!sectionData || sectionData?.type === 'llm_task') {
    console.log('🎥 buildVideoUrl: No section data or LLM task type');
    return;
  }

  const cdn = (process.env.NEXT_PUBLIC_CDN_URL || 'http://yodea.hexense.ai:9000/lxplayer').replace(/\/+$/, '');
  const fromObj = (value?: string) => value ? (value.startsWith('http') ? value : `${cdn}/${encodeURIComponent(value)}`) : undefined;

  const videoObject = sectionData?.video_object as string | undefined;
  if (videoObject) {
    console.log('🎥 buildVideoUrl: Using video_object:', videoObject);
    return fromObj(videoObject);
  }

  const asset = sectionData?.asset as { kind?: string; uri?: string } | undefined;
  console.log('🎥 buildVideoUrl: Section asset:', asset);
  if (asset?.kind === 'video' && asset.uri) {
    console.log('🎥 buildVideoUrl: Using asset URI:', asset.uri);
    return fromObj(asset.uri);
  }

  console.log('🎥 buildVideoUrl: No video found in section');
  return;
}


// Memoized VideoFrame to prevent unnecessary re-renders
const MemoizedVideoFrame = memo(forwardRef<any, any>((props, ref) => {
  return <VideoFrame ref={ref} {...props} />;
}));

// Global WebSocket connection tracker to prevent multiple connections
let globalWebSocketConnection: WebSocket | null = null;

export const InteractivePlayer = forwardRef<any, InteractivePlayerProps>(({ accessCode, userId }, ref) => {
  const playerRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectTimerRef = useRef<any>(null);
  const wsDidOpenRef = useRef(false);
  const wsUnmountedRef = useRef(false);
  const wsHelloSentRef = useRef(false);
  const wsInitializedRef = useRef(false);
  const loadingRef = useRef<boolean>(false);
  const sectionsRef = useRef<any[]>([]);
  const currentSectionRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const videoEndedMessageSentRef = useRef<boolean>(false);
  const accessCodeRef = useRef<string>(accessCode || '');
  const userIdRef = useRef<string>(userId || '');
  
  // Update refs when props change
  accessCodeRef.current = accessCode || '';
  userIdRef.current = userId || '';
  
  // Helper function to update both state and ref
  const updateCurrentSection = (section: any) => {
    setCurrentSection(section);
    currentSectionRef.current = section;
  };
  
  // Session and interaction tracking
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [trainingId, setTrainingId] = useState<string | null>(null);
  const sessionCreateInFlightRef = useRef(false);

  const [companyTraining, setCompanyTraining] = useState<CompanyTraining | null>(null);
  const [trainingTitle, setTrainingTitle] = useState<string>('');
  const [sections, setSections] = useState<any[]>([]);
  const [trainingAvatar, setTrainingAvatar] = useState<any>(null);
  const [currentSection, setCurrentSection] = useState<any | null>(null);
  const [overlays, setOverlays] = useState<any[]>([]);
  const [trainingJson, setTrainingJson] = useState<any | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [currentFrame, setCurrentFrame] = useState<string>('wide');
  const [currentFrameConfig, setCurrentFrameConfig] = useState<any>(null);
  const [overlayPaused, setOverlayPaused] = useState<boolean>(false);
  const [pausedByOverlayId, setPausedByOverlayId] = useState<string | null>(null);
  const [modalContentOverlay, setModalContentOverlay] = useState<any | null>(null);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Array<{ type: 'user'|'ai'|'system'; content: string; ts: number }>>([]);
  const lastOverlayIdRef = useRef<string | null>(null);
  const [chatInput, setChatInput] = useState<string>('');
  const [liveMode, setLiveMode] = useState<boolean>(false);
  const [playerVolume, setPlayerVolume] = useState<number>(1);
  const isPlayingRef = useRef<boolean>(false);
  const videoEndedRef = useRef<boolean>(false);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const suppressNextPauseRef = useRef<boolean>(false);
  const [chatSuggestions, setChatSuggestions] = useState<string[]>([]);
  const [overlaySuggestions, setOverlaySuggestions] = useState<Array<{ overlay_id?: string; caption?: string; time_seconds?: number }>>([]);
  const [pendingNavigation, setPendingNavigation] = useState<any>(null);
  
  // Memoize overlays to prevent unnecessary re-renders
  const memoizedOverlays = useMemo(() => overlays as any, [overlays]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  
  // Interaction tracking hook
  const {
    trackVideoPlay,
    trackVideoPause,
    trackVideoSeek,
    trackSectionChange,
    trackOverlayClick,
    trackNavigation,
    trackTrainingStart,
    trackTrainingEnd,
    trackTrainingResume,
    trackUserMessage,
    trackAssistantMessage
  } = useInteractionTracking({
    sessionId: sessionId || '',
    userId: userId,
    trainingId: trainingId || '',
    currentSectionId: currentSection?.id,
    currentVideoTime: currentTime
  });
  
  // Create or get session for tracking
  const createSession = async (trainingId: string) => {
    if (sessionId || sessionCreateInFlightRef.current) return;
    sessionCreateInFlightRef.current = true;
    try {
      // Create session in backend
      const response = await api.createSession({
        user_id: userId || '',
        training_id: trainingId,
        company_id: 'default-company', // Default company for now
        status: 'active'
      });
      
      // Use backend-generated session ID
      const newSessionId = response.id;
      setSessionId(newSessionId);
      setTrainingId(trainingId);
      
      // Track training start
      trackTrainingStart();
      
      console.log('✅ Session created:', newSessionId);
    } catch (error) {
      console.error('❌ Failed to create session:', error);
    } finally {
      sessionCreateInFlightRef.current = false;
    }
  };

  const openChatWindow = () => {
    setChatOpen(true);
    if (isPlayingRef.current) {
      suppressNextPauseRef.current = true;
      setIsPlaying(false);
    }
  };

  const playAudio = (audioData: string) => {
    if (!audioEnabled) return;
    
    try {
      // Stop current audio if playing
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      
      // Create audio from base64
      console.log('🎤 Creating audio from base64, data length:', audioData.length);
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        console.log('🎤 Audio playback ended');
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
      };
      
      audio.onerror = (e) => {
        console.error('🎤 Audio playback failed:', e);
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
      };
      
      audio.onloadstart = () => {
        console.log('🎤 Audio loading started');
      };
      
      audio.oncanplay = () => {
        console.log('🎤 Audio can play');
      };
      
      setCurrentAudio(audio);
      audio.play().catch(err => {
        console.error('🎤 Audio play failed:', err);
        setCurrentAudio(null);
      });
      
      console.log('🎤 Playing TTS audio');
    } catch (error) {
      console.error('🎤 Audio creation failed:', error);
    }
  };
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Mikrofon kaynağını düzgün kapat
  const stopMic = () => {
    try {
      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== 'inactive') rec.stop();
    } catch {}
    mediaRecorderRef.current = null;
    try {
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    } catch {}
    mediaStreamRef.current = null;
  };

  const sendUserMessage = (text: string) => {
    const msg = (text || '').trim();
    if (!msg) return;
    
    // Check if this is a video ended response
    const isVideoEndedResponse = msg.toLowerCase().includes('devam et') || 
                                 msg.toLowerCase().includes('tekrar et') ||
                                 msg.toLowerCase().includes('sonraki');
    
    if (isVideoEndedResponse) {
      // Handle video ended responses specially
      if (msg.toLowerCase().includes('tekrar et')) {
        // Restart current video
        if (playerRef.current) {
          videoEndedRef.current = false; // Video ended flag'ini sıfırla
          playerRef.current.seekTo(0);
          setIsPlaying(true);
          setChatOpen(false);
        }
      } else if (msg.toLowerCase().includes('devam et') || msg.toLowerCase().includes('sonraki')) {
        // Continue to next section - let LLM handle this
        try { wsRef.current?.send(JSON.stringify({ type: 'user_message', content: msg })); } catch {}
      }
    } else {
      // Normal message handling
      try { wsRef.current?.send(JSON.stringify({ type: 'user_message', content: msg })); } catch {}
    }
    
    setChatMessages(m => [...m, { type: 'user', content: msg, ts: Date.now() }]);
    
    // Track user message (only if session ID is available)
    if (sessionId) {
      trackUserMessage(msg);
    }
    openChatWindow();
    setChatInput('');
  };

  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => playerRef.current?.seekTo(time),
    setFrame: (frame: string) => setCurrentFrame(frame)
  }));

  // Load training data IMMEDIATELY
  useEffect(() => {
    console.log('🔍 Training loading useEffect triggered with accessCode:', accessCode);
    console.log('🔍 useEffect is running!');
    
    // Prevent multiple loads in React Strict Mode
    if (sections.length > 0) {
      console.log('🔍 Sections already loaded, skipping...');
      return;
    }
    
    // Prevent multiple loads with ref
    if (loadingRef.current) {
      console.log('🔍 Already loading, skipping...');
      return;
    }
    loadingRef.current = true;
    
    const loadTrainingTitle = async () => {
      console.log('🔍 loadTrainingTitle called with accessCode:', accessCode);
      if (!accessCode) {
        console.log('❌ No accessCode provided, skipping training load');
        return;
      }
      
      // Always load training data (remove cache check for now)
      console.log('🔍 Starting training load process...');
      
      console.log('🔍 Loading training for access code:', accessCode);
      try {
        // Eğitim başlığını ve tüm sections'ları yükle
        console.log('📡 Calling api.listTrainings()...');
        const trainings = await api.listTrainings();
        console.log('📡 Received trainings:', trainings.length, trainings);
        const training = trainings.find(t => t.access_code === accessCode);
        console.log('🔍 Found training by access_code:', training);
        
        if (training) {
          console.log('✅ Found training:', training.title);
          setTrainingTitle(training.title);
          
          // Load all sections for this training
          const sectionsResponse = await api.listTrainingSections(training.id);
          if (sectionsResponse && Array.isArray(sectionsResponse)) {
            // Sort sections by order_index
            const sortedSections = sectionsResponse.sort((a, b) => a.order_index - b.order_index);
            console.log('📚 Loaded sections:', sortedSections.length, sortedSections);
            setSections(sortedSections);
            sectionsRef.current = sortedSections;
            console.log('📚 setSections called with:', sortedSections.length, 'sections');
            
            // Set first section as current if no current section
            if (sortedSections.length > 0) {
              updateCurrentSection(sortedSections[0]);
              console.log('📚 setCurrentSection called with:', sortedSections[0].title);
            }
            
            console.log('📚 Loaded sections:', sortedSections);
          }
        } else {
          // Fallback: CompanyTraining tablosundan ara
          console.log('🔍 Training not found in main table, checking company trainings...');
          console.log('📡 Calling api.listAllCompanyTrainings()...');
          const companyTrainings = await api.listAllCompanyTrainings();
          console.log('📡 Received company trainings:', companyTrainings.length, companyTrainings);
          const companyTraining = companyTrainings.find(ct => ct.access_code === accessCode);
          console.log('🔍 Found company training by access_code:', companyTraining);
          
          if (companyTraining) {
            console.log('✅ Found company training:', companyTraining);
            const trainingData = await api.getTraining(companyTraining.training_id);
            setTrainingTitle(trainingData.title);
            setCompanyTraining(companyTraining);
            setTrainingAvatar(trainingData.avatar || null);
            console.log('🎭 Training data:', trainingData);
            console.log('🎭 Training avatar loaded:', trainingData.avatar);
            console.log('🎭 Avatar image_url:', trainingData.avatar ? (trainingData.avatar as any).image_url : 'No avatar');
            console.log('🎭 Avatar voice_id:', trainingData.avatar ? (trainingData.avatar as any).elevenlabs_voice_id : 'No voice_id');
            
            // Test avatar if none exists
            if (!trainingData.avatar) {
              console.log('🎭 No avatar found, using test avatar');
              setTrainingAvatar({
                id: 'test',
                name: 'Test Avatar',
                personality: 'Test Kişilik',
                elevenlabs_voice_id: '21m00Tcm4TlvDq8ikWAM', // Real ElevenLabs voice ID
                image_url: null,
                is_default: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            }
            
            // Load sections for company training
            const sectionsResponse = await api.listTrainingSections(trainingData.id);
            if (sectionsResponse && Array.isArray(sectionsResponse)) {
              const sortedSections = sectionsResponse.sort((a, b) => a.order_index - b.order_index);
              console.log('📚 Loaded sections (company training):', sortedSections.length, sortedSections);
              setSections(sortedSections);
              sectionsRef.current = sortedSections;
              
              if (sortedSections.length > 0) {
                updateCurrentSection(sortedSections[0]);
              }
              
              console.log('📚 Loaded sections for company training:', sortedSections);
            }
          } else {
            console.error('Training not found for access code:', accessCode);
          }
        }
      } catch (error) {
        console.error('Error loading training title:', error);
      } finally {
        loadingRef.current = false;
      }
    };
    
    loadTrainingTitle();
  }, [accessCode]);



  // WebSocket URL utility
  const toWsUrl = (apiBase: string) => {
    if (!apiBase) return (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.host + '/chat/ws';
    // http(s) -> ws(s)
    const url = new URL(apiBase);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = (url.pathname.replace(/\/+$/, '')) + '/chat/ws';
    return url.toString();
  };

  // Open chat websocket connection - only once
  useEffect(() => {
    console.log('🔄 WebSocket useEffect triggered - Component mounted or remounted');
    
    // Global check to prevent multiple WebSocket connections across all instances
    if (globalWebSocketConnection && globalWebSocketConnection.readyState === WebSocket.OPEN) {
      console.log('🔄 Global WebSocket already connected, using existing connection...');
      wsRef.current = globalWebSocketConnection;
      return;
    }
    
    // Prevent multiple WebSocket connections
    if (wsInitializedRef.current) {
      console.log('🔄 WebSocket already initialized, skipping...');
      return;
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('🔄 WebSocket already connected, skipping...');
      return;
    }
    
    // Additional check: if we're in the middle of connecting, don't start another
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
      console.log('🔄 WebSocket already connecting, skipping...');
      return;
    }
    
    wsInitializedRef.current = true;
    
    let closedByUnmount = false;
    let reconnectTimer: any;

    const openSocket = () => {
      try {
        const wsUrl = toWsUrl(process.env.NEXT_PUBLIC_API_URL || '');
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        globalWebSocketConnection = ws; // Store globally
        wsDidOpenRef.current = false;
        ws.onopen = () => {
          if (closedByUnmount) return;
          console.log('✅ WebSocket connected successfully!');
          wsDidOpenRef.current = true;
          const ctx = { accessCode: accessCodeRef.current, userId: userIdRef.current };
          console.log('🚀 Sending init message with context:', ctx);
          ws.send(JSON.stringify({ type: 'init', context: ctx }));
          if (!wsHelloSentRef.current) {
            ws.send(JSON.stringify({ type: 'user_message', content: 'Merhaba!' }));
            wsHelloSentRef.current = true;
            openChatWindow();
          }
        };
        ws.onmessage = (ev) => {
          if (wsUnmountedRef.current) return;
          try {
            const data = JSON.parse(ev.data);
            if (data.type === 'test') {
              console.log('🧪 WebSocket test message received:', data.message);
            }
            if (data.type === 'initialized') {
              // LLM initialized with training context
              console.log('🤖 LLM initialized with training context:', data.context);
              
              // Create session for interaction tracking
              if (data.context?.training_json?.training?.id) {
                createSession(data.context.training_json.training.id);
              }
              
              if (!wsHelloSentRef.current) {
                try {
                  ws.send(JSON.stringify({ type: 'user_message', content: 'Merhaba!' }));
                  wsHelloSentRef.current = true;
                  openChatWindow();
                } catch {}
              }
            }
            if (data.type === 'session_started' && !wsHelloSentRef.current) {
              try {
                ws.send(JSON.stringify({ type: 'user_message', content: 'Merhaba!' }));
                wsHelloSentRef.current = true;
                openChatWindow();
              } catch {}
            }
            if (data.type === 'section_updated') {
              console.log('🔄 Section update acknowledgment:', data.message);
            }
            if (data.type === 'sections_loaded_ack') {
              console.log('📚 Sections loaded acknowledgment:', data.message);
            }
            if (data.type === 'assistant_message') {
              console.log('[chat] assistant raw:', data.content);
              openChatWindow();
              let assistantMessage = '';
              
              // Backend sends content as an object, extract message field
              if (typeof data.content === 'object' && data.content) {
                assistantMessage = String(data.content.message || '');
              } else if (typeof data.content === 'string') {
                // Fallback for string content
                assistantMessage = data.content;
              }
              
              // Only add to chat if we have a meaningful message
              if (assistantMessage && assistantMessage.trim()) {
                console.log('[chat] extracted message:', assistantMessage);
                setChatMessages(m => [...m, { type: 'ai', content: assistantMessage, ts: Date.now() }]);
                
                // Check if this is a video ended message
                const isVideoEndedMessage = data.content?.is_video_ended === true || data.type === 'video_ended';
                console.log("🎬 isVideoEndedMessage:", isVideoEndedMessage, "content:", data.content, "type:", data.type);
                
                // Check if this is a response to an LLM interaction
                const hasLLMInteractionWaiting = chatMessages.some(msg => 
                  msg.type === 'system' && msg.content === 'LLM_INTERACTION_WAITING'
                );
                
                // If this is an LLM interaction response, resume video after a short delay
                if (hasLLMInteractionWaiting && !isVideoEndedMessage) {
                  // Remove the system message
                  setChatMessages(m => m.filter(msg => !(msg.type === 'system' && msg.content === 'LLM_INTERACTION_WAITING')));
                  
                  // Resume video after LLM responds
                  setTimeout(() => {
                    setIsPlaying(true);
                    setOverlayPaused(false);
                    setPausedByOverlayId(null);
                    setChatOpen(false);
                  }, 3000); // 3 saniye bekle, LLM cevabını görebilsin
                }
                
                // If this is a video ended message, keep chat open and don't resume video
                if (isVideoEndedMessage) {
                  setChatOpen(true);
                  // Don't resume video - user needs to choose next action
                  
                  // Handle video ended actions
                  if (data.content?.action === 'restart_video') {
                    // Restart current video
                    setTimeout(() => {
                      if (playerRef.current) {
                        playerRef.current.seekTo(0);
                        setIsPlaying(true);
                        setChatOpen(false);
                      }
                    }, 2000);
                  } else if (data.content?.action === 'navigate_next') {
                    // Navigate to next section
                    console.log("➡️ Navigating to next section");
                    safeNavigateNext();
                  }
                }
                
                // Track assistant message (only if session ID is available)
                if (sessionId) {
                  trackAssistantMessage(assistantMessage, {
                    llm_model: 'gpt-4o',
                    audio_data: data.audio_data,
                    has_audio: !!data.audio_data
                  });
                }
              }
              
              // Handle audio data
              if (data.audio_data && audioEnabled) {
                console.log('🎤 Received audio data, length:', data.audio_data.length, 'playing...');
                playAudio(data.audio_data);
              } else if (data.audio_data && !audioEnabled) {
                console.log('🎤 Audio data received but audio is disabled');
              } else {
                console.log('🎤 No audio data in response');
              }
              
              // Handle structured actions from LLM
              try {
                const actions = data.actions || [];
                const suggestions = data.suggestions || [];
                
                console.log('🎬 LLM Actions:', actions);
                console.log('💡 LLM Suggestions:', suggestions);
                console.log(
              '🔍 Current sections state (ref):',
              sectionsRef.current.length,
              sectionsRef.current.map(s => ({ id: s.id, title: s.title }))
            );
                
                // Process each action
                for (const action of actions) {
                  switch (action.type) {
                    case 'navigate_to_section':
                      console.log('🔍 Available sections:', sectionsRef.current.map(s => ({ id: s.id, title: s.title })));
                      console.log('🎯 Looking for section ID:', action.section_id);
                      console.log('🔍 Sections array length:', sectionsRef.current.length);
                      
                      if (sectionsRef.current.length === 0) {
                        console.warn('⚠️ Sections not loaded yet, cannot navigate. Will retry when sections are available...');
                        // Store the pending navigation action
                        const pendingNavigation = {
                          sectionId: action.section_id,
                          reason: action.reason,
                          timestamp: Date.now()
                        };
                        console.log('📝 Storing pending navigation:', pendingNavigation);
                        setPendingNavigation(pendingNavigation);
                        break;
                      }
                      
                      const targetSection = sectionsRef.current.find(s => s.id === action.section_id);
                    if (targetSection) {
                        console.log('🎯 LLM navigating to section:', targetSection.title, 'Reason:', action.reason);
                      updateCurrentSection(targetSection);
                      // Track section change
                      trackSectionChange(targetSection.id, targetSection.title);
                      trackNavigation('navigate_to_section', targetSection.id, action.reason);
                      } else {
                        console.warn('⚠️ LLM tried to navigate to unknown section:', action.section_id);
                        console.warn('⚠️ Available section IDs:', sectionsRef.current.map(s => s.id));
                        
                        // Try to find by title as fallback
                        const titleMatch = sectionsRef.current.find(s => s.title.toLowerCase().includes(action.section_id.toLowerCase()));
                        if (titleMatch) {
                          console.log('🎯 Found section by title match:', titleMatch.title);
                          updateCurrentSection(titleMatch);
                          // Track section change
                          trackSectionChange(titleMatch.id, titleMatch.title);
                          trackNavigation('navigate_to_section', titleMatch.id, action.reason);
                        }
                      }
                      break;
                      
                    case 'navigate_next':
                      console.log('➡️ LLM navigating to next section. Reason:', action.reason);
                      safeNavigateNext(action.reason);
                      break;
                      
                    case 'navigate_previous': {
                      console.log('⬅️ LLM navigating to previous section. Reason:', action.reason);
                      const list = sectionsRef.current;
                      const curId = currentSectionRef.current?.id;
                      if (list.length > 0 && curId) {
                        const idx = list.findIndex(s => s.id === curId);
                        if (idx > 0) {
                          const prev = list[idx - 1];
                          console.log('⬅️ Previous section found:', prev.title);
                          updateCurrentSection(prev);
                          trackSectionChange(prev.id, prev.title);
                          trackNavigation('navigate_previous', prev.id, action.reason);
                        } else {
                          console.warn('⚠️ No previous section available');
                        }
                      } else {
                        console.warn('⚠️ Sections not loaded yet for previous navigation. Storing as pending...');
                        setPendingNavigation({ type: 'previous', reason: action.reason, timestamp: Date.now() });
                      }
                      break;
                    }
                      
                    case 'show_overlay':
                      console.log('📺 LLM showing overlay:', action.overlay_id, 'at time:', action.time);
                      // Find and show the overlay
                      const overlay = overlaysRef.current.find(o => o.id === action.overlay_id);
                      if (overlay) {
                        setCurrentTime(action.time || overlay.time_stamp);
                        // Trigger overlay display logic here
                        console.log('📺 Overlay found and will be shown:', overlay);
                      }
                      break;
                      
                    case 'pause_video':
                      console.log('⏸️ LLM pausing video. Reason:', action.reason);
                      setIsPlaying(false);
                      break;
                      
                    case 'resume_video':
                      console.log('▶️ LLM resuming video. Reason:', action.reason);
                      // Don't resume if video has ended
                      if (!videoEndedRef.current) {
                        setIsPlaying(true);
                      } else {
                        console.log('🎬 Video ended, ignoring resume action');
                      }
                      break;
                      
                    default:
                      console.log('❓ Unknown LLM action type:', action.type);
                  }
                }
                
                // Process suggestions (could be used for UI hints)
                if (suggestions.length > 0) {
                  console.log('💡 LLM suggestions available:', suggestions);
                  // Store suggestions for UI display
                  const suggestionTexts = suggestions.map((s: any) => s.text || s).filter(Boolean);
                  if (suggestionTexts.length > 0) {
                    setChatSuggestions(suggestionTexts);
                  }
                }
              } catch (error) {
                console.error('Error processing section navigation:', error);
              }
              
              // Optional TTS when live mode is on
              try {
                if (liveMode) {
                  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
                  fetch(`${apiBase}/chat/tts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: assistantMessage })
                  }).then(r => r.ok ? r.json() : null).then(j => {
                    if (j && j.audio) {
                      const audio = new Audio(`data:audio/mp3;base64,${j.audio}`);
                      audio.play().catch(() => {});
                    }
                  }).catch(() => {});
                }
              } catch {}
            }
          } catch {}
        };
        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          console.error('❌ WebSocket URL attempted:', wsUrl);
          console.error('❌ WebSocket state:', ws.readyState);
          // no-op; reconnect handled on close
        };
        ws.onclose = () => {
          wsRef.current = null;
          if (!closedByUnmount) {
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(openSocket, wsDidOpenRef.current ? 1500 : 400);
          }
        };
      } catch {}
    };
    wsUnmountedRef.current = false;
    openSocket();
    
    return () => {
      stopMic();
      closedByUnmount = true;
      wsUnmountedRef.current = true;
      wsHelloSentRef.current = false;
      wsInitializedRef.current = false; // Reset initialization flag
      clearTimeout(reconnectTimer);
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws) {
        ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null as any;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          try { ws.close(); } catch {}
        }
      }
    };
  }, []); // Only run once on mount

  // Sync initial volume to player once ref is ready
  useEffect(() => {
    try { playerRef.current?.setVolume?.(playerVolume); } catch {}
  }, [playerRef]);

  // When section changes, update overlays from training_json
  useEffect(() => {
    if (!currentSection) return;
    
    const loadSectionOverlays = async () => {
      try {
        // Training ID'yi belirle (yeni sistem veya eski sistem)
        let trainingId: string;
        if (companyTraining) {
          // Eski sistem: CompanyTraining'den al
          trainingId = companyTraining.training_id;
        } else {
          // Yeni sistem: Training tablosundan access_code ile bulunan training'den al
          const trainings = await api.listTrainings();
          const training = trainings.find(t => t.access_code === accessCode);
          if (!training) return;
          trainingId = training.id;
        }
        
        // Yeni bölümün overlay'lerini yükle
        const overlays = await api.listSectionOverlays(trainingId, currentSection.id);
        setOverlays(overlays);
        overlaysRef.current = overlays;
        
        // Auto-populate overlay suggestions from current section overlays
        const meaningfulOverlays = overlays.filter((ov: any) => 
          (ov.caption && ov.caption.trim()) || 
          (ov.content_asset && ov.content_asset.title)
        ).map((ov: any) => ({
          overlay_id: ov.id,
          caption: ov.caption || ov.content_asset?.title || 'İçerik',
          time_seconds: ov.time_stamp
        }));
        setOverlaySuggestions(meaningfulOverlays);
      } catch (e) {
        console.error('Overlay update error:', e);
      }
    };
    
    loadSectionOverlays();
    setCurrentTime(0);
    setDuration(undefined); // Yeni section'da duration'ı sıfırla
    setCurrentFrame('wide');
    setOverlayPaused(false);
    setPausedByOverlayId(null);
    setModalContentOverlay(null);
    console.log('🔄 Current section changed:', currentSection);
    
    // Notify LLM about section change (only if sections are loaded)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && sections.length > 0) {
      const sectionChangeMessage = {
        type: 'section_change',
        context: {
          currentSection: {
            id: currentSection.id,
            title: currentSection.title,
            description: currentSection.description,
            type: currentSection.type,
            order_index: currentSection.order_index
          },
          trainingId: companyTraining?.training_id,
          availableSections: sections.map(s => ({ id: s.id, title: s.title, type: s.type, order_index: s.order_index }))
        }
      };
      console.log('📢 Notifying LLM about section change:', sectionChangeMessage);
      wsRef.current.send(JSON.stringify(sectionChangeMessage));
    } else if (sections.length === 0) {
      console.log('⏳ Sections not loaded yet, skipping LLM notification');
    }
  }, [currentSection, companyTraining, sections]);

  // Notify LLM when sections are first loaded
  useEffect(() => {
    if (sections.length > 0 && currentSection && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('📚 Sections loaded, sending initial section info to LLM');
      const initialSectionMessage = {
        type: 'sections_loaded',
        context: {
          currentSection: {
            id: currentSection.id,
            title: currentSection.title,
            description: currentSection.description,
            type: currentSection.type,
            order_index: currentSection.order_index
          },
          trainingId: companyTraining?.training_id,
          availableSections: sections.map(s => ({ id: s.id, title: s.title, type: s.type, order_index: s.order_index }))
        }
      };
      console.log('📚 Initial sections info:', initialSectionMessage);
      wsRef.current.send(JSON.stringify(initialSectionMessage));
    }
  }, [sections.length]); // Only run when sections are first loaded

  // Process pending navigation when sections are loaded
  useEffect(() => {
    if (pendingNavigation && sectionsRef.current.length > 0) {
      console.log('🎯 Processing pending navigation:', pendingNavigation);
      
      let targetSection = null;
      
      if (pendingNavigation.sectionId) {
        // Direct section navigation
        targetSection = sectionsRef.current.find(s => s.id === pendingNavigation.sectionId);
        if (targetSection) {
          console.log('🎯 Pending navigation successful - navigating to section:', targetSection.title, 'Reason:', pendingNavigation.reason);
        } else {
          console.warn('⚠️ Pending navigation failed - section not found:', pendingNavigation.sectionId);
          console.warn('⚠️ Available section IDs:', sections.map(s => s.id));
        }
      } else if (pendingNavigation.type === 'next') {
        // Next section navigation
        const currentIndex = sectionsRef.current.findIndex(s => s.id === currentSectionRef.current?.id);
        if (currentIndex >= 0 && currentIndex < sectionsRef.current.length - 1) {
          targetSection = sectionsRef.current[currentIndex + 1];
          console.log('🎯 Pending next navigation successful - navigating to section:', targetSection.title, 'Reason:', pendingNavigation.reason);
        } else {
          console.warn('⚠️ Pending next navigation failed - no next section available');
        }
      } else if (pendingNavigation.type === 'previous') {
        // Previous section navigation
        const currentIndex = sectionsRef.current.findIndex(s => s.id === currentSectionRef.current?.id);
        if (currentIndex > 0) {
          targetSection = sectionsRef.current[currentIndex - 1];
          console.log('🎯 Pending previous navigation successful - navigating to section:', targetSection.title, 'Reason:', pendingNavigation.reason);
        } else {
          console.warn('⚠️ Pending previous navigation failed - no previous section available');
        }
      }
      
      if (targetSection) {
        updateCurrentSection(targetSection);
      }
      setPendingNavigation(null); // Clear pending navigation
    }
  }, [pendingNavigation]);

  const videoUrl = useMemo(() => {
    const url = buildVideoUrl(currentSection);
    console.log('🎥 Video URL built:', { currentSection, videoUrl: url });
    return url;
  }, [currentSection]);

  // Auto-open chat for LLM task sections
  useEffect(() => {
    if (currentSection && (currentSection.type === 'llm_task' || !videoUrl)) {
      setChatOpen(true);
    }
  }, [currentSection, videoUrl]);

  // Video ended helper
  const setVideoEnded = (ended: boolean) => {
    videoEndedRef.current = ended;
    if (ended) {
      isPlayingRef.current = false;
    }
  };

  // Güvenli navigate next
  const safeNavigateNext = (reason?: string) => {
    if (videoEndedRef.current) return;
    const idx = sectionsRef.current.findIndex(s => s.id === currentSectionRef.current?.id);
    if (idx >= 0 && idx < sectionsRef.current.length - 1) {
      const next = sectionsRef.current[idx + 1];
      updateCurrentSection(next);
      trackSectionChange(next.id, next.title);
      trackNavigation('navigate_next', next.id, reason);
    }
  };

  const handleTimeUpdate = (t: number) => {
    setCurrentTime(t);
    
    // Video bitimine 0.5 saniye kala flag'i set et (onPause'dan önce)
    if (duration && t >= Math.max(0, duration - 0.5) && !videoEndedRef.current) {
      console.log("🎬 Video ending soon, setting ended flag early");
      setVideoEnded(true);
    }
  };

  const handleDurationChange = (d: number) => {
    setDuration(d);
  };

  const handleSeek = (value: number) => {
    setCurrentTime(value);
    playerRef.current?.seekTo(value);
  };

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Auto-scroll chat to the latest message when messages change or window opens
  useEffect(() => {
    if (!chatOpen) return;
    try {
      const el = messagesScrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }, [chatMessages, chatOpen]);

  if (!currentSection) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <div className="text-white text-lg">Oynatıcı yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">

        <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
          {/* Training Title Overlay - Show when chat is open */}
          {chatOpen && (
            <div className="absolute top-3 left-3 z-30 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
              <div className="text-sm font-semibold">{trainingTitle || 'Eğitim'}</div>
              <div className="text-xs text-gray-300">Bölüm {sections.findIndex(s => s.id === currentSection?.id) + 1}/{sections.length} · {currentSection?.title || ''}</div>
            </div>
          )}
          
          {/* Video bölümü */}
          <MemoizedVideoFrame
              ref={playerRef}
              videoUrl={videoUrl}
              currentTime={currentTime}
              isPlaying={isPlaying}
              frame={currentFrame}
              frameConfig={currentFrameConfig}
              onTimeUpdate={handleTimeUpdate}
              onDurationChange={handleDurationChange}
              onPlay={() => {
                if (videoEndedRef.current) {
                  // bitti bayrağı açıkken tekrar oynatma yok
                  setIsPlaying(false);
                  playerRef.current?.pauseVideo?.();
                  return;
                }
                setIsPlaying(true);
                videoEndedMessageSentRef.current = false;
                setChatOpen(false);
                trackVideoPlay();
              }}
              onPause={() => {
                if (videoEndedRef.current) return; // bitti ise tamamen bastır
                setIsPlaying(false);
                trackVideoPause();
                if (suppressNextPauseRef.current) {
                  suppressNextPauseRef.current = false;
                  return;
                }
                try {
                  wsRef.current?.send(JSON.stringify({
                    type: 'user_message',
                    content: `Kullanıcı videoyu durdurdu. Bölüm: ${currentSectionRef.current?.title ?? ''}. Zaman: ${Math.floor(currentTime)}s. Son overlay: ${lastOverlayIdRef.current ?? 'yok'}.`
                  }));
                } catch {}
                openChatWindow();
              }}
            onEnded={() => {
              setVideoEnded(true);
              if (!videoEndedMessageSentRef.current) {
                try {
                  wsRef.current?.send(JSON.stringify({
                    type: 'video_ended',
                    content: `Video bitti. Bölüm: ${currentSectionRef.current?.title ?? ''}.`,
                    section_id: currentSectionRef.current?.id
                  }));
                } catch {}
                videoEndedMessageSentRef.current = true;
              }
              openChatWindow();
            }}
          />

          {/* Session Loading Overlay */}
          {!sessionId && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3"></div>
                <div className="text-white">Oturum başlatılıyor...</div>
              </div>
            </div>
          )}

        {/* Overlays */}
          <div className="absolute inset-0 pointer-events-none">
            <OverlayManager
              overlays={memoizedOverlays}
              currentTime={currentTime}
              isPaused={!isPlaying}
              pausedOverlayId={pausedByOverlayId}
              onAction={async (action, value) => {
                // Track overlay interactions
                if (value && typeof value === 'string') {
                  const overlay = overlays.find(ov => ov.id === value);
                  if (overlay) {
                    trackOverlayClick(overlay.id, overlay.type, overlay.caption);
                  }
                }
                
                if (action === 'frame_set' && value) {
                  setCurrentFrame(value);
                  
                  // If it's a custom frame, load the frame configuration
                  if (value === 'custom') {
                    // Find the overlay that triggered this frame change
                    const frameOverlay = overlays.find(ov => 
                      ov.type === 'frame_set' && 
                      ov.frame === 'custom' && 
                      currentTime >= ov.time_stamp
                    );
                    
                    if (frameOverlay?.frame_config_id) {
                      try {
                        const frameConfig = await api.getFrameConfig(frameOverlay.frame_config_id);
                        setCurrentFrameConfig(frameConfig);
                      } catch (error) {
                        console.error('Error loading frame config:', error);
                        setCurrentFrameConfig(null);
                      }
                    }
                  } else {
                    setCurrentFrameConfig(null);
                  }
                }
                if (action === 'pause_video' || action === 'pause_video_overlay') {
                  // Overlay kaynaklı duraklatma: onPause içinde LLM'e mesaj göndermeyi bastır
                  suppressNextPauseRef.current = true;
                  setIsPlaying(false);
                  setOverlayPaused(true);
                  if (value) setPausedByOverlayId(String(value));
                }
                if (action === 'resume_video' || action === 'resume_video_overlay') {
                  if (value && pausedByOverlayId && String(value) !== pausedByOverlayId) return;
                  // Don't resume if video has ended
                  if (!videoEndedRef.current) {
                    setOverlayPaused(false);
                    setPausedByOverlayId(null);
                    setModalContentOverlay(null);
                    setIsPlaying(true);
                  } else {
                    console.log('🎬 Video ended, ignoring overlay resume action');
                  }
                  // Video tekrar oynarken chat penceresini gizle (sadece video ended değilse)
                  if (!videoEndedRef.current) {
                    setChatOpen(false);
                  }
                }
                if (action === 'show_fullscreen_content' && value) {
                  const ov = overlays.find(o => o.id === value);
                  if (ov) {
                    const fullscreenOverlay: any = {
                      ...(ov as any),
                      type: 'content',
                      position: (ov as any).position && (ov as any).position.startsWith('fullscreen') ? (ov as any).position : 'fullscreen_dark'
                    };
                    setModalContentOverlay(fullscreenOverlay);
                  }
                }
                if (action === 'overlay_visible' && value) {
                  lastOverlayIdRef.current = String(value);
                }
                if (action === 'open_chat_with_message' && value) {
                  // Open chat and send LLM message
                  setChatOpen(true);
                  const { message, isLLMInteraction } = value;
                  if (message) {
                    // Add LLM message to chat
                    setChatMessages(m => [...m, { type: 'ai', content: message, ts: Date.now() }]);
                    
                    // If this is an LLM interaction, mark it as waiting for user response
                    if (isLLMInteraction) {
                      // Store the LLM interaction context for later use
                      setChatMessages(m => [...m, { 
                        type: 'system', 
                        content: 'LLM_INTERACTION_WAITING', 
                        ts: Date.now() 
                      }]);
                      
                      // Send context to LLM that this is an overlay-triggered interaction
                      try { 
                        wsRef.current?.send(JSON.stringify({ 
                          type: 'system_message', 
                          content: 'OVERLAY_INTERACTION: This is an overlay-triggered LLM interaction. The user should respond to the question, and then the video should continue playing. Do NOT suggest moving to the next section unless the user explicitly asks for it.',
                          ts: Date.now()
                        })); 
                      } catch {}
                    }
                    
                    // Scroll to bottom
                    setTimeout(() => {
                      if (messagesScrollRef.current) {
                        messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
                      }
                    }, 100);
                  }
                }
              }}
            />
          </div>

          {modalContentOverlay && (
            <div className="absolute inset-0 pointer-events-none">
              <OverlayComponent
                overlay={modalContentOverlay as any}
                isVisible={true}
                isInPositionContainer={true}
                isSticky={true}
              />
            </div>
          )}

          {/* Resume button */}
          {overlayPaused && (
            <button
              onClick={() => { setIsPlaying(true); setOverlayPaused(false); setPausedByOverlayId(null); setModalContentOverlay(null); }}
              className="absolute bottom-3 right-3 z-50 px-3 py-1.5 text-sm bg-white/90 text-black rounded shadow pointer-events-auto"
            >
              ▶ Devam Et
            </button>
          )}

          {/* Chat window */}
          <AnimatePresence>
            {chatOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-16 right-3 left-3 z-40 max-h-[70%] overflow-hidden bg-gray-900/95 border border-gray-700 rounded-lg shadow-lg pointer-events-auto flex flex-col min-h-0"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 w-full">
                  <div className="flex items-center gap-3">
                    {/* Avatar - Always show for testing */}
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center overflow-hidden shadow-lg">
                          {trainingAvatar?.image_url ? (
                            <img 
                              src={trainingAvatar.image_url} 
                              alt={trainingAvatar.name || 'AI Asistan'}
                              className="w-full h-full object-cover"
                              onLoad={() => console.log('🎭 Chat avatar image loaded successfully')}
                              onError={(e) => {
                                console.log('🎭 Chat avatar image failed to load, using fallback');
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className={`w-full h-full flex items-center justify-center ${trainingAvatar?.image_url ? 'hidden' : 'flex'}`}
                            style={{ display: trainingAvatar?.image_url ? 'none' : 'flex' }}
                          >
                            {trainingAvatar?.name ? (
                              <div className="text-sm font-bold text-white">
                                {trainingAvatar.name.charAt(0).toUpperCase()}
                              </div>
                            ) : (
                              <div className="text-lg">🤖</div>
                            )}
                          </div>
                        </div>
                        <div className="text-white text-sm font-medium">{trainingAvatar?.name || 'AI Asistan'}</div>
                      </div>
                    
                  <div className="flex items-center gap-2">
                    <div className="text-white text-sm font-medium">Sohbet</div>
                    <div className={`flex items-center gap-1 ${liveMode ? 'text-emerald-400' : 'text-gray-500'}`}>
                      <span className={`w-2 h-2 rounded-full ${liveMode ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`}></span>
                      <span className="text-[11px]">{liveMode ? 'Canlı' : 'Pasif'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* STT - Speech to Text (User speaks) */}
                    <button
                      onClick={async () => {
                        const next = !liveMode;
                        setLiveMode(next);
                        if (next) {
                          // Start mic capture
                          try {
                            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                            mediaStreamRef.current = stream; // YENİ ref
                            const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                            mediaRecorderRef.current = rec;
                            audioChunksRef.current = [];
                            rec.ondataavailable = (e) => {
                              if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
                            };
                            rec.onstop = async () => {
                              try {
                                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                                audioChunksRef.current = [];
                                // Send to STT
                                const form = new FormData();
                                form.append('audio_file', blob, 'audio.webm');
                                const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
                                const token = localStorage.getItem('token');
                                const headers: HeadersInit = {};
                                if (token) {
                                  headers['Authorization'] = `Bearer ${token}`;
                                }
                                
                                const resp = await fetch(`${apiBase}/chat/stt`, { 
                                  method: 'POST', 
                                  body: form,
                                  headers
                                });
                                if (resp.ok) {
                                  const data = await resp.json();
                                  const text = (data && data.text) || '';
                                  if (text) {
                                    // Send transcript to LLM
                                    try { wsRef.current?.send(JSON.stringify({ type: 'user_message', content: text })); } catch {}
                                    setChatMessages(m => [...m, { type: 'user', content: text, ts: Date.now() }]);
                                    openChatWindow();
                                  }
                                }
                              } catch {}
                            };
                            rec.start(2000); // gather chunks every 2s
                            openChatWindow();
                          } catch (err) {
                            console.error('Mic error', err);
                            setLiveMode(false);
                            stopMic();
                          }
                        } else {
                          setLiveMode(false);
                          stopMic();
                        }
                      }}
                      className={`px-2 py-1.5 rounded text-sm flex items-center gap-1 ${liveMode ? 'bg-emerald-600 text-white' : 'bg-gray-700/40 text-gray-300 hover:text-white'}`}
                      title={liveMode ? 'Mikrofon açık - konuşabilirsiniz' : 'Mikrofon kapalı - yazı ile iletişim'}
                    >
                      <Radio size={16} />
                      <span>{liveMode ? 'Mikrofon' : 'Yazı'}</span>
                    </button>
                    
                    {/* TTS - Text to Speech (AI speaks) */}
                    <button
                      onClick={() => {
                        setAudioEnabled(!audioEnabled);
                        if (currentAudio) {
                          currentAudio.pause();
                          setCurrentAudio(null);
                        }
                      }}
                      className={`px-2 py-1.5 rounded text-sm flex items-center gap-1 ${audioEnabled ? 'bg-blue-600 text-white' : 'bg-gray-700/40 text-gray-300 hover:text-white'}`}
                      title={audioEnabled ? 'AI sesli cevap veriyor' : 'AI sadece yazılı cevap veriyor'}
                    >
                      <Volume2 size={16} />
                      <span>{audioEnabled ? 'AI Ses' : 'AI Yazı'}</span>
                    </button>
                    {currentSection?.type !== 'llm_task' && (
                      <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white text-sm">Kapat</button>
                    )}
                  </div>
                </div>
                
                {/* Main Content - Two Column Layout */}
                <div className="flex flex-1 overflow-hidden min-h-0">
                  {/* Left Column - Chat Messages */}
                  <div className="flex-1 flex flex-col min-h-0 border-r border-gray-700">
                    <div ref={messagesScrollRef} className="flex-1 overflow-y-auto p-2 space-y-2">
                      {chatMessages.filter(m => m.type !== 'system').map((m, i) => {
                        return (
                          <div key={i} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`${m.type === 'user' ? 'bg-purple-600' : 'bg-gray-700'} text-white text-sm px-3 py-2 rounded-lg max-w-[75%] whitespace-pre-wrap`}>{m.content}</div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="p-2 border-t border-gray-700 flex items-center gap-2 bg-gray-900/95">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendUserMessage(chatInput);
                          }
                        }}
                        placeholder="Mesaj yazın..."
                        className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-purple-500 outline-none text-sm"
                      />
                      <button
                        onClick={() => sendUserMessage(chatInput)}
                        className="px-2 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                        title="Gönder"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Right Column - Suggestions and Overlays */}
                  <div className="w-80 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto p-2 space-y-3">
                      {/* Chat Suggestions */}
                      {chatSuggestions.length > 0 && (
                        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-600">
                          <div className="text-sm text-gray-300 mb-2 font-medium">💡 Öneriler</div>
                          <div className="space-y-2">
                            {chatSuggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  sendUserMessage(suggestion);
                                  setChatSuggestions([]);
                                }}
                                className="w-full text-left px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded border border-gray-600 transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Overlay Suggestions */}
                      {overlaySuggestions.length > 0 && (
                        <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-600">
                          <div className="text-sm text-blue-300 mb-2 font-medium">🎬 Video İçeriği</div>
                          <div className="space-y-2">
                            {overlaySuggestions.map((overlay, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  if (overlay.time_seconds !== undefined) {
                                    setCurrentTime(overlay.time_seconds);
                                    playerRef.current?.seekTo(overlay.time_seconds);
                                  }
                                  setOverlaySuggestions([]);
                                }}
                                className="w-full text-left px-3 py-2 text-sm bg-blue-700 hover:bg-blue-600 text-white rounded border border-blue-600 transition-colors"
                              >
                                <div className="font-medium">{overlay.caption || 'Video İçeriği'}</div>
                                {overlay.time_seconds !== undefined && (
                                  <div className="text-xs text-blue-200">{overlay.time_seconds}s</div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Empty State */}
                      {chatSuggestions.length === 0 && overlaySuggestions.length === 0 && (
                        <div className="text-center text-gray-500 text-sm py-8">
                          <div className="mb-2">💬</div>
                          <div>Öneriler ve video içeriği burada görünecek</div>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls - Only show for video sections, not LLM task sections */}
        {currentSection?.type !== 'llm_task' && videoUrl && (
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-3">
            <button
              onClick={() => setIsPlaying(p => !p)}
              className="p-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
              title={isPlaying ? 'Durdur' : 'Oynat'}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            {/* Ses kontrolü */}
            <div className="flex items-center gap-2 text-white/80 text-xs">
              <span>{playerVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={playerVolume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setPlayerVolume(v);
                  try { playerRef.current?.setVolume?.(v); } catch {}
                }}
              />
              <span className="w-10 text-right">{Math.round(playerVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="flex-1"
            />
            <div className="text-xs text-white/80 w-24 text-right">
              {Math.floor(currentTime)}s {duration ? `/ ${duration}s` : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
