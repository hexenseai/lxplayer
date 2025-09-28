"use client";
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useUser } from '@/hooks/useUser';

interface UserInteraction {
  id: string;
  user_id: string | null;
  training_id: string;
  session_id: string;
  company_id: string | null;
  timestamp: string;
  interaction_type: string;
  section_id: string | null;
  overlay_id: string | null;
  video_time: number | null;
  duration: number | null;
  content: string | null;
  interaction_metadata: string;
  response_time: number | null;
  success: boolean;
  user?: {
    id: string;
    email: string;
    username?: string | null;
    full_name?: string | null;
  } | null;
  training?: {
    id: string;
    title: string;
    description?: string | null;
  } | null;
  session?: {
    id: string;
    started_at: string;
    ended_at?: string | null;
    status: string;
  } | null;
  section?: {
    id: string;
    title: string;
    order_index: number;
  } | null;
  overlay?: {
    id: string;
    type: string;
    caption?: string | null;
    time_stamp: number;
  } | null;
  company?: {
    id: string;
    name: string;
  } | null;
}

interface TrainingSummary {
  training_id: string;
  training?: {
    id: string;
    title: string;
    description?: string | null;
  } | null;
  sessions: Record<string, {
    session_id: string;
    session?: {
      id: string;
      started_at: string;
      ended_at?: string | null;
      status: string;
      total_duration?: number | null;
      completion_percentage?: number | null;
    } | null;
    interactions: UserInteraction[];
    interaction_count: number;
  }>;
  total_interactions: number;
  first_interaction?: string | null;
  last_interaction?: string | null;
}

export default function UserInteractionsPage() {
  const { user, loading: userLoading, isSuperAdmin, isAdmin } = useUser();
  const [interactions, setInteractions] = useState<UserInteraction[]>([]);
  const [trainingSummaries, setTrainingSummaries] = useState<TrainingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'by-training' | 'by-session'>('list');
  const [filterType, setFilterType] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);

  useEffect(() => {
    if (isSuperAdmin || isAdmin) {
      fetchData();
    }
  }, [isSuperAdmin, isAdmin, userLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch users and trainings for filters
      const usersData = await api.listUsers();
      const trainingsData = await api.listTrainings();
      
      // Admin kullanıcılar sadece kendi şirketlerindeki kullanıcıları görebilir
      let filteredUsers = usersData;
      if (!isSuperAdmin && isAdmin) {
        // Admin ise, sadece kendi şirketindeki kullanıcıları göster
        const currentUserCompany = user?.company_id;
        if (currentUserCompany) {
          filteredUsers = usersData.filter(u => u.company_id === currentUserCompany);
        }
      }
      
      setUsers(filteredUsers);
      setTrainings(trainingsData);
      
      // Fetch all interactions (backend zaten access control yapıyor)
      const interactionsData = await api.getUserInteractions({ limit: 1000 });
      setInteractions(interactionsData);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainingSummaries = async (userId: string) => {
    try {
      const summaries = await api.getUserTrainingInteractions(userId);
      setTrainingSummaries(summaries);
    } catch (error) {
      console.error('Error fetching training summaries:', error);
    }
  };

  const filteredInteractions = interactions.filter(interaction => {
    if (selectedUserId && interaction.user_id !== selectedUserId) return false;
    if (selectedTrainingId && interaction.training_id !== selectedTrainingId) return false;
    if (selectedSessionId && interaction.session_id !== selectedSessionId) return false;
    if (filterType && interaction.interaction_type !== filterType) return false;
    return true;
  });

  const getInteractionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'play': 'bg-green-100 text-green-800',
      'pause': 'bg-yellow-100 text-yellow-800',
      'seek': 'bg-blue-100 text-blue-800',
      'section_change': 'bg-purple-100 text-purple-800',
      'chat_message': 'bg-indigo-100 text-indigo-800',
      'llm_response': 'bg-pink-100 text-pink-800',
      'overlay_click': 'bg-orange-100 text-orange-800',
      'navigation': 'bg-gray-100 text-gray-800',
      'training_start': 'bg-green-100 text-green-800',
      'training_end': 'bg-red-100 text-red-800',
      'training_resume': 'bg-blue-100 text-blue-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('tr-TR');
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Kullanıcı Etkileşimleri</h1>
        <p className="text-slate-600">Kullanıcıların eğitimlerle olan etkileşimlerini inceleyin</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı</label>
            <select
              value={selectedUserId || ''}
              onChange={(e) => setSelectedUserId(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Tüm kullanıcılar</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.username || user.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Eğitim</label>
            <select
              value={selectedTrainingId || ''}
              onChange={(e) => setSelectedTrainingId(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Tüm eğitimler</option>
              {trainings.map(training => (
                <option key={training.id} value={training.id}>
                  {training.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Etkileşim Türü</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Tüm türler</option>
              <option value="play">Play</option>
              <option value="pause">Pause</option>
              <option value="seek">Seek</option>
              <option value="section_change">Section Change</option>
              <option value="chat_message">Chat Message</option>
              <option value="llm_response">LLM Response</option>
              <option value="overlay_click">Overlay Click</option>
              <option value="navigation">Navigation</option>
              <option value="training_start">Training Start</option>
              <option value="training_end">Training End</option>
              <option value="training_resume">Training Resume</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Görünüm</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="list">Liste</option>
              <option value="by-training">Eğitim Bazında</option>
              <option value="by-session">Oturum Bazında</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedUserId(null);
                setSelectedTrainingId(null);
                setSelectedSessionId(null);
                setFilterType('');
                setViewMode('list');
              }}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Temizle
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {viewMode === 'list' && `${filteredInteractions.length} etkileşim`}
              {viewMode === 'by-training' && 'Eğitim Bazında Görünüm'}
              {viewMode === 'by-session' && 'Oturum Bazında Görünüm'}
            </h2>
            {selectedUserId && (
              <button
                onClick={() => fetchTrainingSummaries(selectedUserId)}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              >
                Eğitim Özetleri
              </button>
            )}
          </div>
        </div>

        {viewMode === 'list' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kullanıcı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Eğitim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tür
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zaman
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Video Zamanı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Süre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Başarı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İçerik
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInteractions.map((interaction) => (
                  <tr key={interaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {interaction.user?.full_name || interaction.user?.username || interaction.user?.email || 'Bilinmeyen'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {interaction.training?.title || 'Bilinmeyen Eğitim'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getInteractionTypeColor(interaction.interaction_type)}`}>
                        {interaction.interaction_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTimestamp(interaction.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {interaction.video_time ? `${Math.floor(interaction.video_time / 60)}:${(interaction.video_time % 60).toString().padStart(2, '0')}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(interaction.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${interaction.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {interaction.success ? 'Başarılı' : 'Başarısız'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {interaction.content || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'by-training' && trainingSummaries.length > 0 && (
          <div className="p-4">
            {trainingSummaries.map((summary) => (
              <div key={summary.training_id} className="mb-6 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {summary.training?.title || 'Bilinmeyen Eğitim'}
                  </h3>
                  <div className="text-sm text-gray-600">
                    {summary.total_interactions} etkileşim
                  </div>
                </div>
                
                <div className="space-y-3">
                  {Object.entries(summary.sessions).map(([sessionId, sessionData]) => (
                    <div key={sessionId} className="border-l-4 border-primary-500 pl-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium text-gray-900">
                          Oturum: {sessionId.slice(0, 8)}...
                        </div>
                        <div className="text-sm text-gray-600">
                          {sessionData.interaction_count} etkileşim
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        Başlangıç: {formatTimestamp(sessionData.session?.started_at || '')}
                        {sessionData.session?.ended_at && (
                          <span> - Bitiş: {formatTimestamp(sessionData.session.ended_at)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredInteractions.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Etkileşim bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              Seçilen filtreler için herhangi bir etkileşim bulunamadı.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
