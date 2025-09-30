'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { InteractivePlayer } from '@/components/InteractivePlayer';
import { ElevenLabsEvaluationReport, mockElevenLabsEvaluations, mockElevenLabsSummary, mockElevenLabsRecommendations } from '@/components/admin/ElevenLabsEvaluationReport';
import { Button } from '@lxplayer/ui';
import { ArrowLeft, Play, RotateCcw, FileText, CheckCircle } from 'lucide-react';
import { api, Training, TrainingSection } from '@/lib/api';

export default function TrainingTestPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const trainingId = searchParams.get('trainingId');
  
  const [training, setTraining] = useState<Training | null>(null);
  const [sections, setSections] = useState<TrainingSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [evaluationData, setEvaluationData] = useState<any>(null);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [evaluationSource, setEvaluationSource] = useState<string>('');
  
  const playerRef = useRef<any>(null);

  // Load training data
  useEffect(() => {
    const loadTrainingData = async () => {
      if (!trainingId) {
        setError('Training ID gerekli');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Load training and sections data
        const [trainingData, sectionsData] = await Promise.all([
          api.getTraining(trainingId),
          api.listTrainingSections(trainingId)
        ]);
        
        setTraining(trainingData);
        setSections(sectionsData.sort((a, b) => a.order_index - b.order_index));
        
      } catch (err) {
        console.error('Error loading training data:', err);
        setError('Eğitim verisi yüklenirken hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    loadTrainingData();
  }, [trainingId]);

  const handleStartTest = () => {
    setTestStarted(true);
    setTestCompleted(false);
    setShowEvaluation(false);
    setCurrentSessionId(null);
  };

  const handleTestComplete = async () => {
    setTestCompleted(true);
    setTestStarted(false);
    setShowEvaluation(true);
    
    // Test modunda gerçek değerlendirme verilerini çek
    await loadEvaluationData();
  };

  const loadEvaluationData = async () => {
    if (!trainingId) return;
    
    setEvaluationLoading(true);
    try {
      // Test modu için özel session ID oluştur
      const testSessionId = `test_${trainingId}_${Date.now()}`;
      setCurrentSessionId(testSessionId);
      
      // Önce ElevenLabs webhook'dan gelen gerçek değerlendirme verilerini kontrol et
      try {
        const elevenLabsResponse = await api.getElevenLabsEvaluation(testSessionId);
        if (elevenLabsResponse.evaluations.length > 0) {
          // Gerçek ElevenLabs değerlendirme verileri var
          setEvaluationData({
            evaluations: elevenLabsResponse.evaluations,
            overallScore: elevenLabsResponse.overall_score,
            summary: elevenLabsResponse.summary,
            recommendations: elevenLabsResponse.recommendations
          });
          setEvaluationSource('🔐 ElevenLabs Webhook (Gerçek Veri)');
          console.log('✅ Gerçek ElevenLabs değerlendirme verisi kullanılıyor');
          return;
        }
      } catch (elevenLabsError) {
        console.log('ElevenLabs değerlendirme verisi bulunamadı, test modu verileri kullanılacak');
      }
      
      // ElevenLabs verisi yoksa test modu değerlendirme verilerini çek
      const evaluationResponse = await api.getTestModeEvaluation(trainingId);
      
      setEvaluationData({
        evaluations: evaluationResponse.evaluations,
        overallScore: evaluationResponse.overall_score,
        summary: evaluationResponse.summary,
        recommendations: evaluationResponse.recommendations
      });
      setEvaluationSource('🧪 Test Modu Mock Veri');
      console.log('⚠️ Test modu mock değerlendirme verisi kullanılıyor');
      
    } catch (error) {
      console.error('Değerlendirme verileri yüklenirken hata:', error);
      // Hata durumunda mock data kullan
      setEvaluationData({
        evaluations: mockElevenLabsEvaluations,
        overallScore: 72,
        summary: mockElevenLabsSummary,
        recommendations: mockElevenLabsRecommendations
      });
      setEvaluationSource('📝 Hardcoded Mock Veri');
      console.log('❌ Hata durumunda hardcoded mock veri kullanılıyor');
    } finally {
      setEvaluationLoading(false);
    }
  };

  const handleRestartTest = () => {
    setTestStarted(false);
    setTestCompleted(false);
    setShowEvaluation(false);
    setCurrentSessionId(null);
  };

  const handleBackToSections = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Eğitim verisi yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !training) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Hata</h1>
          <p className="text-gray-600 mb-4">{error || 'Eğitim bulunamadı'}</p>
          <Button onClick={handleBackToSections} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri Dön
          </Button>
        </div>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-500 text-6xl mb-4">📚</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Bölüm Bulunamadı</h1>
          <p className="text-gray-600 mb-4">Bu eğitim için henüz bölüm eklenmemiş.</p>
          <Button onClick={handleBackToSections} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri Dön
          </Button>
        </div>
      </div>
    );
  }

  // Test başlamışsa InteractivePlayer'ı göster
  if (testStarted) {
    return (
      <div className="w-full h-screen bg-gray-900 relative">
        <InteractivePlayer
          ref={playerRef}
          accessCode="TEST_MODE" // Test modu için özel access code
          userId="test_user"
          testMode={true} // Test modu aktif
          testTrainingId={trainingId} // Test modu için training ID
        />
        
        {/* Test Mode Overlay */}
        <div className="absolute top-4 left-4 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-medium z-50">
          🧪 Test Modu - Kayıt Alınmıyor
        </div>
        
        {/* Test Complete Button */}
        <div className="absolute top-4 right-4 z-50">
          <Button
            onClick={handleTestComplete}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Testi Tamamla
          </Button>
        </div>
      </div>
    );
  }

  // Test tamamlanmışsa değerlendirme raporunu göster
  if (testCompleted && showEvaluation) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToSections}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Bölümler
                </Button>
                <div>
                  <h1 className="text-xl font-semibold">Eğitim Test Raporu</h1>
                  <p className="text-sm text-gray-600">{training.title}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleRestartTest}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Tekrar Test Et
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Test Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-green-900">Test Tamamlandı</h2>
                <p className="text-green-600 text-sm">Eğitim başarıyla test edildi</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-1">📚 Eğitim</h3>
                <p className="text-blue-700 text-sm">{training.title}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-medium text-purple-900 mb-1">📖 Bölüm Sayısı</h3>
                <p className="text-purple-700 text-sm">{sections.length} bölüm</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="font-medium text-orange-900 mb-1">🧪 Test Modu</h3>
                <p className="text-orange-700 text-sm">Kayıt alınmadı</p>
              </div>
            </div>
          </div>

          {/* Evaluation Reports */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Değerlendirme Raporu</h2>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <p className="text-yellow-800 text-sm">
                  <strong>Test Modu:</strong> Bu test kayıt alınmadan gerçekleştirildi. 
                  Değerlendirme raporu örnek veriler içerebilir.
                </p>
              </div>
            </div>

            {/* ElevenLabs Değerlendirme Raporu */}
        {evaluationLoading ? (
          <div className="bg-white rounded-lg border p-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Değerlendirme verileri yükleniyor...</p>
            </div>
          </div>
        ) : evaluationData ? (
          <div>
            {/* Veri Kaynağı Göstergesi */}
            <div className="mb-4 p-3 rounded-lg border-l-4 border-blue-500 bg-blue-50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-800">Veri Kaynağı:</span>
                <span className="text-sm text-blue-700">{evaluationSource}</span>
              </div>
            </div>
            
            <ElevenLabsEvaluationReport
              evaluations={evaluationData.evaluations}
              overallScore={evaluationData.overallScore}
              summary={evaluationData.summary}
              recommendations={evaluationData.recommendations}
            />
          </div>
        ) : (
          <div>
            {/* Veri Kaynağı Göstergesi */}
            <div className="mb-4 p-3 rounded-lg border-l-4 border-gray-500 bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">Veri Kaynağı:</span>
                <span className="text-sm text-gray-700">📝 Hardcoded Mock Veri</span>
              </div>
            </div>
            
            <ElevenLabsEvaluationReport
              evaluations={mockElevenLabsEvaluations}
              overallScore={72}
              summary={mockElevenLabsSummary}
              recommendations={mockElevenLabsRecommendations}
            />
          </div>
        )}
          </div>
        </div>
      </div>
    );
  }

  // Ana sayfa - Test başlatma
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToSections}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Bölümler
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Eğitim Testi</h1>
              <p className="text-sm text-gray-600">{training.title}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Training Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🧪</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Eğitim Test Modu</h2>
              <p className="text-gray-600">Bu eğitimi test edin ve değerlendirme raporunu görün</p>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-blue-900 mb-2">📚 {training.title}</h3>
            {training.description && (
              <p className="text-blue-700 text-sm mb-3">{training.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-blue-600">
              <span>📖 {sections.length} bölüm</span>
              <span>⏱️ Tahmini süre: {sections.reduce((total, section) => total + (section.duration || 0), 0)} saniye</span>
            </div>
          </div>
        </div>

        {/* Test Features */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Test Özellikleri</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-green-900">Tam Etkileşim</h4>
                <p className="text-green-700 text-sm">InteractivePlayer ile gerçek eğitim deneyimi</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-yellow-600 text-sm">🚫</span>
              </div>
              <div>
                <h4 className="font-medium text-yellow-900">Kayıt Alınmaz</h4>
                <p className="text-yellow-700 text-sm">Test verileri kaydedilmez</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Değerlendirme Raporu</h4>
                <p className="text-blue-700 text-sm">Eğitim sonunda detaylı rapor</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 text-sm">⚡</span>
              </div>
              <div>
                <h4 className="font-medium text-purple-900">Hızlı Test</h4>
                <p className="text-purple-700 text-sm">Başlangıç ve bitiş sayfaları yok</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sections Preview */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Eğitim Bölümleri</h3>
          
          <div className="space-y-3">
            {sections.map((section, index) => (
              <div key={section.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-medium text-sm">
                  {section.order_index}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{section.title}</h4>
                  {section.description && (
                    <p className="text-gray-600 text-sm">{section.description}</p>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {section.duration ? `${Math.floor(section.duration / 60)}:${(section.duration % 60).toString().padStart(2, '0')}` : '-'}
                </div>
                <div className={`px-2 py-1 text-xs rounded-full ${
                  section.type === 'llm_agent' ? 'bg-green-100 text-green-800' :
                  section.type === 'llm_interaction' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {section.type}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Start Test Button */}
        <div className="text-center">
          <Button
            onClick={handleStartTest}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
          >
            <Play className="w-5 h-5 mr-2" />
            Testi Başlat
          </Button>
          
          <p className="text-gray-500 text-sm mt-3">
            Test başladığında InteractivePlayer açılacak ve eğitimi test edebileceksiniz
          </p>
        </div>
      </div>
    </div>
  );
}
