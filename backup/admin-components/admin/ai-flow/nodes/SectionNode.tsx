import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

function SectionNode({ data }: NodeProps) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-blue-50 border-2 border-blue-200">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-blue-500 text-white text-sm font-bold">
          📚
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold text-blue-800">Bölüm</div>
          <div className="text-xs text-blue-600">{data.label}</div>
          {data.sectionId && (
            <div className="text-xs text-blue-500">ID: {data.sectionId}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(SectionNode);
