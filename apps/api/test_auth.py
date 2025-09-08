#!/usr/bin/env python3
"""
Test script for authentication system
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_login():
    """Test login functionality"""
    print("Testing login...")
    
    login_data = {
        "email": "superadmin@example.com",
        "password": "superadmin123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        print(f"Login Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Login successful!")
            print(f"Token: {data.get('access_token', 'No token')[:50]}...")
            print(f"User: {data.get('user', {}).get('email', 'No user')}")
            print(f"Role: {data.get('user', {}).get('role', 'No role')}")
            return data.get('access_token')
        else:
            print(f"Login failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"Login error: {e}")
        return None

def test_protected_endpoint(token):
    """Test a protected endpoint"""
    if not token:
        print("No token available for testing")
        return
        
    print("\nTesting protected endpoint...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        # Test users endpoint
        response = requests.get(f"{BASE_URL}/users", headers=headers)
        print(f"Users endpoint Status Code: {response.status_code}")
        
        if response.status_code == 200:
            users = response.json()
            print(f"Found {len(users)} users")
            for user in users:
                print(f"  - {user.get('email', 'No email')} ({user.get('role', 'No role')})")
        else:
            print(f"Users endpoint failed: {response.text}")
            
        # Test organizations endpoint
        response = requests.get(f"{BASE_URL}/organizations", headers=headers)
        print(f"\nOrganizations endpoint Status Code: {response.status_code}")
        
        if response.status_code == 200:
            orgs = response.json()
            print(f"Found {len(orgs)} organizations")
            for org in orgs:
                print(f"  - {org.get('name', 'No name')}")
        else:
            print(f"Organizations endpoint failed: {response.text}")
            
    except Exception as e:
        print(f"Protected endpoint error: {e}")

def test_me_endpoint(token):
    """Test /auth/me endpoint"""
    if not token:
        print("No token available for testing")
        return
        
    print("\nTesting /auth/me endpoint...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        print(f"Me endpoint Status Code: {response.status_code}")
        
        if response.status_code == 200:
            user = response.json()
            print(f"Current user: {user.get('email', 'No email')}")
            print(f"Role: {user.get('role', 'No role')}")
            print(f"Organization ID: {user.get('organization_id', 'No org')}")
        else:
            print(f"Me endpoint failed: {response.text}")
            
    except Exception as e:
        print(f"Me endpoint error: {e}")

if __name__ == "__main__":
    print("=== Authentication Test ===")
    
    # Test login
    token = test_login()
    
    if token:
        # Test protected endpoints
        test_protected_endpoint(token)
        test_me_endpoint(token)
    else:
        print("Cannot proceed with tests without valid token")
    
    print("\n=== Test Complete ===")
