'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap, addEdge, Connection, Edge, Node, NodeTypes, Handle, Position, applyNodeChanges, applyEdgeChanges, OnNodesChange, OnEdgesChange } from 'reactflow';
import 'reactflow/dist/style.css';
import { api, type Training, type TrainingSection } from '@/lib/api';
import { Bot, BookOpen } from 'lucide-react';
import { TrainingSectionForm } from './TrainingSectionForm';

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
  const [showCreateSectionForm, setShowCreateSectionForm] = useState(false);
  const [newSectionType, setNewSectionType] = useState<'video' | 'llm_task'>('video');

  // Sections'ları yeniden yükle
  const reloadSections = useCallback(async () => {
    try {
      const secs = await api.listTrainingSections(trainingId);
      const sorted = [...secs].sort((a, b) => a.order_index - b.order_index);
      setSections(sorted);
      
      // Mevcut sections'ları flow'a ekle (zaten varsa ekleme)
      const existingSectionIds = new Set(nodes.filter(n => n.type === 'sectionNode' || n.type === 'taskNode').map(n => n.id));
      const newSections = sorted.filter(s => !existingSectionIds.has(s.id));
      
      if (newSections.length > 0) {
        const newNodes = newSections.map((s, idx) => ({
          id: s.id,
          type: (s as any).type === 'llm_task' ? 'taskNode' : 'sectionNode',
          position: { x: 120 + (nodes.length % 4) * 260, y: 80 + Math.floor(nodes.length / 4) * 160 },
          data: { 
            label: s.title, 
            sectionId: s.id,
            section: s,
            description: s.description || ''
          },
        }));
        
        setNodes(prevNodes => [...prevNodes.filter(n => n.id !== 'end'), ...newNodes, prevNodes.find(n => n.id === 'end')!]);
      }
    } catch (error) {
      console.error('Error reloading sections:', error);
    }
  }, [trainingId, nodes]);

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
            type: (s as any).type === 'llm_task' ? 'taskNode' : 'sectionNode',
            position: { x: 120 + (idx % 4) * 260, y: 80 + Math.floor(idx / 4) * 160 },
            data: { 
              label: s.title, 
              sectionId: s.id,
              section: s,
              description: s.description || ''
            },
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
          // Mevcut flow varsa, sections'ları da ekle (eksik olanları)
          const existingSectionIds = new Set(loaded.nodes.filter(n => n.type === 'sectionNode' || n.type === 'taskNode').map(n => n.id));
          const missingSections = sorted.filter(s => !existingSectionIds.has(s.id));
          
          if (missingSections.length > 0) {
            const missingNodes = missingSections.map((s, idx) => ({
              id: s.id,
              type: (s as any).type === 'llm_task' ? 'taskNode' : 'sectionNode',
              position: { x: 120 + (loaded.nodes.length % 4) * 260, y: 80 + Math.floor(loaded.nodes.length / 4) * 160 },
              data: { 
                label: s.title, 
                sectionId: s.id,
                section: s,
                description: s.description || ''
              },
            }));
            loaded.nodes.push(...missingNodes);
          }
          
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


  const addDecisionNode = () => {
    const id = `decision-${Date.now()}`;
    setNodes((nds) => nds.concat({ id, type: 'decisionNode', position: { x: 280, y: 180 }, data: { label: 'LLM Kararı', decisionText: '', options: [] } }));
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

  const DecisionNode: React.FC<any> = ({ data }) => {
    const options = data?.options || [];
    const totalOptions = options.length;
    
    return (
      <div>
        <Handle type="target" position={Position.Left} />
        {options.map((option: any, index: number) => {
          const position = totalOptions === 1 ? 0.5 : index / (totalOptions - 1);
          return (
            <Handle
              key={`source-${index}`}
              type="source"
              position={Position.Right}
              id={`option-${index}`}
              style={{
                top: `${20 + position * 60}%`,
                background: '#f97316',
                border: '2px solid #ea580c',
                width: '8px',
                height: '8px'
              }}
            />
          );
        })}
        <BaseCard color="border-orange-400" title="LLM Kararı">
          <div className="text-gray-900 text-xs font-semibold">{data?.label || 'LLM Kararı'}</div>
          {data?.decisionText && (
            <div className="text-gray-600 text-[11px] whitespace-pre-wrap break-words">
              {data.decisionText}
            </div>
          )}
          {data?.options && data.options.length > 0 && (
            <div className="text-gray-500 text-[10px] mt-1">
              {data.options.length} seçenek
            </div>
          )}
        </BaseCard>
      </div>
    );
  };

  const nodeTypes = useMemo<NodeTypes>(() => ({ startNode: StartNode, endNode: EndNode, sectionNode: SectionNode, taskNode: TaskNode, decisionNode: DecisionNode }), []);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="bg-white w-[95vw] h-[90vh] rounded-lg shadow-xl flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">Akış Düzenleyici {training ? `— ${training.title}` : ''}</div>
          <div className="flex items-center gap-2 text-sm">
            <button 
              onClick={() => {
                setNewSectionType('llm_task');
                setShowCreateSectionForm(true);
              }} 
              className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white inline-flex items-center gap-1"
            >
              <Bot size={16} />
              <span>LLM Görevi</span>
            </button>
            <button 
              onClick={() => {
                setNewSectionType('video');
                setShowCreateSectionForm(true);
              }} 
              className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1"
            >
              <BookOpen size={16} />
              <span>Bölüm Düğümü</span>
            </button>
            <button onClick={addDecisionNode} className="px-3 py-1.5 rounded bg-orange-600 hover:bg-orange-700 text-white inline-flex items-center gap-1">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M9 12l2 2 4-4"/>
                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3"/>
                <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3"/>
              </svg>
              <span>LLM Kararı</span>
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
                    <div className="text-xs text-gray-500 mb-2">
                      📹 Video Bölümü
                    </div>
                    {selected.data?.section && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{selected.data.section.title}</div>
                        {selected.data.section.description && (
                          <div className="text-xs text-gray-600">{selected.data.section.description}</div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              // Section'ı düzenlemek için TrainingSectionForm aç
                              // Bu kısım daha sonra eklenebilir
                            }}
                            className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                          >
                            Düzenle
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {selected.type === 'taskNode' && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 mb-2">
                      🤖 LLM Görevi
                    </div>
                    {selected.data?.section && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{selected.data.section.title}</div>
                        {selected.data.section.description && (
                          <div className="text-xs text-gray-600">{selected.data.section.description}</div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              // Section'ı düzenlemek için TrainingSectionForm aç
                              // Bu kısım daha sonra eklenebilir
                            }}
                            className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                          >
                            Düzenle
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {selected.type === 'decisionNode' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600">Karar Başlığı</label>
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
                      <label className="block text-xs text-gray-600">LLM Karar Metni</label>
                      <textarea
                        className="w-full border rounded px-2 py-1 text-sm"
                        rows={4}
                        value={selected.data?.decisionText || ''}
                        onChange={(e) => {
                          setNodes((nds) => nds.map((n) => (n.id === selected.id ? { ...n, data: { ...n.data, decisionText: e.target.value } } : n)));
                          setSelected((n) => (n && n.id === selected.id ? { ...n, data: { ...n.data, decisionText: e.target.value } } : n));
                        }}
                        placeholder="LLM'in karar vermesi için gerekli bilgiler ve koşullar..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Seçenekler</label>
                      <div className="space-y-1">
                        {(selected.data?.options || []).map((option: any, index: number) => (
                          <div key={index} className="flex gap-1">
                            <input
                              className="flex-1 border rounded px-2 py-1 text-sm"
                              value={option.text || ''}
                              onChange={(e) => {
                                const newOptions = [...(selected.data?.options || [])];
                                newOptions[index] = { ...option, text: e.target.value };
                                setNodes((nds) => nds.map((n) => (n.id === selected.id ? { ...n, data: { ...n.data, options: newOptions } } : n)));
                                setSelected((n) => (n && n.id === selected.id ? { ...n, data: { ...n.data, options: newOptions } } : n));
                              }}
                              placeholder={`Seçenek ${index + 1}`}
                            />
                            <button
                              onClick={() => {
                                const newOptions = (selected.data?.options || []).filter((_: any, i: number) => i !== index);
                                setNodes((nds) => nds.map((n) => (n.id === selected.id ? { ...n, data: { ...n.data, options: newOptions } } : n)));
                                setSelected((n) => (n && n.id === selected.id ? { ...n, data: { ...n.data, options: newOptions } } : n));
                              }}
                              className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newOptions = [...(selected.data?.options || []), { text: '', targetNodeId: null }];
                            setNodes((nds) => nds.map((n) => (n.id === selected.id ? { ...n, data: { ...n.data, options: newOptions } } : n)));
                            setSelected((n) => (n && n.id === selected.id ? { ...n, data: { ...n.data, options: newOptions } } : n));
                          }}
                          className="w-full px-2 py-1 bg-green-500 text-white rounded text-xs"
                        >
                          + Seçenek Ekle
                        </button>
                      </div>
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
        
        {/* TrainingSectionForm Modal */}
        {showCreateSectionForm && training && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">
                {newSectionType === 'llm_task' ? '🤖 Yeni LLM Görevi' : '📹 Yeni Video Bölümü'}
              </h2>
              <TrainingSectionForm
                trainingId={training.id}
                onDone={() => {
                  setShowCreateSectionForm(false);
                  reloadSections(); // Sections'ları yeniden yükle
                }}
                initialType={newSectionType}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


