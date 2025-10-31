#!/usr/bin/env python3
"""
Check for and fix missing salon images
This script identifies salon images in the database that don't exist on disk
and provides options to fix them.
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(backend_path))

from app import app, db, Salon, SalonImage

def check_missing_images():
    """Check for salon images that reference non-existent files"""
    with app.app_context():
        all_images = SalonImage.query.all()
        uploads_dir = backend_path / 'uploads'
        
        print(f"Checking {len(all_images)} images in database...")
        print(f"Uploads directory: {uploads_dir}")
        print("=" * 80)
        
        missing_images = []
        existing_images = []
        
        for img in all_images:
            # Extract filename from URL
            if img.image_url.startswith('/uploads/'):
                filename = img.image_url.replace('/uploads/', '')
                file_path = uploads_dir / filename
                
                if file_path.exists():
                    existing_images.append(img)
                    print(f"✓ Salon {img.salon_id}: {filename} EXISTS")
                else:
                    missing_images.append(img)
                    salon = Salon.query.get(img.salon_id)
                    salon_name = salon.nome if salon else "Unknown"
                    print(f"✗ Salon {img.salon_id} ({salon_name}): {filename} MISSING")
                    print(f"  Image ID: {img.id}, Primary: {img.is_primary}")
        
        print("=" * 80)
        print(f"\nSummary:")
        print(f"  Total images in database: {len(all_images)}")
        print(f"  Existing images: {len(existing_images)}")
        print(f"  Missing images: {len(missing_images)}")
        
        return missing_images, existing_images

def list_available_files():
    """List all image files in the uploads directory"""
    uploads_dir = backend_path / 'uploads'
    
    if not uploads_dir.exists():
        print(f"Uploads directory not found: {uploads_dir}")
        return []
    
    image_files = []
    for ext in ['*.jpg', '*.jpeg', '*.png', '*.gif', '*.webp']:
        image_files.extend(uploads_dir.glob(ext))
    
    print(f"\nAvailable image files in uploads directory:")
    print("=" * 80)
    for idx, file_path in enumerate(image_files, 1):
        size_mb = file_path.stat().st_size / (1024 * 1024)
        print(f"{idx}. {file_path.name} ({size_mb:.2f} MB)")
    
    return image_files

def delete_missing_image_records():
    """Delete database records for images that don't exist on disk"""
    missing_images, _ = check_missing_images()
    
    if not missing_images:
        print("\n✓ No missing images to delete!")
        return
    
    print(f"\n⚠ WARNING: This will delete {len(missing_images)} image records from the database")
    response = input("Continue? (yes/no): ")
    
    if response.lower() != 'yes':
        print("Cancelled.")
        return
    
    with app.app_context():
        for img in missing_images:
            db.session.delete(img)
        
        db.session.commit()
        print(f"✓ Deleted {len(missing_images)} missing image records")

def assign_available_images_to_salon(salon_id):
    """Assign available image files to a salon"""
    uploads_dir = backend_path / 'uploads'
    available_files = list_available_files()
    
    if not available_files:
        print("\n✗ No image files available in uploads directory")
        return
    
    print(f"\nSelect images to assign to salon {salon_id} (comma-separated numbers, e.g., 1,3,5):")
    selection = input("> ")
    
    try:
        indices = [int(x.strip()) - 1 for x in selection.split(',')]
        selected_files = [available_files[i] for i in indices]
    except (ValueError, IndexError):
        print("Invalid selection")
        return
    
    with app.app_context():
        salon = Salon.query.get(salon_id)
        if not salon:
            print(f"✗ Salon {salon_id} not found")
            return
        
        # Delete existing images for this salon
        SalonImage.query.filter_by(salon_id=salon_id).delete()
        
        # Add new images
        for idx, file_path in enumerate(selected_files):
            img = SalonImage(
                salon_id=salon_id,
                image_url=f"/uploads/{file_path.name}",
                image_alt=f"{salon.nome} - Image {idx + 1}",
                is_primary=(idx == 0),
                display_order=idx
            )
            db.session.add(img)
        
        db.session.commit()
        print(f"✓ Assigned {len(selected_files)} images to salon {salon_id} ({salon.nome})")

def main():
    """Main menu"""
    while True:
        print("\n" + "=" * 80)
        print("Salon Image Management Tool")
        print("=" * 80)
        print("1. Check for missing images")
        print("2. List available image files")
        print("3. Delete missing image records from database")
        print("4. Assign available images to a salon")
        print("5. Exit")
        print()
        
        choice = input("Select an option (1-5): ")
        
        if choice == '1':
            check_missing_images()
        elif choice == '2':
            list_available_files()
        elif choice == '3':
            delete_missing_image_records()
        elif choice == '4':
            salon_id = input("Enter salon ID: ")
            try:
                assign_available_images_to_salon(int(salon_id))
            except ValueError:
                print("Invalid salon ID")
        elif choice == '5':
            print("Goodbye!")
            break
        else:
            print("Invalid option")

if __name__ == '__main__':
    main()

