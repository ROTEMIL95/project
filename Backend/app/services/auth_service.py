from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
from passlib.context import CryptContext
from app.config import settings
from app.database import get_supabase
from app.models.user import UserCreate, UserLogin, Token
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(seconds=settings.JWT_EXPIRATION)

    to_encode = {
        "sub": user_id,
        "exp": expire,
        "type": "access"
    }

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(user_id: str) -> str:
    """Create JWT refresh token"""
    expire = datetime.utcnow() + timedelta(seconds=settings.JWT_REFRESH_EXPIRATION)

    to_encode = {
        "sub": user_id,
        "exp": expire,
        "type": "refresh"
    }

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


async def register_user(user_data: UserCreate) -> dict:
    """Register a new user"""
    supabase = get_supabase()

    try:
        # Check if user already exists
        existing = supabase.table("users").select("*").eq("email", user_data.email).execute()
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Hash password
        hashed_password = hash_password(user_data.password)

        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )

        user_id = auth_response.user.id

        # Create user profile in users table
        user_profile = {
            "id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "phone": user_data.phone,
            "role": "user",
            "password_hash": hashed_password
        }

        profile_response = supabase.table("users").insert(user_profile).execute()

        # Generate tokens
        access_token = create_access_token(user_id)
        refresh_token = create_refresh_token(user_id)

        return {
            "user": profile_response.data[0] if profile_response.data else user_profile,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )


async def login_user(credentials: UserLogin) -> Token:
    """Authenticate user and return tokens"""
    supabase = get_supabase()

    try:
        # Get user from database
        response = supabase.table("users").select("*").eq("email", credentials.email).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        user = response.data[0]

        # Verify password
        if not verify_password(credentials.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # Generate tokens
        access_token = create_access_token(user["id"])
        refresh_token = create_refresh_token(user["id"])

        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to login"
        )


async def get_user_by_id(user_id: str) -> dict:
    """Get user by ID"""
    supabase = get_supabase()

    try:
        response = supabase.table("users").select("*").eq("id", user_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        user = response.data[0]
        # Remove password hash from response
        user.pop("password_hash", None)
        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user"
        )
