'use client';

import { useState, useEffect } from 'react';

interface StyleSettings {
  backgroundColor?: string;
  backgroundColorOpacity?: string;
  borderColor?: string;
  borderColorOpacity?: string;
  borderWidth?: string;
  borderStyle?: string;
  borderRadius?: string;
  fontFamily?: string;
  fontSize?: string;
  color?: string;
  colorOpacity?: string;
  fontWeight?: string;
  textShadow?: string;
  boxShadow?: string;
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  width?: string;
  height?: string;
  fixedWidth?: boolean;
  fixedHeight?: boolean;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  backdropBlur?: boolean;
  backdropBlurAmount?: string;
}

interface StyleEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const fontFamilies = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Courier New, monospace', label: 'Courier New' },
  { value: 'Impact, sans-serif', label: 'Impact' },
  { value: 'Comic Sans MS, cursive', label: 'Comic Sans MS' },
];

const fontWeights = [
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Bold' },
  { value: 'lighter', label: 'Lighter' },
  { value: '100', label: '100' },
  { value: '200', label: '200' },
  { value: '300', label: '300' },
  { value: '400', label: '400' },
  { value: '500', label: '500' },
  { value: '600', label: '600' },
  { value: '700', label: '700' },
  { value: '800', label: '800' },
  { value: '900', label: '900' },
];

const borderStyles = [
  { value: 'none', label: 'None' },
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'double', label: 'Double' },
];

const commonColors = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', 
  '#ffff00', '#ff00ff', '#00ffff', '#808080', '#c0c0c0',
  '#800000', '#808000', '#008000', '#800080', '#008080', '#000080'
];

const stylePresets = [
  {
    name: 'Varsayılan',
    style: {}
  },
  {
    name: 'Başlık Stili',
    style: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#2c3e50',
      textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
    }
  },
  {
    name: 'Vurgu Kutusu',
    style: {
      backgroundColor: '#f8f9fa',
      borderColor: '#dee2e6',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderRadius: '8px',
      padding: '12px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }
  },
  {
    name: 'Uyarı Kutusu',
    style: {
      backgroundColor: '#fff3cd',
      borderColor: '#ffeaa7',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderRadius: '6px',
      padding: '10px',
      color: '#856404'
    }
  },
  {
    name: 'Büyük Metin',
    style: {
      fontSize: '18px',
      fontWeight: '500',
      color: '#495057',
      lineHeight: '1.6'
    }
  },
  {
    name: 'Sabit Boyut Kutu',
    style: {
      width: '300px',
      height: '150px',
      fixedWidth: true,
      fixedHeight: true,
      backgroundColor: '#f8f9fa',
      borderColor: '#dee2e6',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderRadius: '8px',
      padding: '15px',
      textAlign: 'center'
    }
  },
  {
    name: 'Sabit Genişlik Banner',
    style: {
      width: '500px',
      fixedWidth: true,
      backgroundColor: '#007bff',
      color: '#ffffff',
      padding: '10px 20px',
      borderRadius: '4px',
      fontSize: '16px',
      fontWeight: 'bold',
      textAlign: 'center'
    }
  },
  {
    name: 'Küçük Sabit Kutu',
    style: {
      width: '200px',
      height: '100px',
      fixedWidth: true,
      fixedHeight: true,
      backgroundColor: '#e3f2fd',
      borderColor: '#2196f3',
      borderWidth: '2px',
      borderStyle: 'solid',
      borderRadius: '8px',
      padding: '10px',
      textAlign: 'center',
      fontSize: '14px'
    }
  },
  {
    name: 'Büyük Sabit Kutu',
    style: {
      width: '400px',
      height: '250px',
      fixedWidth: true,
      fixedHeight: true,
      backgroundColor: '#f3e5f5',
      borderColor: '#9c27b0',
      borderWidth: '2px',
      borderStyle: 'solid',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      fontSize: '18px'
    }
  },
  {
    name: 'Şeffaf Buzlu Cam',
    style: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderColor: 'rgba(255, 255, 255, 0.3)',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderRadius: '12px',
      padding: '15px',
      backdropBlur: true,
      backdropBlurAmount: '15',
      color: '#ffffff',
      fontSize: '16px',
      fontWeight: '500',
      textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
    }
  },
  {
    name: 'Tam Şeffaf',
    style: {
      backgroundColor: 'rgba(0, 0, 0, 0)',
      color: '#ffffff',
      fontSize: '16px',
      fontWeight: '600',
      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
      padding: '10px'
    }
  },
  {
    name: 'Koyu Buzlu Cam',
    style: {
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderRadius: '8px',
      padding: '12px',
      backdropBlur: true,
      backdropBlurAmount: '20',
      color: '#ffffff',
      fontSize: '14px'
    }
  }
];

export default function StyleEditor({ value, onChange }: StyleEditorProps) {
  const [settings, setSettings] = useState<StyleSettings>({});
  const [activeTab, setActiveTab] = useState<'background' | 'border' | 'font' | 'spacing' | 'shadow'>('background');

  useEffect(() => {
    if (value) {
      try {
        const parsed = JSON.parse(value);
        setSettings(parsed);
      } catch (error) {
        console.error('Error parsing style JSON:', error);
      }
    }
  }, [value]);

  const updateSetting = (key: keyof StyleSettings, newValue: string | boolean) => {
    const newSettings = { ...settings };
    if (newValue === '' || newValue === false) {
      delete newSettings[key];
    } else {
      // For fixed dimensions, ensure values are in 50px increments
      if ((key === 'width' || key === 'height') && typeof newValue === 'string') {
        const numericValue = parseFloat(newValue.replace('px', ''));
        if (!isNaN(numericValue)) {
          // Round to nearest 50px increment
          const roundedValue = Math.round(numericValue / 50) * 50;
          newSettings[key] = `${roundedValue}px`;
        } else {
          newSettings[key] = newValue as any;
        }
      } else {
        newSettings[key] = newValue as any;
      }
    }
    setSettings(newSettings);
    onChange(JSON.stringify(newSettings, null, 2));
  };

  const resetSettings = () => {
    setSettings({});
    onChange('');
  };

  const applyPreset = (preset: typeof stylePresets[0]) => {
    setSettings(preset.style);
    onChange(JSON.stringify(preset.style, null, 2));
  };

  const tabs = [
    { id: 'background', label: 'Arka Plan', icon: '🎨' },
    { id: 'border', label: 'Kenarlık', icon: '🔲' },
    { id: 'font', label: 'Yazı Tipi', icon: '📝' },
    { id: 'spacing', label: 'Boşluk', icon: '📏' },
    { id: 'shadow', label: 'Gölge', icon: '🌫️' },
  ] as const;

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-300">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 bg-gray-50">
        {activeTab === 'background' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Arka Plan Rengi
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={settings.backgroundColor || '#ffffff'}
                  onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.backgroundColor || ''}
                  onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {commonColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => updateSetting('backgroundColor', color)}
                    className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Arka Plan Şeffaflığı: {settings.backgroundColorOpacity || '100'}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.backgroundColorOpacity || '100'}
                onChange={(e) => updateSetting('backgroundColorOpacity', e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  id="backdropBlur"
                  checked={settings.backdropBlur || false}
                  onChange={(e) => updateSetting('backdropBlur', e.target.checked)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="backdropBlur" className="text-sm font-medium text-gray-700">
                  Buzlu Cam Efekti (Backdrop Blur)
                </label>
              </div>
              {settings.backdropBlur && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Blur Miktarı: {settings.backdropBlurAmount || '12'}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={settings.backdropBlurAmount || '12'}
                    onChange={(e) => updateSetting('backdropBlurAmount', e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Şeffaf</span>
                    <span>Çok Bulanık</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'border' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kenarlık Rengi
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={settings.borderColor || '#000000'}
                  onChange={(e) => updateSetting('borderColor', e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.borderColor || ''}
                  onChange={(e) => updateSetting('borderColor', e.target.value)}
                  placeholder="#000000"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {commonColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => updateSetting('borderColor', color)}
                    className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kenarlık Şeffaflığı: {settings.borderColorOpacity || '100'}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.borderColorOpacity || '100'}
                onChange={(e) => updateSetting('borderColorOpacity', e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kenarlık Kalınlığı
              </label>
              <input
                type="text"
                value={settings.borderWidth || ''}
                onChange={(e) => updateSetting('borderWidth', e.target.value)}
                placeholder="1px"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kenarlık Stili
              </label>
              <select
                value={settings.borderStyle || ''}
                onChange={(e) => updateSetting('borderStyle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Seçiniz</option>
                {borderStyles.map((style) => (
                  <option key={style.value} value={style.value}>
                    {style.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Köşe Yuvarlaklığı
              </label>
              <input
                type="text"
                value={settings.borderRadius || ''}
                onChange={(e) => updateSetting('borderRadius', e.target.value)}
                placeholder="4px"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        )}

        {activeTab === 'font' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yazı Tipi
              </label>
              <select
                value={settings.fontFamily || ''}
                onChange={(e) => updateSetting('fontFamily', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Seçiniz</option>
                {fontFamilies.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yazı Boyutu
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={settings.fontSize || ''}
                  onChange={(e) => updateSetting('fontSize', e.target.value)}
                  placeholder="16px"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <div className="flex space-x-1">
                  {['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => updateSetting('fontSize', size)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded"
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yazı Rengi
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={settings.color || '#000000'}
                  onChange={(e) => updateSetting('color', e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.color || ''}
                  onChange={(e) => updateSetting('color', e.target.value)}
                  placeholder="#000000"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {commonColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => updateSetting('color', color)}
                    className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yazı Şeffaflığı: {settings.colorOpacity || '100'}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.colorOpacity || '100'}
                onChange={(e) => updateSetting('colorOpacity', e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yazı Kalınlığı
              </label>
              <select
                value={settings.fontWeight || ''}
                onChange={(e) => updateSetting('fontWeight', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Seçiniz</option>
                {fontWeights.map((weight) => (
                  <option key={weight.value} value={weight.value}>
                    {weight.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeTab === 'spacing' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Genel Boşluk (Padding)
              </label>
              <input
                type="text"
                value={settings.padding || ''}
                onChange={(e) => updateSetting('padding', e.target.value)}
                placeholder="10px"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Üst Boşluk
                </label>
                <input
                  type="text"
                  value={settings.paddingTop || ''}
                  onChange={(e) => updateSetting('paddingTop', e.target.value)}
                  placeholder="10px"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sağ Boşluk
                </label>
                <input
                  type="text"
                  value={settings.paddingRight || ''}
                  onChange={(e) => updateSetting('paddingRight', e.target.value)}
                  placeholder="10px"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alt Boşluk
                </label>
                <input
                  type="text"
                  value={settings.paddingBottom || ''}
                  onChange={(e) => updateSetting('paddingBottom', e.target.value)}
                  placeholder="10px"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sol Boşluk
                </label>
                <input
                  type="text"
                  value={settings.paddingLeft || ''}
                  onChange={(e) => updateSetting('paddingLeft', e.target.value)}
                  placeholder="10px"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Genişlik
                </label>
                <input
                  type="number"
                  step="50"
                  min="50"
                  value={settings.width ? parseFloat(settings.width.replace('px', '')) || '' : ''}
                  onChange={(e) => updateSetting('width', e.target.value ? `${e.target.value}px` : '')}
                  placeholder="200"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <div className="mt-2 flex items-center">
                  <input
                    type="checkbox"
                    id="fixedWidth"
                    checked={settings.fixedWidth || false}
                    onChange={(e) => updateSetting('fixedWidth', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="fixedWidth" className="ml-2 text-sm text-gray-700">
                    Sabit genişlik (50px katları)
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Sabit boyutlar 50px katlarında olmalıdır (50, 100, 150, 200...)
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {[100, 150, 200, 250, 300, 350, 400, 450, 500].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => updateSetting('width', `${size}px`)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded"
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yükseklik
                </label>
                <input
                  type="number"
                  step="50"
                  min="50"
                  value={settings.height ? parseFloat(settings.height.replace('px', '')) || '' : ''}
                  onChange={(e) => updateSetting('height', e.target.value ? `${e.target.value}px` : '')}
                  placeholder="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <div className="mt-2 flex items-center">
                  <input
                    type="checkbox"
                    id="fixedHeight"
                    checked={settings.fixedHeight || false}
                    onChange={(e) => updateSetting('fixedHeight', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="fixedHeight" className="ml-2 text-sm text-gray-700">
                    Sabit yükseklik (50px katları)
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Sabit boyutlar 50px katlarında olmalıdır (50, 100, 150, 200...)
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {[100, 150, 200, 250, 300, 350, 400, 450, 500].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => updateSetting('height', `${size}px`)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded"
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metin Hizalama
              </label>
              <select
                value={settings.textAlign || ''}
                onChange={(e) => updateSetting('textAlign', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Seçiniz</option>
                <option value="left">Sol</option>
                <option value="center">Orta</option>
                <option value="right">Sağ</option>
                <option value="justify">İki Yana</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'shadow' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kutu Gölgesi
              </label>
              <input
                type="text"
                value={settings.boxShadow || ''}
                onChange={(e) => updateSetting('boxShadow', e.target.value)}
                placeholder="0 2px 4px rgba(0,0,0,0.1)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yazı Gölgesi
              </label>
              <input
                type="text"
                value={settings.textShadow || ''}
                onChange={(e) => updateSetting('textShadow', e.target.value)}
                placeholder="1px 1px 2px rgba(0,0,0,0.5)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Preset Selector */}
      <div className="px-4 py-3 bg-white border-t border-gray-300">
        <div className="text-sm font-medium text-gray-700 mb-2">Hazır Stiller:</div>
        <div className="flex flex-wrap gap-2">
          {stylePresets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyPreset(preset)}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-white border-t border-gray-300 flex justify-between items-center">
        <button
          type="button"
          onClick={resetSettings}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
        >
          Sıfırla
        </button>
        
        <div className="text-xs text-gray-500">
          {Object.keys(settings).length} stil özelliği aktif
        </div>
      </div>

      {/* Preview */}
      {Object.keys(settings).length > 0 && (
        <div className="px-4 py-3 bg-gray-100 border-t border-gray-300">
          <div className="text-xs font-medium text-gray-700 mb-2">
            Önizleme:
            {(settings.fixedWidth || settings.fixedHeight) && (
              <span className="ml-2 text-xs text-blue-600 font-medium">
                🔒 Sabit boyut
              </span>
            )}
          </div>
          <div
            className="p-3 border border-gray-300 rounded text-sm"
            style={{
              ...settings,
              // Apply fixed dimensions with !important if marked as fixed
              width: settings.fixedWidth && settings.width ? `${settings.width} !important` : settings.width,
              height: settings.fixedHeight && settings.height ? `${settings.height} !important` : settings.height,
            }}
          >
            Bu bir örnek metindir
            {(settings.fixedWidth || settings.fixedHeight) && (
              <div className="mt-2 text-xs text-blue-600">
                🔒 Bu boyutlar sabit olarak ayarlanmıştır
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
