/**
 * SectionStateManager - Her section için ayrı durum yönetimi
 * 
 * Bu sınıf her section tipi için özel işleyiciler sağlar:
 * - Video sections: Video oynatma, overlay yönetimi, chat desteği
 * - LLM Interaction sections: Etkileşimli sohbet, görev yönetimi
 * - LLM Agent sections: Sesli sohbet, agent yönetimi
 */

import { api } from '../api';

export interface SectionState {
  sectionId: string;
  type: 'video' | 'llm_interaction' | 'llm_agent';
  status: 'idle' | 'active' | 'paused' | 'completed' | 'error';
  startTime: number;
  endTime?: number;
  duration: number;
  userInteractions: number;
  engagementScore: number; // 0-1
  data: Record<string, any>;
}

export interface SectionAction {
  type: string;
  timestamp: number;
  data: any;
  metadata?: Record<string, any>;
}

export interface SectionHandler {
  initialize(): Promise<void>;
  handleAction(action: SectionAction): Promise<boolean>;
  getState(): SectionState;
  cleanup(): Promise<void>;
}

/**
 * Video Section Handler
 */
export class VideoSectionHandler implements SectionHandler {
  private state: SectionState;
  private videoElement: HTMLVideoElement | null = null;
  private overlays: any[] = [];
  private chatMessages: any[] = [];
  private isPlaying = false;
  private currentTime = 0;
  private totalDuration = 0;

  constructor(sectionId: string, sectionData: any) {
    this.state = {
      sectionId,
      type: 'video',
      status: 'idle',
      startTime: Date.now(),
      duration: 0,
      userInteractions: 0,
      engagementScore: 0,
      data: sectionData
    };
  }

  async initialize(): Promise<void> {
    try {
      // Video element'ini bul
      this.videoElement = document.querySelector('video');
      
      // Overlay'leri yükle
      this.overlays = await this.loadOverlays();
      
      // Event listener'ları ekle
      this.setupVideoEventListeners();
      
      this.state.status = 'active';
      console.log('🎥 Video section initialized:', this.state.sectionId);
    } catch (error) {
      console.error('❌ Failed to initialize video section:', error);
      this.state.status = 'error';
    }
  }

  async handleAction(action: SectionAction): Promise<boolean> {
    this.state.userInteractions++;
    
    switch (action.type) {
      case 'play':
        return this.handlePlay();
      case 'pause':
        return this.handlePause();
      case 'seek':
        return this.handleSeek(action.data.time);
      case 'overlay_click':
        return this.handleOverlayClick(action.data);
      case 'chat_message':
        return this.handleChatMessage(action.data);
      case 'volume_change':
        return this.handleVolumeChange(action.data.volume);
      default:
        console.warn('Unknown video action:', action.type);
        return false;
    }
  }

  getState(): SectionState {
    return { ...this.state };
  }

  async cleanup(): Promise<void> {
    if (this.videoElement) {
      this.removeVideoEventListeners();
    }
    
    this.state.endTime = Date.now();
    this.state.duration = this.state.endTime - this.state.startTime;
    this.state.status = 'completed';
    
    console.log('🎥 Video section cleaned up:', this.state.sectionId);
  }

  private setupVideoEventListeners(): void {
    if (!this.videoElement) return;

    this.videoElement.addEventListener('play', () => {
      this.isPlaying = true;
      this.calculateEngagementScore();
    });

    this.videoElement.addEventListener('pause', () => {
      this.isPlaying = false;
      this.calculateEngagementScore();
    });

    this.videoElement.addEventListener('timeupdate', () => {
      this.currentTime = this.videoElement?.currentTime || 0;
      this.totalDuration = this.videoElement?.duration || 0;
      this.calculateEngagementScore();
    });

    this.videoElement.addEventListener('ended', () => {
      this.state.status = 'completed';
      this.calculateEngagementScore();
    });
  }

  private removeVideoEventListeners(): void {
    // Event listener'ları kaldır
  }

  private async loadOverlays(): Promise<any[]> {
    try {
      // Overlay'leri API'den yükle
      const trainingId = this.state.data.training_id;
      return await api.listSectionOverlays(trainingId, this.state.sectionId);
    } catch (error) {
      console.error('❌ Failed to load overlays:', error);
      return [];
    }
  }

  private async handlePlay(): Promise<boolean> {
    if (this.videoElement) {
      await this.videoElement.play();
      this.isPlaying = true;
      return true;
    }
    return false;
  }

  private async handlePause(): Promise<boolean> {
    if (this.videoElement) {
      this.videoElement.pause();
      this.isPlaying = false;
      return true;
    }
    return false;
  }

  private async handleSeek(time: number): Promise<boolean> {
    if (this.videoElement) {
      this.videoElement.currentTime = time;
      this.currentTime = time;
      return true;
    }
    return false;
  }

  private async handleOverlayClick(data: any): Promise<boolean> {
    // Overlay tıklama işlemi
    console.log('🎯 Overlay clicked:', data);
    return true;
  }

  private async handleChatMessage(data: any): Promise<boolean> {
    // Chat mesajı işlemi
    this.chatMessages.push({
      type: 'user',
      content: data.message,
      timestamp: Date.now()
    });
    
    // AI yanıtı al (basit implementasyon)
    const aiResponse = await this.getAIResponse(data.message);
    this.chatMessages.push({
      type: 'ai',
      content: aiResponse,
      timestamp: Date.now()
    });
    
    return true;
  }

  private async handleVolumeChange(volume: number): Promise<boolean> {
    if (this.videoElement) {
      this.videoElement.volume = volume;
      return true;
    }
    return false;
  }

  private async getAIResponse(message: string): Promise<string> {
    // Basit AI yanıtı (gerçek implementasyonda API çağrısı yapılacak)
    return `Bu video hakkında "${message}" sorusuna yanıt veriyorum...`;
  }

  private calculateEngagementScore(): void {
    let score = 0;
    
    // Video izleme oranı
    if (this.totalDuration > 0) {
      score += (this.currentTime / this.totalDuration) * 0.4;
    }
    
    // Etkileşim sayısı
    score += Math.min(this.state.userInteractions / 10, 1) * 0.3;
    
    // Chat etkileşimleri
    score += Math.min(this.chatMessages.length / 5, 1) * 0.3;
    
    this.state.engagementScore = Math.min(score, 1);
  }
}

/**
 * LLM Interaction Section Handler
 */
export class LLMInteractionHandler implements SectionHandler {
  private state: SectionState;
  private chatMessages: any[] = [];
  private websocket: WebSocket | null = null;
  private isConnected = false;

  constructor(sectionId: string, sectionData: any) {
    this.state = {
      sectionId,
      type: 'llm_interaction',
      status: 'idle',
      startTime: Date.now(),
      duration: 0,
      userInteractions: 0,
      engagementScore: 0,
      data: sectionData
    };
  }

  async initialize(): Promise<void> {
    try {
      // WebSocket bağlantısı kur
      await this.connectWebSocket();
      
      this.state.status = 'active';
      console.log('💬 LLM Interaction section initialized:', this.state.sectionId);
    } catch (error) {
      console.error('❌ Failed to initialize LLM interaction section:', error);
      this.state.status = 'error';
    }
  }

  async handleAction(action: SectionAction): Promise<boolean> {
    this.state.userInteractions++;
    
    switch (action.type) {
      case 'chat_message':
        return this.handleChatMessage(action.data);
      case 'suggestion_click':
        return this.handleSuggestionClick(action.data);
      case 'task_completion':
        return this.handleTaskCompletion(action.data);
      default:
        console.warn('Unknown LLM interaction action:', action.type);
        return false;
    }
  }

  getState(): SectionState {
    return { ...this.state };
  }

  async cleanup(): Promise<void> {
    if (this.websocket) {
      this.websocket.close();
    }
    
    this.state.endTime = Date.now();
    this.state.duration = this.state.endTime - this.state.startTime;
    this.state.status = 'completed';
    
    console.log('💬 LLM Interaction section cleaned up:', this.state.sectionId);
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.getWebSocketUrl();
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        this.isConnected = true;
        console.log('✅ LLM Interaction WebSocket connected');
        resolve();
      };
      
      this.websocket.onerror = (error) => {
        console.error('❌ LLM Interaction WebSocket error:', error);
        reject(error);
      };
      
      this.websocket.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };
    });
  }

  private getWebSocketUrl(): string {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const url = new URL(apiBase);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/chat/ws';
    return url.toString();
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'assistant_message') {
        this.chatMessages.push({
          type: 'ai',
          content: data.content,
          timestamp: Date.now()
        });
        this.calculateEngagementScore();
      }
    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', error);
    }
  }

  private async handleChatMessage(data: any): Promise<boolean> {
    if (!this.websocket || !this.isConnected) return false;
    
    this.chatMessages.push({
      type: 'user',
      content: data.message,
      timestamp: Date.now()
    });
    
    this.websocket.send(JSON.stringify({
      type: 'user_message',
      content: data.message
    }));
    
    this.calculateEngagementScore();
    return true;
  }

  private async handleSuggestionClick(data: any): Promise<boolean> {
    return this.handleChatMessage({ message: data.suggestion });
  }

  private async handleTaskCompletion(data: any): Promise<boolean> {
    // Görev tamamlanması işlemi
    console.log('✅ Task completed:', data);
    this.calculateEngagementScore();
    return true;
  }

  private calculateEngagementScore(): void {
    // Chat mesajı sayısına göre engagement hesapla
    const messageCount = this.chatMessages.length;
    this.state.engagementScore = Math.min(messageCount / 10, 1);
  }
}

/**
 * LLM Agent Section Handler
 */
export class LLMAgentHandler implements SectionHandler {
  private state: SectionState;
  private agentId: string;
  private isRecording = false;
  private isPlaying = false;
  private conversationHistory: any[] = [];

  constructor(sectionId: string, sectionData: any) {
    this.state = {
      sectionId,
      type: 'llm_agent',
      status: 'idle',
      startTime: Date.now(),
      duration: 0,
      userInteractions: 0,
      engagementScore: 0,
      data: sectionData
    };
    
    this.agentId = sectionData.agent_id || 'default-agent';
  }

  async initialize(): Promise<void> {
    try {
      // Agent bağlantısı kur
      await this.initializeAgent();
      
      this.state.status = 'active';
      console.log('🎭 LLM Agent section initialized:', this.state.sectionId);
    } catch (error) {
      console.error('❌ Failed to initialize LLM agent section:', error);
      this.state.status = 'error';
    }
  }

  async handleAction(action: SectionAction): Promise<boolean> {
    this.state.userInteractions++;
    
    switch (action.type) {
      case 'start_recording':
        return this.handleStartRecording();
      case 'stop_recording':
        return this.handleStopRecording();
      case 'agent_response':
        return this.handleAgentResponse(action.data);
      case 'voice_input':
        return this.handleVoiceInput(action.data);
      default:
        console.warn('Unknown LLM agent action:', action.type);
        return false;
    }
  }

  getState(): SectionState {
    return { ...this.state };
  }

  async cleanup(): Promise<void> {
    // Agent bağlantısını kapat
    await this.disconnectAgent();
    
    this.state.endTime = Date.now();
    this.state.duration = this.state.endTime - this.state.startTime;
    this.state.status = 'completed';
    
    console.log('🎭 LLM Agent section cleaned up:', this.state.sectionId);
  }

  private async initializeAgent(): Promise<void> {
    // Agent başlatma işlemi
    console.log('🎭 Initializing agent:', this.agentId);
  }

  private async disconnectAgent(): Promise<void> {
    // Agent bağlantısını kapatma işlemi
    console.log('🎭 Disconnecting agent');
  }

  private async handleStartRecording(): Promise<boolean> {
    this.isRecording = true;
    console.log('🎤 Recording started');
    return true;
  }

  private async handleStopRecording(): Promise<boolean> {
    this.isRecording = false;
    console.log('🎤 Recording stopped');
    return true;
  }

  private async handleAgentResponse(data: any): Promise<boolean> {
    this.conversationHistory.push({
      type: 'agent',
      content: data.response,
      timestamp: Date.now()
    });
    
    this.isPlaying = false;
    this.calculateEngagementScore();
    return true;
  }

  private async handleVoiceInput(data: any): Promise<boolean> {
    this.conversationHistory.push({
      type: 'user',
      content: data.transcript,
      timestamp: Date.now()
    });
    
    this.calculateEngagementScore();
    return true;
  }

  private calculateEngagementScore(): void {
    // Konuşma geçmişine göre engagement hesapla
    const conversationCount = this.conversationHistory.length;
    this.state.engagementScore = Math.min(conversationCount / 8, 1);
  }
}

/**
 * Section State Manager Factory
 */
export class SectionStateManager {
  private handlers: Map<string, SectionHandler> = new Map();

  createHandler(sectionId: string, sectionType: string, sectionData: any): SectionHandler {
    let handler: SectionHandler;
    
    switch (sectionType) {
      case 'video':
        handler = new VideoSectionHandler(sectionId, sectionData);
        break;
      case 'llm_interaction':
        handler = new LLMInteractionHandler(sectionId, sectionData);
        break;
      case 'llm_agent':
        handler = new LLMAgentHandler(sectionId, sectionData);
        break;
      default:
        throw new Error(`Unknown section type: ${sectionType}`);
    }
    
    this.handlers.set(sectionId, handler);
    return handler;
  }

  getHandler(sectionId: string): SectionHandler | undefined {
    return this.handlers.get(sectionId);
  }

  removeHandler(sectionId: string): void {
    const handler = this.handlers.get(sectionId);
    if (handler) {
      handler.cleanup();
      this.handlers.delete(sectionId);
    }
  }

  getAllHandlers(): SectionHandler[] {
    return Array.from(this.handlers.values());
  }

  cleanup(): void {
    this.handlers.forEach(handler => handler.cleanup());
    this.handlers.clear();
  }
}
