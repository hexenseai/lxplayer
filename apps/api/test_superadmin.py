#!/usr/bin/env python3
"""
Test script for super admin functionality
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_superadmin_login():
    """Test super admin login"""
    print("=== Testing Super Admin Login ===")
    
    login_data = {
        "email": "superadmin@example.com",
        "password": "superadmin123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        print(f"Login Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Login successful!")
            print(f"Token: {data.get('access_token', 'No token')[:50]}...")
            print(f"User: {data.get('user', {}).get('email', 'No user')}")
            print(f"Role: {data.get('user', {}).get('role', 'No role')}")
            print(f"Organization ID: {data.get('user', {}).get('organization_id', 'No org')}")
            return data.get('access_token')
        else:
            print(f"❌ Login failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_superadmin_endpoints(token):
    """Test super admin endpoints"""
    if not token:
        print("No token available for testing")
        return
        
    print("\n=== Testing Super Admin Endpoints ===")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Test users endpoint
    print("\n--- Testing Users Endpoint ---")
    try:
        response = requests.get(f"{BASE_URL}/users", headers=headers)
        print(f"Users Status Code: {response.status_code}")
        
        if response.status_code == 200:
            users = response.json()
            print(f"✅ Found {len(users)} users")
            for user in users:
                print(f"  - {user.get('email', 'No email')} ({user.get('role', 'No role')}) - Org: {user.get('organization_id', 'No org')}")
        else:
            print(f"❌ Users endpoint failed: {response.text}")
    except Exception as e:
        print(f"❌ Users endpoint error: {e}")
    
    # Test organizations endpoint
    print("\n--- Testing Organizations Endpoint ---")
    try:
        response = requests.get(f"{BASE_URL}/organizations", headers=headers)
        print(f"Organizations Status Code: {response.status_code}")
        
        if response.status_code == 200:
            orgs = response.json()
            print(f"✅ Found {len(orgs)} organizations")
            for org in orgs:
                print(f"  - {org.get('name', 'No name')} (ID: {org.get('id', 'No ID')})")
        else:
            print(f"❌ Organizations endpoint failed: {response.text}")
    except Exception as e:
        print(f"❌ Organizations endpoint error: {e}")
    
    # Test trainings endpoint
    print("\n--- Testing Trainings Endpoint ---")
    try:
        response = requests.get(f"{BASE_URL}/trainings", headers=headers)
        print(f"Trainings Status Code: {response.status_code}")
        
        if response.status_code == 200:
            trainings = response.json()
            print(f"✅ Found {len(trainings)} trainings")
            for training in trainings:
                print(f"  - {training.get('title', 'No title')} (Org: {training.get('organization_id', 'No org')})")
        else:
            print(f"❌ Trainings endpoint failed: {response.text}")
    except Exception as e:
        print(f"❌ Trainings endpoint error: {e}")
    
    # Test styles endpoint
    print("\n--- Testing Styles Endpoint ---")
    try:
        response = requests.get(f"{BASE_URL}/styles", headers=headers)
        print(f"Styles Status Code: {response.status_code}")
        
        if response.status_code == 200:
            styles = response.json()
            print(f"✅ Found {len(styles)} styles")
            for style in styles:
                print(f"  - {style.get('name', 'No name')} (Org: {style.get('organization_id', 'No org')})")
        else:
            print(f"❌ Styles endpoint failed: {response.text}")
    except Exception as e:
        print(f"❌ Styles endpoint error: {e}")
    
    # Test assets endpoint
    print("\n--- Testing Assets Endpoint ---")
    try:
        response = requests.get(f"{BASE_URL}/assets", headers=headers)
        print(f"Assets Status Code: {response.status_code}")
        
        if response.status_code == 200:
            assets = response.json()
            print(f"✅ Found {len(assets)} assets")
            for asset in assets:
                print(f"  - {asset.get('title', 'No title')} (Org: {asset.get('organization_id', 'No org')})")
        else:
            print(f"❌ Assets endpoint failed: {response.text}")
    except Exception as e:
        print(f"❌ Assets endpoint error: {e}")

def test_unauthorized_access():
    """Test unauthorized access"""
    print("\n=== Testing Unauthorized Access ===")
    
    try:
        response = requests.get(f"{BASE_URL}/users")
        print(f"Users without token Status Code: {response.status_code}")
        
        if response.status_code == 401:
            print("✅ Unauthorized access properly blocked")
        else:
            print(f"❌ Unauthorized access not blocked: {response.text}")
    except Exception as e:
        print(f"❌ Unauthorized access test error: {e}")

if __name__ == "__main__":
    print("=== Super Admin Functionality Test ===")
    
    # Test login
    token = test_superadmin_login()
    
    if token:
        # Test super admin endpoints
        test_superadmin_endpoints(token)
    else:
        print("Cannot proceed with tests without valid token")
    
    # Test unauthorized access
    test_unauthorized_access()
    
    print("\n=== Test Complete ===")
