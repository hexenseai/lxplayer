'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  NodeTypes,
  EdgeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { api, TrainingSection, Asset } from '@/lib/api';

import StartNode from './nodes/StartNode';
import SectionNode from './nodes/SectionNode';
import PromptNode from './nodes/PromptNode';
import QuestionNode from './nodes/QuestionNode';
import ContentNode from './nodes/ContentNode';
import EndNode from './nodes/EndNode';
import CustomEdge from './edges/CustomEdge';

interface AIFlowEditorProps {
  trainingId: string;
  initialFlow?: {
    nodes: Node[];
    edges: Edge[];
  };
  onSave: (flow: { nodes: Node[]; edges: Edge[] }) => void;
  onClose: () => void;
}

export default function AIFlowEditor({ trainingId, initialFlow, onSave, onClose }: AIFlowEditorProps) {
  const nodeTypes: NodeTypes = useMemo(() => ({
    start: StartNode,
    section: SectionNode,
    prompt: PromptNode,
    question: QuestionNode,
    content: ContentNode,
    end: EndNode,
  }), []);

  const edgeTypes: EdgeTypes = useMemo(() => ({
    custom: CustomEdge,
  }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    (initialFlow?.edges || []).map(edge => ({
      ...edge,
      data: edge.data || { label: '' }
    }))
  );
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [sections, setSections] = useState<TrainingSection[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        type: 'custom',
        data: { label: '' } // Varsayılan boş label
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const updateEdgeLabel = useCallback((edgeId: string, label: string) => {
    setEdges((eds) =>
      eds.map((edge) => 
        edge.id === edgeId 
          ? { ...edge, data: { ...(edge.data || {}), label } }
          : edge
      )
    );
  }, [setEdges]);

  const addNode = useCallback((type: string, position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: { label: `New ${type}` },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const updateNodeData = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node))
    );
  }, [setNodes]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  }, [setNodes, setEdges]);

  const handleSave = useCallback(() => {
    onSave({ nodes, edges });
  }, [nodes, edges, onSave]);

  // Load sections and assets
  useEffect(() => {
    const loadData = async () => {
      try {
        const [sectionsData, assetsData] = await Promise.all([
          api.listTrainingSections(trainingId),
          api.listAssets()
        ]);
        setSections(sectionsData);
        setAssets(assetsData);
      } catch (error) {
        console.error('Data yüklenirken hata:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, [trainingId]);

  const nodeCount = useMemo(() => ({
    start: nodes.filter(n => n.type === 'start').length,
    section: nodes.filter(n => n.type === 'section').length,
    prompt: nodes.filter(n => n.type === 'prompt').length,
    question: nodes.filter(n => n.type === 'question').length,
    content: nodes.filter(n => n.type === 'content').length,
    end: nodes.filter(n => n.type === 'end').length,
  }), [nodes]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">AI Akış Editörü</h2>
            <p className="text-sm text-gray-600">Training ID: {trainingId}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Kaydet
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Kapat
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
                     {/* Sidebar */}
           <div className="w-80 bg-gray-50 border-r p-4 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Node Tipleri</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => addNode('start', { x: 100, y: 100 })}
                    className="w-full p-2 text-left bg-white border rounded hover:bg-gray-50"
                  >
                    🚀 Başlangıç ({nodeCount.start})
                  </button>
                  <button
                    onClick={() => addNode('section', { x: 200, y: 200 })}
                    className="w-full p-2 text-left bg-white border rounded hover:bg-gray-50"
                  >
                    📚 Bölüm ({nodeCount.section})
                  </button>
                  <button
                    onClick={() => addNode('prompt', { x: 300, y: 300 })}
                    className="w-full p-2 text-left bg-white border rounded hover:bg-gray-50"
                  >
                    💬 Prompt ({nodeCount.prompt})
                  </button>
                  <button
                    onClick={() => addNode('question', { x: 400, y: 400 })}
                    className="w-full p-2 text-left bg-white border rounded hover:bg-gray-50"
                  >
                    ❓ Soru ({nodeCount.question})
                  </button>
                  <button
                    onClick={() => addNode('content', { x: 500, y: 500 })}
                    className="w-full p-2 text-left bg-white border rounded hover:bg-gray-50"
                  >
                    📄 İçerik ({nodeCount.content})
                  </button>
                  <button
                    onClick={() => addNode('end', { x: 600, y: 600 })}
                    className="w-full p-2 text-left bg-white border rounded hover:bg-gray-50"
                  >
                    🏁 Bitiş ({nodeCount.end})
                  </button>
                </div>
              </div>

              {selectedNode && (
                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Node Özellikleri</h3>
                  <NodeProperties
                    node={selectedNode}
                    onUpdate={updateNodeData}
                    onDelete={deleteNode}
                    sections={sections}
                    assets={assets}
                    isLoadingData={isLoadingData}
                  />
                </div>
              )}

              {selectedEdge && (
                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Edge Özellikleri</h3>
                  <EdgeProperties
                    edge={selectedEdge}
                    onUpdate={updateEdgeLabel}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Flow Editor */}
          <div className="flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              zoomOnScroll={true}
              panOnScroll={false}
              zoomOnPinch={true}
              panOnDrag={true}
              zoomOnDoubleClick={false}
            >
              <Controls />
              <Background />
              <MiniMap />
            </ReactFlow>
          </div>
        </div>
      </div>
    </div>
  );
}

// Node Properties Component
function NodeProperties({ 
  node, 
  onUpdate, 
  onDelete, 
  sections, 
  assets, 
  isLoadingData 
}: {
  node: Node;
  onUpdate: (nodeId: string, data: any) => void;
  onDelete: (nodeId: string) => void;
  sections: TrainingSection[];
  assets: Asset[];
  isLoadingData: boolean;
}) {
  const [localData, setLocalData] = useState(node.data);

  // Node değiştiğinde local data'yı güncelle
  useEffect(() => {
    setLocalData(node.data);
  }, [node.id, node.data]);

  const handleLocalUpdate = useCallback((field: string, value: any) => {
    setLocalData((prev: any) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(() => {
    onUpdate(node.id, localData);
  }, [node.id, localData, onUpdate]);

     return (
     <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
       <div onClick={(e) => e.stopPropagation()}>
         <label className="block text-sm font-medium text-gray-700 mb-2">
           Label
         </label>
         <input
           type="text"
           value={localData.label || ''}
           onChange={(e) => handleLocalUpdate('label', e.target.value)}
           onMouseDown={(e) => e.stopPropagation()}
           onMouseUp={(e) => e.stopPropagation()}
           onKeyDown={(e) => e.stopPropagation()}
           onKeyUp={(e) => e.stopPropagation()}
           onFocus={(e) => e.stopPropagation()}
           onBlur={(e) => e.stopPropagation()}
           className="w-full p-3 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
           placeholder="Node etiketi..."
         />
       </div>

             {node.type === 'prompt' && (
         <div className="space-y-4">
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               Prompt
             </label>
             <textarea
               value={localData.prompt || ''}
               onChange={(e) => handleLocalUpdate('prompt', e.target.value)}
               onMouseDown={(e) => e.stopPropagation()}
               onMouseUp={(e) => e.stopPropagation()}
               onKeyDown={(e) => e.stopPropagation()}
               onKeyUp={(e) => e.stopPropagation()}
               onFocus={(e) => e.stopPropagation()}
               onBlur={(e) => e.stopPropagation()}
               rows={4}
               className="w-full p-3 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
               placeholder="AI prompt'unu buraya yazın..."
             />
           </div>
          
                     <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               Amaç
             </label>
             <textarea
               value={localData.purpose || ''}
               onChange={(e) => handleLocalUpdate('purpose', e.target.value)}
               onMouseDown={(e) => e.stopPropagation()}
               onMouseUp={(e) => e.stopPropagation()}
               onKeyDown={(e) => e.stopPropagation()}
               onKeyUp={(e) => e.stopPropagation()}
               onFocus={(e) => e.stopPropagation()}
               onBlur={(e) => e.stopPropagation()}
               rows={2}
               className="w-full p-3 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
               placeholder="Bu adımın amacını açıklayın..."
             />
           </div>
           
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               İlk Mesaj
             </label>
             <textarea
               value={localData.initial_message || ''}
               onChange={(e) => handleLocalUpdate('initial_message', e.target.value)}
               onMouseDown={(e) => e.stopPropagation()}
               onMouseUp={(e) => e.stopPropagation()}
               onKeyDown={(e) => e.stopPropagation()}
               onKeyUp={(e) => e.stopPropagation()}
               onFocus={(e) => e.stopPropagation()}
               onBlur={(e) => e.stopPropagation()}
               rows={3}
               className="w-full p-3 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
               placeholder="LLM'e gönderilecek ilk mesaj..."
             />
           </div>
        </div>
      )}

             {node.type === 'question' && (
         <div>
           <label className="block text-sm font-medium text-gray-700 mb-2">
             Soru
           </label>
           <textarea
             value={localData.question || ''}
             onChange={(e) => handleLocalUpdate('question', e.target.value)}
             onMouseDown={(e) => e.stopPropagation()}
             onMouseUp={(e) => e.stopPropagation()}
             onKeyDown={(e) => e.stopPropagation()}
             onKeyUp={(e) => e.stopPropagation()}
             onFocus={(e) => e.stopPropagation()}
             onBlur={(e) => e.stopPropagation()}
             rows={3}
             className="w-full p-3 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
             placeholder="Kullanıcıya sorulacak soru..."
           />
         </div>
       )}

             {node.type === 'section' && (
         <div>
           <label className="block text-sm font-medium text-gray-700 mb-2">
             Bölüm Seç
           </label>
           {isLoadingData ? (
             <div className="w-full p-3 border rounded-md text-sm text-gray-500">
               Yükleniyor...
             </div>
           ) : (
             <select
               value={localData.sectionId || ''}
               onChange={(e) => handleLocalUpdate('sectionId', e.target.value)}
               onMouseDown={(e) => e.stopPropagation()}
               onMouseUp={(e) => e.stopPropagation()}
               onKeyDown={(e) => e.stopPropagation()}
               onKeyUp={(e) => e.stopPropagation()}
               onFocus={(e) => e.stopPropagation()}
               onBlur={(e) => e.stopPropagation()}
               className="w-full p-3 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
             >
              <option value="">Bölüm seçin...</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

             {node.type === 'content' && (
         <>
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               İçerik Türü
             </label>
             <select
               value={localData.contentType || 'text'}
               onChange={(e) => handleLocalUpdate('contentType', e.target.value)}
               onMouseDown={(e) => e.stopPropagation()}
               onMouseUp={(e) => e.stopPropagation()}
               onKeyDown={(e) => e.stopPropagation()}
               onKeyUp={(e) => e.stopPropagation()}
               onFocus={(e) => e.stopPropagation()}
               onBlur={(e) => e.stopPropagation()}
               className="w-full p-3 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
             >
              <option value="text">Metin</option>
              <option value="image">Resim</option>
              <option value="video">Video</option>
              <option value="overlay">Overlay</option>
            </select>
          </div>
          
                     <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               İçerik Seç
             </label>
             {isLoadingData ? (
               <div className="w-full p-3 border rounded-md text-sm text-gray-500">
                 Yükleniyor...
               </div>
             ) : (
               <select
                 value={localData.contentId || ''}
                 onChange={(e) => handleLocalUpdate('contentId', e.target.value)}
                 onMouseDown={(e) => e.stopPropagation()}
                 onMouseUp={(e) => e.stopPropagation()}
                 onKeyDown={(e) => e.stopPropagation()}
                 onKeyUp={(e) => e.stopPropagation()}
                 onFocus={(e) => e.stopPropagation()}
                 onBlur={(e) => e.stopPropagation()}
                 className="w-full p-3 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
               >
                <option value="">İçerik seçin...</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.title} ({asset.kind})
                  </option>
                ))}
              </select>
            )}
          </div>
        </>
      )}

      <div className="flex space-x-2">
        <button
          onClick={handleSave}
          className="flex-1 p-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
        >
          Tamam
        </button>
        <button
          onClick={() => onDelete(node.id)}
          className="flex-1 p-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Node'u Sil
        </button>
      </div>
    </div>
  );
}

// Edge Properties Component
function EdgeProperties({ 
  edge, 
  onUpdate 
}: {
  edge: Edge;
  onUpdate: (edgeId: string, label: string) => void;
}) {
  const [localLabel, setLocalLabel] = useState(edge.data?.label || '');

  // Edge değiştiğinde local label'ı güncelle
  useEffect(() => {
    setLocalLabel(edge.data?.label || '');
  }, [edge.id, edge.data?.label]);

  const handleLocalUpdate = useCallback((field: string, value: any) => {
    setLocalLabel(value);
  }, []);

  const handleSave = useCallback(() => {
    onUpdate(edge.id, localLabel);
  }, [edge.id, localLabel, onUpdate]);

     return (
     <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
       <div onClick={(e) => e.stopPropagation()}>
         <label className="block text-sm font-medium text-gray-700 mb-2">
           Etiket
         </label>
         <input
           type="text"
           value={localLabel || ''}
           onChange={(e) => handleLocalUpdate('label', e.target.value)}
           onMouseDown={(e) => e.stopPropagation()}
           onMouseUp={(e) => e.stopPropagation()}
           onKeyDown={(e) => e.stopPropagation()}
           onKeyUp={(e) => e.stopPropagation()}
           onFocus={(e) => e.stopPropagation()}
           onBlur={(e) => e.stopPropagation()}
           className="w-full p-3 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
           placeholder="Edge etiketi..."
         />
       </div>

      <div className="flex space-x-2">
        <button
          onClick={handleSave}
          className="flex-1 p-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
        >
          Tamam
        </button>
      </div>
    </div>
  );
}
