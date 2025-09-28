"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@lxplayer/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@lxplayer/ui';
import { Badge } from '@lxplayer/ui';
import { Alert, AlertDescription } from '@lxplayer/ui';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Clock,
  Target
} from 'lucide-react';
import EvaluationCriteriaForm from './forms/EvaluationCriteriaForm';
import { api } from '@/lib/api';

interface TrainingSection {
  id: string;
  title: string;
  type: string;
}

interface EvaluationCriteria {
  id: string;
  training_id: string;
  title: string;
  description?: string;
  section_id?: string;
  applies_to_entire_training: boolean;
  llm_evaluation_prompt: string;
  criteria_type: string;
  weight: number;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  company_id?: string;
}

interface EvaluationCriteriaListProps {
  trainingId: string;
  trainingTitle?: string;
}

export default function EvaluationCriteriaList({
  trainingId,
  trainingTitle
}: EvaluationCriteriaListProps) {
  const [criteria, setCriteria] = useState<EvaluationCriteria[]>([]);
  const [sections, setSections] = useState<{ [key: string]: TrainingSection }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<EvaluationCriteria | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Kriterleri yükle
  const loadCriteria = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getEvaluationCriteria({ training_id: trainingId });
      setCriteria(data);
    } catch (err) {
      setError('Kriterler yüklenirken hata oluştu');
      console.error('Criteria load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Bölümleri yükle
  const loadSections = async () => {
    try {
      const data = await api.getTrainingSectionsForCriteria(trainingId);
      
      const sectionsMap: { [key: string]: TrainingSection } = {};
      data.forEach((section: TrainingSection) => {
        sectionsMap[section.id] = section;
      });
      setSections(sectionsMap);
    } catch (err) {
      console.error('Sections load error:', err);
    }
  };

  useEffect(() => {
    loadCriteria();
    loadSections();
  }, [trainingId]);

  const handleSave = async (data: any) => {
    setActionLoading('save');
    try {
      if (editingCriteria) {
        await api.updateEvaluationCriteria(editingCriteria.id, data);
      } else {
        await api.createEvaluationCriteria(data);
      }
      
      await loadCriteria();
      setShowForm(false);
      setEditingCriteria(null);
    } catch (err) {
      setError('Kaydetme sırasında hata oluştu');
      console.error('Save error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (criteriaId: string) => {
    if (!confirm('Bu değerlendirme kriterini silmek istediğinizden emin misiniz?')) {
      return;
    }

    setActionLoading(criteriaId);
    try {
      await api.deleteEvaluationCriteria(criteriaId);
      await loadCriteria();
    } catch (err) {
      setError('Silme sırasında hata oluştu');
      console.error('Delete error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (criteriaId: string) => {
    setActionLoading(criteriaId);
    try {
      await api.duplicateEvaluationCriteria(criteriaId);
      await loadCriteria();
    } catch (err) {
      setError('Kopyalama sırasında hata oluştu');
      console.error('Duplicate error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const getCriteriaTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      question: 'Soru',
      title: 'Başlık',
      assessment: 'Değerlendirme',
      skill: 'Beceri'
    };
    return types[type] || type;
  };

  const getCriteriaTypeIcon = (type: string) => {
    switch (type) {
      case 'question': return <Target className="w-4 h-4" />;
      case 'title': return <CheckCircle className="w-4 h-4" />;
      case 'assessment': return <AlertCircle className="w-4 h-4" />;
      case 'skill': return <Clock className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  if (showForm) {
    return (
      <EvaluationCriteriaForm
        trainingId={trainingId}
        criteria={editingCriteria || undefined}
        onSave={handleSave}
        onCancel={() => {
          setShowForm(false);
          setEditingCriteria(null);
        }}
        isLoading={actionLoading === 'save'}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Değerlendirme Kriterleri</h2>
          {trainingTitle && (
            <p className="text-muted-foreground">Eğitim: {trainingTitle}</p>
          )}
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Kriter
        </Button>
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
      ) : criteria.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Target className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Henüz kriter tanımlanmamış</h3>
            <p className="text-muted-foreground text-center mb-4">
              Bu eğitim için değerlendirme kriteri tanımlamaya başlayın.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              İlk Kriteri Ekle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {criteria.map((criterion) => (
            <Card key={criterion.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getCriteriaTypeIcon(criterion.criteria_type)}
                      <CardTitle className="text-lg">{criterion.title}</CardTitle>
                      <Badge variant={criterion.is_active ? "default" : "secondary"}>
                        {getCriteriaTypeLabel(criterion.criteria_type)}
                      </Badge>
                      {criterion.is_active ? (
                        <Badge variant="outline" className="text-green-600">
                          <Eye className="w-3 h-3 mr-1" />
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-600">
                          <EyeOff className="w-3 h-3 mr-1" />
                          Pasif
                        </Badge>
                      )}
                    </div>
                    {criterion.description && (
                      <CardDescription>{criterion.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingCriteria(criterion);
                        setShowForm(true);
                      }}
                      disabled={actionLoading !== null}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicate(criterion.id)}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === criterion.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(criterion.id)}
                      disabled={actionLoading !== null}
                      className="text-red-600 hover:text-red-700"
                    >
                      {actionLoading === criterion.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Kapsam:</span>
                      <p className="text-muted-foreground">
                        {criterion.applies_to_entire_training 
                          ? 'Tüm eğitim' 
                          : sections[criterion.section_id || '']?.title || 'Bilinmeyen bölüm'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Ağırlık:</span>
                      <p className="text-muted-foreground">{criterion.weight}</p>
                    </div>
                    <div>
                      <span className="font-medium">Sıra:</span>
                      <p className="text-muted-foreground">{criterion.order_index}</p>
                    </div>
                    <div>
                      <span className="font-medium">Oluşturulma:</span>
                      <p className="text-muted-foreground">
                        {new Date(criterion.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium text-sm">LLM Değerlendirme Metni:</span>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                      {criterion.llm_evaluation_prompt}
                    </p>
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
