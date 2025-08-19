'use client';

import { useState, useEffect } from 'react';
import { api, Style } from '@/lib/api';

interface StyleSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function StyleSelector({ value, onChange, placeholder = "Stil seçiniz" }: StyleSelectorProps) {
  const [styles, setStyles] = useState<Style[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);

  useEffect(() => {
    const loadStyles = async () => {
      try {
        const stylesList = await api.listStyles();
        setStyles(stylesList);
        
        // If there's a value, find the corresponding style
        if (value) {
          const style = stylesList.find(s => s.id === value);
          setSelectedStyle(style || null);
        }
      } catch (error) {
        console.error('Error loading styles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStyles();
  }, [value]);

  const handleStyleChange = (styleId: string) => {
    const style = styles.find(s => s.id === styleId);
    setSelectedStyle(style || null);
    onChange(styleId);
  };

  if (isLoading) {
    return (
      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
        <span className="text-gray-500">Stiller yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <select
        value={value || ''}
        onChange={(e) => handleStyleChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">{placeholder}</option>
        {styles.map((style) => (
          <option key={style.id} value={style.id}>
            {style.name}
          </option>
        ))}
      </select>

      {selectedStyle && (
        <div className="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50">
          <div className="text-xs font-medium text-gray-700 mb-2">Seçili Stil Önizlemesi:</div>
          <div
            className="p-2 border border-gray-300 rounded text-sm"
            style={JSON.parse(selectedStyle.style_json)}
          >
            Bu bir örnek metindir
          </div>
          {selectedStyle.description && (
            <div className="text-xs text-gray-600 mt-1">{selectedStyle.description}</div>
          )}
        </div>
      )}
    </div>
  );
}
