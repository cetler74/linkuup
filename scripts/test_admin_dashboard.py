#!/usr/bin/env python3
"""
Integration test script for the Platform Admin Dashboard.
Tests all admin functionality end-to-end.
"""

import requests
import json
import sys
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List

# Configuration
BASE_URL = "http://localhost:5001/api/v1"
ADMIN_EMAIL = "admin@linkuup.com"
ADMIN_PASSWORD = "admin123"  # Update with actual admin password

class AdminDashboardTester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, message: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if message:
            print(f"   {message}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat()
        })
        
    def authenticate_admin(self) -> bool:
        """Test admin authentication"""
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                # Handle different response structures
                if "tokens" in data:
                    self.access_token = data["tokens"]["access_token"]
                elif "access_token" in data:
                    self.access_token = data["access_token"]
                else:
                    self.access_token = data.get("access_token")
                
                self.session.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
                
                # For now, assume admin if we can authenticate
                # In a real scenario, we'd need to check user profile
                self.log_test(
                    "Admin Authentication",
                    True,
                    f"Access token obtained successfully"
                )
                return True
            else:
                self.log_test("Admin Authentication", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Admin Authentication", False, str(e))
            return False
    
    def test_admin_stats(self) -> bool:
        """Test admin stats endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/admin/stats")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["users", "places", "bookings", "time_period", "generated_at"]
                has_required_fields = all(field in data for field in required_fields)
                
                self.log_test(
                    "Admin Stats API",
                    has_required_fields,
                    f"Fields: {list(data.keys())}"
                )
                return has_required_fields
            else:
                self.log_test("Admin Stats API", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Admin Stats API", False, str(e))
            return False
    
    def test_admin_owners(self) -> bool:
        """Test admin owners management"""
        try:
            # Test get owners
            response = self.session.get(f"{BASE_URL}/admin/owners?page=1&per_page=10")
            
            if response.status_code == 200:
                data = response.json()
                has_pagination = "items" in data and "total" in data
                
                self.log_test(
                    "Admin Owners API",
                    has_pagination,
                    f"Total owners: {data.get('total', 0)}"
                )
                return has_pagination
            else:
                self.log_test("Admin Owners API", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Admin Owners API", False, str(e))
            return False
    
    def test_admin_places(self) -> bool:
        """Test admin places management"""
        try:
            # Test get places
            response = self.session.get(f"{BASE_URL}/admin/places?page=1&per_page=10")
            
            if response.status_code == 200:
                data = response.json()
                has_pagination = "items" in data and "total" in data
                
                self.log_test(
                    "Admin Places API",
                    has_pagination,
                    f"Total places: {data.get('total', 0)}"
                )
                return has_pagination
            else:
                self.log_test("Admin Places API", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Admin Places API", False, str(e))
            return False
    
    def test_admin_bookings(self) -> bool:
        """Test admin bookings overview"""
        try:
            # Test get bookings
            response = self.session.get(f"{BASE_URL}/admin/bookings?page=1&per_page=10")
            
            if response.status_code == 200:
                data = response.json()
                has_pagination = "items" in data and "total" in data
                
                self.log_test(
                    "Admin Bookings API",
                    has_pagination,
                    f"Total bookings: {data.get('total', 0)}"
                )
                return has_pagination
            else:
                self.log_test("Admin Bookings API", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Admin Bookings API", False, str(e))
            return False
    
    def test_admin_campaigns(self) -> bool:
        """Test admin campaigns management"""
        try:
            # Test get campaigns
            response = self.session.get(f"{BASE_URL}/admin/campaigns?page=1&per_page=10")
            
            if response.status_code == 200:
                data = response.json()
                has_pagination = "items" in data and "total" in data
                
                self.log_test(
                    "Admin Campaigns API",
                    has_pagination,
                    f"Total campaigns: {data.get('total', 0)}"
                )
                return has_pagination
            else:
                self.log_test("Admin Campaigns API", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Admin Campaigns API", False, str(e))
            return False
    
    def test_admin_messages(self) -> bool:
        """Test admin messaging system"""
        try:
            # Test get messages
            response = self.session.get(f"{BASE_URL}/admin/messages?page=1&per_page=10")
            
            if response.status_code == 200:
                data = response.json()
                has_pagination = "items" in data and "total" in data
                
                self.log_test(
                    "Admin Messages API",
                    has_pagination,
                    f"Total messages: {data.get('total', 0)}"
                )
                return has_pagination
            else:
                self.log_test("Admin Messages API", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Admin Messages API", False, str(e))
            return False
    
    def test_unauthorized_access(self) -> bool:
        """Test that non-admin users cannot access admin endpoints"""
        try:
            # Create a session without admin token
            test_session = requests.Session()
            
            response = test_session.get(f"{BASE_URL}/admin/stats")
            
            # Should return 401 or 403
            is_unauthorized = response.status_code in [401, 403]
            
            self.log_test(
                "Unauthorized Access Protection",
                is_unauthorized,
                f"Status: {response.status_code}"
            )
            return is_unauthorized
            
        except Exception as e:
            self.log_test("Unauthorized Access Protection", False, str(e))
            return False
    
    def test_database_connection(self) -> bool:
        """Test database connectivity"""
        try:
            response = self.session.get(f"{BASE_URL}/health")
            
            if response.status_code == 200:
                data = response.json()
                is_healthy = data.get("status") == "healthy"
                
                self.log_test(
                    "Database Connection",
                    is_healthy,
                    f"Status: {data.get('status', 'unknown')}"
                )
                return is_healthy
            else:
                self.log_test("Database Connection", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Database Connection", False, str(e))
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all integration tests"""
        print("🚀 Starting Platform Admin Dashboard Integration Tests")
        print("=" * 60)
        
        # Test database connection first
        if not self.test_database_connection():
            print("\n❌ Database connection failed. Please check your database setup.")
            return self.get_test_summary()
        
        # Test authentication
        if not self.authenticate_admin():
            print("\n❌ Admin authentication failed. Please check admin credentials.")
            return self.get_test_summary()
        
        # Test all admin endpoints
        self.test_admin_stats()
        self.test_admin_owners()
        self.test_admin_places()
        self.test_admin_bookings()
        self.test_admin_campaigns()
        self.test_admin_messages()
        self.test_unauthorized_access()
        
        return self.get_test_summary()
    
    def get_test_summary(self) -> Dict[str, Any]:
        """Get test summary"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        summary = {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": (passed_tests / total_tests * 100) if total_tests > 0 else 0,
            "results": self.test_results
        }
        
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {summary['success_rate']:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        return summary

def main():
    """Main test runner"""
    tester = AdminDashboardTester()
    
    try:
        summary = tester.run_all_tests()
        
        # Exit with error code if any tests failed
        if summary["failed_tests"] > 0:
            sys.exit(1)
        else:
            print("\n🎉 All tests passed! Admin dashboard is ready.")
            sys.exit(0)
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n💥 Test runner error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
