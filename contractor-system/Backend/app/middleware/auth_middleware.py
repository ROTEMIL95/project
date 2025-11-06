from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.config import settings
from app.database import get_supabase
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Create HTTPBearer instance for token extraction
security = HTTPBearer(auto_error=False)


def verify_supabase_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """Verify Supabase JWT token and return user data

    Note: CORSMiddleware intercepts OPTIONS requests before they reach this dependency,
    so we don't need to handle OPTIONS here.
    """
    # If no credentials provided, raise error
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    supabase = get_supabase()

    try:
        # Get user from Supabase using the token
        response = supabase.auth.get_user(token)

        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = response.user
        return {
            "sub": user.id,
            "email": user.email,
            "user_metadata": user.user_metadata
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """Verify JWT token and return payload - supports both Supabase and custom tokens"""
    return verify_supabase_token(request, credentials)


def get_current_user(request: Request, payload: dict = Depends(verify_token)) -> str:
    """Get current user ID from token payload

    Note: CORSMiddleware intercepts OPTIONS requests before they reach this dependency.
    """
    user_id: Optional[str] = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    return user_id


def get_current_user_data(request: Request, payload: dict = Depends(verify_token)) -> dict:
    """Get current user full data from token payload

    Note: CORSMiddleware intercepts OPTIONS requests before they reach this dependency.
    """
    return payload


def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[str]:
    """Get current user ID if token is provided, otherwise return None

    Note: CORSMiddleware intercepts OPTIONS requests before they reach this dependency.
    """
    if credentials is None:
        return None

    try:
        payload = verify_token(request, credentials)
        return payload.get("sub")
    except HTTPException:
        return None
