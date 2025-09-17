/**
 * ActionSystem - InteractivePlayer ile LLM sistemi arasında iletişim
 * 
 * Bu sistem şu işlevleri sağlar:
 * 1. Action'ları tanımlar ve yönetir
 * 2. Action'ları LLM sistemine iletir
 * 3. LLM yanıtlarını InteractivePlayer'a geri döndürür
 * 4. Action queue'yu yönetir
 */

import { TrainingLLMService, UserAction, LLMResponse } from './TrainingLLMService';
import { SectionStateManager, SectionAction } from './SectionStateManager';

export interface ActionPayload {
  type: string;
  data: any;
  metadata?: Record<string, any>;
  timestamp?: number;
}

export interface ActionResponse {
  success: boolean;
  message?: string;
  data?: any;
  llmResponse?: LLMResponse;
}

export interface ActionQueueItem {
  id: string;
  payload: ActionPayload;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  retryCount: number;
  maxRetries: number;
}

export class ActionSystem {
  private llmService: TrainingLLMService;
  private sectionManager: SectionStateManager;
  private actionQueue: ActionQueueItem[] = [];
  private isProcessing = false;
  private actionHandlers: Map<string, (payload: ActionPayload) => Promise<ActionResponse>> = new Map();

  constructor(llmService: TrainingLLMService, sectionManager: SectionStateManager) {
    this.llmService = llmService;
    this.sectionManager = sectionManager;
    this.setupDefaultHandlers();
  }

  /**
   * Action'ı işle
   */
  async processAction(payload: ActionPayload): Promise<ActionResponse> {
    const actionId = this.generateActionId();
    const queueItem: ActionQueueItem = {
      id: actionId,
      payload,
      timestamp: payload.timestamp || Date.now(),
      priority: this.getPriority(payload.type),
      retryCount: 0,
      maxRetries: 3
    };

    // Action'ı queue'ya ekle
    this.addToQueue(queueItem);

    // Queue'yu işle
    if (!this.isProcessing) {
      await this.processQueue();
    }

    return {
      success: true,
      message: 'Action queued for processing'
    };
  }

  /**
   * Action handler'ı kaydet
   */
  registerHandler(actionType: string, handler: (payload: ActionPayload) => Promise<ActionResponse>): void {
    this.actionHandlers.set(actionType, handler);
  }

  /**
   * Action handler'ı kaldır
   */
  unregisterHandler(actionType: string): void {
    this.actionHandlers.delete(actionType);
  }

  /**
   * Varsayılan handler'ları kur
   */
  private setupDefaultHandlers(): void {
    // Video actions
    this.registerHandler('video_play', this.handleVideoPlay.bind(this));
    this.registerHandler('video_pause', this.handleVideoPause.bind(this));
    this.registerHandler('video_seek', this.handleVideoSeek.bind(this));
    this.registerHandler('video_volume', this.handleVideoVolume.bind(this));
    this.registerHandler('video_ended', this.handleVideoEnded.bind(this));

    // Navigation actions
    this.registerHandler('navigate_next', this.handleNavigateNext.bind(this));
    this.registerHandler('navigate_previous', this.handleNavigatePrevious.bind(this));
    this.registerHandler('navigate_to_section', this.handleNavigateToSection.bind(this));

    // Chat actions
    this.registerHandler('chat_message', this.handleChatMessage.bind(this));
    this.registerHandler('chat_suggestion', this.handleChatSuggestion.bind(this));

    // Overlay actions
    this.registerHandler('overlay_click', this.handleOverlayClick.bind(this));
    this.registerHandler('overlay_action', this.handleOverlayAction.bind(this));

    // LLM Agent actions
    this.registerHandler('agent_start_recording', this.handleAgentStartRecording.bind(this));
    this.registerHandler('agent_stop_recording', this.handleAgentStopRecording.bind(this));
    this.registerHandler('agent_response', this.handleAgentResponse.bind(this));

    // System actions
    this.registerHandler('section_complete', this.handleSectionComplete.bind(this));
    this.registerHandler('training_complete', this.handleTrainingComplete.bind(this));
    this.registerHandler('error', this.handleError.bind(this));
    this.registerHandler('user_idle', this.handleUserIdle.bind(this));
  }

  /**
   * Queue'yu işle
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.actionQueue.length === 0) return;

    this.isProcessing = true;

    try {
      // Priority'ye göre sırala
      this.actionQueue.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      while (this.actionQueue.length > 0) {
        const item = this.actionQueue.shift();
        if (!item) continue;

        try {
          await this.processActionItem(item);
        } catch (error) {
          console.error('❌ Failed to process action:', error);
          
          // Retry logic
          if (item.retryCount < item.maxRetries) {
            item.retryCount++;
            this.actionQueue.push(item);
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Action item'ı işle
   */
  private async processActionItem(item: ActionQueueItem): Promise<void> {
    const handler = this.actionHandlers.get(item.payload.type);
    
    if (!handler) {
      console.warn('⚠️ No handler found for action type:', item.payload.type);
      return;
    }

    // Handler'ı çağır
    const response = await handler(item.payload);

    // LLM'den yanıt al
    const userAction: UserAction = {
      type: item.payload.type as any,
      timestamp: item.timestamp,
      data: item.payload.data,
      metadata: item.payload.metadata
    };

    const llmResponse = await this.llmService.recordUserAction(userAction);
    
    if (llmResponse) {
      // LLM yanıtını işle
      await this.handleLLMResponse(llmResponse);
    }

    console.log('✅ Action processed:', item.payload.type, response);
  }

  /**
   * LLM yanıtını işle
   */
  private async handleLLMResponse(response: LLMResponse): Promise<void> {
    switch (response.type) {
      case 'guidance':
        await this.showGuidanceMessage(response.message);
        break;
      case 'intervention':
        await this.showInterventionMessage(response.message);
        break;
      case 'navigation':
        if (response.nextSection) {
          await this.navigateToSection(response.nextSection);
        }
        break;
      case 'feedback':
        await this.showFeedbackMessage(response.message);
        break;
      case 'silent':
        // Sessizce devam et
        break;
    }
  }

  /**
   * Queue'ya ekle
   */
  private addToQueue(item: ActionQueueItem): void {
    this.actionQueue.push(item);
  }

  /**
   * Action ID oluştur
   */
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Priority belirle
   */
  private getPriority(actionType: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalActions = ['error', 'training_complete'];
    const highActions = ['user_idle', 'section_complete', 'navigate_next', 'navigate_previous'];
    const mediumActions = ['video_play', 'video_pause', 'chat_message', 'overlay_click'];

    if (criticalActions.includes(actionType)) return 'critical';
    if (highActions.includes(actionType)) return 'high';
    if (mediumActions.includes(actionType)) return 'medium';
    return 'low';
  }

  // Handler implementations
  private async handleVideoPlay(payload: ActionPayload): Promise<ActionResponse> {
    const handler = this.sectionManager.getHandler(payload.data.sectionId);
    if (handler) {
      const success = await handler.handleAction({
        type: 'play',
        timestamp: payload.timestamp || Date.now(),
        data: payload.data
      });
      return { success };
    }
    return { success: false, message: 'Section handler not found' };
  }

  private async handleVideoPause(payload: ActionPayload): Promise<ActionResponse> {
    const handler = this.sectionManager.getHandler(payload.data.sectionId);
    if (handler) {
      const success = await handler.handleAction({
        type: 'pause',
        timestamp: payload.timestamp || Date.now(),
        data: payload.data
      });
      return { success };
    }
    return { success: false, message: 'Section handler not found' };
  }

  private async handleVideoSeek(payload: ActionPayload): Promise<ActionResponse> {
    const handler = this.sectionManager.getHandler(payload.data.sectionId);
    if (handler) {
      const success = await handler.handleAction({
        type: 'seek',
        timestamp: payload.timestamp || Date.now(),
        data: payload.data
      });
      return { success };
    }
    return { success: false, message: 'Section handler not found' };
  }

  private async handleVideoVolume(payload: ActionPayload): Promise<ActionResponse> {
    const handler = this.sectionManager.getHandler(payload.data.sectionId);
    if (handler) {
      const success = await handler.handleAction({
        type: 'volume_change',
        timestamp: payload.timestamp || Date.now(),
        data: payload.data
      });
      return { success };
    }
    return { success: false, message: 'Section handler not found' };
  }

  private async handleVideoEnded(payload: ActionPayload): Promise<ActionResponse> {
    // Video bittiğinde sonraki bölüme geç
    const transition = await this.llmService.suggestSectionTransition(payload.data.sectionId, 'Video completed');
    return { success: true, data: { transition } };
  }

  private async handleNavigateNext(payload: ActionPayload): Promise<ActionResponse> {
    const transition = await this.llmService.suggestSectionTransition(payload.data.sectionId, 'User requested next');
    return { success: true, data: { transition } };
  }

  private async handleNavigatePrevious(payload: ActionPayload): Promise<ActionResponse> {
    // Önceki bölüme geçiş mantığı
    return { success: true, message: 'Navigate previous' };
  }

  private async handleNavigateToSection(payload: ActionPayload): Promise<ActionResponse> {
    // Belirli bir bölüme geçiş
    return { success: true, message: 'Navigate to section' };
  }

  private async handleChatMessage(payload: ActionPayload): Promise<ActionResponse> {
    const handler = this.sectionManager.getHandler(payload.data.sectionId);
    if (handler) {
      const success = await handler.handleAction({
        type: 'chat_message',
        timestamp: payload.timestamp || Date.now(),
        data: payload.data
      });
      return { success };
    }
    return { success: false, message: 'Section handler not found' };
  }

  private async handleChatSuggestion(payload: ActionPayload): Promise<ActionResponse> {
    const handler = this.sectionManager.getHandler(payload.data.sectionId);
    if (handler) {
      const success = await handler.handleAction({
        type: 'suggestion_click',
        timestamp: payload.timestamp || Date.now(),
        data: payload.data
      });
      return { success };
    }
    return { success: false, message: 'Section handler not found' };
  }

  private async handleOverlayClick(payload: ActionPayload): Promise<ActionResponse> {
    const handler = this.sectionManager.getHandler(payload.data.sectionId);
    if (handler) {
      const success = await handler.handleAction({
        type: 'overlay_click',
        timestamp: payload.timestamp || Date.now(),
        data: payload.data
      });
      return { success };
    }
    return { success: false, message: 'Section handler not found' };
  }

  private async handleOverlayAction(payload: ActionPayload): Promise<ActionResponse> {
    const handler = this.sectionManager.getHandler(payload.data.sectionId);
    if (handler) {
      const success = await handler.handleAction({
        type: 'overlay_action',
        timestamp: payload.timestamp || Date.now(),
        data: payload.data
      });
      return { success };
    }
    return { success: false, message: 'Section handler not found' };
  }

  private async handleAgentStartRecording(payload: ActionPayload): Promise<ActionResponse> {
    const handler = this.sectionManager.getHandler(payload.data.sectionId);
    if (handler) {
      const success = await handler.handleAction({
        type: 'start_recording',
        timestamp: payload.timestamp || Date.now(),
        data: payload.data
      });
      return { success };
    }
    return { success: false, message: 'Section handler not found' };
  }

  private async handleAgentStopRecording(payload: ActionPayload): Promise<ActionResponse> {
    const handler = this.sectionManager.getHandler(payload.data.sectionId);
    if (handler) {
      const success = await handler.handleAction({
        type: 'stop_recording',
        timestamp: payload.timestamp || Date.now(),
        data: payload.data
      });
      return { success };
    }
    return { success: false, message: 'Section handler not found' };
  }

  private async handleAgentResponse(payload: ActionPayload): Promise<ActionResponse> {
    const handler = this.sectionManager.getHandler(payload.data.sectionId);
    if (handler) {
      const success = await handler.handleAction({
        type: 'agent_response',
        timestamp: payload.timestamp || Date.now(),
        data: payload.data
      });
      return { success };
    }
    return { success: false, message: 'Section handler not found' };
  }

  private async handleSectionComplete(payload: ActionPayload): Promise<ActionResponse> {
    // Bölüm tamamlandığında sonraki bölüme geç
    const transition = await this.llmService.suggestSectionTransition(payload.data.sectionId, 'Section completed');
    return { success: true, data: { transition } };
  }

  private async handleTrainingComplete(payload: ActionPayload): Promise<ActionResponse> {
    // Eğitim tamamlandı
    return { success: true, message: 'Training completed' };
  }

  private async handleError(payload: ActionPayload): Promise<ActionResponse> {
    // Hata durumu
    return { success: false, message: 'Error occurred', data: payload.data };
  }

  private async handleUserIdle(payload: ActionPayload): Promise<ActionResponse> {
    // Kullanıcı inaktif
    return { success: true, message: 'User is idle' };
  }

  // UI Helper methods
  private async showGuidanceMessage(message?: string): Promise<void> {
    if (message) {
      console.log('💡 Guidance:', message);
      // UI'da rehberlik mesajı göster
    }
  }

  private async showInterventionMessage(message?: string): Promise<void> {
    if (message) {
      console.log('🚨 Intervention:', message);
      // UI'da müdahale mesajı göster
    }
  }

  private async showFeedbackMessage(message?: string): Promise<void> {
    if (message) {
      console.log('📝 Feedback:', message);
      // UI'da geri bildirim mesajı göster
    }
  }

  private async navigateToSection(sectionId: string): Promise<void> {
    console.log('🔄 Navigate to section:', sectionId);
    // Section'a geçiş yap
  }

  /**
   * Temizlik
   */
  cleanup(): void {
    this.actionQueue = [];
    this.actionHandlers.clear();
    this.isProcessing = false;
  }
}
