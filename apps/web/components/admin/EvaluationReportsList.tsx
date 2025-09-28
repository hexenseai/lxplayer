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
  FileText,
  BarChart3,
  Download,
  RefreshCw,
  Globe,
  Lock
} from 'lucide-react';
import { api } from '@/lib/api';

interface EvaluationReport {
  id: string;
  session_id: string;
  user_id: string;
  training_id: string;
  report_title: string;
  overall_score?: number;
  summary: string;
  detailed_analysis: string;
  recommendations: string;
  criteria_results_json: string;
  strengths: string;
  weaknesses: string;
  status: string;
  is_public: boolean;
  generated_at: string;
  reviewed_at?: string;
  finalized_at?: string;
  generated_by?: string;
  reviewed_by?: string;
  company_id?: string;
  metadata_json: string;
}

interface EvaluationReportsListProps {
  sessionId?: string;
  userId?: string;
  trainingId?: string;
  status?: string;
  isPublic?: boolean;
  title?: string;
  showActions?: boolean;
}

export default function EvaluationReportsList({
  sessionId,
  userId,
  trainingId,
  status,
  isPublic,
  title = "Değerlendirme Raporları",
  showActions = true
}: EvaluationReportsListProps) {
  const [reports, setReports] = useState<EvaluationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Raporları yükle
  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getEvaluationReports({
        session_id: sessionId,
        user_id: userId,
        training_id: trainingId,
        status: status,
        is_public: isPublic
      });
      setReports(data);
    } catch (err) {
      setError('Raporlar yüklenirken hata oluştu');
      console.error('Reports load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [sessionId, userId, trainingId, status, isPublic]);

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

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { variant: any; label: string; color: string } } = {
      generated: { variant: "default", label: "Oluşturuldu", color: "bg-blue-100 text-blue-800" },
      reviewed: { variant: "default", label: "İncelendi", color: "bg-purple-100 text-purple-800" },
      finalized: { variant: "default", label: "Finalize Edildi", color: "bg-green-100 text-green-800" }
    };
    
    const statusInfo = statusMap[status] || { variant: "secondary", label: status, color: "bg-gray-100 text-gray-800" };
    
    return (
      <Badge className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  const handleRegenerateReport = async (reportId: string) => {
    setActionLoading(reportId);
    try {
      await api.regenerateEvaluationReport(reportId);
      await loadReports();
    } catch (err) {
      setError('Rapor yeniden oluşturma sırasında hata oluştu');
      console.error('Regenerate error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAutoGenerateReport = async (sessionId: string) => {
    setActionLoading('auto-generate');
    try {
      await api.autoGenerateEvaluationReport(sessionId);
      await loadReports();
    } catch (err) {
      setError('Otomatik rapor oluşturma sırasında hata oluştu');
      console.error('Auto generate error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground">
            LLM tarafından oluşturulan değerlendirme raporları
          </p>
        </div>
        {sessionId && showActions && (
          <Button 
            onClick={() => handleAutoGenerateReport(sessionId)}
            disabled={actionLoading !== null}
          >
            {actionLoading === 'auto-generate' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Otomatik Rapor Oluştur
          </Button>
        )}
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
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Henüz rapor oluşturulmamış</h3>
            <p className="text-muted-foreground text-center">
              Bu oturum için henüz değerlendirme raporu oluşturulmamış.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {reports.map((report) => (
            <Card key={report.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5" />
                      <CardTitle className="text-xl">{report.report_title}</CardTitle>
                      {getScoreBadge(report.overall_score)}
                      {getStatusBadge(report.status)}
                      {report.is_public ? (
                        <Badge variant="outline" className="text-green-600">
                          <Globe className="w-3 h-3 mr-1" />
                          Herkese Açık
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-600">
                          <Lock className="w-3 h-3 mr-1" />
                          Özel
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(report.generated_at).toLocaleString('tr-TR')}
                        </span>
                        {report.reviewed_at && (
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            İncelendi: {new Date(report.reviewed_at).toLocaleDateString('tr-TR')}
                          </span>
                        )}
                        {report.finalized_at && (
                          <span className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            Finalize: {new Date(report.finalized_at).toLocaleDateString('tr-TR')}
                          </span>
                        )}
                      </div>
                    </CardDescription>
                  </div>
                  {showActions && (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegenerateReport(report.id)}
                        disabled={actionLoading !== null}
                      >
                        {actionLoading === report.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {/* TODO: Implement download */}}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.overall_score !== undefined && report.overall_score !== null && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Genel Puan:</span>
                      <span className={`text-2xl font-bold ${getScoreColor(report.overall_score)}`}>
                        {report.overall_score}
                      </span>
                      {getScoreIcon(report.overall_score)}
                    </div>
                  )}

                  <div>
                    <span className="font-medium text-sm">Özet:</span>
                    <p className="text-sm mt-1 bg-muted p-3 rounded-md">
                      {report.summary}
                    </p>
                  </div>

                  <div>
                    <span className="font-medium text-sm">Detaylı Analiz:</span>
                    <p className="text-sm mt-1 bg-blue-50 p-3 rounded-md border-l-4 border-blue-200">
                      {report.detailed_analysis}
                    </p>
                  </div>

                  <div>
                    <span className="font-medium text-sm">Öneriler:</span>
                    <p className="text-sm mt-1 bg-green-50 p-3 rounded-md border-l-4 border-green-200">
                      {report.recommendations}
                    </p>
                  </div>

                  {(report.strengths || report.weaknesses) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {report.strengths && (
                        <div>
                          <span className="font-medium text-sm text-green-700">Güçlü Yanlar:</span>
                          <p className="text-sm mt-1 text-green-600">
                            {report.strengths}
                          </p>
                        </div>
                      )}
                      {report.weaknesses && (
                        <div>
                          <span className="font-medium text-sm text-red-700">Geliştirilmesi Gereken Alanlar:</span>
                          <p className="text-sm mt-1 text-red-600">
                            {report.weaknesses}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Oturum ID:</span>
                      <p className="text-muted-foreground font-mono text-xs">
                        {report.session_id.slice(0, 8)}...
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Kullanıcı ID:</span>
                      <p className="text-muted-foreground font-mono text-xs">
                        {report.user_id.slice(0, 8)}...
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Eğitim ID:</span>
                      <p className="text-muted-foreground font-mono text-xs">
                        {report.training_id.slice(0, 8)}...
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Oluşturan:</span>
                      <p className="text-muted-foreground font-mono text-xs">
                        {report.generated_by ? report.generated_by.slice(0, 8) + '...' : 'Sistem'}
                      </p>
                    </div>
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
