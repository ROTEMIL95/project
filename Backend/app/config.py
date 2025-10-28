from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application configuration settings"""

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

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Email Service (SendGrid)
    SENDGRID_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@contractorapp.com"

    # File Upload
    MAX_FILE_SIZE: int = 10485760  # 10MB
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".jpg", ".jpeg", ".png", ".docx", ".xlsx"]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
