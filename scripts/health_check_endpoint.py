#!/usr/bin/env python3
"""
Health Check Endpoint for BioSearch2
This script adds a health check endpoint to the Flask application
"""

import sys
import os
import psycopg2
from datetime import datetime

# Add the backend directory to Python path
sys.path.append('/home/biosearch/BioSearch2/backend')

def check_database_connection():
    """Check if database connection is working"""
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="biosearch_db",
            user="biosearch_user",
            password=os.getenv('DB_PASSWORD', 'biosearch_secure_password_2024')
        )
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        conn.close()
        return True, "Database connection OK"
    except Exception as e:
        return False, f"Database connection failed: {str(e)}"

def check_disk_space():
    """Check available disk space"""
    try:
        import shutil
        total, used, free = shutil.disk_usage("/")
        free_percent = (free / total) * 100
        if free_percent < 10:
            return False, f"Low disk space: {free_percent:.1f}% free"
        return True, f"Disk space OK: {free_percent:.1f}% free"
    except Exception as e:
        return False, f"Disk space check failed: {str(e)}"

def check_memory_usage():
    """Check memory usage"""
    try:
        with open('/proc/meminfo', 'r') as f:
            meminfo = f.read()
        
        for line in meminfo.split('\n'):
            if 'MemTotal:' in line:
                total = int(line.split()[1])
            elif 'MemAvailable:' in line:
                available = int(line.split()[1])
        
        used_percent = ((total - available) / total) * 100
        if used_percent > 90:
            return False, f"High memory usage: {used_percent:.1f}%"
        return True, f"Memory usage OK: {used_percent:.1f}%"
    except Exception as e:
        return False, f"Memory check failed: {str(e)}"

def main():
    """Main health check function"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {}
    }
    
    # Check database
    db_ok, db_msg = check_database_connection()
    health_status["checks"]["database"] = {
        "status": "ok" if db_ok else "error",
        "message": db_msg
    }
    
    # Check disk space
    disk_ok, disk_msg = check_disk_space()
    health_status["checks"]["disk"] = {
        "status": "ok" if disk_ok else "warning",
        "message": disk_msg
    }
    
    # Check memory
    memory_ok, memory_msg = check_memory_usage()
    health_status["checks"]["memory"] = {
        "status": "ok" if memory_ok else "warning",
        "message": memory_msg
    }
    
    # Overall status
    if not db_ok:
        health_status["status"] = "unhealthy"
    elif not disk_ok or not memory_ok:
        health_status["status"] = "degraded"
    
    # Print JSON response
    import json
    print(json.dumps(health_status, indent=2))
    
    # Exit with appropriate code
    if health_status["status"] == "unhealthy":
        sys.exit(1)
    elif health_status["status"] == "degraded":
        sys.exit(2)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
