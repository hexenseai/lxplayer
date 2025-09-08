"use client";
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function TestAuthPage() {
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [styles, setStyles] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = () => {
    try {
      const userData = localStorage.getItem('lx_user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (e) {
      console.error('Error loading user:', e);
    }
  };

  const testEndpoints = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Test users endpoint
      try {
        const usersData = await api.listUsers();
        setUsers(usersData);
        console.log('Users loaded:', usersData);
      } catch (e) {
        console.error('Users error:', e);
        setError(`Users error: ${e}`);
      }

      // Test organizations endpoint
      try {
        const orgsData = await api.listOrganizations();
        setOrganizations(orgsData);
        console.log('Organizations loaded:', orgsData);
      } catch (e) {
        console.error('Organizations error:', e);
        setError(`Organizations error: ${e}`);
      }

      // Test trainings endpoint
      try {
        const trainingsData = await api.listTrainings();
        setTrainings(trainingsData);
        console.log('Trainings loaded:', trainingsData);
      } catch (e) {
        console.error('Trainings error:', e);
        setError(`Trainings error: ${e}`);
      }

      // Test styles endpoint
      try {
        const stylesData = await api.listStyles();
        setStyles(stylesData);
        console.log('Styles loaded:', stylesData);
      } catch (e) {
        console.error('Styles error:', e);
        setError(`Styles error: ${e}`);
      }

      // Test assets endpoint
      try {
        const assetsData = await api.listAssets();
        setAssets(assetsData);
        console.log('Assets loaded:', assetsData);
      } catch (e) {
        console.error('Assets error:', e);
        setError(`Assets error: ${e}`);
      }

    } catch (e) {
      console.error('General error:', e);
      setError(`General error: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const clearData = () => {
    setUsers([]);
    setOrganizations([]);
    setTrainings([]);
    setStyles([]);
    setAssets([]);
    setError(null);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Authentication Test Page</h1>
      
      {/* User Info */}
      <div className="card mb-6">
        <div className="card-content">
          <h2 className="text-xl font-semibold mb-4">Current User</h2>
          {user ? (
            <div className="space-y-2">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> {user.role}</p>
              <p><strong>Organization ID:</strong> {user.organization_id || 'None'}</p>
              <p><strong>Full Name:</strong> {user.full_name || 'None'}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">No user data found</p>
          )}
        </div>
      </div>

      {/* Token Info */}
      <div className="card mb-6">
        <div className="card-content">
          <h2 className="text-xl font-semibold mb-4">Token Info</h2>
          <p><strong>Token:</strong> {typeof window !== 'undefined' ? (localStorage.getItem('token') ? 'Present' : 'Missing') : 'Unknown'}</p>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="card mb-6">
        <div className="card-content">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="space-x-4">
            <button 
              onClick={testEndpoints}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Testing...' : 'Test All Endpoints'}
            </button>
            <button 
              onClick={clearData}
              className="btn btn-outline"
            >
              Clear Data
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card mb-6">
          <div className="card-content">
            <h2 className="text-xl font-semibold mb-4 text-red-600">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Users */}
        <div className="card">
          <div className="card-content">
            <h3 className="text-lg font-semibold mb-4">Users ({users.length})</h3>
            {users.length > 0 ? (
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="p-2 bg-gray-50 rounded">
                    <p className="font-medium">{user.email}</p>
                    <p className="text-sm text-gray-600">Role: {user.role}</p>
                    <p className="text-sm text-gray-600">Org: {user.organization_id || 'None'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No users loaded</p>
            )}
          </div>
        </div>

        {/* Organizations */}
        <div className="card">
          <div className="card-content">
            <h3 className="text-lg font-semibold mb-4">Organizations ({organizations.length})</h3>
            {organizations.length > 0 ? (
              <div className="space-y-2">
                {organizations.map((org) => (
                  <div key={org.id} className="p-2 bg-gray-50 rounded">
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-gray-600">ID: {org.id}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No organizations loaded</p>
            )}
          </div>
        </div>

        {/* Trainings */}
        <div className="card">
          <div className="card-content">
            <h3 className="text-lg font-semibold mb-4">Trainings ({trainings.length})</h3>
            {trainings.length > 0 ? (
              <div className="space-y-2">
                {trainings.map((training) => (
                  <div key={training.id} className="p-2 bg-gray-50 rounded">
                    <p className="font-medium">{training.title}</p>
                    <p className="text-sm text-gray-600">Org: {training.organization_id || 'None'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No trainings loaded</p>
            )}
          </div>
        </div>

        {/* Styles */}
        <div className="card">
          <div className="card-content">
            <h3 className="text-lg font-semibold mb-4">Styles ({styles.length})</h3>
            {styles.length > 0 ? (
              <div className="space-y-2">
                {styles.map((style) => (
                  <div key={style.id} className="p-2 bg-gray-50 rounded">
                    <p className="font-medium">{style.name}</p>
                    <p className="text-sm text-gray-600">Org: {style.organization_id || 'None'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No styles loaded</p>
            )}
          </div>
        </div>

        {/* Assets */}
        <div className="card">
          <div className="card-content">
            <h3 className="text-lg font-semibold mb-4">Assets ({assets.length})</h3>
            {assets.length > 0 ? (
              <div className="space-y-2">
                {assets.map((asset) => (
                  <div key={asset.id} className="p-2 bg-gray-50 rounded">
                    <p className="font-medium">{asset.title}</p>
                    <p className="text-sm text-gray-600">Org: {asset.organization_id || 'None'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No assets loaded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
