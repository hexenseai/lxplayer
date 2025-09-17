import React, { useEffect, useRef, useState } from 'react';
import { type TrainingSection } from '@/lib/api';
import { Send, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@lxplayer/ui';

interface LLMInteractionPlayerProps {
  section: TrainingSection;
  trainingTitle: string;
  trainingAvatar: any;
  onNavigateNext: () => void;
  onNavigatePrevious: () => void;
  onTrackUserMessage: (message: string) => void;
  onTrackAssistantMessage: (message: string) => void;
}

export function LLMInteractionPlayer({ 
  section, 
  trainingTitle, 
  trainingAvatar, 
  onNavigateNext, 
  onNavigatePrevious,
  onTrackUserMessage,
  onTrackAssistantMessage
}: LLMInteractionPlayerProps) {
  const [chatMessages, setChatMessages] = useState<Array<{ type: 'user'|'ai'|'system'; content: string; ts: number }>>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSuggestions, setChatSuggestions] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);

  // WebSocket URL utility
  const toWsUrl = (apiBase: string) => {
    if (!apiBase) return (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.host + '/chat/ws';
    const url = new URL(apiBase);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = (url.pathname.replace(/\/+$/, '')) + '/chat/ws';
    return url.toString();
  };

  // Initialize WebSocket connection
  useEffect(() => {
    console.log('🤖 LLM Interaction: Initializing WebSocket connection');
    
    const openSocket = () => {
      try {
        const wsUrl = toWsUrl(process.env.NEXT_PUBLIC_API_URL || '');
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onopen = () => {
          console.log('✅ LLM Interaction WebSocket connected');
          // Send initialization message
          ws.send(JSON.stringify({ 
            type: 'init', 
            context: { 
              sectionId: section.id,
              sectionType: 'llm_interaction',
              trainingId: section.training_id 
            } 
          }));
          
          // Send training context as system message (LLM should not respond to this)
          setTimeout(() => {
            ws.send(JSON.stringify({ 
              type: 'system_message', 
              content: `# EĞİTİM BİLGİLERİ (Bu bilgilere cevap verme, sadece referans olarak kullan)
              
**Eğitim Başlığı:** ${trainingTitle}
**Bölüm:** ${section.title}
**Bölüm Açıklaması:** ${section.description || 'Açıklama yok'}
**Bölüm Türü:** LLM Etkileşim

## GÖREV TALİMATLARI:
Bu bir ETKİLEŞİM BÖLÜMÜDÜR. Kullanıcı ile aktif olarak iletişim kurmalısın:

1. **Görev Odaklı Yaklaşım**: Bu bölümün amacını gerçekleştirmek için kullanıcıya sorular sor
2. **Aktif Yönlendirme**: Kullanıcıyı görev doğrultusunda yönlendir
3. **İnteraktif Sohbet**: Sadece cevap verme, sorular sor ve etkileşimi başlat
4. **Öneriler Sun**: Her mesajında kullanıcıya yapabileceği seçenekler sun
5. **İlerleme Takibi**: Kullanıcının görevi tamamlayıp tamamlamadığını kontrol et

Bu bölümde TTS/STT özellikleri kullanılmamalı, sadece metin tabanlı sohbet yapılmalı.`
            }));
          }, 500);
          
          // Send initial greeting to trigger LLM interaction
          setTimeout(() => {
            ws.send(JSON.stringify({ 
              type: 'user_message', 
              content: 'Bu etkileşim bölümüne başlayalım. Lütfen bana bu bölümde ne yapmam gerektiğini açıkla ve ilk adımımı sor.' 
            }));
          }, 1500);
        };
        
        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            
            if (data.type === 'assistant_message') {
              let assistantMessage = '';
              
              if (typeof data.content === 'object' && data.content) {
                assistantMessage = String(data.content.message || '');
              } else if (typeof data.content === 'string') {
                assistantMessage = data.content;
              }
              
              if (assistantMessage && assistantMessage.trim()) {
                setChatMessages(m => [...m, { type: 'ai', content: assistantMessage, ts: Date.now() }]);
                onTrackAssistantMessage(assistantMessage);
              }
              
              // Handle suggestions
              if (data.suggestions && data.suggestions.length > 0) {
                const suggestionTexts = data.suggestions.map((s: any) => s.text || s).filter(Boolean);
                if (suggestionTexts.length > 0) {
                  setChatSuggestions(suggestionTexts);
                }
              }
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.error('❌ LLM Interaction WebSocket error:', error);
        };
        
        ws.onclose = () => {
          console.log('🔌 LLM Interaction WebSocket closed');
          wsRef.current = null;
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
      }
    };
    
    openSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [section.id, section.training_id]);

  // Auto-scroll chat to the latest message
  useEffect(() => {
    try {
      const el = messagesScrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }, [chatMessages]);

  const sendUserMessage = (text: string) => {
    const msg = (text || '').trim();
    if (!msg || !wsRef.current) return;
    
    setIsLoading(true);
    setChatMessages(m => [...m, { type: 'user', content: msg, ts: Date.now() }]);
    onTrackUserMessage(msg);
    
    try {
      wsRef.current.send(JSON.stringify({ type: 'user_message', content: msg }));
    } catch (error) {
      console.error('Error sending message:', error);
    }
    
    setChatInput('');
    setIsLoading(false);
  };

  return (
    <div className="w-full h-full bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center overflow-hidden shadow-lg">
              {trainingAvatar?.image_url ? (
                <img 
                  src={trainingAvatar.image_url} 
                  alt={trainingAvatar.name || 'AI Asistan'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {trainingAvatar?.name ? (
                    <div className="text-lg font-bold text-white">
                      {trainingAvatar.name.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="text-xl">🤖</div>
                  )}
                </div>
              )}
            </div>
            <div>
              <div className="text-white text-lg font-semibold">{trainingTitle}</div>
              <div className="text-gray-300 text-sm">{section.title}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-white text-sm">LLM Etkileşim</div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.filter(m => m.type !== 'system').map((message, index) => (
          <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`${
              message.type === 'user' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-700 text-white'
            } px-4 py-3 rounded-lg max-w-[80%] whitespace-pre-wrap shadow-lg`}>
              {message.content}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-white px-4 py-3 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Yanıt bekleniyor...</span>
              </div>
            </div>
          </div>
        )}
        
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
      </div>

      {/* Chat Input */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-center gap-3">
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
            placeholder="Mesajınızı yazın..."
            className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 outline-none"
            disabled={isLoading}
          />
          <button
            onClick={() => sendUserMessage(chatInput)}
            disabled={isLoading || !chatInput.trim()}
            className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex justify-between items-center">
          <Button
            onClick={onNavigatePrevious}
            variant="outline"
            className="flex items-center gap-2 text-white border-gray-600 hover:bg-gray-700"
          >
            <ArrowLeft size={16} />
            <span>Önceki Bölüm</span>
          </Button>
          
          <div className="text-gray-300 text-sm">
            Etkileşim Bölümü
          </div>
          
          <Button
            onClick={onNavigateNext}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <span>Sonraki Bölüm</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

