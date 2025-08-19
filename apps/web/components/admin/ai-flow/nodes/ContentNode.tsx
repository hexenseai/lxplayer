import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

function ContentNode({ data }: NodeProps) {
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'overlay': return '📋';
      default: return '📄';
    }
  };

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'image': return 'bg-pink-500';
      case 'video': return 'bg-red-500';
      case 'overlay': return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  };

  const contentType = data.contentType || 'text';
  const icon = getContentTypeIcon(contentType);
  const colorClass = getContentTypeColor(contentType);

  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-gray-50 border-2 border-gray-200">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      <div className="flex items-center">
        <div className={`rounded-full w-8 h-8 flex items-center justify-center ${colorClass} text-white text-sm font-bold`}>
          {icon}
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold text-gray-800">İçerik</div>
          <div className="text-xs text-gray-600">{data.label}</div>
          <div className="text-xs text-gray-500">Tür: {contentType}</div>
          {data.contentId && (
            <div className="text-xs text-gray-400">ID: {data.contentId}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ContentNode);
