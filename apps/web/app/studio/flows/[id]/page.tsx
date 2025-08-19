'use client';
import React from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import { CompanyUserSection } from '@/components/CompanyUserSection';

const initialNodes = [
  { id: '1', position: { x: 0, y: 50 }, data: { label: 'Start' }, type: 'input' },
  { id: '2', position: { x: 200, y: 50 }, data: { label: 'Lesson' } },
];
const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
];

export default function FlowEditorPage() {
  return (
    <>
      <CompanyUserSection />
      <div style={{ width: '100%', height: '80vh' }}>
        <ReactFlow defaultNodes={initialNodes} defaultEdges={initialEdges}>
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </>
  );
}
