"use client";
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { LLMAgentPlayer } from './player/LLMAgentPlayer';
import { LLMInteractionPlayer } from './player/LLMInteractionPlayer';
import { VideoSectionPlayer } from './player/VideoSectionPlayer';
import { api, type TrainingSection, type CompanyTraining } from '@/lib/api';
import { useInteractionTracking } from '@/hooks/useInteractionTracking';

interface InteractivePlayerProps {
  accessCode: string;
  userId?: string;
}

export const InteractivePlayer = forwardRef<any, InteractivePlayerProps>(({ accessCode, userId }, ref) => {
  const loadingRef = useRef<boolean>(false);
  const sectionsRef = useRef<any[]>([]);
  const currentSectionRef = useRef<any>(null);
  
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
    } catch (error) {
      console.error('❌ Failed to create session:', error);
    } finally {
      sessionCreateInFlightRef.current = false;
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
      } catch (e) {
        console.error('Overlay update error:', e);
      }
    };
    
    loadSectionOverlays();
    console.log('🔄 Current section changed:', currentSection);
  }, [currentSection, companyTraining, accessCode]);

  // Navigation functions
  const safeNavigateNext = (reason?: string) => {
    const idx = sectionsRef.current.findIndex(s => s.id === currentSectionRef.current?.id);
    if (idx >= 0 && idx < sectionsRef.current.length - 1) {
      const next = sectionsRef.current[idx + 1];
      updateCurrentSection(next);
      trackSectionChange(next.id, next.title);
      trackNavigation('navigate_next', next.id, reason);
    }
  };

  const safeNavigatePrevious = (reason?: string) => {
    const idx = sectionsRef.current.findIndex(s => s.id === currentSectionRef.current?.id);
    if (idx > 0) {
      const prev = sectionsRef.current[idx - 1];
      updateCurrentSection(prev);
      trackSectionChange(prev.id, prev.title);
      trackNavigation('navigate_previous', prev.id, reason);
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
            onComplete={() => {
              console.log('🤖 LLM Agent section completed');
              safeNavigateNext('LLM Agent completed');
            }}
            onNavigateNext={() => safeNavigateNext('User requested next section')}
            onNavigatePrevious={() => safeNavigatePrevious('User requested previous section')}
          />
        );
        
      case 'llm_interaction':
        return (
          <LLMInteractionPlayer
            section={currentSection}
            trainingTitle={trainingTitle}
            trainingAvatar={trainingAvatar}
            onNavigateNext={() => safeNavigateNext('User requested next section')}
            onNavigatePrevious={() => safeNavigatePrevious('User requested previous section')}
            onTrackUserMessage={trackUserMessage}
            onTrackAssistantMessage={trackAssistantMessage}
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
