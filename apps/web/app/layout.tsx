import './globals.css';
import type { ReactNode } from 'react';
import { Navbar } from '@/components/Navbar';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'LXPlayer - AI Destekli İnteraktif Eğitim Platformu',
  description: 'Yapay zeka destekli interaktif eğitim oynatıcı ile öğrenme deneyiminizi geliştirin',
  keywords: 'eğitim, yapay zeka, interaktif, öğrenme, video, platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 text-foreground antialiased`}>
        <Navbar />
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
