"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@lxplayer/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@lxplayer/ui';
import { Badge } from '@lxplayer/ui';
import { Alert, AlertDescription } from '@lxplayer/ui';
import { 
  Eye, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  User,
  Target,
  Brain
} from 'lucide-react';

interface EvaluationResult {
  id: string;
  criteria_id: string;
  session_id: string;
  user_id: string;
  training_id: string;
  evaluation_score?: number;
  evaluation_result: string;
  explanation: string;
  llm_model?: string;
  processing_time_ms?: number;
  tokens_used?: number;
  section_id?: string;
  evaluated_at: string;
  created_at: string;
  metadata_json: string;
}

interface EvaluationResultsListProps {
  sessionId?: string;
  userId?: string;
  trainingId?: string;
  criteriaId?: string;
  title?: string;
}

export default function EvaluationResultsList({
  sessionId,
  userId,
  trainingId,
  criteriaId,
  title = "Değerlendirme Sonuçları"
}: EvaluationResultsListProps) {
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  // Sonuçları yükle
  const loadResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (sessionId) params.append('session_id', sessionId);
      if (userId) params.append('user_id', userId);
      if (trainingId) params.append('training_id', trainingId);
      if (criteriaId) params.append('criteria_id', criteriaId);

      const response = await fetch(`/api/evaluation-results?${params}`);
      if (!response.ok) throw new Error('Sonuçlar yüklenemedi');
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError('Sonuçlar yüklenirken hata oluştu');
      console.error('Results load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Özet bilgileri yükle (session için)
  const loadSummary = async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`/api/evaluation-results/session/${sessionId}/summary`);
      if (!response.ok) throw new Error('Özet yüklenemedi');
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error('Summary load error:', err);
    }
  };

  useEffect(() => {
    loadResults();
    if (sessionId) {
      loadSummary();
    }
  }, [sessionId, userId, trainingId, criteriaId]);

  const getScoreColor = (score?: number) => {
    if (score === undefined || score === null) return 'text-gray-500';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score?: number) => {
    if (score === undefined || score === null) return <Minus className="w-4 h-4" />;
    if (score >= 80) return <TrendingUp className="w-4 h-4" />;
    if (score >= 60) return <Minus className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  };

  const getScoreBadge = (score?: number) => {
    if (score === undefined || score === null) {
      return <Badge variant="outline">Puan Yok</Badge>;
    }
    
    if (score >= 80) {
      return <Badge className="bg-green-100 text-green-800">Mükemmel ({score})</Badge>;
    } else if (score >= 60) {
      return <Badge className="bg-yellow-100 text-yellow-800">İyi ({score})</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Gelişim Gerekli ({score})</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {sessionId && summary && (
            <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
              <span>Toplam Kriter: {summary.total_criteria}</span>
              <span>Değerlendirilen: {summary.evaluated_criteria}</span>
              {summary.average_score !== null && (
                <span>Ortalama Puan: {summary.average_score.toFixed(1)}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Target className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Henüz değerlendirme sonucu yok</h3>
            <p className="text-muted-foreground text-center">
              Bu kriterler için henüz LLM değerlendirmesi yapılmamış.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {results.map((result) => (
            <Card key={result.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4" />
                      <CardTitle className="text-lg">Değerlendirme Sonucu</CardTitle>
                      {getScoreBadge(result.evaluation_score)}
                    </div>
                    <CardDescription>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(result.evaluated_at).toLocaleString('tr-TR')}
                        </span>
                        {result.llm_model && (
                          <span className="flex items-center gap-1">
                            <Brain className="w-3 h-3" />
                            {result.llm_model}
                          </span>
                        )}
                        {result.processing_time_ms && (
                          <span>
                            {result.processing_time_ms}ms
                          </span>
                        )}
                      </div>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.evaluation_score !== undefined && result.evaluation_score !== null && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Puan:</span>
                      <span className={`text-xl font-bold ${getScoreColor(result.evaluation_score)}`}>
                        {result.evaluation_score}
                      </span>
                      {getScoreIcon(result.evaluation_score)}
                    </div>
                  )}

                  <div>
                    <span className="font-medium text-sm">Değerlendirme Sonucu:</span>
                    <p className="text-sm mt-1 bg-muted p-3 rounded-md">
                      {result.evaluation_result}
                    </p>
                  </div>

                  <div>
                    <span className="font-medium text-sm">LLM Açıklaması:</span>
                    <p className="text-sm mt-1 bg-blue-50 p-3 rounded-md border-l-4 border-blue-200">
                      {result.explanation}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Kriter ID:</span>
                      <p className="text-muted-foreground font-mono text-xs">
                        {result.criteria_id.slice(0, 8)}...
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Oturum ID:</span>
                      <p className="text-muted-foreground font-mono text-xs">
                        {result.session_id.slice(0, 8)}...
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Kullanıcı ID:</span>
                      <p className="text-muted-foreground font-mono text-xs">
                        {result.user_id.slice(0, 8)}...
                      </p>
                    </div>
                    {result.tokens_used && (
                      <div>
                        <span className="font-medium">Token Kullanımı:</span>
                        <p className="text-muted-foreground">{result.tokens_used}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
