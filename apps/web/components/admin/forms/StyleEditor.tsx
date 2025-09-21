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
      newSettings[key] = newValue as any;
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
                  type="text"
                  value={settings.width || ''}
                  onChange={(e) => updateSetting('width', e.target.value)}
                  placeholder="200px"
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
                    Sabit genişlik (opsiyonel)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yükseklik
                </label>
                <input
                  type="text"
                  value={settings.height || ''}
                  onChange={(e) => updateSetting('height', e.target.value)}
                  placeholder="100px"
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
                    Sabit yükseklik (opsiyonel)
                  </label>
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
