import { useCallback, useRef } from 'react';
import { api } from '@/lib/api';

interface InteractionTrackingOptions {
  sessionId: string;
  userId?: string;
  trainingId?: string;
  currentSectionId?: string;
  currentVideoTime?: number;
}

interface InteractionData {
  interaction_type: string;
  section_id?: string;
  overlay_id?: string;
  video_time?: number;
  duration?: number;
  content?: string;
  interaction_metadata?: Record<string, any>;
  response_time?: number;
  success?: boolean;
}

interface ChatMessageData {
  message_type: 'user' | 'assistant' | 'system';
  content: string;
  section_id?: string;
  video_time?: number;
  llm_model?: string;
  llm_tokens_used?: number;
  llm_response_time?: number;
  audio_data?: string;
  has_audio?: boolean;
  message_metadata?: Record<string, any>;
}

export const useInteractionTracking = (options: InteractionTrackingOptions) => {
  const { sessionId, userId, trainingId, currentSectionId, currentVideoTime } = options;
  const startTimeRef = useRef<number>(0);

  const trackInteraction = useCallback(async (data: InteractionData) => {
    if (!sessionId) {
      console.warn('No session ID available for interaction tracking');
      return;
    }

    try {
      const interactionData = {
        session_id: sessionId,
        interaction_type: data.interaction_type,
        section_id: data.section_id || currentSectionId,
        overlay_id: data.overlay_id,
        video_time: data.video_time || currentVideoTime,
        duration: data.duration,
        content: data.content,
        interaction_metadata: data.interaction_metadata,
        response_time: data.response_time,
        success: data.success ?? true
      };

      await api.createInteraction(interactionData);
      console.log('✅ Interaction tracked:', data.interaction_type);
    } catch (error) {
      console.error('❌ Failed to track interaction:', error);
    }
  }, [sessionId, currentSectionId]); // Remove currentVideoTime from dependencies

  const trackChatMessage = useCallback(async (data: ChatMessageData) => {
    if (!sessionId) {
      console.warn('No session ID available for chat message tracking');
      return;
    }

    try {
      const messageData = {
        session_id: sessionId,
        message_type: data.message_type,
        content: data.content,
        section_id: data.section_id || currentSectionId,
        video_time: data.video_time || currentVideoTime,
        llm_model: data.llm_model,
        llm_tokens_used: data.llm_tokens_used,
        llm_response_time: data.llm_response_time,
        audio_data: data.audio_data,
        has_audio: data.has_audio,
        message_metadata: data.message_metadata
      };

      await api.createChatMessage(messageData);
      console.log('✅ Chat message tracked:', data.message_type);
    } catch (error) {
      console.error('❌ Failed to track chat message:', error);
    }
  }, [sessionId, currentSectionId]); // Remove currentVideoTime from dependencies

  const updateTrainingProgress = useCallback(async (progress: {
    current_section_id?: string;
    current_video_time?: number;
    completed_sections?: string[];
    status?: string;
    is_completed?: boolean;
  }) => {
    if (!userId || !trainingId) {
      console.warn('No user ID or training ID available for progress update');
      return;
    }

    try {
      await api.updateTrainingProgress(userId, trainingId, progress);
      console.log('✅ Training progress updated');
    } catch (error) {
      console.error('❌ Failed to update training progress:', error);
    }
  }, [userId, trainingId]);

  // Convenience methods for common interactions
  const trackVideoPlay = useCallback(() => {
    startTimeRef.current = Date.now();
    trackInteraction({ interaction_type: 'play' });
  }, [trackInteraction]);

  const trackVideoPause = useCallback(() => {
    const duration = startTimeRef.current ? Date.now() - startTimeRef.current : undefined;
    trackInteraction({ 
      interaction_type: 'pause',
      duration: duration ? duration / 1000 : undefined
    });
  }, [trackInteraction]);

  const trackVideoSeek = useCallback((fromTime: number, toTime: number) => {
    trackInteraction({ 
      interaction_type: 'seek',
      interaction_metadata: { from_time: fromTime, to_time: toTime }
    });
  }, [trackInteraction]);

  const trackSectionChange = useCallback((sectionId: string, sectionTitle: string) => {
    trackInteraction({ 
      interaction_type: 'section_change',
      section_id: sectionId,
      content: sectionTitle,
      interaction_metadata: { section_title: sectionTitle }
    });
    
    // Update training progress
    updateTrainingProgress({ current_section_id: sectionId });
  }, [trackInteraction, updateTrainingProgress]);

  const trackOverlayClick = useCallback((overlayId: string, overlayType: string, overlayCaption?: string) => {
    trackInteraction({ 
      interaction_type: 'overlay_click',
      overlay_id: overlayId,
      content: overlayCaption,
      interaction_metadata: { overlay_type: overlayType, overlay_caption: overlayCaption }
    });
  }, [trackInteraction]);

  const trackNavigation = useCallback((action: string, targetSectionId?: string, reason?: string) => {
    trackInteraction({ 
      interaction_type: 'navigation',
      section_id: targetSectionId,
      content: action,
      interaction_metadata: { action, target_section_id: targetSectionId, reason }
    });
  }, [trackInteraction]);

  const trackTrainingStart = useCallback(() => {
    trackInteraction({ interaction_type: 'training_start' });
    updateTrainingProgress({ status: 'in_progress' });
  }, [trackInteraction, updateTrainingProgress]);

  const trackTrainingEnd = useCallback(() => {
    trackInteraction({ interaction_type: 'training_end' });
    updateTrainingProgress({ status: 'completed', is_completed: true });
  }, [trackInteraction, updateTrainingProgress]);

  const trackTrainingResume = useCallback(() => {
    trackInteraction({ interaction_type: 'training_resume' });
    updateTrainingProgress({ status: 'in_progress' });
  }, [trackInteraction, updateTrainingProgress]);

  const trackUserMessage = useCallback((content: string) => {
    trackChatMessage({ 
      message_type: 'user',
      content 
    });
  }, [trackChatMessage]);

  const trackAssistantMessage = useCallback((content: string, options?: {
    llm_model?: string;
    llm_tokens_used?: number;
    llm_response_time?: number;
    audio_data?: string;
    has_audio?: boolean;
  }) => {
    trackChatMessage({ 
      message_type: 'assistant',
      content,
      ...options
    });
  }, [trackChatMessage]);

  const completeTraining = useCallback(async (completionTime: number, completionPercentage: number = 100) => {
    if (!userId || !trainingId) {
      console.warn('Missing required data for training completion');
      return;
    }

    try {
      await api.completeTraining({
        user_id: userId,
        training_id: trainingId,
        completion_time: completionTime,
        completion_percentage: completionPercentage
      });
      
      // Track training completion interaction
      await trackInteraction({
        interaction_type: 'training_completed',
        content: `Training completed in ${Math.floor(completionTime / 60)} minutes`,
        interaction_metadata: { 
          completion_time: completionTime,
          completion_percentage: completionPercentage
        }
      });
      
      console.log('✅ Training completed successfully');
    } catch (error) {
      console.error('❌ Failed to complete training:', error);
    }
  }, [userId, trainingId, trackInteraction]);

  return {
    trackInteraction,
    trackChatMessage,
    updateTrainingProgress,
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
    trackAssistantMessage,
    completeTraining
  };
};
