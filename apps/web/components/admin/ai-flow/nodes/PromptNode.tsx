import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

function PromptNode({ data }: NodeProps) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-purple-50 border-2 border-purple-200">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-purple-500 text-white text-sm font-bold">
          💬
        </div>
        <div className="ml-2 flex-1">
          <div className="text-sm font-bold text-purple-800">Prompt</div>
          <div className="text-xs text-purple-600">{data.label}</div>
          {data.prompt && (
            <div className="text-xs text-purple-500 mt-1 max-w-xs truncate">
              "{data.prompt.substring(0, 30)}..."
            </div>
          )}
          {data.purpose && (
            <div className="text-xs text-purple-400 mt-1 max-w-xs truncate">
              🎯 {data.purpose.substring(0, 25)}...
            </div>
          )}
          {data.initial_message && (
            <div className="text-xs text-purple-300 mt-1 max-w-xs truncate">
              💭 {data.initial_message.substring(0, 25)}...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(PromptNode);
