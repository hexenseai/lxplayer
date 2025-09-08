#!/usr/bin/env python3
"""
Test script for SuperAdmin permissions
"""

import requests
import json

# API base URL
BASE_URL = "http://localhost:8000"

def test_superadmin_permissions():
    """Test SuperAdmin permissions for organizations and users"""
    
    print("Testing SuperAdmin Permissions...")
    print("=" * 50)
    
    # Login as superadmin
    print("\n1. Logging in as SuperAdmin...")
    try:
        login_data = {
            "username": "superadmin@example.com",
            "password": "superadmin123"
        }
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        print(f"Login Status: {response.status_code}")
        
        if response.status_code == 200:
            login_response = response.json()
            access_token = login_response.get("access_token")
            print(f"Login successful, token: {access_token[:20]}...")
            
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Test 2: Get current user
            print("\n2. Getting current user...")
            response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
            if response.status_code == 200:
                user_data = response.json()
                print(f"User: {user_data.get('email')} - Role: {user_data.get('role')}")
            else:
                print(f"Error getting user: {response.text}")
                return
            
            # Test 3: List organizations
            print("\n3. Testing list organizations...")
            response = requests.get(f"{BASE_URL}/organizations", headers=headers)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                orgs = response.json()
                print(f"Organizations found: {len(orgs)}")
                for org in orgs:
                    print(f"  - {org.get('name')} (ID: {org.get('id')})")
            else:
                print(f"Error: {response.text}")
            
            # Test 4: Create organization
            print("\n4. Testing create organization...")
            org_data = {
                "name": "Test Organization",
                "business_topic": "Test Business"
            }
            response = requests.post(f"{BASE_URL}/organizations", json=org_data, headers=headers)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                new_org = response.json()
                print(f"Created organization: {new_org.get('name')} (ID: {new_org.get('id')})")
                org_id = new_org.get('id')
            else:
                print(f"Error: {response.text}")
                org_id = None
            
            # Test 5: Update organization
            if org_id:
                print(f"\n5. Testing update organization {org_id}...")
                update_data = {
                    "name": "Updated Test Organization",
                    "business_topic": "Updated Business"
                }
                response = requests.put(f"{BASE_URL}/organizations/{org_id}", json=update_data, headers=headers)
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    updated_org = response.json()
                    print(f"Updated organization: {updated_org.get('name')}")
                else:
                    print(f"Error: {response.text}")
            
            # Test 6: List users
            print("\n6. Testing list users...")
            response = requests.get(f"{BASE_URL}/users", headers=headers)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                users = response.json()
                print(f"Users found: {len(users)}")
                for user in users:
                    print(f"  - {user.get('email')} (Role: {user.get('role')}, Org: {user.get('organization_id')})")
            else:
                print(f"Error: {response.text}")
            
            # Test 7: Create user
            print("\n7. Testing create user...")
            user_data = {
                "email": "testuser@example.com",
                "username": "testuser",
                "full_name": "Test User",
                "role": "User",
                "password": "testpass123",
                "organization_id": org_id if org_id else None
            }
            response = requests.post(f"{BASE_URL}/users", json=user_data, headers=headers)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                new_user = response.json()
                print(f"Created user: {new_user.get('email')} (ID: {new_user.get('id')})")
                user_id = new_user.get('id')
            else:
                print(f"Error: {response.text}")
                user_id = None
            
            # Test 8: Update user
            if user_id:
                print(f"\n8. Testing update user {user_id}...")
                update_data = {
                    "email": "updateduser@example.com",
                    "full_name": "Updated Test User"
                }
                response = requests.put(f"{BASE_URL}/users/{user_id}", json=update_data, headers=headers)
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    updated_user = response.json()
                    print(f"Updated user: {updated_user.get('email')}")
                else:
                    print(f"Error: {response.text}")
            
            # Test 9: Delete user
            if user_id:
                print(f"\n9. Testing delete user {user_id}...")
                response = requests.delete(f"{BASE_URL}/users/{user_id}", headers=headers)
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    print("User deleted successfully")
                else:
                    print(f"Error: {response.text}")
            
            # Test 10: Delete organization
            if org_id:
                print(f"\n10. Testing delete organization {org_id}...")
                response = requests.delete(f"{BASE_URL}/organizations/{org_id}", headers=headers)
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    print("Organization deleted successfully")
                else:
                    print(f"Error: {response.text}")
                    
        else:
            print(f"Login failed: {response.text}")
            
    except Exception as e:
        print(f"Error during test: {e}")

if __name__ == "__main__":
    test_superadmin_permissions()
