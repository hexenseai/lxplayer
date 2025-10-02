import React, { useEffect, useRef, useState } from 'react';
import { type TrainingSection } from '@/lib/api';
import { Send, ArrowLeft, ArrowRight, Radio } from 'lucide-react';
import { Button } from '@lxplayer/ui';
import { api } from '@/lib/api';

interface LLMInteractionPlayerProps {
  section: TrainingSection;
  trainingTitle: string;
  trainingAvatar: any;
  accessCode?: string;
  userId?: string;
  sessionId?: string | null;
  flowAnalysis?: any;
  onNavigateNext: () => void;
  onNavigatePrevious: () => void;
  onTrackUserMessage: (message: string) => void;
  onTrackAssistantMessage: (message: string) => void;
  onLLMAction?: (actionPayload: any) => Promise<any>;
  hasPreviousSection?: boolean;
  hasNextSection?: boolean;
  canProceedToNext?: boolean;
  sectionProgress?: any; // Progress information for this section
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  suggestions?: string[];
}

export function LLMInteractionPlayer({ 
  section, 
  trainingTitle, 
  trainingAvatar, 
  accessCode, 
  userId, 
  sessionId,
  flowAnalysis,
  onNavigateNext, 
  onNavigatePrevious,
  onTrackUserMessage,
  onTrackAssistantMessage,
  onLLMAction,
  hasPreviousSection = false,
  hasNextSection = true,
  canProceedToNext = false,
  sectionProgress
}: LLMInteractionPlayerProps) {
  
  // Sadece llm_interaction section'lar için çalış
  if (section.type !== 'llm_interaction') {
    console.log('❌ LLMInteractionPlayer sadece llm_interaction section\'lar için kullanılabilir');
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Geçersiz Bölüm Tipi</h2>
          <p className="text-gray-600">Bu bölüm LLM etkileşimi için uygun değil.</p>
        </div>
      </div>
    );
  }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSuggestions, setChatSuggestions] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [canProceed, setCanProceed] = useState(canProceedToNext);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const sectionChatKey = useRef<string>(`${sessionId}-${section.id}`);

  // Initialize LLM interaction section with chat history support
  useEffect(() => {
    if (!sessionId) return;

    const initializeSection = async () => {
      try {
        console.log('🚀 Initializing LLM interaction section:', section.title);
        
        // Load existing chat history for this section if available
        await loadChatHistory();
        
        // Only send initial greeting if no existing messages
        if (chatMessages.length === 0) {
          await sendInitialGreeting();
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Failed to initialize section:', error);
        setIsInitialized(true); // Still mark as initialized to prevent infinite loop
      }
    };

    initializeSection();
  }, [sessionId, section.id]);

  // Load chat history for this specific section
  const loadChatHistory = async () => {
    if (!sessionId) return;
    
    try {
      console.log('📚 Loading chat history for section:', section.id);
      const history = await api.getSectionChatHistory(sessionId, section.id);
      if (history && history.length > 0) {
        setChatMessages(history);
        console.log(`✅ Loaded ${history.length} messages from history`);
      }
    } catch (error) {
      console.error('❌ Failed to load chat history:', error);
      // Continue without history - not critical
    }
  };

  // Save chat messages to history
  const saveChatHistory = async (messages: ChatMessage[]) => {
    if (!sessionId) return;
    
    try {
      await api.saveSectionChatHistory(sessionId, section.id, messages);
    } catch (error) {
      console.error('❌ Failed to save chat history:', error);
    }
  };

  // Send initial greeting
  const sendInitialGreeting = async () => {
    if (!sessionId) return;

    try {
      const assistantName = trainingAvatar?.name || 'Asistan';
      const voiceId = trainingAvatar?.elevenlabs_voice_id || null;
      
      // Açılış mesajını doğrudan section description'dan al
      let initialGreetingMessage = '';
      
      if (section.description && section.description.trim()) {
        initialGreetingMessage = section.description;
        console.log('📝 Using section description as initial greeting');
      } else {
        initialGreetingMessage = `Merhaba! Ben ${assistantName}. Bu eğitimde size yardımcı olacağım. ${section.title} bölümüne hoş geldiniz. Size nasıl yardımcı olabilirim?`;
        console.log('📝 Using default greeting message');
      }

      // Açılış mesajını doğrudan göster (LLM'e gönderme)
      const assistantMessage: ChatMessage = {
        id: `initial-${Date.now()}`,
        type: 'assistant',
        content: initialGreetingMessage,
        timestamp: new Date().toISOString(),
        suggestions: [
          "Merhaba, nasılsınız?",
          "Bu konu hakkında bilgi almak istiyorum",
          "Devam etmek istiyorum"
        ]
      };

      setChatMessages(prev => [assistantMessage]);
      setChatSuggestions(assistantMessage.suggestions);
      
      // Save to history
      await saveChatHistory([assistantMessage]);
      
      // Track the message
      onTrackAssistantMessage(initialGreetingMessage);
      
      console.log('✅ Initial greeting displayed successfully');
      
    } catch (error) {
      console.error('❌ Failed to send initial greeting:', error);
    }
  };

  // Send user message
  const sendUserMessage = async (message: string) => {
    if (!message.trim() || !sessionId || isLoading) return;

    console.log('🚀 Sending user message:', message);

    // Add user message to chat immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsLoading(true);

    // Track the message
    onTrackUserMessage(message);

    try {
      // Send to LLM via REST API
      const response = await api.sendMessageToLLM(sessionId, message, 'user');
      
      // Add assistant response to chat
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: response.message,
        timestamp: response.timestamp,
        suggestions: response.suggestions
      };

      const newMessages = [...chatMessages, userMessage, assistantMessage];
      setChatMessages(newMessages);
      setChatSuggestions(response.suggestions);
      
      // Save to history
      await saveChatHistory(newMessages);
      
      // Track the response
      onTrackAssistantMessage(response.message);
      
      // Check if we can proceed to next section
      console.log('🔍 Checking canProceedToNext:', response.canProceedToNext);
      console.log('🔍 Current canProceed state:', canProceed);
      console.log('🔍 Section progress status:', sectionProgress?.status);
      
      if (response.canProceedToNext) {
        console.log('✅ Setting canProceed to true and calling onLLMAction');
        setCanProceed(true);
        // Send action to parent component
        if (onLLMAction) {
          await onLLMAction({
            type: 'can_proceed_to_next',
            data: { canProceed: true },
            timestamp: Date.now()
          });
        }
      } else {
        console.log('❌ canProceedToNext is false, not proceeding');
        console.log('💡 Tip: "Sonraki bölüme geçmek istiyorum" yazarak butonu aktif edebilirsiniz');
      }

      // Handle LLM actions (navigation, etc.)
      if (response.actions && response.actions.length > 0) {
        for (const action of response.actions) {
          console.log('🔄 Processing LLM action:', action);
          if (onLLMAction) {
            await onLLMAction(action);
          }
        }
      }

      // Update section progress
      await updateSectionProgress();

      console.log('✅ LLM response received:', {
        message: response.message.substring(0, 100) + '...',
        suggestions: response.suggestions.length,
        processingTime: response.processing_time_ms,
        canProceedToNext: response.canProceedToNext
      });

    } catch (error) {
      console.error('❌ Failed to send message:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'system',
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        timestamp: new Date().toISOString()
      };

      const newMessages = [...chatMessages, userMessage, errorMessage];
      setChatMessages(newMessages);
      
      // Save to history
      await saveChatHistory(newMessages);
    } finally {
      setIsLoading(false);
    }
  };

  // Update section progress
  const updateSectionProgress = async () => {
    if (!sessionId) return;

    try {
      await api.updateSectionProgress(sessionId, section.id, {
        status: 'in_progress',
        interactions_count: chatMessages.filter(m => m.type === 'user').length + 1,
        completion_percentage: Math.min(100, (chatMessages.length / 10) * 100) // Simple progress calculation
      });
    } catch (error) {
      console.error('❌ Failed to update progress:', error);
    }
  };

  // Handle input submission
  const handleSubmit = () => {
    if (chatInput.trim()) {
      sendUserMessage(chatInput.trim());
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setChatInput(suggestion);
    setChatSuggestions([]);
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesScrollRef.current) {
      messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isLoading]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messagesScrollRef.current) {
      setTimeout(() => {
        messagesScrollRef.current?.scrollTo({
          top: messagesScrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [chatMessages.length]);

  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col">
       <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-4">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
             {/* Avatar Display */}
             <div className="flex-shrink-0">
               <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-2xl font-bold relative overflow-hidden">
                 {section.avatar?.image_url ? (
                   <img 
                     src={section.avatar.image_url} 
                     alt={section.avatar.name}
                     className="w-full h-full object-cover"
                   />
                 ) : (
                   section.avatar?.name?.charAt(0).toUpperCase() || section.title.charAt(0).toUpperCase()
                 )}
               </div>
             </div>
             
             {/* Section Info */}
             <div className="flex-1">
               <h2 
                 className="text-xl font-semibold text-white cursor-help" 
                 title={section.description || ''}
               >
                 {section.title}
               </h2>
               {section.avatar && (
                 <div className="text-sm text-slate-300 mt-1">
                   <span className="font-medium">{section.avatar.name}</span>
                   {section.avatar.personality && (
                     <span className="ml-2 px-2 py-1 text-xs bg-blue-600/20 text-blue-300 rounded-full border border-blue-500/30">
                       {section.avatar.personality}
                     </span>
                   )}
                 </div>
               )}
             </div>
           </div>
           <div className="flex items-center space-x-2">
             <button
               onClick={onNavigatePrevious}
               disabled={!hasPreviousSection}
               className={`flex items-center space-x-1 px-3 py-1.5 text-sm rounded border transition-colors ${
                 hasPreviousSection
                   ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600'
                   : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
               }`}
             >
               <ArrowLeft className="w-3 h-3" />
               <span>Önceki</span>
             </button>
            <button
              onClick={() => {
                console.log('🚀 Next button clicked!');
                console.log('🔍 canProceed:', canProceed);
                console.log('🔍 sectionProgress?.status:', sectionProgress?.status);
                console.log('🔍 hasNextSection:', hasNextSection);
                onNavigateNext();
              }}
              disabled={(!canProceed && sectionProgress?.status !== 'completed') || !hasNextSection}
              className={`flex items-center space-x-1 px-3 py-1.5 text-sm rounded border transition-colors ${
                (canProceed || sectionProgress?.status === 'completed') && hasNextSection
                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-500'
                  : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
              }`}
              title={(!canProceed && sectionProgress?.status !== 'completed') ? 
                'Bu bölümü tamamlamak için LLM ile etkileşime geçin veya "Sonraki bölüme geçmek istiyorum" yazın' : 
                'Sonraki bölüme geç'}
            >
              <span>Sonraki</span>
              <ArrowRight className="w-3 h-3" />
            </button>
           </div>
         </div>
       </div>

      <div className="flex-1 overflow-hidden bg-slate-900 flex flex-col">
        {/* Chat Messages Container */}
        <div 
          ref={messagesScrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.type === 'assistant'
                    ? 'bg-white text-gray-900 border'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.type === 'user' 
                    ? 'text-blue-100' 
                    : 'text-gray-500'
                }`}>
                  {formatTimestamp(message.timestamp)}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">Yanıt hazırlanıyor...</span>
                </div>
              </div>
            </div>
          )}

          {!isInitialized && (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Etkileşim oturumu başlatılıyor...</p>
              </div>
            </div>
          )}
        </div>
          
        {/* Chat Suggestions */}
        {chatSuggestions.length > 0 && (
          <div className="p-4 bg-slate-800 border-t border-slate-700">
            <p className="text-sm text-slate-300 mb-2">Öneriler:</p>
            <div className="flex flex-wrap gap-2">
              {chatSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1 text-sm bg-slate-700 text-slate-200 rounded-full hover:bg-slate-600 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      <div className="bg-slate-800 border-t border-slate-700 p-4">
        <div className="flex items-center space-x-2">
          {/* Message Input */}
          <div className="flex-1 flex items-center space-x-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Mesajınızı yazın..."
              disabled={isLoading || !isInitialized}
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-600 disabled:cursor-not-allowed placeholder-slate-400"
            />
            <Button
              onClick={handleSubmit}
              disabled={!chatInput.trim() || isLoading || !isInitialized}
              className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Live Mode Toggle */}
          <button
            onClick={() => setIsLiveMode(!isLiveMode)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
              isLiveMode 
                ? 'bg-green-600 border-green-500 text-white' 
                : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
            }`}
            title={isLiveMode ? 'Canlı mod açık' : 'Canlı mod kapalı'}
          >
            <Radio className="w-4 h-4" />
            <span className="text-sm">Canlı</span>
          </button>
        </div>
      </div>
    </div>
  );
}