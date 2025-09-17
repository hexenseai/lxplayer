import React, { useEffect, useRef, useState } from 'react';
import { type TrainingSection } from '@/lib/api';
import { Send, ArrowLeft, ArrowRight } from 'lucide-react';
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
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);

  // Load existing messages when session is ready
  useEffect(() => {
    if (!sessionId || isInitialized) return;

    const loadMessages = async () => {
      try {
        console.log('📚 Loading existing messages for session:', sessionId);
        
        // Load existing messages
        const messages = await api.getSessionMessages(sessionId);
        
        const formattedMessages: ChatMessage[] = messages.map(msg => ({
          id: msg.id,
          type: msg.message_type === 'user' ? 'user' : 
                msg.message_type === 'assistant' ? 'assistant' : 'system',
          content: msg.message,
          timestamp: msg.timestamp,
          suggestions: msg.suggestions_json ? JSON.parse(msg.suggestions_json) : []
        }));

        setChatMessages(formattedMessages);
        console.log('📚 Loaded messages:', formattedMessages.length);

        // Send initial greeting if no messages exist
        if (formattedMessages.length === 0) {
          await sendInitialGreeting();
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Failed to load messages:', error);
        setIsInitialized(true); // Still mark as initialized to prevent infinite loop
      }
    };

    loadMessages();
  }, [sessionId, isInitialized]);

  // Send initial greeting
  const sendInitialGreeting = async () => {
    if (!sessionId) return;

    try {
      let initialMessage = '';
      
      if (section.description || section.script) {
        initialMessage = `Bu etkileşim bölümünde yukarıdaki açıklama ve script içeriğini kullanarak benimle etkileşim kur. Bölümün özel amacına uygun şekilde başla.`;
      } else {
        initialMessage = 'Merhaba! Etkileşim bölümüne hoş geldiniz. Lütfen kendinizi tanıtın ve eğitim hakkındaki beklentilerinizi paylaşın.';
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
          await onLLMAction(action);
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
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
            LLM Etkileşim
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigatePrevious}
            className="flex items-center space-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Önceki</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateNext}
            className="flex items-center space-x-1"
          >
            <span>Sonraki</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <div 
        ref={messagesScrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col"
      >
        {/* Spacer to push messages to bottom */}
        <div className="flex-1"></div>
        
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
              <p className="text-sm">{message.content}</p>
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
        <div className="p-4 bg-white border-t">
          <p className="text-sm text-gray-600 mb-2">Öneriler:</p>
          <div className="flex flex-wrap gap-2">
            {chatSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}


      {/* Chat Input */}
      <div className="p-4 bg-white border-t">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Mesajınızı yazın..."
            disabled={isLoading || !isInitialized}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <Button
            onClick={handleSubmit}
            disabled={!chatInput.trim() || isLoading || !isInitialized}
            className="flex items-center space-x-1"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}