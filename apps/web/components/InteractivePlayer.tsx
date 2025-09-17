"use client";
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { LLMAgentPlayer } from './player/LLMAgentPlayer';
import { LLMInteractionPlayer } from './player/LLMInteractionPlayer';
import { VideoSectionPlayer } from './player/VideoSectionPlayer';
import { api, type TrainingSection, type CompanyTraining } from '@/lib/api';
import { useInteractionTracking } from '@/hooks/useInteractionTracking';
// LLM System removed - using REST API instead

interface InteractivePlayerProps {
  accessCode: string;
  userId?: string;
}

export const InteractivePlayer = forwardRef<any, InteractivePlayerProps>(({ accessCode, userId }, ref) => {
  const loadingRef = useRef<boolean>(false);
  const sectionsRef = useRef<any[]>([]);
  const currentSectionRef = useRef<any>(null);
  
  // REST API Session management
  const [interactionSessionId, setInteractionSessionId] = useState<string | null>(null);
  
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

  // REST API state
  const [isSessionReady, setIsSessionReady] = useState<boolean>(false);
  const [currentSectionHandler, setCurrentSectionHandler] = useState<any>(null);
  const [flowAnalysis, setFlowAnalysis] = useState<any>(null);
  
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
    currentVideoTime: 0 // Video time will be handled by individual components
  });
  
  // Create or get session for tracking
  const createSession = async (trainingId: string) => {
    if (sessionId || sessionCreateInFlightRef.current) return;
    sessionCreateInFlightRef.current = true;
    try {
      const response = await api.createSession({
        user_id: userId || '',
        training_id: trainingId,
        company_id: 'default-company',
        status: 'active'
      });
      
      const newSessionId = response.id;
      setSessionId(newSessionId);
      setTrainingId(trainingId);
      trackTrainingStart();
      
      console.log('✅ Session created:', newSessionId);
      
      // REST API session'ı başlat
      await initializeRestAPISession(trainingId, newSessionId);
    } catch (error) {
      console.error('❌ Failed to create session:', error);
    } finally {
      sessionCreateInFlightRef.current = false;
    }
  };

  // REST API session'ı başlat
  const initializeRestAPISession = async (trainingId: string, sessionId: string) => {
    try {
      console.log('🔄 Initializing REST API session...');
      
      // Interaction session oluştur - current_section_id'yi gönderme
      const sessionData = {
        training_id: trainingId,
        user_id: userId || 'anonymous',
        access_code: accessCode
      };
      
      console.log('🔍 Sending session data:', sessionData);
      
      const interactionSession = await api.createInteractionSession(sessionData);
      
      setInteractionSessionId(interactionSession.id);
      setIsSessionReady(true);
      
      // Flow analysis'ı yükle
      await loadFlowAnalysis(interactionSession.id);
      
      console.log('✅ REST API session initialized:', interactionSession.id);
    } catch (error) {
      console.error('❌ Failed to initialize REST API session:', error);
    }
  };

  const loadFlowAnalysis = async (sessionId: string) => {
    try {
      console.log('🔄 Loading flow analysis...');
      const analysis = await api.getFlowAnalysis(sessionId);
      setFlowAnalysis(analysis);
      console.log('✅ Flow analysis loaded:', analysis);
    } catch (error) {
      console.error('❌ Failed to load flow analysis:', error);
    }
  };

  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      // This will be handled by individual components
      console.log('seekTo called:', time);
    },
    setFrame: (frame: string) => {
      // This will be handled by individual components
      console.log('setFrame called:', frame);
    }
  }));

  // Cleanup on unmount - MUST be before other useEffect hooks
  useEffect(() => {
    return () => {
      // REST API session cleanup
      if (interactionSessionId) {
        console.log('🧹 Cleaning up REST API session:', interactionSessionId);
        // Session'ı abandon et (soft delete)
        api.updateInteractionSession(interactionSessionId, { status: 'abandoned' }).catch(console.error);
      }
    };
  }, []);

  // Load training data
  useEffect(() => {
    console.log('🔍 Training loading useEffect triggered with accessCode:', accessCode);
    
    if (sections.length > 0) {
      console.log('🔍 Sections already loaded, skipping...');
      return;
    }
    
    if (loadingRef.current) {
      console.log('🔍 Already loading, skipping...');
      return;
    }
    loadingRef.current = true;
    
    const loadTrainingData = async () => {
      console.log('🔍 loadTrainingData called with accessCode:', accessCode);
      if (!accessCode) {
        console.log('❌ No accessCode provided, skipping training load');
        return;
      }
      
      try {
        // Load training data
        const trainings = await api.listTrainings();
        const training = trainings.find(t => t.access_code === accessCode);
        
        if (training) {
          console.log('✅ Found training:', training.title);
          setTrainingTitle(training.title);
          
          // Load sections
          const sectionsResponse = await api.listTrainingSections(training.id);
          if (sectionsResponse && Array.isArray(sectionsResponse)) {
            const sortedSections = sectionsResponse.sort((a, b) => a.order_index - b.order_index);
            console.log('📚 Loaded sections:', sortedSections.length, sortedSections);
            setSections(sortedSections);
            sectionsRef.current = sortedSections;
            
            if (sortedSections.length > 0) {
              updateCurrentSection(sortedSections[0]);
              console.log('📚 Set current section:', sortedSections[0].title);
            }
          }
        } else {
          // Fallback: Check company trainings
          console.log('🔍 Training not found in main table, checking company trainings...');
          const companyTrainings = await api.listAllCompanyTrainings();
          const companyTraining = companyTrainings.find(ct => ct.access_code === accessCode);
          
          if (companyTraining) {
            console.log('✅ Found company training:', companyTraining);
            const trainingData = await api.getTraining(companyTraining.training_id);
            setTrainingTitle(trainingData.title);
            setCompanyTraining(companyTraining);
            setTrainingAvatar(trainingData.avatar || null);
            
            // Test avatar if none exists
            if (!trainingData.avatar) {
              setTrainingAvatar({
                id: 'test',
                name: 'Test Avatar',
                personality: 'Test Kişilik',
                elevenlabs_voice_id: '21m00Tcm4TlvDq8ikWAM',
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
              setSections(sortedSections);
              sectionsRef.current = sortedSections;
              
              if (sortedSections.length > 0) {
                updateCurrentSection(sortedSections[0]);
              }
            }
          } else {
            console.error('Training not found for access code:', accessCode);
          }
        }
      } catch (error) {
        console.error('Error loading training data:', error);
      } finally {
        loadingRef.current = false;
      }
    };
    
    loadTrainingData();
  }, [accessCode]);


  // When section changes, load overlays and create session
  useEffect(() => {
    if (!currentSection) return;
    
    const loadSectionOverlays = async () => {
      try {
        let trainingId: string;
        if (companyTraining) {
          trainingId = companyTraining.training_id;
        } else {
          const trainings = await api.listTrainings();
          const training = trainings.find(t => t.access_code === accessCode);
          if (!training) return;
          trainingId = training.id;
        }
        
        // Load overlays for current section
        const overlays = await api.listSectionOverlays(trainingId, currentSection.id);
        setOverlays(overlays);
        
        // Create session for tracking
        createSession(trainingId);
        
        // REST API session ile section handler'ı başlat
        if (isSessionReady && interactionSessionId) {
          await initializeSectionHandler(currentSection);
        }
      } catch (e) {
        console.error('Overlay update error:', e);
      }
    };
    
    loadSectionOverlays();
    console.log('🔄 Current section changed:', currentSection);
  }, [currentSection, companyTraining, accessCode, isSessionReady, interactionSessionId]);

  // Section handler'ı başlat (REST API için basitleştirilmiş)
  const initializeSectionHandler = async (section: any) => {
    try {
      console.log('🎯 Initializing section handler for:', section.title);
      
      if (!interactionSessionId) return;
      
      // Section progress'ı güncelle
      await api.updateSectionProgress(interactionSessionId, section.id, {
        status: 'in_progress',
        started_at: new Date().toISOString()
      });
      
      console.log('✅ Section handler initialized:', section.type);
    } catch (error) {
      console.error('❌ Failed to initialize section handler:', error);
    }
  };

  // Navigation functions with REST API integration
  const safeNavigateNext = async (reason?: string) => {
    const idx = sectionsRef.current.findIndex(s => s.id === currentSectionRef.current?.id);
    if (idx >= 0 && idx < sectionsRef.current.length - 1) {
      const next = sectionsRef.current[idx + 1];
      
      // Current section'ı tamamlandı olarak işaretle
      if (interactionSessionId && currentSectionRef.current) {
        try {
          await api.updateSectionProgress(interactionSessionId, currentSectionRef.current.id, {
            status: 'completed',
            completed_at: new Date().toISOString()
          });
        } catch (error) {
          console.error('❌ Failed to update section progress:', error);
        }
      }
      
      updateCurrentSection(next);
      trackSectionChange(next.id, next.title);
      trackNavigation('navigate_next', next.id, reason);
    }
  };

  const safeNavigatePrevious = async (reason?: string) => {
    const idx = sectionsRef.current.findIndex(s => s.id === currentSectionRef.current?.id);
    if (idx > 0) {
      const prev = sectionsRef.current[idx - 1];
      
      // Current section'ı tamamlandı olarak işaretle
      if (interactionSessionId && currentSectionRef.current) {
        try {
          await api.updateSectionProgress(interactionSessionId, currentSectionRef.current.id, {
            status: 'completed',
            completed_at: new Date().toISOString()
          });
        } catch (error) {
          console.error('❌ Failed to update section progress:', error);
        }
      }
      
      updateCurrentSection(prev);
      trackSectionChange(prev.id, prev.title);
      trackNavigation('navigate_previous', prev.id, reason);
    }
  };

  // REST API action handler
  const handleLLMAction = async (actionPayload: any) => {
    if (!interactionSessionId) {
      return { success: false, message: 'Session not ready' };
    }

    try {
      console.log('🔄 Processing LLM action:', actionPayload);
      
      // Action tipine göre farklı işlemler yap
      switch (actionPayload.type) {
        case 'navigate_next':
          console.log('🚀 LLM requested: Navigate to next section');
          safeNavigateNext('LLM requested navigation to next section');
          break;
          
        case 'navigate_previous':
          console.log('🚀 LLM requested: Navigate to previous section');
          safeNavigatePrevious('LLM requested navigation to previous section');
          break;
          
        case 'video_play':
        case 'video_pause':
          // Video actions için tracking
          console.log('🎥 LLM requested video action:', actionPayload.type);
          break;
          
        case 'agent_start_recording':
        case 'agent_stop_recording':
          // Agent actions için tracking
          console.log('🎤 LLM requested agent action:', actionPayload.type);
          break;
          
        default:
          console.log('🔧 Unknown LLM action type:', actionPayload.type);
      }
      
      return { success: true, message: 'Action processed' };
    } catch (error) {
      console.error('❌ Failed to process action:', error);
      return { success: false, message: 'Action processing failed' };
    }
  };

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

  // Render appropriate component based on section type
  const renderSectionComponent = () => {
    switch (currentSection.type) {
      case 'llm_agent':
        return (
          <LLMAgentPlayer
            section={currentSection}
            onComplete={async () => {
              console.log('🤖 LLM Agent section completed');
              
              // Section completion action'ı gönder (REST API)
              if (handleLLMAction) {
                await handleLLMAction({
                  type: 'section_complete',
                  data: {
                    sectionId: currentSection.id,
                    sectionType: 'llm_agent'
                  },
                  timestamp: Date.now()
                });
              }
              
              safeNavigateNext('LLM Agent completed');
            }}
            onNavigateNext={() => safeNavigateNext('User requested next section')}
            onNavigatePrevious={() => safeNavigatePrevious('User requested previous section')}
            onLLMAction={handleLLMAction}
          />
        );
        
      case 'llm_interaction':
        return (
          <LLMInteractionPlayer
            section={currentSection}
            trainingTitle={trainingTitle}
            trainingAvatar={trainingAvatar}
            accessCode={accessCode}
            userId={userId}
            sessionId={interactionSessionId}
            flowAnalysis={flowAnalysis}
            onNavigateNext={() => safeNavigateNext('User requested next section')}
            onNavigatePrevious={() => safeNavigatePrevious('User requested previous section')}
            onTrackUserMessage={trackUserMessage}
            onTrackAssistantMessage={trackAssistantMessage}
            onLLMAction={handleLLMAction}
          />
        );
        
      default:
        // Video section or any other type
        return (
          <VideoSectionPlayer
            section={currentSection}
            trainingTitle={trainingTitle}
            trainingAvatar={trainingAvatar}
            overlays={overlays}
            onNavigateNext={() => safeNavigateNext('User requested next section')}
            onNavigatePrevious={() => safeNavigatePrevious('User requested previous section')}
            onTrackVideoPlay={trackVideoPlay}
            onTrackVideoPause={trackVideoPause}
            onTrackVideoSeek={() => trackVideoSeek(0, 0)}
            onTrackOverlayClick={trackOverlayClick}
            onTrackUserMessage={trackUserMessage}
            onTrackAssistantMessage={trackAssistantMessage}
            onLLMAction={handleLLMAction}
            sessionId={interactionSessionId}
            accessCode={accessCode}
            userId={userId}
          />
        );
    }
  };

  return (
    <div className="w-full h-screen bg-gray-900">
      {renderSectionComponent()}
      
      {/* Session Loading Overlay */}
      {!sessionId && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3"></div>
            <div className="text-white">Oturum başlatılıyor...</div>
          </div>
        </div>
      )}
      
    </div>
  );
});
