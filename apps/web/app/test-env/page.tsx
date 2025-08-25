'use client';

export default function TestEnvPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Test</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold">TinyMCE API Key:</h2>
          <p className="text-sm text-gray-600">
            Loaded: {process.env.NEXT_PUBLIC_TINYMCE_API_KEY ? 'Yes' : 'No'}
          </p>
          <p className="text-sm text-gray-600">
            Length: {process.env.NEXT_PUBLIC_TINYMCE_API_KEY?.length || 0}
          </p>
          <p className="text-sm text-gray-600">
            First 10 chars: {process.env.NEXT_PUBLIC_TINYMCE_API_KEY?.substring(0, 10) || 'N/A'}
          </p>
        </div>
        
        <div className="p-4 border rounded">
          <h2 className="font-semibold">API URL:</h2>
          <p className="text-sm text-gray-600">
            {process.env.NEXT_PUBLIC_API_URL || 'Not set'}
          </p>
        </div>
        
        <div className="p-4 border rounded">
          <h2 className="font-semibold">CDN URL:</h2>
          <p className="text-sm text-gray-600">
            {process.env.NEXT_PUBLIC_CDN_URL || 'Not set'}
          </p>
        </div>
      </div>
    </div>
  );
}
