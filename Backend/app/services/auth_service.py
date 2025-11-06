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
        existing = supabase.table("user_profiles").select("*").eq("email", user_data.email).execute()
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

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

        # Create user profile in user_profiles table
        # Note: Most fields have defaults in the database schema
        y = {
            "auth_user_id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "phone": user_data.phone,
            "role": "admin" if user_data.email in ["rotemiluz53@gmail.com", "avishaycohen11@gmail.com"] else "user",
            "contract_template": "",
            "contractor_commitments": "",
            "client_commitments": ""
        }

        profile_response = supabase.table("user_profiles").insert(user_profile).execute()

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
        # Use Supabase Auth for login (it handles password verification)
        auth_response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        user_id = auth_response.user.id

        # Get user profile from database
        response = supabase.table("user_profiles").select("*").eq("auth_user_id", user_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )

        # Update last login date
        supabase.table("user_profiles").update({"last_login_date": datetime.utcnow().isoformat()}).eq("auth_user_id", user_id).execute()

        # Generate tokens
        access_token = create_access_token(user_id)
        refresh_token = create_refresh_token(user_id)

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
        response = supabase.table("user_profiles").select("*").eq("auth_user_id", user_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        user = response.data[0]
        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user"
        )


async def list_users() -> list:
    """List all user profiles"""
    supabase = get_supabase()

    try:
        response = supabase.table("user_profiles").select("*").order("created_at", desc=True).execute()
        return response.data or []

    except Exception as e:
        logger.error(f"List users error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list users"
        )


async def update_user_profile(user_id: str, user_data: dict) -> dict:
    """Update user profile"""
    supabase = get_supabase()

    try:
        # Check if user exists
        existing = supabase.table("user_profiles").select("*").eq("auth_user_id", user_id).execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Remove sensitive fields that shouldn't be updated via this endpoint
        update_data = {k: v for k, v in user_data.items() if k not in ['id', 'auth_user_id', 'created_at']}

        if not update_data:
            return existing.data[0]

        # Update user
        response = supabase.table("user_profiles").update(update_data).eq("auth_user_id", user_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user"
            )

        user = response.data[0]
        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update user error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )


async def delete_user(user_id: str) -> None:
    """Delete user profile"""
    supabase = get_supabase()

    try:
        # Check if user exists
        existing = supabase.table("user_profiles").select("*").eq("auth_user_id", user_id).execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Delete user profile
        supabase.table("user_profiles").delete().eq("auth_user_id", user_id).execute()

        # Note: Deleting from Supabase Auth requires admin privileges
        # This is handled through Supabase backend

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete user error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )
