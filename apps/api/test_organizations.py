#!/usr/bin/env python3
"""
Test script for organizations API endpoint
"""

import requests
import json

# API base URL
BASE_URL = "http://localhost:8000"

def test_organizations_api():
    """Test the organizations API endpoint"""
    
    print("Testing Organizations API...")
    print("=" * 50)
    
    # Test 1: Health check
    print("\n1. Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")
        return
    
    # Test 2: Get current user (without auth - should fail)
    print("\n2. Testing get current user without auth...")
    try:
        response = requests.get(f"{BASE_URL}/auth/me")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 3: List organizations (without auth - should fail)
    print("\n3. Testing list organizations without auth...")
    try:
        response = requests.get(f"{BASE_URL}/organizations")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 4: Login as superadmin
    print("\n4. Testing login as superadmin...")
    try:
        login_data = {
            "username": "superadmin@example.com",
            "password": "superadmin123"
        }
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            login_response = response.json()
            access_token = login_response.get("access_token")
            print(f"Login successful, token: {access_token[:20]}...")
            
            # Test 5: Get current user with auth
            print("\n5. Testing get current user with auth...")
            headers = {"Authorization": f"Bearer {access_token}"}
            response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                user_data = response.json()
                print(f"User: {user_data.get('email')} - Role: {user_data.get('role')}")
                
                # Test 6: List organizations with auth
                print("\n6. Testing list organizations with auth...")
                response = requests.get(f"{BASE_URL}/organizations", headers=headers)
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    orgs = response.json()
                    print(f"Organizations found: {len(orgs)}")
                    for org in orgs:
                        print(f"  - {org.get('name')} (ID: {org.get('id')})")
                else:
                    print(f"Error response: {response.text}")
            else:
                print(f"Error getting user: {response.text}")
        else:
            print(f"Login failed: {response.text}")
            
    except Exception as e:
        print(f"Error during login: {e}")

if __name__ == "__main__":
    test_organizations_api()
