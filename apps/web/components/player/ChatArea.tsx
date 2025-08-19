'use client';
import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatAreaProps, LLMMessage } from '@/lib/types';

export function ChatArea({
  messages,
  onSendMessage,
  currentMessage,
  onMessageChange,
  isMicrophoneActive,
  onToggleMicrophone
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed right-4 bottom-20 w-80 h-96 bg-gray-900 bg-opacity-95 backdrop-blur-sm rounded-lg border border-gray-700 z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h3 className="text-white font-medium">AI Sohbet</h3>
        <button
          onClick={onToggleMicrophone}
          className={`p-1 rounded transition-colors ${
            isMicrophoneActive 
              ? 'bg-red-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
          title={isMicrophoneActive ? "Mikrofonu Kapat" : "Mikrofonu Aç"}
        >
          <div className="w-3 h-3 rounded-full bg-current"></div>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-white'
                }`}
              >
                <div className="text-sm">{message.content}</div>
                <div className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-purple-200' : 'text-gray-400'
                }`}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-700">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (currentMessage.trim()) {
                  onSendMessage(currentMessage.trim());
                  onMessageChange('');
                }
              }
            }}
            placeholder="Mesajınızı yazın..."
            className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none placeholder-gray-400 text-sm"
          />
          <button
            onClick={() => {
              if (currentMessage.trim()) {
                onSendMessage(currentMessage.trim());
                onMessageChange('');
              }
            }}
            disabled={!currentMessage.trim()}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
}

export function SubtitlesOverlay({ 
  currentScript, 
  aiResponse, 
  showSubtitles 
}: { 
  currentScript?: string; 
  aiResponse?: string; 
  showSubtitles: boolean; 
}) {
  if (!showSubtitles) return null;

  return (
    <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-50 max-w-4xl w-full px-4">
      <div className="bg-black bg-opacity-90 backdrop-blur-sm rounded-lg p-4 text-center shadow-2xl border border-gray-600">
        {currentScript && (
          <div className="text-white text-lg mb-2 font-medium">
            {currentScript}
          </div>
        )}
        {aiResponse && (
          <div className="text-purple-300 text-base font-semibold">
            🤖 AI: {aiResponse}
          </div>
        )}
      </div>
    </div>
  );
}
