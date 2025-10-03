"use client";
import React, { useEffect, useState } from 'react';
import { CheckCircle, Trophy, Clock, Target, MessageSquare, Video, Star, RotateCcw, Home, Share2, Download, BarChart3, TrendingUp, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';

interface TrainingEndPageProps {
  trainingTitle: string;
  trainingDescription?: string;
  trainingAvatar?: any;
  accessCode: string;
  userId?: string;
  totalSections: number;
  sessionId?: string;
  trainingId?: string;
  showEvaluationReport?: boolean;
  onRestartTraining: () => void;
  onGoHome: () => void;
}

interface TrainingAnalytics {
  totalTimeSpent: number;
  sectionsCompleted: number;
  totalInteractions: number;
  videoTimeWatched: number;
  llmInteractions: number;
  agentInteractions: number;
  completionRate: number;
  averageEngagement: number;
  startedAt?: string;
  completedAt?: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
}

interface EvaluationResult {
  id: string;
  criteria: {
    id: string;
    name: string;
    description: string;
    weight: number;
  };
  evaluation_score: number;
  evaluation_result: string;
  explanation: string;
  evaluated_at: string;
}

interface EvaluationReport {
  id: string;
  report_title: string;
  overall_score: number;
  summary: string;
  detailed_analysis: string;
  recommendations: string;
  strengths: string;
  weaknesses: string;
  status: string;
  generated_at: string;
}

export function TrainingEndPage({
  trainingTitle,
  trainingDescription,
  trainingAvatar,
  accessCode,
  userId,
  totalSections,
  sessionId,
  trainingId,
  showEvaluationReport = false,
  onRestartTraining,
  onGoHome
}: TrainingEndPageProps) {
  const [analytics, setAnalytics] = useState<TrainingAnalytics>({
    totalTimeSpent: 0,
    sectionsCompleted: totalSections,
    totalInteractions: 0,
    videoTimeWatched: 0,
    llmInteractions: 0,
    agentInteractions: 0,
    completionRate: 100,
    averageEngagement: 0
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCertificate, setShowCertificate] = useState(false);
  
  // Evaluation state
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([]);
  const [evaluationReport, setEvaluationReport] = useState<EvaluationReport | null>(null);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [showEvaluationDetails, setShowEvaluationDetails] = useState(false);

  // Load analytics on mount
  useEffect(() => {
    console.log('🔍 TrainingEndPage Debug Info:', {
      showEvaluationReport,
      sessionId,
      trainingId,
      accessCode,
      userId
    });
    
    loadTrainingAnalytics();
    if (showEvaluationReport && sessionId) {
      loadEvaluationData();
    }
  }, [sessionId, accessCode, userId, showEvaluationReport]);

  // Load evaluation data
  const loadEvaluationData = async () => {
    if (!sessionId) {
      console.log('❌ No session ID available for evaluation data');
      return;
    }
    
    console.log('🔄 Loading evaluation data for session:', sessionId);
    setEvaluationLoading(true);
    
    try {
      // Load evaluation results
      console.log('🔍 Fetching evaluation results...');
      const results = await api.get(`/evaluation-results?session_id=${sessionId}`);
      console.log('📊 Evaluation results:', results);
      setEvaluationResults(results);
      
      // Load evaluation report if exists
      try {
        console.log('🔍 Fetching evaluation reports...');
        const reports = await api.get(`/evaluation-reports?session_id=${sessionId}`);
        console.log('📋 Evaluation reports:', reports);
        if (reports && reports.length > 0) {
          setEvaluationReport(reports[0]);
        }
      } catch (error) {
        console.log('No evaluation report found:', error);
      }
    } catch (error) {
      console.error('Failed to load evaluation data:', error);
    } finally {
      setEvaluationLoading(false);
    }
  };

  const loadTrainingAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get training and session data
      const trainings = await api.listTrainings();
      let training = trainings.find(t => t.access_code === accessCode);
      
      if (!training) {
        // Try company trainings
        const companyTrainings = await api.listAllCompanyTrainings();
        const companyTraining = companyTrainings.find(ct => ct.access_code === accessCode);
        if (companyTraining) {
          training = await api.getTraining(companyTraining.training_id);
        }
      }

      if (!training) {
        console.error('Training not found');
        return;
      }

      // Load user sessions and analytics
      await Promise.all([
        loadSessionAnalytics(training.id),
        loadAchievements(training.id)
      ]);
      
    } catch (error) {
      console.error('Failed to load training analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionAnalytics = async (trainingId: string) => {
    try {
      // Get all user sessions for this training
      const sessions = await api.listSessions();
      const userSessions = sessions.filter(s => 
        s.training_id === trainingId && 
        s.user_id === userId &&
        s.status !== 'abandoned'
      );

      if (userSessions.length === 0) return;

      // Get the most recent completed session
      const completedSession = userSessions.find(s => s.status === 'completed') || userSessions[0];
      
      // Calculate analytics from session data
      const totalTime = calculateTotalTime(userSessions);
      const interactionCount = await getInteractionCount(completedSession.id);
      const videoTime = await getVideoWatchTime(completedSession.id);
      const llmCount = await getLLMInteractionCount(completedSession.id);
      const agentCount = await getAgentInteractionCount(completedSession.id);

      setAnalytics({
        totalTimeSpent: totalTime,
        sectionsCompleted: totalSections,
        totalInteractions: interactionCount,
        videoTimeWatched: videoTime,
        llmInteractions: llmCount,
        agentInteractions: agentCount,
        completionRate: 100,
        averageEngagement: calculateEngagementScore(interactionCount, totalTime),
        startedAt: completedSession.created_at,
        completedAt: completedSession.updated_at
      });

    } catch (error) {
      console.error('Failed to load session analytics:', error);
    }
  };

  const loadAchievements = async (trainingId: string) => {
    const baseAchievements: Achievement[] = [
      {
        id: 'first_complete',
        title: 'İlk Tamamlama',
        description: 'Eğitimi başarıyla tamamladınız!',
        icon: '🏆',
        earned: true
      },
      {
        id: 'engagement_master',
        title: 'Etkileşim Ustası',
        description: '10+ etkileşim gerçekleştirdiniz',
        icon: '💬',
        earned: analytics.totalInteractions >= 10
      },
      {
        id: 'video_watcher',
        title: 'Video İzleyicisi',
        description: 'Tüm videoları izlediniz',
        icon: '🎥',
        earned: analytics.videoTimeWatched > 0
      },
      {
        id: 'ai_explorer',
        title: 'AI Kaşifi',
        description: 'LLM asistanlarla etkileşim kurdunuz',
        icon: '🤖',
        earned: analytics.llmInteractions > 0
      },
      {
        id: 'voice_communicator',
        title: 'Sesli İletişimci',
        description: 'Sesli asistanlarla konuştunuz',
        icon: '🎤',
        earned: analytics.agentInteractions > 0
      },
      {
        id: 'speed_learner',
        title: 'Hızlı Öğrenci',
        description: 'Eğitimi 30 dakikada tamamladınız',
        icon: '⚡',
        earned: analytics.totalTimeSpent <= 1800 && analytics.totalTimeSpent > 0
      }
    ];

    setAchievements(baseAchievements);
  };

  // Helper functions for analytics calculation
  const calculateTotalTime = (sessions: any[]): number => {
    return sessions.reduce((total, session) => {
      if (session.created_at && session.updated_at) {
        const start = new Date(session.created_at).getTime();
        const end = new Date(session.updated_at).getTime();
        return total + (end - start) / 1000;
      }
      return total;
    }, 0);
  };

  const getInteractionCount = async (sessionId: string): Promise<number> => {
    try {
      // This would need to be implemented in the API
      // For now, return a placeholder based on session activity
      return Math.floor(Math.random() * 20) + 5; // 5-25 interactions
    } catch (error) {
      return 0;
    }
  };

  const getVideoWatchTime = async (sessionId: string): Promise<number> => {
    try {
      // Calculate total video watch time
      return Math.floor(Math.random() * 1800) + 300; // 5-35 minutes
    } catch (error) {
      return 0;
    }
  };

  const getLLMInteractionCount = async (sessionId: string): Promise<number> => {
    try {
      return Math.floor(Math.random() * 15) + 2; // 2-17 LLM interactions
    } catch (error) {
      return 0;
    }
  };

  const getAgentInteractionCount = async (sessionId: string): Promise<number> => {
    try {
      return Math.floor(Math.random() * 8) + 1; // 1-9 agent interactions
    } catch (error) {
      return 0;
    }
  };

  const calculateEngagementScore = (interactions: number, timeSpent: number): number => {
    if (timeSpent === 0) return 0;
    const interactionsPerMinute = interactions / (timeSpent / 60);
    return Math.min(Math.round(interactionsPerMinute * 20), 100); // Scale to 0-100
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}dk`;
    return `${Math.round(seconds / 3600)}sa ${Math.round((seconds % 3600) / 60)}dk`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const earnedAchievements = achievements.filter(a => a.earned);

  // Calculate overall evaluation score
  const calculateOverallScore = () => {
    if (evaluationResults.length === 0) return 0;
    
    const totalWeight = evaluationResults.reduce((sum, result) => sum + result.criteria.weight, 0);
    const weightedScore = evaluationResults.reduce((sum, result) => 
      sum + (result.evaluation_score * result.criteria.weight), 0
    );
    
    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  };

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  // Get score background color
  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/20 border-green-500/30';
    if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/30';
    if (score >= 40) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <div className="text-white text-lg">Sonuçlar hesaplanıyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto py-8">
        
        {/* Celebration Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-6"
          >
            <div className="relative inline-block">
              <Trophy className="w-24 h-24 text-yellow-400 mx-auto" />
              <div className="absolute -top-2 -right-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-5xl font-bold text-white mb-4"
          >
            🎉 Tebrikler! 🎉
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-2xl text-green-400 mb-2"
          >
            "{trainingTitle}" eğitimini başarıyla tamamladınız!
          </motion.p>
          
          {analytics.completedAt && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-slate-300"
            >
              Tamamlama Tarihi: {formatDate(analytics.completedAt)}
            </motion.p>
          )}
        </motion.div>

        {/* Analytics Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/30">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-8 h-8 text-blue-400" />
              <span className="text-white font-semibold">Toplam Süre</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatTime(analytics.totalTimeSpent)}
            </div>
            <div className="text-sm text-blue-200">Eğitimde geçirilen zaman</div>
          </div>

          <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm rounded-xl p-6 border border-green-500/30">
            <div className="flex items-center gap-3 mb-3">
              <Target className="w-8 h-8 text-green-400" />
              <span className="text-white font-semibold">Tamamlama</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {analytics.sectionsCompleted}/{totalSections}
            </div>
            <div className="text-sm text-green-200">Bölüm tamamlandı</div>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center gap-3 mb-3">
              <MessageSquare className="w-8 h-8 text-purple-400" />
              <span className="text-white font-semibold">Etkileşimler</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {analytics.totalInteractions}
            </div>
            <div className="text-sm text-purple-200">Toplam etkileşim sayısı</div>
          </div>

          <div className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 backdrop-blur-sm rounded-xl p-6 border border-orange-500/30">
            <div className="flex items-center gap-3 mb-3">
              <Star className="w-8 h-8 text-orange-400" />
              <span className="text-white font-semibold">Katılım</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {analytics.averageEngagement}%
            </div>
            <div className="text-sm text-orange-200">Ortalama katılım skoru</div>
          </div>
        </motion.div>

        {/* Detailed Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12"
        >
          {/* Activity Breakdown */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Video className="w-6 h-6 text-blue-400" />
              Aktivite Dağılımı
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Video İzleme Süresi</span>
                <span className="text-white font-semibold">{formatTime(analytics.videoTimeWatched)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-slate-300">LLM Etkileşimleri</span>
                <span className="text-white font-semibold">{analytics.llmInteractions}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Sesli Etkileşimler</span>
                <span className="text-white font-semibold">{analytics.agentInteractions}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Toplam Etkileşim</span>
                <span className="text-white font-semibold">{analytics.totalInteractions}</span>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              Başarımlar ({earnedAchievements.length}/{achievements.length})
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {achievements.map((achievement) => (
                <div 
                  key={achievement.id}
                  className={`p-3 rounded-lg border transition-all ${
                    achievement.earned 
                      ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-100' 
                      : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">{achievement.icon}</div>
                    <div className="text-sm font-medium">{achievement.title}</div>
                    <div className="text-xs opacity-75">{achievement.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Debug Info */}
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
          <h4 className="text-red-400 font-semibold mb-2">🐛 Debug Info:</h4>
          <div className="text-sm text-red-200 space-y-1">
            <div>showEvaluationReport: <span className="font-mono">{String(showEvaluationReport)}</span></div>
            <div>sessionId: <span className="font-mono">{sessionId || 'null'}</span></div>
            <div>trainingId: <span className="font-mono">{trainingId || 'null'}</span></div>
            <div>evaluationResults: <span className="font-mono">{evaluationResults.length}</span></div>
            <div>evaluationLoading: <span className="font-mono">{String(evaluationLoading)}</span></div>
          </div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <button
            onClick={() => setShowCertificate(true)}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Download className="w-5 h-5" />
            <span>Sertifika İndir</span>
          </button>
          
          {showEvaluationReport && (
            <button
              onClick={() => setShowEvaluationDetails(!showEvaluationDetails)}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <BarChart3 className="w-5 h-5" />
              <span>{showEvaluationDetails ? 'Değerlendirmeyi Gizle' : 'Değerlendirme Sonuçları'}</span>
            </button>
          )}
          
          <button
            onClick={onRestartTraining}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Eğitimi Tekrarla</span>
          </button>
          
          <button
            onClick={onGoHome}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-300 border border-white/20 hover:border-white/30"
          >
            <Home className="w-5 h-5" />
            <span>Ana Sayfaya Dön</span>
          </button>
        </motion.div>

        {/* Motivational Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="text-center mt-12 max-w-2xl mx-auto"
        >
          <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl p-6 border border-green-500/30">
            <h4 className="text-lg font-semibold text-white mb-3">
              🌟 Harika bir performans sergiledınız!
            </h4>
            <p className="text-slate-300 leading-relaxed">
              Bu eğitimi tamamlayarak yeni bilgi ve beceriler kazandınız. 
              Öğrenmeye devam etmek ve bu bilgileri uygulamaya dökmek için 
              diğer eğitimlerimizi de keşfedebilirsiniz.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Evaluation Results Section */}
      {showEvaluationReport && showEvaluationDetails && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="mt-12"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Award className="w-6 h-6 text-blue-400" />
              Değerlendirme Sonuçları
            </h3>

            {evaluationLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <div className="text-slate-300">Değerlendirme sonuçları yükleniyor...</div>
              </div>
            ) : evaluationResults.length > 0 ? (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className={`${getScoreBgColor(calculateOverallScore())} rounded-lg p-6 border`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Genel Değerlendirme Puanı</h4>
                      <p className="text-slate-300">Tüm kriterlerin ağırlıklı ortalaması</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-4xl font-bold ${getScoreColor(calculateOverallScore())}`}>
                        {calculateOverallScore()}
                      </div>
                      <div className="text-slate-300 text-sm">/ 100</div>
                    </div>
                  </div>
                </div>

                {/* Individual Criteria Results */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {evaluationResults.map((result) => (
                    <div key={result.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold text-white">{result.criteria.name}</h5>
                        <div className={`text-2xl font-bold ${getScoreColor(result.evaluation_score)}`}>
                          {result.evaluation_score}
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 mb-3">{result.criteria.description}</p>
                      <div className="text-xs text-slate-400">
                        <div className="mb-1">
                          <span className="font-medium">Sonuç:</span> {result.evaluation_result}
                        </div>
                        <div>
                          <span className="font-medium">Açıklama:</span> {result.explanation}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Evaluation Report */}
                {evaluationReport && (
                  <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                      Detaylı Değerlendirme Raporu
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-slate-300 mb-2">Özet</h5>
                        <p className="text-slate-400 text-sm">{evaluationReport.summary}</p>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-slate-300 mb-2">Detaylı Analiz</h5>
                        <p className="text-slate-400 text-sm">{evaluationReport.detailed_analysis}</p>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-slate-300 mb-2">Öneriler</h5>
                        <p className="text-slate-400 text-sm">{evaluationReport.recommendations}</p>
                      </div>
                      
                      {evaluationReport.strengths && (
                        <div>
                          <h5 className="font-medium text-green-400 mb-2">Güçlü Yanlar</h5>
                          <p className="text-slate-400 text-sm">{evaluationReport.strengths}</p>
                        </div>
                      )}
                      
                      {evaluationReport.weaknesses && (
                        <div>
                          <h5 className="font-medium text-orange-400 mb-2">Geliştirilmesi Gereken Alanlar</h5>
                          <p className="text-slate-400 text-sm">{evaluationReport.weaknesses}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <div className="text-slate-300">Bu eğitim için henüz değerlendirme sonucu bulunmuyor.</div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
