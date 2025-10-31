#!/usr/bin/env python3
"""
Database cleanup script - Remove all salons except the ones you want to keep
"""

import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app, db, Salon, SalonService, Booking, TimeSlot, Review, SalonImage

def list_all_salons():
    """List all salons in the database"""
    with app.app_context():
        salons = Salon.query.order_by(Salon.id).all()
        print(f"\nTotal salons in database: {len(salons)}")
        print("=" * 80)
        
        for salon in salons[:20]:  # Show first 20
            owner_info = f" (Owner: {salon.owner.email})" if salon.owner else " (No owner)"
            print(f"ID: {salon.id:4d} | {salon.nome[:60]:<60} | {salon.cidade or 'No city'}")
        
        if len(salons) > 20:
            print(f"\n... and {len(salons) - 20} more salons")
        
        return salons

def show_database_stats():
    """Show database statistics"""
    with app.app_context():
        total_salons = Salon.query.count()
        active_salons = Salon.query.filter_by(is_active=True).count()
        booking_enabled = Salon.query.filter_by(booking_enabled=True).count()
        total_services = SalonService.query.count()
        total_bookings = Booking.query.count()
        total_reviews = Review.query.count()
        
        print("\n" + "=" * 60)
        print("DATABASE STATISTICS")
        print("=" * 60)
        print(f"Total Salons:          {total_salons}")
        print(f"Active Salons:         {active_salons}")
        print(f"Booking Enabled:       {booking_enabled}")
        print(f"Total Services:        {total_services}")
        print(f"Total Bookings:        {total_bookings}")
        print(f"Total Reviews:         {total_reviews}")
        print("=" * 60)

def keep_only_salons(salon_ids_to_keep):
    """
    Keep only specified salons and delete the rest
    
    Args:
        salon_ids_to_keep: List of salon IDs to keep
    """
    with app.app_context():
        # Get all salons
        all_salons = Salon.query.all()
        total_count = len(all_salons)
        
        salons_to_delete = [s for s in all_salons if s.id not in salon_ids_to_keep]
        salons_to_keep = [s for s in all_salons if s.id in salon_ids_to_keep]
        
        print(f"\n{'='*60}")
        print(f"CLEANUP PLAN")
        print(f"{'='*60}")
        print(f"Total salons:          {total_count}")
        print(f"Salons to KEEP:        {len(salons_to_keep)}")
        print(f"Salons to DELETE:      {len(salons_to_delete)}")
        print(f"{'='*60}")
        
        print("\nSalons to KEEP:")
        for salon in salons_to_keep:
            print(f"  ✓ ID {salon.id}: {salon.nome}")
        
        print(f"\nWill DELETE {len(salons_to_delete)} salons...")
        
        # Confirm
        confirm = input("\nType 'DELETE' to confirm deletion: ")
        if confirm != 'DELETE':
            print("❌ Cancelled - no changes made")
            return False
        
        # Delete salons (cascade will delete related records)
        deleted_count = 0
        for salon in salons_to_delete:
            # Manually delete related records to be sure
            SalonImage.query.filter_by(salon_id=salon.id).delete()
            SalonService.query.filter_by(salon_id=salon.id).delete()
            Booking.query.filter_by(salon_id=salon.id).delete()
            TimeSlot.query.filter_by(salon_id=salon.id).delete()
            Review.query.filter_by(salon_id=salon.id).delete()
            
            db.session.delete(salon)
            deleted_count += 1
            
            if deleted_count % 100 == 0:
                print(f"Deleted {deleted_count} salons...")
                db.session.commit()
        
        db.session.commit()
        
        print(f"\n✅ Successfully deleted {deleted_count} salons")
        print(f"✅ Kept {len(salons_to_keep)} salons")
        
        # Show new stats
        show_database_stats()
        
        return True

def delete_all_salons_except_owned():
    """Delete all salons except those with owners"""
    with app.app_context():
        # Find salons with owners
        owned_salons = Salon.query.filter(Salon.owner_id.isnot(None)).all()
        
        if not owned_salons:
            print("❌ No salons with owners found!")
            return False
        
        print(f"\nFound {len(owned_salons)} salons with owners:")
        for salon in owned_salons:
            print(f"  ID {salon.id}: {salon.nome} (Owner: {salon.owner.email})")
        
        salon_ids = [s.id for s in owned_salons]
        return keep_only_salons(salon_ids)

def interactive_cleanup():
    """Interactive cleanup mode"""
    print("\n" + "="*60)
    print("DATABASE CLEANUP TOOL")
    print("="*60)
    
    show_database_stats()
    
    print("\nOptions:")
    print("1. List first 50 salons")
    print("2. Delete all salons EXCEPT those with owners")
    print("3. Keep specific salon IDs (you specify)")
    print("4. Search salons by name")
    print("5. Exit")
    
    choice = input("\nEnter choice (1-5): ").strip()
    
    if choice == '1':
        list_all_salons()
        interactive_cleanup()
    
    elif choice == '2':
        delete_all_salons_except_owned()
    
    elif choice == '3':
        ids_input = input("\nEnter salon IDs to keep (comma-separated, e.g., 1,5,10): ")
        try:
            salon_ids = [int(x.strip()) for x in ids_input.split(',')]
            keep_only_salons(salon_ids)
        except ValueError:
            print("❌ Invalid input. Please enter numbers separated by commas.")
            interactive_cleanup()
    
    elif choice == '4':
        search_term = input("\nEnter salon name to search: ")
        with app.app_context():
            salons = Salon.query.filter(Salon.nome.ilike(f'%{search_term}%')).limit(50).all()
            print(f"\nFound {len(salons)} salons matching '{search_term}':")
            for salon in salons:
                owner_info = f" (Owner: {salon.owner.email})" if salon.owner else " (No owner)"
                print(f"  ID {salon.id}: {salon.nome}{owner_info}")
        interactive_cleanup()
    
    elif choice == '5':
        print("👋 Exiting...")
        return
    
    else:
        print("Invalid choice")
        interactive_cleanup()

if __name__ == '__main__':
    print("⚠️  WARNING: This script will modify your database!")
    print("⚠️  Make sure you have a backup before proceeding.")
    
    if len(sys.argv) > 1 and sys.argv[1] == '--auto-keep-owned':
        # Automatic mode: keep only salons with owners
        delete_all_salons_except_owned()
    else:
        # Interactive mode
        interactive_cleanup()

