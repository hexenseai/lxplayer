'use client';

import React from 'react';
import { CheckCircle, XCircle, HelpCircle, Star, MessageSquare, Target } from 'lucide-react';

interface ElevenLabsCriteria {
  id: string;
  name: string;
  description: string;
  weight: number; // 1-10 arası ağırlık
}

interface ElevenLabsEvaluation {
  id: string;
  criteria: ElevenLabsCriteria;
  status: 'success' | 'failed' | 'unknown';
  score: number; // 0-100 arası puan
  comment: string;
  timestamp: string;
}

interface ElevenLabsEvaluationReportProps {
  evaluations: ElevenLabsEvaluation[];
  overallScore?: number;
  summary?: string;
  recommendations?: string[];
}

export function ElevenLabsEvaluationReport({ 
  evaluations, 
  overallScore, 
  summary, 
  recommendations = [] 
}: ElevenLabsEvaluationReportProps) {
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'unknown':
        return <HelpCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <HelpCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'unknown':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Başarılı';
      case 'failed':
        return 'Başarısız';
      case 'unknown':
        return 'Bilinmiyor';
      default:
        return 'Değerlendirilmedi';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getOverallScoreColor = (score?: number) => {
    if (!score) return 'text-gray-600';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getOverallScoreIcon = (score?: number) => {
    if (!score) return <HelpCircle className="w-6 h-6" />;
    if (score >= 80) return <CheckCircle className="w-6 h-6" />;
    if (score >= 60) return <Star className="w-6 h-6" />;
    return <XCircle className="w-6 h-6" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <Target className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-purple-900">ElevenLabs Değerlendirme Raporu</h2>
            <p className="text-purple-600 text-sm">AI tabanlı ses analizi ve değerlendirme sonuçları</p>
          </div>
        </div>

        {/* Overall Score */}
        {overallScore !== undefined && (
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getOverallScoreIcon(overallScore)}
                <div>
                  <h3 className="font-semibold text-gray-900">Genel Puan</h3>
                  <p className="text-sm text-gray-600">Tüm kriterlerin ağırlıklı ortalaması</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${getOverallScoreColor(overallScore)}`}>
                  {overallScore}/100
                </div>
                <div className="text-sm text-gray-500">
                  {overallScore >= 80 ? 'Mükemmel' : 
                   overallScore >= 60 ? 'İyi' : 
                   overallScore >= 40 ? 'Orta' : 'Geliştirilmeli'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Özet</h3>
              <p className="text-blue-700 text-sm leading-relaxed">{summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Criteria */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Değerlendirme Kriterleri
        </h3>
        
        {evaluations.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Henüz değerlendirme verisi bulunmuyor</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {evaluations.map((evaluation) => (
              <div key={evaluation.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(evaluation.status)}`}>
                        {getStatusIcon(evaluation.status)}
                        {getStatusText(evaluation.status)}
                      </div>
                      <div className={`text-lg font-bold ${getScoreColor(evaluation.score)}`}>
                        {evaluation.score}/100
                      </div>
                    </div>
                    
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {evaluation.criteria.name}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {evaluation.criteria.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Ağırlık: {evaluation.criteria.weight}/10</span>
                      <span>•</span>
                      <span>{new Date(evaluation.timestamp).toLocaleString('tr-TR')}</span>
                    </div>
                  </div>
                </div>

                {/* Comment Box */}
                {evaluation.comment && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-3">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-1">Değerlendirme Yorumu</h5>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {evaluation.comment}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 mb-3">Öneriler</h3>
              <ul className="space-y-2">
                {recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-green-700">
                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <span>Bu rapor ElevenLabs AI teknolojisi kullanılarak oluşturulmuştur</span>
        </div>
      </div>
    </div>
  );
}

// Örnek veri için mock data
export const mockElevenLabsEvaluations: ElevenLabsEvaluation[] = [
  {
    id: '1',
    criteria: {
      id: 'pronunciation',
      name: 'Telaffuz Kalitesi',
      description: 'Kelime ve cümle telaffuzunun doğruluğu ve netliği',
      weight: 9
    },
    status: 'success',
    score: 85,
    comment: 'Telaffuz genel olarak çok iyi. Sadece birkaç kelimede küçük aksan farklılıkları var.',
    timestamp: new Date().toISOString()
  },
  {
    id: '2',
    criteria: {
      id: 'fluency',
      name: 'Akıcılık',
      description: 'Konuşmanın doğal akışı ve ritmi',
      weight: 8
    },
    status: 'success',
    score: 78,
    comment: 'Konuşma akıcı ancak bazı yerlerde küçük duraksamalar mevcut.',
    timestamp: new Date().toISOString()
  },
  {
    id: '3',
    criteria: {
      id: 'intonation',
      name: 'Tonlama',
      description: 'Cümle vurguları ve ton değişimleri',
      weight: 7
    },
    status: 'failed',
    score: 45,
    comment: 'Tonlama konusunda gelişim gerekiyor. Monoton bir konuşma tarzı var.',
    timestamp: new Date().toISOString()
  },
  {
    id: '4',
    criteria: {
      id: 'clarity',
      name: 'Netlik',
      description: 'Sesin netliği ve anlaşılabilirliği',
      weight: 9
    },
    status: 'unknown',
    score: 0,
    comment: 'Bu kriter henüz değerlendirilmedi.',
    timestamp: new Date().toISOString()
  }
];

export const mockElevenLabsSummary = "Genel olarak telaffuz ve akıcılık konularında iyi performans gösterilmiş. Ancak tonlama konusunda önemli gelişim alanları mevcut. Ses kalitesi ve netlik açısından değerlendirme devam ediyor.";

export const mockElevenLabsRecommendations = [
  "Tonlama egzersizleri yaparak konuşma tarzınızı geliştirin",
  "Farklı duygusal durumları ifade eden cümlelerle pratik yapın",
  "Ses kayıtlarınızı dinleyerek kendi performansınızı değerlendirin",
  "Profesyonel ses koçluğu almayı düşünün"
];
