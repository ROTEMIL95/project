from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from pydantic import field_validator
import logging

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application configuration settings"""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True
    )

    # Application
    APP_NAME: str = "Contractor Management System"
    DEBUG: bool = False
    API_VERSION: str = "v1"

    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_JWT_SECRET: str  # JWT Secret for local token validation

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION: int = 3600  # 1 hour
    JWT_REFRESH_EXPIRATION: int = 604800  # 7 days

    # CORS - stored as string in .env, converted to list
    # Default origins include localhost and production URLs
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://calculatesmartil.netlify.app,https://project-b88e.onrender.com"

    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS_ORIGINS from comma-separated string or list"""
        if isinstance(v, str):
            return v
        if isinstance(v, list):
            return ','.join(v)
        return v

    @property
    def cors_origins_list(self) -> List[str]:
        """Get CORS_ORIGINS as a list with validation and fallback"""
        default_origins = [
            "http://localhost:5173",
            "http://localhost:3000",
            "https://calculatesmartil.netlify.app",
            "https://project-b88e.onrender.com"
        ]
        
        try:
            if isinstance(self.CORS_ORIGINS, str):
                # Parse comma-separated string
                origins = [origin.strip() for origin in self.CORS_ORIGINS.split(',') if origin.strip()]
                if origins:
                    return origins
                else:
                    logger.warning("CORS_ORIGINS is empty, using default origins")
                    return default_origins
            elif isinstance(self.CORS_ORIGINS, list):
                # Already a list
                origins = [origin.strip() if isinstance(origin, str) else str(origin) for origin in self.CORS_ORIGINS if origin]
                if origins:
                    return origins
                else:
                    logger.warning("CORS_ORIGINS list is empty, using default origins")
                    return default_origins
            else:
                logger.warning(f"CORS_ORIGINS has unexpected type {type(self.CORS_ORIGINS)}, using default origins")
                return default_origins
        except Exception as e:
            logger.error(f"Error parsing CORS_ORIGINS: {e}, using default origins")
            return default_origins

    # Email Service (SendGrid)
    SENDGRID_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@contractorapp.com"

    # File Upload
    MAX_FILE_SIZE: int = 10485760  # 10MB
    ALLOWED_EXTENSIONS: str = ".pdf,.jpg,.jpeg,.png,.docx,.xlsx"

    @field_validator('ALLOWED_EXTENSIONS', mode='before')
    @classmethod
    def parse_allowed_extensions(cls, v):
        """Parse ALLOWED_EXTENSIONS from comma-separated string or list"""
        if isinstance(v, str):
            return v
        if isinstance(v, list):
            return ','.join(v)
        return v

    @property
    def allowed_extensions_list(self) -> List[str]:
        """Get ALLOWED_EXTENSIONS as a list"""
        if isinstance(self.ALLOWED_EXTENSIONS, str):
            return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(',')]
        return self.ALLOWED_EXTENSIONS


settings = Settings()
