'use client';

import { useState } from 'react';
import { api, Style } from '@/lib/api';

interface CopyStyleButtonProps {
  style: Style;
}

export function CopyStyleButton({ style }: CopyStyleButtonProps) {
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = async () => {
    const defaultName = `${style.name} kopya`;
    const name = prompt('Yeni stil adı:', defaultName);
    if (!name) return;

    setIsCopying(true);
    try {
      await api.createStyle({
        name,
        description: style.description ?? undefined,
        style_json: style.style_json,
      });
      window.location.reload();
    } catch (error: any) {
      console.error('Error copying style:', error);
      alert(error?.message || 'Stil kopyalanırken hata oluştu');
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <button
      onClick={handleCopy}
      disabled={isCopying}
      className="text-gray-600 hover:text-gray-800 text-xs font-medium disabled:opacity-50"
    >
      {isCopying ? 'Kopyalanıyor...' : 'Kopyala'}
    </button>
  );
}


