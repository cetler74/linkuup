#!/usr/bin/env python3
"""
Script to add sample reviews to the database for testing purposes.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import app, db, Review, Salon
import random
from datetime import datetime, timedelta

def add_sample_reviews():
    """Add sample reviews to the database"""
    with app.app_context():
        # Get all salons
        salons = Salon.query.all()
        
        if not salons:
            print("No salons found in database. Please run import_data.py first.")
            return
        
        # Sample review data
        sample_reviews = [
            {
                'customer_name': 'Maria Silva',
                'customer_email': 'maria.silva@email.com',
                'rating': 5,
                'title': 'Excelente serviço!',
                'comment': 'Atendimento impecável e resultado fantástico. Recomendo vivamente!'
            },
            {
                'customer_name': 'Ana Costa',
                'customer_email': 'ana.costa@email.com',
                'rating': 4,
                'title': 'Muito bom',
                'comment': 'Profissional e atenciosa. Ficou muito bonito, voltarei certamente.'
            },
            {
                'customer_name': 'Joana Santos',
                'customer_email': 'joana.santos@email.com',
                'rating': 5,
                'title': 'Perfeito!',
                'comment': 'Melhor salão da cidade. Equipe muito competente e ambiente agradável.'
            },
            {
                'customer_name': 'Carla Oliveira',
                'customer_email': 'carla.oliveira@email.com',
                'rating': 3,
                'title': 'Bom, mas pode melhorar',
                'comment': 'Serviço correto, mas demorou mais do que o esperado. Preço justo.'
            },
            {
                'customer_name': 'Sofia Ferreira',
                'customer_email': 'sofia.ferreira@email.com',
                'rating': 5,
                'title': 'Fantástico!',
                'comment': 'Bio Sculpture é realmente superior. Duração excelente e acabamento perfeito.'
            },
            {
                'customer_name': 'Rita Martins',
                'customer_email': 'rita.martins@email.com',
                'rating': 4,
                'title': 'Recomendo',
                'comment': 'Boa experiência, profissional competente. Ambiente limpo e organizado.'
            },
            {
                'customer_name': 'Patrícia Alves',
                'customer_email': 'patricia.alves@email.com',
                'rating': 5,
                'title': 'Excepcional',
                'comment': 'Serviço de primeira qualidade. Equipe muito simpática e competente.'
            },
            {
                'customer_name': 'Teresa Rodrigues',
                'customer_email': 'teresa.rodrigues@email.com',
                'rating': 4,
                'title': 'Muito satisfeita',
                'comment': 'Bom atendimento e resultado conforme esperado. Preço adequado.'
            },
            {
                'customer_name': 'Isabel Pereira',
                'customer_email': 'isabel.pereira@email.com',
                'rating': 5,
                'title': 'Excelente qualidade',
                'comment': 'Bio Diamond é realmente especial. Vale cada euro investido!'
            },
            {
                'customer_name': 'Cristina Lopes',
                'customer_email': 'cristina.lopes@email.com',
                'rating': 3,
                'title': 'Regular',
                'comment': 'Serviço básico, nada de especial. Funcionou, mas não superou expectativas.'
            }
        ]
        
        # Add reviews to random salons
        reviews_added = 0
        for salon in salons[:50]:  # Add reviews to first 50 salons
            # Add 2-5 reviews per salon
            num_reviews = random.randint(2, 5)
            
            for i in range(num_reviews):
                review_data = random.choice(sample_reviews).copy()
                
                # Create review with random date in the last 6 months
                days_ago = random.randint(1, 180)
                review_date = datetime.utcnow() - timedelta(days=days_ago)
                
                review = Review(
                    salon_id=salon.id,
                    customer_name=review_data['customer_name'],
                    customer_email=review_data['customer_email'],
                    rating=review_data['rating'],
                    title=review_data['title'],
                    comment=review_data['comment'],
                    created_at=review_date
                )
                
                db.session.add(review)
                reviews_added += 1
        
        db.session.commit()
        print(f"✅ Added {reviews_added} sample reviews to {min(50, len(salons))} salons")
        
        # Show some statistics
        total_reviews = Review.query.count()
        avg_rating = db.session.query(db.func.avg(Review.rating)).scalar()
        print(f"📊 Total reviews in database: {total_reviews}")
        print(f"⭐ Average rating: {avg_rating:.1f}/5.0")

if __name__ == '__main__':
    add_sample_reviews()
