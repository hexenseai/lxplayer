'use client';

import { useState } from 'react';
import { Style as StyleT } from '@/lib/api';
import { DeleteStyleButton } from './DeleteStyleButton';
import { Drawer } from './Drawer';
import { StyleEditForm } from './forms/StyleEditForm';
import { CopyStyleButton } from './CopyStyleButton';

interface StyleCardProps {
  style: StyleT;
}

export function StyleCard({ style }: StyleCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleEditDone = () => {
    setIsEditing(false);
    // Refresh the page to show updated data
    window.location.reload();
  };

  return (
    <>
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{style.name}</h3>
            {style.description && (
              <p className="text-sm text-gray-600 mt-1">{style.description}</p>
            )}
          </div>
          {style.is_default && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Varsayılan
            </span>
          )}
        </div>
        
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-700 mb-2">Önizleme:</div>
          <div
            className="p-3 border border-gray-300 rounded text-sm"
            style={JSON.parse(style.style_json)}
          >
            Bu bir örnek metindir
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Oluşturulma: {new Date(style.created_at).toLocaleDateString('tr-TR')}</span>
          <div className="flex items-center space-x-2">
            <CopyStyleButton style={style} />
            {!style.is_default && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Düzenle
                </button>
                <DeleteStyleButton styleId={style.id} styleName={style.name} />
              </>
            )}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Drawer */}
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-background shadow-2xl animate-slide-left">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold text-foreground">{style.name} - Düzenle</h2>
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="btn btn-ghost btn-sm"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-auto p-6">
                <StyleEditForm style={style} onDone={handleEditDone} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
