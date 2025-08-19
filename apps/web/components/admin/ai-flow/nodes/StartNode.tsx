import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

function StartNode({ data }: NodeProps) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-green-50 border-2 border-green-200">
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-green-500 text-white text-sm font-bold">
          🚀
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold text-green-800">Başlangıç</div>
          <div className="text-xs text-green-600">{data.label}</div>
        </div>
      </div>
    </div>
  );
}

export default memo(StartNode);
