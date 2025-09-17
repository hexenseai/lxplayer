import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

function QuestionNode({ data }: NodeProps) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-orange-50 border-2 border-orange-200">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-orange-500 text-white text-sm font-bold">
          ❓
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold text-orange-800">Soru</div>
          <div className="text-xs text-orange-600">{data.label}</div>
          {data.question && (
            <div className="text-xs text-orange-500 mt-1 max-w-xs truncate">
              "{data.question.substring(0, 50)}..."
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(QuestionNode);
