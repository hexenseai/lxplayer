import './globals.css';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { Navbar } from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'LXPlayer - AI Destekli İnteraktif Eğitim Platformu',
  description: 'Yapay zeka destekli interaktif eğitim oynatıcı ile öğrenme deneyiminizi geliştirin',
  keywords: 'eğitim, yapay zeka, interaktif, öğrenme, video, platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 text-foreground antialiased`}>
        <Navbar />
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
