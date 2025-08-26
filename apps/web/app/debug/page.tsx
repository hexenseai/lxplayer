'use client';

export default function DebugPage() {
  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">LXPlayer Debug Page</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Environment Variables</h2>
          
          <div className="space-y-4">
            <div className="p-4 border border-gray-200 rounded">
              <h3 className="font-semibold text-gray-600">NEXT_PUBLIC_API_URL:</h3>
              <p className="text-lg font-mono bg-gray-50 p-2 rounded">
                {process.env.NEXT_PUBLIC_API_URL || 'Not set'}
              </p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded">
              <h3 className="font-semibold text-gray-600">NEXT_PUBLIC_CDN_URL:</h3>
              <p className="text-lg font-mono bg-gray-50 p-2 rounded">
                {process.env.NEXT_PUBLIC_CDN_URL || 'Not set'}
              </p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded">
              <h3 className="font-semibold text-gray-600">NEXT_PUBLIC_TINYMCE_API_KEY:</h3>
              <p className="text-lg font-mono bg-gray-50 p-2 rounded">
                {process.env.NEXT_PUBLIC_TINYMCE_API_KEY ? 
                  `Yes (${process.env.NEXT_PUBLIC_TINYMCE_API_KEY.length} chars)` : 
                  'Not set'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Browser Information</h2>
          
          <div className="space-y-2 text-sm">
            <p><strong>User Agent:</strong> {typeof window !== 'undefined' ? window.navigator.userAgent : 'Server-side'}</p>
            <p><strong>Location:</strong> {typeof window !== 'undefined' ? window.location.href : 'Server-side'}</p>
            <p><strong>Origin:</strong> {typeof window !== 'undefined' ? window.location.origin : 'Server-side'}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">API Test</h2>
          
          <div className="space-y-4">
            <button 
              onClick={async () => {
                try {
                  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/docs`);
                  alert(`API Test: ${response.status} ${response.statusText}`);
                } catch (error) {
                  alert(`API Test Error: ${error instanceof Error ? error.message : String(error)}`);
                }
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Test API Connection
            </button>
            
            <div className="text-sm text-gray-600">
              <p>Click the button above to test if the API is accessible from the browser.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
