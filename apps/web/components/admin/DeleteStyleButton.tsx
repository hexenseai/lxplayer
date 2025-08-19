'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface DeleteStyleButtonProps {
  styleId: string;
  styleName: string;
}

export function DeleteStyleButton({ styleId, styleName }: DeleteStyleButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`"${styleName}" stilini silmek istediğinizden emin misiniz?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.deleteStyle(styleId);
      window.location.reload();
    } catch (error) {
      console.error('Error deleting style:', error);
      alert('Stil silinirken hata oluştu');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
    >
      {isDeleting ? 'Siliniyor...' : 'Sil'}
    </button>
  );
}
