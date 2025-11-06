from pydantic_settings import BaseSettings, SettingsConfigDict
import json

class Settings(BaseSettings):
    PROJECT_NAME: str = "LinkUup API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database - using linkuup_db as originally configured
    DATABASE_URL: str = "postgresql+asyncpg://carloslarramba@localhost:5432/linkuup_db"
    
    # Security
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # CORS
    BACKEND_CORS_ORIGINS: str = "*"
    
    # Base URL for API - should match the frontend's expected backend URL
    BASE_URL: str = "http://localhost:5001"
    
    # Frontend Base URL - used for OAuth redirects (optional, will use referer header if not set)
    FRONTEND_BASE_URL: str = "http://localhost:5173"
    
    @property
    def cors_origins(self) -> list[str]:
        """Parse CORS origins from string or JSON array"""
        if self.BACKEND_CORS_ORIGINS == "*":
            return ["*"]
        try:
            # Try to parse as JSON array
            return json.loads(self.BACKEND_CORS_ORIGINS)
        except (json.JSONDecodeError, TypeError):
            # Fall back to comma-separated string
            return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",")]
    
    # File uploads
    MAX_CONTENT_LENGTH: int = 20 * 1024 * 1024
    
    # Email settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    
    # Brevo Email Service
    BREVO_API_KEY: str = ""  # Will be loaded from .env file via SettingsConfigDict
    BREVO_SENDER_EMAIL: str = "noreply@linkuup.portugalexpatdirectory.com"
    BREVO_SENDER_NAME: str = "LinkUup"
    
    # WhatsApp settings (Twilio)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_NUMBER: str = ""
    
    # Rate limiting
    RATE_LIMIT_AUTH_LOGIN: str = "5/minute"
    RATE_LIMIT_AUTH_REGISTER: str = "3/hour"
    RATE_LIMIT_MOBILE_READ: str = "500/hour"
    RATE_LIMIT_WRITE: str = "100/hour"
    RATE_LIMIT_STANDARD: str = "300/hour"
    
    # OAuth Configuration (Optional)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    FACEBOOK_CLIENT_ID: str = ""
    FACEBOOK_CLIENT_SECRET: str = ""
    
    # RevenueCat Configuration
    REVENUECAT_API_KEY: str = ""
    REVENUECAT_BASE_URL: str = "https://api.revenuecat.com/v1"

    # Stripe Configuration (Test mode by default)
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_BASIC: str = ""
    STRIPE_PRICE_PRO: str = ""
    APP_URL: str = "http://linkuup.portugalexpatdirectory.com"
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 5001
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )

settings = Settings()
