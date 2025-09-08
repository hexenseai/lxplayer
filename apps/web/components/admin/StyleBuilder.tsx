'use client';

import React, { useState, useEffect } from 'react';

interface StyleBuilderProps {
  initialStyleJson?: string;
  onStyleChange: (styleJson: string) => void;
}

interface StyleData {
  // Text/Title styles
  textColor: string;
  fontSize: string;
  fontFamily: string;
  fontWeight: string;
  textAlign: string;
  textShadow: string;
  
  // Background styles
  backgroundColor: string;
  
  // Border styles
  borderColor: string;
  borderWidth: string;
  borderStyle: string;
  borderRadius: string;
  
  // Position and size
  width: string;
  height: string;
  padding: string;
  margin: string;
  
  // Effects
  boxShadow: string;
}

const defaultStyle: StyleData = {
  // Text/Title styles
  textColor: '#ffffff',
  fontSize: '24px',
  fontFamily: 'Arial, sans-serif',
  fontWeight: 'bold',
  textAlign: 'center',
  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
  
  // Background styles
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  
  // Border styles
  borderColor: '#ffffff',
  borderWidth: '2px',
  borderStyle: 'solid',
  borderRadius: '8px',
  
  // Position and size
  width: 'auto',
  height: 'auto',
  padding: '12px 20px',
  margin: '0px',
  
  // Effects
  boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
};

const fontFamilies = [
  'Arial, sans-serif',
  'Helvetica, sans-serif',
  'Times New Roman, serif',
  'Georgia, serif',
  'Verdana, sans-serif',
  'Tahoma, sans-serif',
  'Trebuchet MS, sans-serif',
  'Impact, sans-serif',
  'Comic Sans MS, cursive',
  'Courier New, monospace'
];

const predefinedThemes = [
  {
    name: 'Bold White',
    style: {
      textColor: '#ffffff',
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      textAlign: 'center',
      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#ffffff',
      borderWidth: '2px',
      borderStyle: 'solid',
      borderRadius: '8px',
      width: 'auto',
      height: 'auto',
      padding: '16px 24px',
      margin: '0px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
      opacity: '1'
    }
  },
  {
    name: 'Elegant Gold',
    style: {
      textColor: '#ffd700',
      fontSize: '24px',
      fontFamily: 'Georgia, serif',
      fontWeight: 'bold',
      textAlign: 'center',
      textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderColor: '#ffd700',
      borderWidth: '3px',
      borderStyle: 'solid',
      borderRadius: '12px',
      width: 'auto',
      height: 'auto',
      padding: '20px 30px',
      margin: '0px',
      boxShadow: '0 6px 12px rgba(255,215,0,0.3)',
      opacity: '1'
    }
  },
  {
    name: 'Modern Blue',
    style: {
      textColor: '#ffffff',
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      fontWeight: '600',
      textAlign: 'center',
      textShadow: '1px 1px 3px rgba(0,0,0,0.7)',
      backgroundColor: 'rgba(37, 99, 235, 0.9)',
      borderColor: '#1e40af',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderRadius: '6px',
      width: 'auto',
      height: 'auto',
      padding: '14px 20px',
      margin: '0px',
      boxShadow: '0 3px 6px rgba(37,99,235,0.4)',
      opacity: '1'
    }
  },
  {
    name: 'Clean Minimal',
    style: {
      textColor: '#000000',
      fontSize: '20px',
      fontFamily: 'Helvetica, sans-serif',
      fontWeight: 'normal',
      textAlign: 'center',
      textShadow: 'none',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: '#e5e7eb',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderRadius: '4px',
      width: 'auto',
      height: 'auto',
      padding: '12px 18px',
      margin: '0px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      opacity: '1'
    }
  }
];

export default function StyleBuilder({ initialStyleJson, onStyleChange }: StyleBuilderProps) {
  const [style, setStyle] = useState<StyleData>(defaultStyle);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (initialStyleJson) {
      try {
        const parsed = JSON.parse(initialStyleJson);
        setStyle({ ...defaultStyle, ...parsed });
      } catch (error) {
        console.error('Error parsing initial style JSON:', error);
      }
    } else {
      setStyle(defaultStyle);
    }
  }, [initialStyleJson]);

  useEffect(() => {
    // Only call onStyleChange if we have a valid style object
    if (style && Object.keys(style).length > 0) {
      onStyleChange(JSON.stringify(style, null, 2));
    }
  }, [style, onStyleChange]);

  const handleStyleChange = (field: keyof StyleData, value: string) => {
    setStyle(prev => ({ ...prev, [field]: value }));
  };

  const applyTheme = (themeStyle: StyleData) => {
    setStyle(themeStyle);
  };

  const resetToDefault = () => {
    setStyle(defaultStyle);
  };

  return (
    <div className="space-y-6">
      {/* Theme Presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Hazır Temalar</label>
        <div className="grid grid-cols-2 gap-2">
          {predefinedThemes.map((theme) => (
            <button
              key={theme.name}
              type="button"
              onClick={() => applyTheme(theme.style)}
              className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="font-medium text-sm">{theme.name}</div>
              <div className="flex space-x-1 mt-1">
                <div 
                  className="w-3 h-3 rounded border"
                  style={{ backgroundColor: theme.style.primaryColor }}
                ></div>
                <div 
                  className="w-3 h-3 rounded border"
                  style={{ backgroundColor: theme.style.secondaryColor }}
                ></div>
                <div 
                  className="w-3 h-3 rounded border"
                  style={{ backgroundColor: theme.style.backgroundColor }}
                ></div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Color Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Metin Rengi</label>
          <div className="flex space-x-2">
            <input
              type="color"
              value={style.textColor}
              onChange={(e) => handleStyleChange('textColor', e.target.value)}
              className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={style.textColor}
              onChange={(e) => handleStyleChange('textColor', e.target.value)}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Arka Plan Rengi</label>
          <div className="flex space-x-2">
            <input
              type="color"
              value={style.backgroundColor.startsWith('rgba') ? style.backgroundColor.match(/rgba?\(([^)]+)\)/)?.[1]?.split(',').slice(0,3).join(',') || '#000000' : style.backgroundColor}
              onChange={(e) => {
                const alpha = style.backgroundColor.startsWith('rgba') ? style.backgroundColor.match(/,\s*([0-9.]+)\)/)?.[1] || '0.7' : '0.7';
                handleStyleChange('backgroundColor', `rgba(${e.target.value.slice(1).match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ')}, ${alpha})`);
              }}
              className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={style.backgroundColor}
              onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Çerçeve Rengi</label>
          <div className="flex space-x-2">
            <input
              type="color"
              value={style.borderColor}
              onChange={(e) => handleStyleChange('borderColor', e.target.value)}
              className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={style.borderColor}
              onChange={(e) => handleStyleChange('borderColor', e.target.value)}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Arka Plan Şeffaflığı</label>
          <select
            value={style.backgroundColor.startsWith('rgba') ? style.backgroundColor.match(/,\s*([0-9.]+)\)/)?.[1] || '0.7' : '0.7'}
            onChange={(e) => {
              const colorMatch = style.backgroundColor.match(/rgba?\(([^)]+)\)/);
              if (colorMatch) {
                const rgb = colorMatch[1].split(',').slice(0,3).join(',');
                handleStyleChange('backgroundColor', `rgba(${rgb}, ${e.target.value})`);
              } else {
                // Convert hex to rgba
                const hex = style.backgroundColor.replace('#', '');
                const r = parseInt(hex.substr(0, 2), 16);
                const g = parseInt(hex.substr(2, 2), 16);
                const b = parseInt(hex.substr(4, 2), 16);
                handleStyleChange('backgroundColor', `rgba(${r}, ${g}, ${b}, ${e.target.value})`);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="0">Tamamen Şeffaf</option>
            <option value="0.1">%10</option>
            <option value="0.2">%20</option>
            <option value="0.3">%30</option>
            <option value="0.4">%40</option>
            <option value="0.5">%50</option>
            <option value="0.6">%60</option>
            <option value="0.7">%70</option>
            <option value="0.8">%80</option>
            <option value="0.9">%90</option>
            <option value="1">Tamamen Opak</option>
          </select>
        </div>
      </div>

      {/* Typography */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Font Ailesi</label>
          <select
            value={style.fontFamily}
            onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {fontFamilies.map((font) => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Font Boyutu</label>
          <select
            value={style.fontSize}
            onChange={(e) => handleStyleChange('fontSize', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="16px">16px - Küçük</option>
            <option value="20px">20px - Normal</option>
            <option value="24px">24px - Orta</option>
            <option value="28px">28px - Büyük</option>
            <option value="32px">32px - Çok Büyük</option>
            <option value="36px">36px - Başlık</option>
            <option value="48px">48px - Büyük Başlık</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Font Kalınlığı</label>
          <select
            value={style.fontWeight}
            onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="normal">Normal</option>
            <option value="bold">Kalın</option>
            <option value="600">Yarı Kalın</option>
            <option value="700">Çok Kalın</option>
            <option value="800">Ekstra Kalın</option>
            <option value="900">En Kalın</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Metin Hizalama</label>
          <select
            value={style.textAlign}
            onChange={(e) => handleStyleChange('textAlign', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="left">Sol</option>
            <option value="center">Orta</option>
            <option value="right">Sağ</option>
            <option value="justify">İki Yana Yasla</option>
          </select>
        </div>
      </div>

      {/* Advanced Settings */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
        >
          <span>{showAdvanced ? 'Gelişmiş Ayarları Gizle' : 'Gelişmiş Ayarları Göster'}</span>
          <svg 
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            {/* Border Settings */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Çerçeve Kalınlığı</label>
                <select
                  value={style.borderWidth}
                  onChange={(e) => handleStyleChange('borderWidth', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0px">Çerçeve Yok</option>
                  <option value="1px">1px - İnce</option>
                  <option value="2px">2px - Normal</option>
                  <option value="3px">3px - Kalın</option>
                  <option value="4px">4px - Çok Kalın</option>
                  <option value="5px">5px - Ekstra Kalın</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Çerçeve Stili</label>
                <select
                  value={style.borderStyle}
                  onChange={(e) => handleStyleChange('borderStyle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="solid">Düz</option>
                  <option value="dashed">Kesikli</option>
                  <option value="dotted">Noktalı</option>
                  <option value="double">Çift</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Köşe Yuvarlaklığı</label>
                <select
                  value={style.borderRadius}
                  onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0px">Köşeli</option>
                  <option value="4px">Hafif Yuvarlak</option>
                  <option value="8px">Orta Yuvarlak</option>
                  <option value="12px">Yuvarlak</option>
                  <option value="16px">Çok Yuvarlak</option>
                  <option value="50%">Tam Yuvarlak</option>
                </select>
              </div>
            </div>

            {/* Size and Spacing */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Genişlik</label>
                <select
                  value={style.width}
                  onChange={(e) => handleStyleChange('width', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="auto">Otomatik</option>
                  <option value="100px">100px</option>
                  <option value="200px">200px</option>
                  <option value="300px">300px</option>
                  <option value="400px">400px</option>
                  <option value="500px">500px</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yükseklik</label>
                <select
                  value={style.height}
                  onChange={(e) => handleStyleChange('height', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="auto">Otomatik</option>
                  <option value="30px">30px</option>
                  <option value="40px">40px</option>
                  <option value="50px">50px</option>
                  <option value="60px">60px</option>
                  <option value="80px">80px</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İç Boşluk</label>
                <select
                  value={style.padding}
                  onChange={(e) => handleStyleChange('padding', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="8px 12px">Küçük</option>
                  <option value="12px 16px">Normal</option>
                  <option value="16px 20px">Orta</option>
                  <option value="20px 24px">Büyük</option>
                  <option value="24px 30px">Çok Büyük</option>
                </select>
              </div>
            </div>

            {/* Effects */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metin Gölgesi</label>
                <select
                  value={style.textShadow}
                  onChange={(e) => handleStyleChange('textShadow', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">Gölge Yok</option>
                  <option value="1px 1px 2px rgba(0,0,0,0.5)">Hafif Gölge</option>
                  <option value="2px 2px 4px rgba(0,0,0,0.8)">Orta Gölge</option>
                  <option value="3px 3px 6px rgba(0,0,0,0.9)">Kalın Gölge</option>
                  <option value="0 0 10px rgba(255,255,255,0.8)">Parlak Gölge</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kutu Gölgesi</label>
                <select
                  value={style.boxShadow}
                  onChange={(e) => handleStyleChange('boxShadow', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">Gölge Yok</option>
                  <option value="0 2px 4px rgba(0,0,0,0.1)">Hafif Gölge</option>
                  <option value="0 4px 8px rgba(0,0,0,0.3)">Orta Gölge</option>
                  <option value="0 6px 12px rgba(0,0,0,0.5)">Kalın Gölge</option>
                  <option value="0 0 20px rgba(255,255,255,0.3)">Parlak Gölge</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={resetToDefault}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Varsayılana Sıfırla
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live Preview */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Canlı Önizleme</label>
        <div className="relative bg-gray-900 rounded-lg p-8 min-h-[200px] flex items-center justify-center overflow-hidden">
          {/* Video background simulation - fully opaque */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-lg"></div>
          <div className="absolute inset-0 bg-gradient-to-tl from-green-500 via-yellow-500 to-red-500 rounded-lg"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent rounded-lg"></div>
          
          {/* Styled element preview */}
          <div 
            className="relative z-10 transition-all duration-200"
            style={{
              color: style.textColor,
              fontFamily: style.fontFamily,
              fontSize: style.fontSize,
              fontWeight: style.fontWeight,
              textAlign: style.textAlign as any,
              textShadow: style.textShadow,
              backgroundColor: style.backgroundColor,
              borderColor: style.borderColor,
              borderWidth: style.borderWidth,
              borderStyle: style.borderStyle,
              borderRadius: style.borderRadius,
              width: style.width,
              height: style.height,
              padding: style.padding,
              margin: style.margin,
              boxShadow: style.boxShadow
            }}
          >
            Video Üzerinde Görünecek Metin
          </div>
        </div>
        
        {/* Style Properties Summary */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div>Font: {style.fontFamily}</div>
          <div>Boyut: {style.fontSize}</div>
          <div>Kalınlık: {style.fontWeight}</div>
          <div>Hizalama: {style.textAlign}</div>
          <div>Arka Plan: {style.backgroundColor}</div>
          <div>Şeffaflık: {style.backgroundColor.startsWith('rgba') ? Math.round(parseFloat(style.backgroundColor.match(/,\s*([0-9.]+)\)/)?.[1] || '0.7') * 100) : '100'}%</div>
        </div>
      </div>
    </div>
  );
}
