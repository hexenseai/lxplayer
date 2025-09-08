#!/usr/bin/env python3
"""
Backend debugging utility for LXPlayer
Usage: python scripts/debug-backend.py
"""

import os
import sys
import requests
import json
from typing import Dict, Any, Optional

# Add the API directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'apps', 'api'))

class BackendDebugger:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.session = requests.Session()
    
    def login(self, username: str = "superadmin@example.com", password: str = "admin123") -> bool:
        """Login and get authentication token"""
        print(f"🔐 Logging in as {username}...")
        
        login_data = {
            "username": username,
            "password": password
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            data = response.json()
            self.token = data.get("access_token")
            
            if self.token:
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                print(f"✅ Login successful! Token: {self.token[:20]}...")
                return True
            else:
                print("❌ No token received")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Login failed: {e}")
            return False
    
    def test_endpoint(self, endpoint: str, method: str = "GET", data: Optional[Dict] = None) -> Dict[str, Any]:
        """Test an API endpoint"""
        url = f"{self.base_url}{endpoint}"
        print(f"🔍 Testing {method} {endpoint}")
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data)
            elif method.upper() == "DELETE":
                response = self.session.delete(url)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            result = {
                "status_code": response.status_code,
                "success": response.status_code < 400,
                "url": url,
                "method": method
            }
            
            if response.status_code < 400:
                try:
                    result["data"] = response.json()
                    print(f"✅ {method} {endpoint} - Status: {response.status_code}")
                except json.JSONDecodeError:
                    result["data"] = response.text
                    print(f"✅ {method} {endpoint} - Status: {response.status_code} (Non-JSON response)")
            else:
                result["error"] = response.text
                print(f"❌ {method} {endpoint} - Status: {response.status_code}")
                print(f"   Error: {response.text}")
            
            return result
            
        except requests.exceptions.RequestException as e:
            error_result = {
                "status_code": None,
                "success": False,
                "error": str(e),
                "url": url,
                "method": method
            }
            print(f"❌ {method} {endpoint} - Request failed: {e}")
            return error_result
    
    def test_all_endpoints(self) -> Dict[str, Any]:
        """Test all major API endpoints"""
        print("🚀 Testing all API endpoints...")
        
        endpoints = [
            ("/auth/me", "GET"),
            ("/users/", "GET"),
            ("/companies/", "GET"),
            ("/styles/", "GET"),
            ("/trainings/", "GET"),
            ("/assets/", "GET"),
            ("/frame-configs/", "GET"),
        ]
        
        results = {}
        
        for endpoint, method in endpoints:
            results[endpoint] = self.test_endpoint(endpoint, method)
        
        return results
    
    def test_style_creation(self) -> Dict[str, Any]:
        """Test creating a new style"""
        print("🎨 Testing style creation...")
        
        style_data = {
            "name": f"Test Style {__import__('datetime').datetime.now().strftime('%Y%m%d%H%M%S')}",
            "description": "Test style created by debug script",
            "style_json": '{"color": "#000000", "fontSize": "14px"}'
        }
        
        return self.test_endpoint("/styles/", "POST", style_data)
    
    def test_user_creation(self) -> Dict[str, Any]:
        """Test creating a new user"""
        print("👤 Testing user creation...")
        
        # First get companies to use a valid company_id
        companies_result = self.test_endpoint("/companies/", "GET")
        if not companies_result.get("success") or not companies_result.get("data"):
            return {"error": "Cannot create user without valid companies"}
        
        company_id = companies_result["data"][0]["id"]
        
        user_data = {
            "email": f"testuser{__import__('datetime').datetime.now().strftime('%Y%m%d%H%M%S')}@example.com",
            "username": f"testuser{__import__('datetime').datetime.now().strftime('%Y%m%d%H%M%S')}",
            "full_name": "Test User",
            "company_id": company_id,
            "role": "User",
            "department": "Testing",
            "password": "testpassword123"
        }
        
        return self.test_endpoint("/users/", "POST", user_data)
    
    def check_database_connection(self) -> bool:
        """Check if database is accessible"""
        print("🗄️ Checking database connection...")
        
        try:
            # Import database modules
            from app.db import get_session
            from app.models import User
            
            session = next(get_session())
            user_count = session.query(User).count()
            session.close()
            
            print(f"✅ Database connection successful! Found {user_count} users")
            return True
            
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            return False
    
    def run_full_diagnostic(self) -> Dict[str, Any]:
        """Run a complete diagnostic of the backend"""
        print("🔧 Running full backend diagnostic...")
        
        diagnostic = {
            "timestamp": __import__('datetime').datetime.now().isoformat(),
            "base_url": self.base_url,
            "login_success": False,
            "database_connection": False,
            "endpoints": {},
            "style_creation": {},
            "user_creation": {}
        }
        
        # Test login
        diagnostic["login_success"] = self.login()
        
        if not diagnostic["login_success"]:
            print("❌ Cannot proceed without authentication")
            return diagnostic
        
        # Test database connection
        diagnostic["database_connection"] = self.check_database_connection()
        
        # Test all endpoints
        diagnostic["endpoints"] = self.test_all_endpoints()
        
        # Test style creation
        diagnostic["style_creation"] = self.test_style_creation()
        
        # Test user creation
        diagnostic["user_creation"] = self.test_user_creation()
        
        return diagnostic
    
    def print_summary(self, diagnostic: Dict[str, Any]):
        """Print a summary of the diagnostic results"""
        print("\n" + "="*50)
        print("📊 DIAGNOSTIC SUMMARY")
        print("="*50)
        
        print(f"🔐 Authentication: {'✅' if diagnostic['login_success'] else '❌'}")
        print(f"🗄️ Database: {'✅' if diagnostic['database_connection'] else '❌'}")
        
        print("\n📡 API Endpoints:")
        for endpoint, result in diagnostic.get("endpoints", {}).items():
            status = "✅" if result.get("success") else "❌"
            print(f"  {status} {endpoint}")
        
        print("\n🎨 Style Creation:")
        style_result = diagnostic.get("style_creation", {})
        status = "✅" if style_result.get("success") else "❌"
        print(f"  {status} Create new style")
        
        print("\n👤 User Creation:")
        user_result = diagnostic.get("user_creation", {})
        status = "✅" if user_result.get("success") else "❌"
        print(f"  {status} Create new user")
        
        print("\n" + "="*50)

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="LXPlayer Backend Debugger")
    parser.add_argument("--url", default="http://localhost:8000", help="Base URL of the API")
    parser.add_argument("--username", default="superadmin@example.com", help="Username for authentication")
    parser.add_argument("--password", default="admin123", help="Password for authentication")
    parser.add_argument("--endpoint", help="Test specific endpoint")
    parser.add_argument("--method", default="GET", help="HTTP method for endpoint testing")
    parser.add_argument("--data", help="JSON data for POST/PUT requests")
    
    args = parser.parse_args()
    
    debugger = BackendDebugger(args.url)
    
    if args.endpoint:
        # Test specific endpoint
        if not debugger.login(args.username, args.password):
            sys.exit(1)
        
        data = json.loads(args.data) if args.data else None
        result = debugger.test_endpoint(args.endpoint, args.method, data)
        print(f"\nResult: {json.dumps(result, indent=2)}")
    else:
        # Run full diagnostic
        diagnostic = debugger.run_full_diagnostic()
        debugger.print_summary(diagnostic)
        
        # Save results to file
        output_file = f"debug-results-{__import__('datetime').datetime.now().strftime('%Y%m%d%H%M%S')}.json"
        with open(output_file, 'w') as f:
            json.dump(diagnostic, f, indent=2)
        print(f"\n💾 Results saved to: {output_file}")

if __name__ == "__main__":
    main()
