import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

function EndNode({ data }: NodeProps) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-red-50 border-2 border-red-200">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-red-500 text-white text-sm font-bold">
          🏁
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold text-red-800">Bitiş</div>
          <div className="text-xs text-red-600">{data.label}</div>
        </div>
      </div>
    </div>
  );
}

export default memo(EndNode);
