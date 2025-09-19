"use client";
import React, { useEffect, useState } from 'react';
import { Play, RotateCcw, Clock, BookOpen, Users, Target, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';

interface TrainingStartPageProps {
  trainingTitle: string;
  trainingDescription?: string;
  trainingAvatar?: any;
  accessCode: string;
  userId?: string;
  totalSections: number;
  onStartTraining: () => void;
  onResumeTraining: (sectionIndex: number) => void;
}

interface ProgressInfo {
  lastCompletedSection?: number;
  totalProgress: number;
  timeSpent: number;
  hasStarted: boolean;
}

export function TrainingStartPage({
  trainingTitle,
  trainingDescription,
  trainingAvatar,
  accessCode,
  userId,
  totalSections,
  onStartTraining,
  onResumeTraining
}: TrainingStartPageProps) {
  const [progressInfo, setProgressInfo] = useState<ProgressInfo>({
    totalProgress: 0,
    timeSpent: 0,
    hasStarted: false
  });
  const [loading, setLoading] = useState(true);

  // Load user progress on mount
  useEffect(() => {
    loadUserProgress();
  }, [accessCode, userId]);

  const loadUserProgress = async () => {
    try {
      setLoading(true);
      
      // Get training info
      const trainings = await api.listTrainings();
      const training = trainings.find(t => t.access_code === accessCode);
      
      if (!training) {
        // Try company trainings
        const companyTrainings = await api.listAllCompanyTrainings();
        const companyTraining = companyTrainings.find(ct => ct.access_code === accessCode);
        if (companyTraining) {
          // Load progress from company training
          await loadCompanyTrainingProgress(companyTraining.training_id);
        }
      } else {
        // Load progress from regular training
        await loadTrainingProgress(training.id);
      }
    } catch (error) {
      console.error('Failed to load user progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainingProgress = async (trainingId: string) => {
    try {
      // Get user sessions for this training
      const sessions = await api.listSessions();
      const userSessions = sessions.filter(s => 
        s.training_id === trainingId && 
        s.user_id === userId &&
        s.status !== 'abandoned'
      );

      if (userSessions.length === 0) {
        setProgressInfo({
          totalProgress: 0,
          timeSpent: 0,
          hasStarted: false
        });
        return;
      }

      // Get the most recent session
      const latestSession = userSessions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      // Calculate progress and time spent
      const completedSections = await getCompletedSectionsCount(latestSession.id);
      const timeSpent = calculateTimeSpent(userSessions);
      const progress = Math.round((completedSections / totalSections) * 100);

      setProgressInfo({
        lastCompletedSection: completedSections > 0 ? completedSections - 1 : undefined,
        totalProgress: progress,
        timeSpent: timeSpent,
        hasStarted: true
      });
    } catch (error) {
      console.error('Failed to load training progress:', error);
    }
  };

  const loadCompanyTrainingProgress = async (trainingId: string) => {
    // Similar logic for company training progress
    await loadTrainingProgress(trainingId);
  };

  const getCompletedSectionsCount = async (sessionId: string): Promise<number> => {
    try {
      // Get section progress for this session
      const interactions = await api.listInteractionSessions();
      const sessionInteractions = interactions.filter(i => i.id === sessionId);
      
      if (sessionInteractions.length === 0) return 0;
      
      // Count completed sections (this would need to be implemented in the API)
      // For now, we'll estimate based on session activity
      return 0; // Placeholder
    } catch (error) {
      console.error('Failed to get completed sections:', error);
      return 0;
    }
  };

  const calculateTimeSpent = (sessions: any[]): number => {
    // Calculate total time spent across all sessions
    let totalTime = 0;
    sessions.forEach(session => {
      if (session.created_at && session.updated_at) {
        const start = new Date(session.created_at).getTime();
        const end = new Date(session.updated_at).getTime();
        totalTime += (end - start) / 1000; // Convert to seconds
      }
    });
    return totalTime;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}dk`;
    return `${Math.round(seconds / 3600)}sa ${Math.round((seconds % 3600) / 60)}dk`;
  };

  const handleStartTraining = () => {
    onStartTraining();
  };

  const handleResumeTraining = () => {
    if (progressInfo.lastCompletedSection !== undefined) {
      onResumeTraining(progressInfo.lastCompletedSection + 1);
    } else {
      onStartTraining();
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <div className="text-white text-lg">Eğitim bilgileri yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-6"
          >
            {trainingAvatar?.image_url ? (
              <img 
                src={trainingAvatar.image_url} 
                alt={trainingAvatar.name || 'Eğitim Avatar'}
                className="w-24 h-24 rounded-full mx-auto border-4 border-purple-500/30 shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full mx-auto bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-purple-500/30 shadow-lg">
                {trainingTitle.charAt(0).toUpperCase()}
              </div>
            )}
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-4xl font-bold text-white mb-4"
          >
            {trainingTitle}
          </motion.h1>
          
          {trainingDescription && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-xl text-slate-300 max-w-2xl mx-auto"
            >
              {trainingDescription}
            </motion.p>
          )}
        </div>

        {/* Training Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-3">
              <BookOpen className="w-6 h-6 text-blue-400" />
              <span className="text-white font-semibold">Bölümler</span>
            </div>
            <div className="text-2xl font-bold text-white">{totalSections}</div>
            <div className="text-sm text-slate-300">Toplam bölüm sayısı</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-3">
              <Target className="w-6 h-6 text-green-400" />
              <span className="text-white font-semibold">İlerleme</span>
            </div>
            <div className="text-2xl font-bold text-white">{progressInfo.totalProgress}%</div>
            <div className="text-sm text-slate-300">Tamamlanan kısım</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-6 h-6 text-purple-400" />
              <span className="text-white font-semibold">Süre</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {progressInfo.timeSpent > 0 ? formatTime(progressInfo.timeSpent) : '-'}
            </div>
            <div className="text-sm text-slate-300">Geçirilen zaman</div>
          </div>
        </motion.div>

        {/* Progress Bar */}
        {progressInfo.hasStarted && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mb-8"
          >
            <div className="bg-white/10 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-full transition-all duration-500"
                style={{ width: `${progressInfo.totalProgress}%` }}
              ></div>
            </div>
            <div className="text-center mt-2 text-slate-300 text-sm">
              {progressInfo.lastCompletedSection !== undefined 
                ? `${progressInfo.lastCompletedSection + 1}/${totalSections} bölüm tamamlandı`
                : 'Henüz başlanmamış'
              }
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          {progressInfo.hasStarted && progressInfo.totalProgress < 100 ? (
            <>
              <button
                onClick={handleResumeTraining}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Kaldığım Yerden Devam Et</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleStartTraining}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-300 border border-white/20 hover:border-white/30"
              >
                <Play className="w-5 h-5" />
                <span>Baştan Başla</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleStartTraining}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Play className="w-5 h-5" />
              <span>
                {progressInfo.hasStarted && progressInfo.totalProgress === 100 
                  ? 'Eğitimi Tekrar Et' 
                  : 'Eğitimi Başlat'
                }
              </span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-center mt-8 text-slate-400 text-sm"
        >
          <p>
            🎯 Bu eğitim interaktif videolar, LLM asistanları ve sesli etkileşimler içerir
          </p>
          <p className="mt-1">
            💡 İstediğiniz zaman duraklatabilir ve daha sonra devam edebilirsiniz
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
