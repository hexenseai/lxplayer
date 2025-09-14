'use client';
import { InteractivePlayer } from '@/components/InteractivePlayer';
import { memo } from 'react';

interface PlayerPageProps {
  params: {
    accessCode: string;
  };
  searchParams?: {
    userId?: string;
  };
}

const PlayerPage = memo(function PlayerPage({ params, searchParams }: PlayerPageProps) {
  console.log('PlayerPage params:', params);
  console.log('Access Code from params:', params.accessCode);
  if (searchParams?.userId) {
    console.log('User ID from query:', searchParams.userId);
  }
  
  return <InteractivePlayer accessCode={params.accessCode} userId={searchParams?.userId} />;
});

export default PlayerPage;
