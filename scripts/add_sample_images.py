#!/usr/bin/env python3
"""
Script to add sample images to existing salons for testing
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app, db
from backend.app import Salon, SalonImage

def add_sample_images():
    """Add sample images to existing salons"""
    
    with app.app_context():
        try:
            # Get all salons
            salons = Salon.query.all()
            
            if not salons:
                print("No salons found. Please create some salons first.")
                return
            
            # Sample image URLs (using placeholder services)
            sample_images = [
                {
                    'url': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop',
                    'alt': 'Modern salon interior with clean design'
                },
                {
                    'url': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=600&fit=crop',
                    'alt': 'Professional hair styling station'
                },
                {
                    'url': 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&h=600&fit=crop',
                    'alt': 'Relaxing spa treatment room'
                },
                {
                    'url': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
                    'alt': 'Beauty products and tools display'
                },
                {
                    'url': 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=800&h=600&fit=crop',
                    'alt': 'Comfortable waiting area'
                }
            ]
            
            for salon in salons:
                # Check if salon already has images
                existing_images = salon.images.count()
                if existing_images > 0:
                    print(f"Salon '{salon.nome}' already has {existing_images} images. Skipping.")
                    continue
                
                # Add 2-4 random images to each salon
                import random
                num_images = random.randint(2, 4)
                selected_images = random.sample(sample_images, num_images)
                
                for i, img_data in enumerate(selected_images):
                    image = SalonImage(
                        salon_id=salon.id,
                        image_url=img_data['url'],
                        image_alt=img_data['alt'],
                        is_primary=(i == 0),  # First image is primary
                        display_order=i
                    )
                    db.session.add(image)
                
                print(f"✅ Added {num_images} images to salon '{salon.nome}'")
            
            db.session.commit()
            print(f"\n🎉 Successfully added sample images to {len(salons)} salons!")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error adding sample images: {e}")
            raise

if __name__ == "__main__":
    add_sample_images()
