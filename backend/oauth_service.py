"""
OAuth Service for Google and Facebook authentication
"""
import os
import requests
from flask import current_app
from authlib.integrations.flask_client import OAuth
from datetime import datetime

# Initialize OAuth
oauth = OAuth()

def init_oauth(app):
    """Initialize OAuth with the Flask app"""
    oauth.init_app(app)
    
    # Configure Google OAuth
    oauth.register(
        name='google',
        client_id=os.getenv('GOOGLE_CLIENT_ID'),
        client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={
            'scope': 'openid email profile'
        }
    )
    
    # Configure Facebook OAuth
    oauth.register(
        name='facebook',
        client_id=os.getenv('FACEBOOK_CLIENT_ID'),
        client_secret=os.getenv('FACEBOOK_CLIENT_SECRET'),
        access_token_url='https://graph.facebook.com/v18.0/oauth/access_token',
        access_token_params=None,
        authorize_url='https://www.facebook.com/v18.0/dialog/oauth',
        authorize_params=None,
        api_base_url='https://graph.facebook.com/v18.0/',
        client_kwargs={'scope': 'email'}
    )

def get_google_user_info(token):
    """Get user information from Google using access token"""
    try:
        # Get user info from Google
        response = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {token}'}
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        current_app.logger.error(f"Error getting Google user info: {e}")
        return None

def get_facebook_user_info(token):
    """Get user information from Facebook using access token"""
    try:
        # Get user info from Facebook
        response = requests.get(
            f'https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token={token}'
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        current_app.logger.error(f"Error getting Facebook user info: {e}")
        return None

def create_oauth_user(email, name, provider, provider_id, db_session, user_type='customer'):
    """Create a new user from OAuth provider data"""
    from app import User, generate_tokens
    
    # Generate tokens for the new user
    tokens = generate_tokens()
    
    # Create user with OAuth data
    user = User(
        email=email,
        password_hash='',  # No password for OAuth users
        name=name,
        auth_token=tokens['access_token'],
        refresh_token=tokens['refresh_token'],
        token_expires_at=tokens['access_expires_at'],
        refresh_token_expires_at=tokens['refresh_expires_at'],
        last_login_at=datetime.utcnow(),
        # OAuth specific fields
        oauth_provider=provider,
        oauth_id=provider_id,
        user_type=user_type,  # Add user_type parameter
        # GDPR consent for OAuth users (assumed consent through provider)
        gdpr_data_processing_consent=True,
        gdpr_data_processing_consent_date=datetime.utcnow(),
        gdpr_marketing_consent=False,  # Default to no marketing
        gdpr_consent_version='1.0'
    )
    
    db_session.add(user)
    db_session.commit()
    
    return user, tokens

def update_oauth_user_tokens(user, db_session):
    """Update tokens for existing OAuth user"""
    from app import generate_tokens
    
    tokens = generate_tokens()
    user.auth_token = tokens['access_token']
    user.refresh_token = tokens['refresh_token']
    user.token_expires_at = tokens['access_expires_at']
    user.refresh_token_expires_at = tokens['refresh_expires_at']
    user.last_login_at = datetime.utcnow()
    
    db_session.commit()
    
    return tokens
