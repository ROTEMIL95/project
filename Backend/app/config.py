from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from pydantic import field_validator


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

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION: int = 3600  # 1 hour
    JWT_REFRESH_EXPIRATION: int = 604800  # 7 days

    # CORS - stored as string in .env, converted to list
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
        """Get CORS_ORIGINS as a list"""
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(',')]
        return self.CORS_ORIGINS

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
