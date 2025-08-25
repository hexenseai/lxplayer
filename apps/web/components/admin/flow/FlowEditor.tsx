'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap, addEdge, Connection, Edge, Node, NodeTypes, Handle, Position, applyNodeChanges, applyEdgeChanges, OnNodesChange, OnEdgesChange } from 'reactflow';
import 'reactflow/dist/style.css';
import { api, type Training, type TrainingSection } from '@/lib/api';
import { Bot, BookOpen } from 'lucide-react';

interface FlowEditorProps {
  trainingId: string;
  onClose: () => void;
}

type FlowData = { nodes: Node[]; edges: Edge[] };

export default function FlowEditor({ trainingId, onClose }: FlowEditorProps) {
  const [training, setTraining] = useState<Training | null>(null);
  const [sections, setSections] = useState<TrainingSection[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [selected, setSelected] = useState<Node | null>(null);

  // Load training + sections & existing flow
  useEffect(() => {
    const load = async () => {
      try {
        const t = await api.getTraining(trainingId);
        setTraining(t);
        const secs = await api.listTrainingSections(trainingId);
        const sorted = [...secs].sort((a, b) => a.order_index - b.order_index);
        setSections(sorted);

        // Prepare initial nodes with fixed Start/End
        const baseNodes: Node[] = [
          { id: 'start', type: 'startNode', position: { x: 40, y: 40 }, data: { label: 'Başla' } },
          ...sorted.map((s, idx) => ({
            id: s.id,
            type: 'sectionNode',
            position: { x: 120 + (idx % 4) * 260, y: 80 + Math.floor(idx / 4) * 160 },
            data: { label: s.title, sectionId: s.id },
          })),
          { id: 'end', type: 'endNode', position: { x: 40, y: 440 }, data: { label: 'Bitiş' } },
        ];

        let loaded: FlowData | null = null;
        if ((t as any).ai_flow) {
          try { loaded = JSON.parse((t as any).ai_flow || '{}'); } catch {}
        }
        const ensureFixed = (nds: Node[]): Node[] => {
          const hasStart = nds.some(n => n.id === 'start');
          const hasEnd = nds.some(n => n.id === 'end');
          const withFixed = [...nds];
          if (!hasStart) withFixed.unshift({ id: 'start', type: 'startNode', position: { x: 40, y: 40 }, data: { label: 'Başla' } });
          if (!hasEnd) withFixed.push({ id: 'end', type: 'endNode', position: { x: 40, y: 440 }, data: { label: 'Bitiş' } });
          return withFixed;
        };
        if (loaded && Array.isArray(loaded.nodes) && Array.isArray(loaded.edges)) {
          setNodes(ensureFixed(loaded.nodes));
          setEdges(loaded.edges);
        } else {
          setNodes(ensureFixed(baseNodes));
          setEdges([]);
        }
      } catch (e) {
        console.error('FlowEditor load error', e);
        setStatus('Yükleme hatası');
      }
    };
    load();
  }, [trainingId]);

  const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)), []);

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    // prevent removing start/end
    const filtered = changes.filter((ch) => !(ch.type === 'remove' && (ch.id === 'start' || ch.id === 'end')));
    setNodes((nds) => applyNodeChanges(filtered, nds));
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const addTaskNode = () => {
    const id = `task-${Date.now()}`;
    setNodes((nds) => nds.concat({ id, type: 'taskNode', position: { x: 160, y: 160 }, data: { label: 'LLM Görevi', description: '' } }));
  };

  const addSectionNode = () => {
    const id = `section-${Date.now()}`;
    setNodes((nds) => nds.concat({ id, type: 'sectionNode', position: { x: 220, y: 120 }, data: { label: 'Bölüm', sectionId: null } }));
  };

  // (Removed) autoLinearize button as requested

  const save = async () => {
    try {
      setIsSaving(true);
      setStatus('Kaydediliyor...');
      const flow: FlowData = { nodes, edges };
      await api.updateTraining(trainingId, { title: training?.title || '', description: training?.description, flow_id: (training as any).flow_id ?? null, ai_flow: JSON.stringify(flow) });
      setStatus('Kaydedildi');
      setTimeout(() => setStatus(''), 1500);
    } catch (e) {
      console.error('Save error', e);
      setStatus('Kaydetme hatası');
    } finally {
      setIsSaving(false);
    }
  };

  // Custom Nodes
  const BaseCard: React.FC<{ color: string; title: string; children?: React.ReactNode }> = ({ color, title, children }) => (
    <div className={`rounded-lg shadow-md border ${color} bg-white min-w-[180px]`}> 
      <div className="px-3 py-2 text-sm font-medium border-b bg-gray-50">{title}</div>
      <div className="p-3 text-xs text-gray-700 space-y-2">{children}</div>
    </div>
  );

  const StartNode: React.FC<any> = () => (
    <div>
      <Handle type="source" position={Position.Right} />
      <BaseCard color="border-emerald-400" title="Başlangıç" />
    </div>
  );

  const EndNode: React.FC<any> = () => (
    <div>
      <Handle type="target" position={Position.Left} />
      <BaseCard color="border-rose-400" title="Bitiş" />
    </div>
  );

  const SectionNode: React.FC<any> = ({ data }) => (
    <div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <BaseCard color="border-indigo-400" title="Bölüm">
        <div className="font-semibold text-gray-900 text-xs">{data?.label || 'Bölüm'}</div>
      </BaseCard>
    </div>
  );

  const TaskNode: React.FC<any> = ({ data }) => (
    <div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <BaseCard color="border-purple-400" title="LLM Görevi">
        <div className="text-gray-900 text-xs font-semibold">{data?.label || 'Görev'}</div>
        {data?.description && (
          <div className="text-gray-600 text-[11px] whitespace-pre-wrap break-words">
            {data.description}
          </div>
        )}
      </BaseCard>
    </div>
  );

  const nodeTypes = useMemo<NodeTypes>(() => ({ startNode: StartNode, endNode: EndNode, sectionNode: SectionNode, taskNode: TaskNode }), []);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="bg-white w-[95vw] h-[90vh] rounded-lg shadow-xl flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">Akış Düzenleyici {training ? `— ${training.title}` : ''}</div>
          <div className="flex items-center gap-2 text-sm">
            <button onClick={addTaskNode} className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white inline-flex items-center gap-1">
              <Bot size={16} />
              <span>LLM Görevi</span>
            </button>
            <button onClick={addSectionNode} className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1">
              <BookOpen size={16} />
              <span>Bölüm Düğümü</span>
            </button>
            <button onClick={save} disabled={isSaving} className="px-3 py-1.5 rounded bg-emerald-600 text-white disabled:bg-emerald-400">Kaydet</button>
            <button onClick={onClose} className="px-3 py-1.5 rounded bg-gray-700 text-white">Kapat</button>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-4 gap-0 min-h-0">
          <div className="col-span-3 min-h-0">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => setSelected(node)}
              fitView
            >
              <MiniMap />
              <Controls />
              <Background />
            </ReactFlow>
          </div>
          <div className="col-span-1 border-l p-3 overflow-auto">
            <div className="text-sm font-medium mb-2">Seçili Düğüm</div>
            {!selected && <div className="text-xs text-gray-500">Bir düğüme tıklayın</div>}
            {selected && (
              <div className="space-y-3 text-sm">
                <div className="text-xs text-gray-500">ID: {selected.id}</div>
                {selected.type === 'sectionNode' && (
                  <div className="space-y-2">
                    <label className="block text-xs text-gray-600">Bölüm</label>
                    <select
                      className="w-full border rounded px-2 py-1 text-sm"
                      value={selected.data?.sectionId ?? ''}
                      onChange={(e) => {
                        const sec = sections.find((s) => s.id === e.target.value);
                        setNodes((nds) => nds.map((n) => (n.id === selected.id ? { ...n, data: { ...n.data, sectionId: sec?.id || null, label: sec?.title || 'Bölüm' } } : n)));
                        setSelected((n) => (n && n.id === selected.id ? { ...n, data: { ...n.data, sectionId: sec?.id || null, label: sec?.title || 'Bölüm' } } : n));
                      }}
                    >
                      <option value="">Seçiniz</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                  </div>
                )}
                {selected.type === 'taskNode' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600">Görev Başlığı</label>
                      <input
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={selected.data?.label || ''}
                        onChange={(e) => {
                          setNodes((nds) => nds.map((n) => (n.id === selected.id ? { ...n, data: { ...n.data, label: e.target.value } } : n)));
                          setSelected((n) => (n && n.id === selected.id ? { ...n, data: { ...n.data, label: e.target.value } } : n));
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Görev Açıklaması</label>
                      <textarea
                        className="w-full border rounded px-2 py-1 text-sm"
                        rows={3}
                        value={selected.data?.description || ''}
                        onChange={(e) => {
                          setNodes((nds) => nds.map((n) => (n.id === selected.id ? { ...n, data: { ...n.data, description: e.target.value } } : n)));
                          setSelected((n) => (n && n.id === selected.id ? { ...n, data: { ...n.data, description: e.target.value } } : n));
                        }}
                      />
                    </div>
                  </div>
                )}
                {selected.id !== 'start' && selected.id !== 'end' && (
                  <button
                    className="px-2 py-1 rounded bg-rose-600 text-white"
                    onClick={() => {
                      const id = selected.id;
                      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
                      setNodes((nds) => nds.filter((n) => n.id !== id));
                      setSelected(null);
                    }}
                  >
                    Düğümü Sil
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {status && <div className="px-4 py-2 text-sm text-gray-600 border-t">{status}</div>}
      </div>
    </div>
  );
}


