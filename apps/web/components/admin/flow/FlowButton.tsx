'use client';
import React, { useState } from 'react';
import FlowEditor from './FlowEditor';

export default function FlowButton({ trainingId }: { trainingId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded">Akışı Düzenle</button>
      {open && <FlowEditor trainingId={trainingId} onClose={() => setOpen(false)} />}
    </>
  );
}


