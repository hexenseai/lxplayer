"use client";

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface DeleteAssetButtonProps {
  assetId: string;
}

export function DeleteAssetButton({ assetId }: DeleteAssetButtonProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Bu içeriği silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await api.deleteAsset(assetId);
      router.refresh();
    } catch (error) {
      console.error('Silme hatası:', error);
      alert('İçerik silinirken bir hata oluştu.');
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="text-red-600 hover:text-red-900 text-sm font-medium"
    >
      Sil
    </button>
  );
}
