'use client';
import { InteractivePlayer } from '@/components/InteractivePlayer';

interface PlayerPageProps {
  params: {
    accessCode: string;
  };
}

export default function PlayerPage({ params }: PlayerPageProps) {
  console.log('PlayerPage params:', params);
  console.log('Access Code from params:', params.accessCode);
  
  return <InteractivePlayer accessCode={params.accessCode} />;
}
