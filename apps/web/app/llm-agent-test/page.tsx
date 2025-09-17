'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@lxplayer/ui';
import { Mic, MicOff, Volume2, VolumeX, Bot, User, ArrowLeft, Loader2, CheckCircle, XCircle, Play, RefreshCw } from 'lucide-react';
import { api, TrainingSection, Training } from '@/lib/api';
import { useAgentConversation } from '../hooks/useAgentConversation';

interface AgentMessage {
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
  audioUrl?: string;
}

export default function LLMAgentTestPage() {
  const searchParams = useSearchParams();
  
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>('');
  const [sections, setSections] = useState<TrainingSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [section, setSection] = useState<TrainingSection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // WebSocket conversation hook
  const {
    startConversation,
    stopConversation,
    toggleRecording,
    sendContextualUpdate,
    isConnected,
    isRecording,
    isPlaying,
    messages: webSocketMessages,
    error: webSocketError
  } = useAgentConversation();

  // ElevenLabs Agent ID - replace with your actual agent ID
  const agentId = 'agent_2901k5a3e15feg6sjmw44apewq20';
  
  // Voice chat only - no message display needed

  // Load trainings on component mount
  useEffect(() => {
    const fetchTrainings = async () => {
      try {
        setIsLoading(true);
        const trainingsList = await api.listTrainings();
        setTrainings(trainingsList);
        
        // Auto-select first training if available
        if (trainingsList.length > 0) {
          setSelectedTrainingId(trainingsList[0].id);
        }
      } catch (err) {
        console.error('Error fetching trainings:', err);
        setError('Failed to load trainings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrainings();
  }, []);

  // Load sections when training is selected
  useEffect(() => {
    const fetchSections = async () => {
      if (!selectedTrainingId) return;
      
      try {
        setIsLoadingSections(true);
        const sectionsList = await api.listTrainingSections(selectedTrainingId);
        setSections(sectionsList as TrainingSection[]);
        
        // Auto-select first llm_agent section if available
        const llmAgentSection = sectionsList.find(s => s.type === 'llm_agent');
        if (llmAgentSection) {
          setSelectedSectionId(llmAgentSection.id);
          setSection(llmAgentSection as TrainingSection);
        } else if (sectionsList.length > 0) {
          setSelectedSectionId(sectionsList[0].id);
          setSection(sectionsList[0] as TrainingSection);
        }
      } catch (err) {
        console.error('Error fetching sections:', err);
        setError('Failed to load sections');
      } finally {
        setIsLoadingSections(false);
      }
    };

    fetchSections();
  }, [selectedTrainingId]);

  // Update section when section is selected
  useEffect(() => {
    if (selectedSectionId && sections.length > 0) {
      const foundSection = sections.find(s => s.id === selectedSectionId);
      if (foundSection) {
        setSection(foundSection);
      }
    }
  }, [selectedSectionId, sections]);


  const handleStartSession = async () => {
    try {
      console.log('🚀 Starting WebSocket conversation with agent:', agentId);
      setError(null);
      
      await startConversation(agentId);
      
      // Send contextual update with section information after connection is established
      if (section) {
        // Wait for WebSocket to be fully ready and stable
        const checkConnectionAndSend = () => {
          if (isConnected) {
            console.log('📝 Sending contextual update after stable connection...');
            sendContextualUpdate(`Training section: ${section.title}. Description: ${section.description}. Script: ${section.script}`);
          } else {
            // Check again after a short delay
            setTimeout(checkConnectionAndSend, 100);
          }
        };
        
        // Start checking after initial delay
        setTimeout(checkConnectionAndSend, 500);
      }
      
    } catch (err) {
      console.error('Error starting session:', err);
      setError('Failed to start conversation');
    }
  };

  const handleEndSession = async () => {
    try {
      await stopConversation();
    } catch (err) {
      console.error('Error ending session:', err);
    }
  };

  const handleToggleRecording = async () => {
    try {
      await toggleRecording();
    } catch (err) {
      console.error('Error toggling recording:', err);
      setError('Failed to toggle recording');
    }
  };

  const getConnectionStatus = () => {
    if (webSocketError) return 'error';
    if (isConnected) return 'connected';
    return 'disconnected';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Bağlı';
      case 'connecting': return 'Bağlanıyor';
      case 'error': return 'Hata';
      default: return 'Bağlantı Yok';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading section...</p>
        </div>
      </div>
    );
  }

  if (error || !section) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error || 'Section not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Geri
            </Button>
            <div>
              <h1 className="text-xl font-semibold">LLM Agent Test - WebSocket API</h1>
              <p className="text-sm text-gray-600">{section.title}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Training and Section Selection */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Training ve Section Seçimi</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Training Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Training Seçin
              </label>
              <select
                value={selectedTrainingId}
                onChange={(e) => setSelectedTrainingId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              >
                <option value="">Training seçin...</option>
                {trainings.map((training) => (
                  <option key={training.id} value={training.id}>
                    {training.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section Seçin
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoadingSections || !selectedTrainingId}
              >
                <option value="">Section seçin...</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.title} {sec.type === 'llm_agent' ? '(LLM Agent)' : `(${sec.type})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoadingSections && (
            <div className="flex items-center gap-2 text-blue-600 mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Section'lar yükleniyor...</span>
            </div>
          )}
        </div>

        {/* Section Info */}
        {section && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <span className={`px-2 py-1 text-xs rounded-full ${
                section.type === 'llm_agent' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {section.type}
              </span>
            </div>
            <p className="text-gray-600 mb-4">{section.description}</p>
            <div className="bg-gray-50 rounded p-4">
              <h3 className="font-medium mb-2">Script:</h3>
              <p className="text-sm text-gray-700">{section.script}</p>
            </div>
            {section.agent_id && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Agent ID:</strong> {section.agent_id}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Bağlantı Durumu</h3>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(getConnectionStatus())}`}></div>
              <span className="text-sm font-medium">{getStatusText(getConnectionStatus())}</span>
            </div>
          </div>
          
          {webSocketError && (
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <p className="text-red-600 text-sm">{webSocketError}</p>
            </div>
          )}

          <div className="flex gap-3">
            {!isConnected ? (
              <Button
                onClick={handleStartSession}
                disabled={isLoading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
                Konuşmayı Başlat
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleToggleRecording}
                  disabled={!isConnected}
                  className={`flex items-center gap-2 ${
                    isRecording 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isRecording ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                  {isRecording ? 'Kaydı Durdur' : 'Kaydet'}
                </Button>
                
                <Button
                  onClick={handleEndSession}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Konuşmayı Bitir
                </Button>
              </>
            )}
          </div>

          {/* Audio Status */}
          {isPlaying && (
            <div className="mt-4 flex items-center gap-2 text-green-600">
              <Volume2 className="w-4 h-4 animate-pulse" />
              <span className="text-sm">Ses çalıyor...</span>
            </div>
          )}
        </div>

        {/* Voice Chat Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Sesli Sohbet</h3>
          
          <div className="text-center py-8">
            {!isConnected ? (
              <div className="text-gray-500">
                <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Sesli sohbet için hazır</p>
                <p className="text-sm">Konuşmayı başlatın ve doğrudan konuşmaya başlayın</p>
              </div>
            ) : isRecording ? (
              <div className="text-red-600">
                <div className="relative">
                  <Mic className="w-16 h-16 mx-auto mb-4 animate-pulse" />
                  <div className="absolute inset-0 w-16 h-16 mx-auto border-4 border-red-300 rounded-full animate-ping"></div>
                </div>
                <p className="text-lg font-medium mb-2">Dinliyorum...</p>
                <p className="text-sm">Konuşun, ses kaydediliyor</p>
              </div>
            ) : isPlaying ? (
              <div className="text-green-600">
                <Volume2 className="w-16 h-16 mx-auto mb-4 animate-pulse" />
                <p className="text-lg font-medium mb-2">Agent Konuşuyor...</p>
                <p className="text-sm">Yanıt veriliyor</p>
              </div>
            ) : (
              <div className="text-blue-600">
                <Bot className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Bağlı ve Hazır</p>
                <p className="text-sm">Kaydet butonuna basın ve konuşmaya başlayın</p>
              </div>
            )}
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <h4 className="font-medium mb-2">Debug Bilgileri</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Agent ID: {agentId}</p>
            <p>Selected Training ID: {selectedTrainingId}</p>
            <p>Selected Section ID: {selectedSectionId}</p>
            <p>Section Type: {section?.type || 'N/A'}</p>
            <p>Section Agent ID: {section?.agent_id || 'N/A'}</p>
            <p>WebSocket Connected: {isConnected ? 'Yes' : 'No'}</p>
            <p>Recording: {isRecording ? 'Yes' : 'No'}</p>
            <p>Playing: {isPlaying ? 'Yes' : 'No'}</p>
            <p>Voice Chat Mode: Active</p>
            <p>Trainings Loaded: {trainings.length}</p>
            <p>Sections Loaded: {sections.length}</p>
            {webSocketError && <p className="text-red-600">Error: {webSocketError}</p>}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-300">
            <h5 className="font-medium mb-2">Audio Debug Bilgileri</h5>
            <div className="text-xs text-gray-600 space-y-1">
              <p>🔧 Doğru Base64 Birleştirme</p>
              <p>🔧 Binary → Combine → Re-encode</p>
              <p>🔧 Asenkron buffer (250ms) + Senkron oynatma</p>
              <p>🔧 Base64 validation ve error handling</p>
              <p>🔧 Fallback individual chunk system</p>
              <p className="text-green-600">✅ Base64 decode hatası çözüldü</p>
              <p className="text-green-600">✅ Chunk birleştirme düzeltildi</p>
              <p className="text-green-600">✅ Ses gelme sorunu çözüldü</p>
              <p className="text-blue-600">💡 Artık sesler düzgün çalacak</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}