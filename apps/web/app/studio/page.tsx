'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function StudioPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Studio</h1>
        <p className="text-gray-600">Eğitim içeriklerinizi oluşturun ve yönetin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" 
              onClick={() => router.push('/studio/trainings')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📚 Eğitimler
            </CardTitle>
            <CardDescription>
              Eğitim içeriklerinizi oluşturun ve düzenleyin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Yeni eğitimler oluşturun, mevcut eğitimleri düzenleyin ve organize edin.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push('/studio/assets')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎬 Medya Varlıkları
            </CardTitle>
            <CardDescription>
              Video, ses ve görsel dosyalarınızı yönetin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Medya dosyalarınızı yükleyin, organize edin ve eğitimlerinizde kullanın.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push('/studio/flows')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔄 Akışlar
            </CardTitle>
            <CardDescription>
              Etkileşimli eğitim akışlarınızı tasarlayın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              AI destekli etkileşimli eğitim akışları oluşturun ve yönetin.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Hızlı Başlangıç</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Yeni bir eğitim oluşturun</span>
            <Button size="sm" onClick={() => router.push('/studio/trainings')}>
              Eğitim Oluştur
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>Medya dosyalarınızı yükleyin</span>
            <Button size="sm" onClick={() => router.push('/studio/assets')}>
              Dosya Yükle
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span>Etkileşimli akışlar tasarlayın</span>
            <Button size="sm" onClick={() => router.push('/studio/flows')}>
              Akış Oluştur
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
