"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@lxplayer/ui';
import { Input } from '@lxplayer/ui';
import { Label } from '@lxplayer/ui';
import { Textarea } from '@lxplayer/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@lxplayer/ui';
import { Switch } from '@lxplayer/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@lxplayer/ui';
import { Alert, AlertDescription } from '@lxplayer/ui';
import { Loader2, Plus, Trash2, Save, X } from 'lucide-react';
import { api } from '@/lib/api';

interface TrainingSection {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  type: string;
}

interface EvaluationCriteriaFormProps {
  trainingId: string;
  criteria?: {
    id: string;
    title: string;
    description?: string;
    section_id?: string;
    applies_to_entire_training: boolean;
    llm_evaluation_prompt: string;
    criteria_type: string;
    weight: number;
    order_index: number;
    is_active: boolean;
  };
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function EvaluationCriteriaForm({
  trainingId,
  criteria,
  onSave,
  onCancel,
  isLoading = false
}: EvaluationCriteriaFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    section_id: '',
    applies_to_entire_training: true,
    llm_evaluation_prompt: '',
    criteria_type: 'question',
    weight: 1.0,
    order_index: 0,
    is_active: true
  });

  const [sections, setSections] = useState<TrainingSection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form verilerini başlat
  useEffect(() => {
    if (criteria) {
      setFormData({
        title: criteria.title || '',
        description: criteria.description || '',
        section_id: criteria.section_id || '',
        applies_to_entire_training: criteria.applies_to_entire_training,
        llm_evaluation_prompt: criteria.llm_evaluation_prompt || '',
        criteria_type: criteria.criteria_type || 'question',
        weight: criteria.weight || 1.0,
        order_index: criteria.order_index || 0,
        is_active: criteria.is_active
      });
    }
  }, [criteria]);

  // Bölümleri yükle
  useEffect(() => {
    const loadSections = async () => {
      setSectionsLoading(true);
      try {
        const data = await api.getTrainingSectionsForCriteria(trainingId);
        setSections(data);
      } catch (err) {
        setError('Bölümler yüklenirken hata oluştu');
        console.error('Sections load error:', err);
      } finally {
        setSectionsLoading(false);
      }
    };

    loadSections();
  }, [trainingId]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const submitData = {
        ...formData,
        training_id: trainingId,
        section_id: formData.applies_to_entire_training ? null : formData.section_id
      };

      await onSave(submitData);
    } catch (err) {
      setError('Kaydetme sırasında hata oluştu');
      console.error('Save error:', err);
    }
  };

  const criteriaTypeOptions = [
    { value: 'question', label: 'Soru' },
    { value: 'title', label: 'Başlık' },
    { value: 'assessment', label: 'Değerlendirme' },
    { value: 'skill', label: 'Beceri' }
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {criteria ? 'Değerlendirme Kriterini Düzenle' : 'Yeni Değerlendirme Kriteri'}
        </CardTitle>
        <CardDescription>
          Eğitim için değerlendirme kriteri tanımlayın. LLM bu kriterlere göre değerlendirme yapacaktır.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Başlık/Soru *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Değerlendirme kriterinin başlığını girin"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="criteria_type">Kriter Türü *</Label>
              <Select
                value={formData.criteria_type}
                onValueChange={(value) => handleInputChange('criteria_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kriter türünü seçin" />
                </SelectTrigger>
                <SelectContent>
                  {criteriaTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Kriterin detaylı açıklamasını girin"
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="applies_to_entire_training"
                checked={formData.applies_to_entire_training}
                onCheckedChange={(checked) => handleInputChange('applies_to_entire_training', checked)}
              />
              <Label htmlFor="applies_to_entire_training">
                Tüm eğitim için geçerli
              </Label>
            </div>

            {!formData.applies_to_entire_training && (
              <div className="space-y-2">
                <Label htmlFor="section_id">Bölüm Seçin *</Label>
                <Select
                  value={formData.section_id}
                  onValueChange={(value) => handleInputChange('section_id', value)}
                  disabled={sectionsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={sectionsLoading ? "Bölümler yükleniyor..." : "Bölüm seçin"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.title} ({section.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sections.length === 0 && !sectionsLoading && (
                  <p className="text-sm text-muted-foreground">
                    Bu eğitim için bölüm bulunamadı.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="llm_evaluation_prompt">LLM Değerlendirme Metni *</Label>
            <Textarea
              id="llm_evaluation_prompt"
              value={formData.llm_evaluation_prompt}
              onChange={(e) => handleInputChange('llm_evaluation_prompt', e.target.value)}
              placeholder="LLM'in nasıl değerlendirme yapacağını açıklayan metni girin..."
              rows={6}
              required
            />
            <p className="text-sm text-muted-foreground">
              LLM bu metne göre değerlendirme yapacaktır. Kullanıcının etkileşimlerini, yanıtlarını ve davranışlarını nasıl analiz edeceğini detaylı olarak açıklayın.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Ağırlık</Label>
              <Input
                id="weight"
                type="number"
                min="0.1"
                max="10.0"
                step="0.1"
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', parseFloat(e.target.value))}
                placeholder="1.0"
              />
              <p className="text-xs text-muted-foreground">0.1 - 10.0 arası</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_index">Sıra</Label>
              <Input
                id="order_index"
                type="number"
                min="0"
                value={formData.order_index}
                onChange={(e) => handleInputChange('order_index', parseInt(e.target.value))}
                placeholder="0"
              />
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="is_active">Aktif</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-2" />
              İptal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {criteria ? 'Güncelle' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
