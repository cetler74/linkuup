#!/usr/bin/env python3
"""
Test Enhanced Salon Search Functionality
Tests search by salon name, city, region, and services
"""

import requests
import json

BASE_URL = "http://localhost:5001"

def test_search(search_term, expected_min_results=1):
    """Test search functionality with a given term"""
    print(f"\n🔍 Testing search for: '{search_term}'")
    
    try:
        response = requests.get(f"{BASE_URL}/api/salons", params={'search': search_term})
        if response.status_code == 200:
            data = response.json()
            salons = data['salons']
            print(f"✅ Found {len(salons)} salons")
            
            if len(salons) >= expected_min_results:
                print("📋 Results:")
                for salon in salons[:5]:  # Show first 5 results
                    print(f"   - {salon['nome']} ({salon['cidade']})")
                if len(salons) > 5:
                    print(f"   ... and {len(salons) - 5} more")
                return True
            else:
                print(f"❌ Expected at least {expected_min_results} results, got {len(salons)}")
                return False
        else:
            print(f"❌ API Error: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def main():
    """Run comprehensive search tests"""
    print("🚀 Testing Enhanced Salon Search Functionality")
    print("=" * 50)
    
    # Test cases
    test_cases = [
        # Service-related searches
        ("manicure", 1, "Service name search"),
        ("pedicure", 1, "Service name search"),
        ("French", 1, "Specific service search"),
        ("Diamond", 1, "Service description search"),
        ("Manicure", 1, "Service category search"),
        
        # Salon name searches
        ("Bio", 1, "Salon name search"),
        ("Beauty", 1, "Salon name search"),
        ("Nails", 1, "Salon name search"),
        
        # Location searches
        ("Porto", 1, "City search"),
        ("Lisboa", 1, "City search"),
        ("Coimbra", 1, "City search"),
        
        # Combined searches
        ("Bio Diamond", 1, "Combined salon + service search"),
        ("Porto Nails", 1, "Combined city + service search"),
    ]
    
    passed = 0
    total = len(test_cases)
    
    for search_term, min_results, description in test_cases:
        print(f"\n📝 {description}")
        if test_search(search_term, min_results):
            passed += 1
    
    print("\n" + "=" * 50)
    print(f"🎯 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All search functionality tests passed!")
        print("\n✨ Enhanced search now supports:")
        print("   - Salon names")
        print("   - Cities and regions")
        print("   - Service names")
        print("   - Service categories")
        print("   - Service descriptions")
    else:
        print("⚠️  Some tests failed. Please check the implementation.")

if __name__ == "__main__":
    main()
