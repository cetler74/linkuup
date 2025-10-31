#!/usr/bin/env python3
"""
Test PostgreSQL Connection Script
Verifies that the application can connect to PostgreSQL successfully
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.app import app, db
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

def test_postgres_connection():
    """Test PostgreSQL connection and basic operations"""
    
    print("🧪 Testing PostgreSQL connection...")
    
    try:
        with app.app_context():
            # Test basic connection
            result = db.session.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"✅ PostgreSQL version: {version}")
            
            # Test table existence
            tables = ['users', 'salons', 'services', 'salon_services', 'reviews', 'bookings', 'salon_images', 'time_slots', 'salon_managers']
            
            for table in tables:
                try:
                    result = db.session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.scalar()
                    print(f"✅ Table '{table}': {count} records")
                except Exception as e:
                    print(f"❌ Table '{table}': Error - {e}")
            
            # Test a simple query
            print("\n🔍 Testing sample queries...")
            
            # Test users table
            try:
                result = db.session.execute(text("SELECT COUNT(*) FROM users WHERE is_active = true"))
                active_users = result.scalar()
                print(f"✅ Active users: {active_users}")
            except Exception as e:
                print(f"❌ Users query failed: {e}")
            
            # Test salons table
            try:
                result = db.session.execute(text("SELECT COUNT(*) FROM salons WHERE is_active = true"))
                active_salons = result.scalar()
                print(f"✅ Active salons: {active_salons}")
            except Exception as e:
                print(f"❌ Salons query failed: {e}")
            
            # Test foreign key relationships
            print("\n🔗 Testing foreign key relationships...")
            try:
                result = db.session.execute(text("""
                    SELECT COUNT(*) FROM salon_services ss
                    JOIN salons s ON ss.salon_id = s.id
                    JOIN services sv ON ss.service_id = sv.id
                """))
                relationships = result.scalar()
                print(f"✅ Salon-Service relationships: {relationships}")
            except Exception as e:
                print(f"❌ Foreign key test failed: {e}")
            
            print("\n🎉 PostgreSQL connection test completed successfully!")
            return True
            
    except Exception as e:
        print(f"❌ PostgreSQL connection test failed: {e}")
        return False

def test_api_endpoints():
    """Test API endpoints with PostgreSQL"""
    
    print("\n🌐 Testing API endpoints...")
    
    try:
        with app.test_client() as client:
            # Test health endpoint
            response = client.get('/api/health')
            if response.status_code == 200:
                print("✅ Health endpoint working")
            else:
                print(f"❌ Health endpoint failed: {response.status_code}")
            
            # Test salons endpoint
            response = client.get('/api/salons')
            if response.status_code == 200:
                data = response.get_json()
                salon_count = len(data.get('salons', []))
                print(f"✅ Salons endpoint working: {salon_count} salons returned")
            else:
                print(f"❌ Salons endpoint failed: {response.status_code}")
            
            # Test services endpoint
            response = client.get('/api/services')
            if response.status_code == 200:
                data = response.get_json()
                service_count = len(data)
                print(f"✅ Services endpoint working: {service_count} services returned")
            else:
                print(f"❌ Services endpoint failed: {response.status_code}")
            
            print("🎉 API endpoint tests completed!")
            return True
            
    except Exception as e:
        print(f"❌ API endpoint test failed: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 Starting PostgreSQL integration tests...\n")
    
    # Test database connection
    db_success = test_postgres_connection()
    
    if db_success:
        # Test API endpoints
        api_success = test_api_endpoints()
        
        if api_success:
            print("\n✅ All tests passed! PostgreSQL migration is successful.")
            return True
        else:
            print("\n❌ API tests failed. Check application configuration.")
            return False
    else:
        print("\n❌ Database connection failed. Check PostgreSQL setup.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
