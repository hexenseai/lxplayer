'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export function SeedStylesButton() {
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await api.seedDefaultStyles();
      window.location.reload();
    } catch (error) {
      console.error('Error seeding styles:', error);
      alert('Varsayılan stiller oluşturulurken hata oluştu');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <button
      onClick={handleSeed}
      disabled={isSeeding}
      className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 border border-indigo-300 rounded-md hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
    >
      {isSeeding ? 'Oluşturuluyor...' : 'Varsayılan Stilleri Oluştur'}
    </button>
  );
}
