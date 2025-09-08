"use client";
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function DebugOrganizationsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await api.getCurrentUser();
      setCurrentUser(user);
      console.log('Current user:', user);
    } catch (e) {
      console.error('Error loading current user:', e);
      setError(`Error loading current user: ${e}`);
    }
  };

  const testOrganizations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing organizations API...');
      const orgs = await api.listOrganizations();
      console.log('Organizations response:', orgs);
      setOrganizations(orgs);
    } catch (e) {
      console.error('Error testing organizations:', e);
      setError(`Error testing organizations: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const clearData = () => {
    setOrganizations([]);
    setError(null);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Debug Organizations Page</h1>
      
      {/* Current User Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Current User</h2>
        {currentUser ? (
          <div className="space-y-2">
            <p><strong>Email:</strong> {currentUser.email}</p>
            <p><strong>Role:</strong> <span className="font-bold text-blue-600">{currentUser.role}</span></p>
            <p><strong>Organization ID:</strong> {currentUser.organization_id || 'None'}</p>
            <p><strong>Full Name:</strong> {currentUser.full_name || 'None'}</p>
            <p><strong>User ID:</strong> {currentUser.id}</p>
          </div>
        ) : (
          <p className="text-gray-500">No user data found</p>
        )}
      </div>

      {/* Test Buttons */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
        <div className="space-x-4">
          <button 
            onClick={testOrganizations}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Testing...' : 'Test Organizations API'}
          </button>
          <button 
            onClick={clearData}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Clear Data
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-red-600">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Results */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Organizations ({organizations.length})</h2>
        {organizations.length > 0 ? (
          <div className="space-y-4">
            {organizations.map((org) => (
              <div key={org.id} className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold text-lg">{org.name}</h3>
                <p className="text-gray-600">ID: {org.id}</p>
                <p className="text-gray-600">Business Topic: {org.business_topic || 'None'}</p>
                <p className="text-gray-600">Created: {org.created_at || 'Unknown'}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No organizations loaded</p>
        )}
      </div>
    </div>
  );
}
