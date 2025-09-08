'use client';

import React from 'react';

interface StylePreviewProps {
  styleJson: string;
  styleName: string;
}

export default function StylePreview({ styleJson, styleName }: StylePreviewProps) {
  let styleData;
  
  try {
    styleData = JSON.parse(styleJson);
  } catch (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-600 text-sm font-medium">Geçersiz JSON</div>
        <div className="text-red-500 text-xs mt-1">Stil JSON'u geçerli değil</div>
      </div>
    );
  }

  const {
    textColor = '#ffffff',
    fontSize = '24px',
    fontFamily = 'Arial, sans-serif',
    fontWeight = 'bold',
    textAlign = 'center',
    textShadow = '2px 2px 4px rgba(0,0,0,0.8)',
    backgroundColor = 'rgba(0, 0, 0, 0.7)',
    borderColor = '#ffffff',
    borderWidth = '2px',
    borderStyle = 'solid',
    borderRadius = '8px',
    width = 'auto',
    height = 'auto',
    padding = '12px 20px',
    margin = '0px',
    boxShadow = '0 4px 8px rgba(0,0,0,0.3)'
  } = styleData;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-sm font-medium text-gray-700 mb-3">Preview: {styleName}</div>
      
      {/* Video Background Simulation */}
      <div className="relative bg-gray-900 rounded-lg p-6 min-h-[120px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-lg"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-green-500 via-yellow-500 to-red-500 rounded-lg"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent rounded-lg"></div>
        
        {/* Styled Element Preview */}
        <div 
          className="relative z-10 transition-all duration-200"
          style={{
            color: textColor,
            fontFamily,
            fontSize,
            fontWeight,
            textAlign: textAlign as any,
            textShadow,
            backgroundColor,
            borderColor,
            borderWidth,
            borderStyle,
            borderRadius,
            width,
            height,
            padding,
            margin,
            boxShadow
          }}
        >
          Video Element Örneği
        </div>
      </div>

      {/* Color Palette */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="flex items-center space-x-2">
          <div 
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: textColor }}
          ></div>
          <span className="text-xs text-gray-600">Metin</span>
        </div>
        <div className="flex items-center space-x-2">
          <div 
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: backgroundColor }}
          ></div>
          <span className="text-xs text-gray-600">Arka Plan</span>
        </div>
        <div className="flex items-center space-x-2">
          <div 
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: borderColor }}
          ></div>
          <span className="text-xs text-gray-600">Çerçeve</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded border bg-gray-200 flex items-center justify-center">
            <span className="text-xs text-gray-600">
              {backgroundColor.startsWith('rgba') ? 
                Math.round(parseFloat(backgroundColor.match(/,\s*([0-9.]+)\)/)?.[1] || '0.7') * 100) : 
                '100'}%
            </span>
          </div>
          <span className="text-xs text-gray-600">Şeffaflık</span>
        </div>
      </div>

      {/* Style Properties */}
      <div className="mt-3 text-xs text-gray-500">
        <div>Font: {fontFamily}</div>
        <div>Boyut: {fontSize}</div>
        <div>Kalınlık: {fontWeight}</div>
        <div>Hizalama: {textAlign}</div>
        <div>Çerçeve: {borderWidth} {borderStyle}</div>
        <div>Köşe: {borderRadius}</div>
      </div>
    </div>
  );
}
