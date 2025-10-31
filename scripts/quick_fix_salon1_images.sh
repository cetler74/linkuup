#!/bin/bash

# Quick fix for Salon 1 images on Hostinger
# This script assigns existing image files to salon 1

HOSTINGER_IP="147.93.89.178"
HOSTINGER_USER="root"

echo "=========================================="
echo "Quick Fix: Assign Images to Salon 1"
echo "=========================================="
echo ""

# Create a Python script to run on the server
cat > /tmp/fix_salon1_images.py << 'PYTHON_SCRIPT'
#!/usr/bin/env python3
import sys
import os
from pathlib import Path

# Change to app directory
os.chdir('/var/www/biosearch2')
sys.path.insert(0, '/var/www/biosearch2/backend')

from backend.app import app, db, Salon, SalonImage

def fix_salon1_images():
    uploads_dir = Path('/var/www/biosearch2/backend/uploads')
    
    # Get available image files
    image_files = sorted(uploads_dir.glob('*.jpg')) + \
                  sorted(uploads_dir.glob('*.jpeg')) + \
                  sorted(uploads_dir.glob('*.png')) + \
                  sorted(uploads_dir.glob('*.webp'))
    
    if not image_files:
        print("✗ No image files found in uploads directory")
        return False
    
    print(f"Found {len(image_files)} image files")
    
    with app.app_context():
        # Get salon 1
        salon = Salon.query.get(1)
        if not salon:
            print("✗ Salon 1 not found in database")
            return False
        
        print(f"Salon: {salon.nome}")
        
        # Delete old image references
        old_images = SalonImage.query.filter_by(salon_id=1).all()
        print(f"Removing {len(old_images)} old image references")
        for img in old_images:
            db.session.delete(img)
        
        # Assign first 4 available images to salon 1
        images_to_assign = image_files[:4]
        print(f"\nAssigning {len(images_to_assign)} new images:")
        
        for idx, file_path in enumerate(images_to_assign):
            image_url = f"/uploads/{file_path.name}"
            img = SalonImage(
                salon_id=1,
                image_url=image_url,
                image_alt=f"{salon.nome} - Interior {idx + 1}",
                is_primary=(idx == 0),
                display_order=idx
            )
            db.session.add(img)
            primary_marker = " (PRIMARY)" if idx == 0 else ""
            print(f"  {idx + 1}. {file_path.name}{primary_marker}")
        
        db.session.commit()
        print(f"\n✓ Successfully assigned {len(images_to_assign)} images to salon 1")
        return True

if __name__ == '__main__':
    try:
        success = fix_salon1_images()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
PYTHON_SCRIPT

# Upload and execute the script
echo "Uploading fix script to server..."
scp /tmp/fix_salon1_images.py "$HOSTINGER_USER@$HOSTINGER_IP:/tmp/"

echo ""
echo "Executing fix on server..."
ssh "$HOSTINGER_USER@$HOSTINGER_IP" << 'ENDSSH'
cd /var/www/biosearch2
source venv/bin/activate
python3 /tmp/fix_salon1_images.py
rm /tmp/fix_salon1_images.py
ENDSSH

echo ""
echo "=========================================="
echo "✓ Fix complete!"
echo "=========================================="
echo ""
echo "Test the results:"
echo "  http://147.93.89.178/salon/1"
echo "  http://findursalon.biosculpture.pt/salon/1"
echo ""

