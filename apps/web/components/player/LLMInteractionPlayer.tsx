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
  onLLMAction
}: LLMInteractionPlayerProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSuggestions, setChatSuggestions] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);

  // Initialize LLM interaction section - start directly with opening sentence
  useEffect(() => {
    if (!sessionId || isInitialized) return;

    const initializeSection = async () => {
      try {
        console.log('🚀 Initializing LLM interaction section:', section.title);
        
        // Don't load chat history - start fresh with LLM opening sentence
        setChatMessages([]);
        
        // Send initial greeting based on section purpose
        await sendInitialGreeting();

        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Failed to initialize section:', error);
        setIsInitialized(true); // Still mark as initialized to prevent infinite loop
      }
    };

    initializeSection();
  }, [sessionId, isInitialized]);

  // Send initial greeting
  const sendInitialGreeting = async () => {
    if (!sessionId) return;

    try {
      let initialMessage = '';
      
      if (section.description || section.script) {
        initialMessage = `# ETKİLEŞİM BÖLÜMÜ BAŞLATMA

**Eğitim:** ${trainingTitle}
**Bölüm:** ${section.title}
**Açıklama:** ${section.description || 'Açıklama yok'}
**Script:** ${section.script || 'Script yok'}

Bu bölümün amacına uygun şekilde kullanıcıya etkileşimli bir açılış cümlesi ile başla. Bölümün içeriğine göre uygun bir soru sor veya konuyu tanıt.`;
      } else {
        initialMessage = `# ETKİLEŞİM BÖLÜMÜ BAŞLATMA

**Eğitim:** ${trainingTitle}
**Bölüm:** ${section.title}

Bu etkileşim bölümünde kullanıcıya hoş geldin ve bölümün amacını belirt. Uygun bir soru sor veya konuyu tanıt.`;
      }

      console.log('📤 Sending initial greeting...');
      const response = await api.sendMessageToLLM(sessionId, initialMessage, 'system');
      
      // Add assistant message to chat
      const assistantMessage: ChatMessage = {
        id: `initial-${Date.now()}`,
        type: 'assistant',
        content: response.message,
        timestamp: response.timestamp,
        suggestions: response.suggestions
      };

      setChatMessages(prev => [...prev, assistantMessage]);
      setChatSuggestions(response.suggestions);
      
      // Track the message
      onTrackAssistantMessage(response.message);
      
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

      setChatMessages(prev => [...prev, assistantMessage]);
      setChatSuggestions(response.suggestions);
      
      // Track the response
      onTrackAssistantMessage(response.message);

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
        processingTime: response.processing_time_ms
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

      setChatMessages(prev => [...prev, errorMessage]);
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
           <div className="flex items-center gap-3">
             <span className="text-2xl">💬</span>
             <div>
               <h2 
                 className="text-xl font-semibold text-white cursor-help" 
                 title={section.description || ''}
               >
                 {section.title}
               </h2>
             </div>
           </div>
           <div className="flex items-center space-x-2">
             <button
               onClick={onNavigatePrevious}
               className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors"
             >
               <ArrowLeft className="w-3 h-3" />
               <span>Önceki</span>
             </button>
             <button
               onClick={onNavigateNext}
               className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors"
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