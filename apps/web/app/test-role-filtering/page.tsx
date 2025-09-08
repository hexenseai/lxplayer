"use client";
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function TestRoleFilteringPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [styles, setStyles] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await api.getCurrentUser();
      setCurrentUser(user);
    } catch (e) {
      console.error('Error loading current user:', e);
      setError(`Error loading current user: ${e}`);
    }
  };

  const testRoleBasedFiltering = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Test all endpoints based on user role
      const [usersData, orgsData, trainingsData, stylesData, assetsData] = await Promise.all([
        api.listUsers(),
        api.listOrganizations(),
        api.listTrainings(),
        api.listStyles(),
        api.listAssets(),
      ]);
      
      setUsers(usersData);
      setOrganizations(orgsData);
      setTrainings(trainingsData);
      setStyles(stylesData);
      setAssets(assetsData);
      
      console.log('All data loaded successfully');
    } catch (e) {
      console.error('Error testing role-based filtering:', e);
      setError(`Error testing role-based filtering: ${e}`);
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
      <h1 className="text-3xl font-bold mb-6">Role-Based Filtering Test Page</h1>
      
      {/* Current User Info */}
      <div className="card mb-6">
        <div className="card-content">
          <h2 className="text-xl font-semibold mb-4">Current User</h2>
          {currentUser ? (
            <div className="space-y-2">
              <p><strong>Email:</strong> {currentUser.email}</p>
              <p><strong>Role:</strong> <span className="font-bold text-blue-600">{currentUser.role}</span></p>
              <p><strong>Organization ID:</strong> {currentUser.organization_id || 'None'}</p>
              <p><strong>Full Name:</strong> {currentUser.full_name || 'None'}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">No user data found</p>
          )}
        </div>
      </div>

      {/* Test Buttons */}
      <div className="card mb-6">
        <div className="card-content">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="space-x-4">
            <button 
              onClick={testRoleBasedFiltering}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Testing...' : 'Test Role-Based Filtering'}
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

      {/* Results Summary */}
      <div className="card mb-6">
        <div className="card-content">
          <h2 className="text-xl font-semibold mb-4">Data Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">{users.length}</div>
              <div className="text-sm text-blue-800">Users</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">{organizations.length}</div>
              <div className="text-sm text-green-800">Organizations</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded">
              <div className="text-2xl font-bold text-purple-600">{trainings.length}</div>
              <div className="text-sm text-purple-800">Trainings</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded">
              <div className="text-2xl font-bold text-orange-600">{styles.length}</div>
              <div className="text-sm text-orange-800">Styles</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">{assets.length}</div>
              <div className="text-sm text-red-800">Assets</div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Results */}
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
                    <p className="text-sm text-gray-600">Default: {style.is_default ? 'Yes' : 'No'}</p>
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
                    <p className="text-sm text-gray-600">Type: {asset.kind}</p>
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
