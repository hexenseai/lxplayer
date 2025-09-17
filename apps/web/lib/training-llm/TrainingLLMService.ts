/**
 * TrainingLLMService - Eğitimin bütününü takip eden ana LLM sistemi
 * 
 * Bu servis şu görevleri üstlenir:
 * 1. Eğitim genelinde akış yönetimi
 * 2. Bölüm geçişlerinin belirlenmesi
 * 3. Kullanıcı davranışlarının analizi
 * 4. Gerekli noktalarda müdahale ve rehberlik
 * 5. Tüm etkileşimlerin kaydedilmesi
 */

import { api } from '../api';

export interface TrainingContext {
  trainingId: string;
  userId: string;
  sessionId: string;
  
  // Eğitim genel bilgileri
  trainingTitle: string;
  trainingDescription?: string;
  trainingAvatar?: {
    id: string;
    name: string;
    personality: string;
    elevenlabs_voice_id: string;
    description?: string;
    image_url?: string;
  };
  
  // Tüm bölümler ve detayları
  sections: Array<{
    id: string;
    title: string;
    type: 'video' | 'llm_interaction' | 'llm_agent';
    order_index: number;
    description?: string;
    script?: string;
    agent_id?: string;
    duration?: number;
    language?: string;
    target_audience?: string;
  }>;
  
  // Mevcut durum
  currentSectionIndex: number;
  currentSectionId?: string;
  completedSections: string[];
  
  // Kullanıcı profili ve ilerlemesi
  userProfile: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
    companyId?: string;
    learningPreferences?: {
      language: string;
      targetAudience: string;
      preferredInteractionMode: 'passive' | 'active' | 'mixed';
      difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
    };
  };
  
  userProgress: {
    totalTimeSpent: number;
    interactionsCount: number;
    engagementLevel: 'low' | 'medium' | 'high';
    learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
    completionPercentage: number;
    sectionsCompleted: number;
    totalSections: number;
    lastAccessedAt?: string;
  };
  
  // Eğitim akışı ve hedefleri
  trainingFlow: {
    goals: string[];
    learningObjectives: string[];
    prerequisites?: string[];
    estimatedDuration: number;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    tags: string[];
  };
  
  // Etkileşim geçmişi
  interactionHistory: Array<{
    sectionId: string;
    actionType: string;
    timestamp: number;
    data: any;
  }>;
}

export interface UserAction {
  type: 'navigation' | 'interaction' | 'video_control' | 'chat' | 'completion' | 'error';
  sectionId?: string;
  timestamp: number;
  data: any;
  metadata?: Record<string, any>;
}

export interface LLMResponse {
  type: 'guidance' | 'intervention' | 'navigation' | 'feedback' | 'silent';
  message?: string;
  suggestedAction?: string;
  nextSection?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
}

export interface SectionTransition {
  fromSectionId: string;
  toSectionId: string;
  reason: string;
  userRequested: boolean;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class TrainingLLMService {
  private context: TrainingContext;
  private actionHistory: UserAction[] = [];
  private llmClient: any; // OpenAI client
  private isInitialized = false;
  private lastInteractionTime = Date.now();
  private interventionThreshold = 300000; // 5 minutes of inactivity
  private guidanceFrequency = 60000; // 1 minute between guidance messages

  constructor(context: TrainingContext) {
    this.context = context;
    this.llmClient = null; // Will be initialized when needed
  }

  /**
   * Servisi başlat
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // OpenAI client'ı başlat (eğer gerekirse)
      // this.llmClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      // İlk eğitim analizi
      await this.analyzeTrainingStructure();
      
      // Kullanıcı profili analizi
      await this.analyzeUserProfile();
      
      this.isInitialized = true;
      console.log('🧠 TrainingLLMService initialized for training:', this.context.trainingId);
    } catch (error) {
      console.error('❌ Failed to initialize TrainingLLMService:', error);
      throw error;
    }
  }

  /**
   * Kullanıcı aksiyonunu kaydet ve analiz et
   */
  async recordUserAction(action: UserAction): Promise<LLMResponse | null> {
    this.actionHistory.push(action);
    this.lastInteractionTime = Date.now();

    // Aksiyonu kaydet
    await this.logAction(action);

    // Analiz et ve gerekirse müdahale et
    return await this.analyzeAndRespond(action);
  }

  /**
   * Bölüm geçişi öner
   */
  async suggestSectionTransition(currentSectionId: string, reason?: string): Promise<SectionTransition | null> {
    const currentIndex = this.context.sections.findIndex(s => s.id === currentSectionId);
    
    if (currentIndex === -1) {
      console.error('❌ Current section not found in context');
      return null;
    }

    // Basit mantık: sıradaki bölüme geç
    if (currentIndex < this.context.sections.length - 1) {
      const nextSection = this.context.sections[currentIndex + 1];
      
      const transition: SectionTransition = {
        fromSectionId: currentSectionId,
        toSectionId: nextSection.id,
        reason: reason || 'Sequential progression',
        userRequested: false,
        timestamp: Date.now()
      };

      // Geçişi kaydet
      await this.logSectionTransition(transition);
      
      return transition;
    }

    // Eğitim tamamlandı
    await this.handleTrainingCompletion();
    return null;
  }

  /**
   * Kullanıcı davranışını analiz et
   */
  private async analyzeUserBehavior(): Promise<void> {
    const recentActions = this.actionHistory.slice(-10);
    
    // Etkileşim seviyesi analizi
    const interactionCount = recentActions.filter(a => a.type === 'interaction').length;
    const timeSpent = Date.now() - (this.actionHistory[0]?.timestamp || Date.now());
    
    if (interactionCount > 5) {
      this.context.userProgress.engagementLevel = 'high';
    } else if (interactionCount > 2) {
      this.context.userProgress.engagementLevel = 'medium';
    } else {
      this.context.userProgress.engagementLevel = 'low';
    }

    // Öğrenme stili analizi
    const videoInteractions = recentActions.filter(a => a.type === 'video_control').length;
    const chatInteractions = recentActions.filter(a => a.type === 'chat').length;
    
    if (videoInteractions > chatInteractions) {
      this.context.userProgress.learningStyle = 'visual';
    } else if (chatInteractions > videoInteractions) {
      this.context.userProgress.learningStyle = 'auditory';
    } else {
      this.context.userProgress.learningStyle = 'mixed';
    }
  }

  /**
   * LLM'den yanıt al
   */
  private async getLLMResponse(prompt: string): Promise<LLMResponse> {
    try {
      // Şimdilik basit bir yanıt döndür
      // Gerçek implementasyonda OpenAI API kullanılacak
      
      const response: LLMResponse = {
        type: 'silent',
        priority: 'low',
        confidence: 0.8
      };

      // Basit mantık: eğer kullanıcı uzun süre etkileşimde değilse müdahale et
      const timeSinceLastInteraction = Date.now() - this.lastInteractionTime;
      if (timeSinceLastInteraction > this.interventionThreshold) {
        response.type = 'intervention';
        response.message = 'Nasıl gidiyor? Herhangi bir sorunuz var mı?';
        response.priority = 'medium';
      }

      return response;
    } catch (error) {
      console.error('❌ LLM response error:', error);
      return {
        type: 'silent',
        priority: 'low',
        confidence: 0.0
      };
    }
  }

  /**
   * Aksiyonu analiz et ve yanıt ver
   */
  private async analyzeAndRespond(action: UserAction): Promise<LLMResponse | null> {
    await this.analyzeUserBehavior();

    // Kritik durumlar için anında müdahale
    if (action.type === 'error') {
      return {
        type: 'intervention',
        message: 'Bir sorun mu yaşıyorsunuz? Size nasıl yardımcı olabilirim?',
        priority: 'high',
        confidence: 0.9
      };
    }

    // Uzun süreli inaktivite için müdahale
    const timeSinceLastInteraction = Date.now() - this.lastInteractionTime;
    if (timeSinceLastInteraction > this.interventionThreshold) {
      return {
        type: 'intervention',
        message: 'Eğitimde kaldığınız yerden devam edebilirsiniz. Herhangi bir yardıma ihtiyacınız var mı?',
        priority: 'medium',
        confidence: 0.7
      };
    }

    // Rehberlik mesajları için kontrol
    if (this.shouldProvideGuidance(action)) {
      return {
        type: 'guidance',
        message: 'Bu bölümü tamamladıktan sonra sonraki bölüme geçebilirsiniz.',
        priority: 'low',
        confidence: 0.6
      };
    }

    return null;
  }

  /**
   * Rehberlik mesajı verilmeli mi?
   */
  private shouldProvideGuidance(action: UserAction): boolean {
    // Video bölümlerinde belirli noktalarda rehberlik
    if (action.type === 'video_control' && action.data?.action === 'pause') {
      const currentSection = this.context.sections[this.context.currentSectionIndex];
      return currentSection?.type === 'video';
    }

    // Chat etkileşimlerinde belirli aralıklarla rehberlik
    if (action.type === 'chat') {
      const chatActions = this.actionHistory.filter(a => a.type === 'chat');
      return chatActions.length % 3 === 0; // Her 3 mesajda bir
    }

    return false;
  }

  /**
   * Eğitim yapısını analiz et
   */
  private async analyzeTrainingStructure(): Promise<void> {
    const sections = this.context.sections;
    
    // Eğitim akışını analiz et
    this.context.trainingFlow = {
      goals: sections.map(s => s.title),
      learningObjectives: sections.map(s => s.description || s.title).filter(Boolean),
      estimatedDuration: sections.reduce((total, s) => total + (s.duration || 0), 0),
      difficulty: this.determineDifficulty(sections),
      tags: this.extractTags(sections)
    };
    
    // Kullanıcı ilerlemesini güncelle
    this.context.userProgress.totalSections = sections.length;
    this.context.userProgress.completionPercentage = (this.context.completedSections.length / sections.length) * 100;
    
    console.log('📚 Training structure analyzed:', {
      totalSections: sections.length,
      goals: this.context.trainingFlow.goals,
      estimatedDuration: this.context.trainingFlow.estimatedDuration,
      difficulty: this.context.trainingFlow.difficulty
    });
  }

  /**
   * Eğitim zorluk seviyesini belirle
   */
  private determineDifficulty(sections: any[]): 'beginner' | 'intermediate' | 'advanced' {
    const hasLLMAgent = sections.some(s => s.type === 'llm_agent');
    const hasComplexInteraction = sections.some(s => s.type === 'llm_interaction');
    const totalDuration = sections.reduce((total, s) => total + (s.duration || 0), 0);
    
    if (hasLLMAgent || totalDuration > 1800) return 'advanced';
    if (hasComplexInteraction || totalDuration > 900) return 'intermediate';
    return 'beginner';
  }

  /**
   * Etiketleri çıkar
   */
  private extractTags(sections: any[]): string[] {
    const tags = new Set<string>();
    
    sections.forEach(section => {
      if (section.type === 'video') tags.add('video-learning');
      if (section.type === 'llm_interaction') tags.add('interactive');
      if (section.type === 'llm_agent') tags.add('ai-conversation');
      if (section.target_audience) tags.add(section.target_audience.toLowerCase());
      if (section.language) tags.add(section.language.toLowerCase());
    });
    
    return Array.from(tags);
  }

  /**
   * Kullanıcı profilini analiz et
   */
  private async analyzeUserProfile(): Promise<void> {
    // Kullanıcı tercihlerini varsayılan değerlerle başlat
    this.context.userPreferences = {
      language: 'TR',
      targetAudience: 'Genel',
      preferredInteractionMode: 'mixed'
    };

    // Gerçek implementasyonda kullanıcı geçmişinden analiz yapılacak
    console.log('👤 User profile analyzed:', this.context.userPreferences);
  }

  /**
   * Aksiyonu kaydet
   */
  private async logAction(action: UserAction): Promise<void> {
    try {
      // Backend'e kaydet
      await api.createInteraction({
        session_id: this.context.sessionId,
        interaction_type: action.type,
        section_id: action.sectionId,
        content: JSON.stringify(action.data),
        interaction_metadata: action.metadata,
        timestamp: action.timestamp,
        success: action.type !== 'error'
      });

      console.log('📝 Action logged:', action.type);
    } catch (error) {
      console.error('❌ Failed to log action:', error);
    }
  }

  /**
   * Bölüm geçişini kaydet
   */
  private async logSectionTransition(transition: SectionTransition): Promise<void> {
    try {
      await api.createInteraction({
        session_id: this.context.sessionId,
        interaction_type: 'section_transition',
        section_id: transition.fromSectionId,
        content: JSON.stringify({
          toSectionId: transition.toSectionId,
          reason: transition.reason,
          userRequested: transition.userRequested
        }),
        interaction_metadata: transition.metadata,
        timestamp: transition.timestamp,
        success: true
      });

      console.log('🔄 Section transition logged:', transition.reason);
    } catch (error) {
      console.error('❌ Failed to log section transition:', error);
    }
  }

  /**
   * Eğitim tamamlanmasını işle
   */
  private async handleTrainingCompletion(): Promise<void> {
    try {
      await api.completeTraining({
        user_id: this.context.userId,
        training_id: this.context.trainingId,
        completion_time: Date.now() - (this.actionHistory[0]?.timestamp || Date.now()),
        completion_percentage: 100
      });

      console.log('🎉 Training completed successfully');
    } catch (error) {
      console.error('❌ Failed to complete training:', error);
    }
  }

  /**
   * LLM için kapsamlı context oluştur
   */
  getLLMContext(currentSectionId?: string): string {
    const currentSection = this.context.sections.find(s => s.id === currentSectionId);
    const completedCount = this.context.completedSections.length;
    const totalCount = this.context.sections.length;
    
    return `# EĞİTİM ASİSTANI GÖREVİ

Sen bir eğitim asistanısın. Şu anda "${this.context.trainingTitle}" eğitiminin "${currentSection?.title || 'Etkileşim'}" bölümündesin.

## GÖREVİN:
Bu bölümde kullanıcıyla etkileşim kur ve aşağıdaki talimatları uygula.

## EĞİTİM GENEL BİLGİLERİ
**Eğitim Başlığı:** ${this.context.trainingTitle}
**Eğitim Açıklaması:** ${this.context.trainingDescription || 'Açıklama yok'}
**Toplam Bölüm Sayısı:** ${totalCount}
**Tamamlanan Bölüm:** ${completedCount}/${totalCount} (%${this.context.userProgress.completionPercentage.toFixed(1)})
**Tahmini Süre:** ${Math.round(this.context.trainingFlow.estimatedDuration / 60)} dakika
**Zorluk Seviyesi:** ${this.context.trainingFlow.difficulty}
**Etiketler:** ${this.context.trainingFlow.tags.join(', ')}

## AVATAR BİLGİLERİ
**Avatar Adı:** ${this.context.trainingAvatar?.name || 'Varsayılan'}
**Kişilik:** ${this.context.trainingAvatar?.personality || 'Yardımcı asistan'}
**Açıklama:** ${this.context.trainingAvatar?.description || 'Eğitim asistanı'}

## KULLANICI PROFİLİ
**Kullanıcı ID:** ${this.context.userProfile.id}
**İsim:** ${this.context.userProfile.name || 'Bilinmiyor'}
**Rol:** ${this.context.userProfile.role || 'Öğrenci'}
**Dil Tercihi:** ${this.context.userProfile.learningPreferences?.language || 'TR'}
**Hedef Kitle:** ${this.context.userProfile.learningPreferences?.targetAudience || 'Genel'}
**Etkileşim Tercihi:** ${this.context.userProfile.learningPreferences?.preferredInteractionMode || 'mixed'}
**Zorluk Tercihi:** ${this.context.userProfile.learningPreferences?.difficultyLevel || 'intermediate'}

## KULLANICI İLERLEMESİ
**Toplam Geçirilen Süre:** ${Math.round(this.context.userProgress.totalTimeSpent / 60)} dakika
**Etkileşim Sayısı:** ${this.context.userProgress.interactionsCount}
**Katılım Seviyesi:** ${this.context.userProgress.engagementLevel}
**Öğrenme Stili:** ${this.context.userProgress.learningStyle}
**Son Erişim:** ${this.context.userProgress.lastAccessedAt || 'Şimdi'}

## EĞİTİM AKIŞI VE HEDEFLER
**Öğrenme Hedefleri:**
${this.context.trainingFlow.learningObjectives.map(obj => `- ${obj}`).join('\n')}

**Eğitim Akışı:**
${this.context.sections.map((section, index) => {
  const isCompleted = this.context.completedSections.includes(section.id);
  const isCurrent = section.id === currentSectionId;
  const status = isCurrent ? '🔄 ŞU AN' : isCompleted ? '✅ TAMAMLANDI' : '⏳ BEKLİYOR';
  return `${index + 1}. [${section.type.toUpperCase()}] ${section.title} ${status}`;
}).join('\n')}

## MEVCUT BÖLÜM DETAYI
${currentSection ? `
**Bölüm:** ${currentSection.title}
**Tür:** ${currentSection.type}
**Açıklama:** ${currentSection.description || 'Açıklama yok'}
**Script/İçerik:** ${currentSection.script || 'İçerik yok'}
**Süre:** ${currentSection.duration || 0} saniye
**Dil:** ${currentSection.language || 'TR'}
**Hedef Kitle:** ${currentSection.target_audience || 'Genel'}
${currentSection.agent_id ? `**Agent ID:** ${currentSection.agent_id}` : ''}

### BÖLÜM ÖZEL TALİMATLARI:
${currentSection.description ? `**Açıklama Talimatları:** ${currentSection.description}` : ''}
${currentSection.script ? `**Script/İçerik Talimatları:** ${currentSection.script}` : ''}
` : 'Mevcut bölüm bilgisi yok'}

## SON ETKİLEŞİMLER
${this.context.interactionHistory.slice(-5).map(interaction => {
  const section = this.context.sections.find(s => s.id === interaction.sectionId);
  const timeAgo = Math.round((Date.now() - interaction.timestamp) / 1000 / 60);
  return `- ${interaction.actionType} (${section?.title || 'Bilinmeyen bölüm'}) - ${timeAgo} dakika önce`;
}).join('\n')}

## GÖREV TALİMATLARI:
Bu bir ETKİLEŞİM BÖLÜMÜDÜR. Kullanıcı ile aktif olarak iletişim kurmalısın:

### ŞİMDİ YAPMAN GEREKENLER:

${currentSection?.description || currentSection?.script ? `
**BÖLÜM TALİMATLARI:**
${currentSection.script || 'Script yok'}

**YAPMAN GEREKENLER:**
1. Kullanıcıya "Merhaba Kullanıcı" diye hitap et
2. Bu bölümün amacını açıkla: "${currentSection.description || 'Açıklama yok'}"
3. Yukarıdaki script talimatlarını takip et
4. Kullanıcıdan beklentilerini öğren
5. Hazır olduğunda sonraki bölüme geçebileceğini söyle
` : `
1. Kullanıcıya "Merhaba Kullanıcı" diye hitap et
2. Eğitimin başlığını ve amacını açıkla
3. "Bu eğitimden ne öğrenmeyi umuyorsunuz?" diye sor
4. Hazır olduğunda sonraki bölüme geçebileceğini söyle
`}

### DEVAM EDEN ETKİLEŞİM:
1. **Eğitim Bağlamı**: Yukarıdaki tüm bilgileri kullanarak kullanıcıya eğitimin bütünü hakkında rehberlik et
2. **Kişiselleştirme**: Kullanıcının profili, ilerlemesi ve tercihlerini dikkate al
3. **Akış Yönetimi**: Hangi bölümlerin tamamlandığını ve sonraki adımları bil
4. **Aktif Yönlendirme**: Kullanıcıyı eğitim hedefleri doğrultusunda yönlendir
5. **Bağlamlı Sohbet**: Önceki bölümler ve sonraki bölümler hakkında bilgi ver
6. **İlerleme Takibi**: Kullanıcının eğitimdeki konumunu ve ilerlemesini takip et

### KURALLAR:
- Türkçe konuş
- Samimi ol
- Kısa mesajlar yaz
- Sorular sor
- Sadece metin tabanlı sohbet yap

## ÖNEMLİ:
Yukarıdaki bilgileri kullan. "Eğitim içeriği yok" deme!`;
  }

  /**
   * Mevcut bağlamı al
   */
  getContext(): TrainingContext {
    return { ...this.context };
  }

  /**
   * Aksiyon geçmişini al
   */
  getActionHistory(): UserAction[] {
    return [...this.actionHistory];
  }

  /**
   * Servisi temizle
   */
  cleanup(): void {
    this.actionHistory = [];
    this.isInitialized = false;
    console.log('🧹 TrainingLLMService cleaned up');
  }
}
