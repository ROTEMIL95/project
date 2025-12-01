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

    This function validates tokens issued by Supabase Auth directly.
    The frontend sends Supabase access tokens in the Authorization header.
    """
    # If no credentials provided, raise error
    if credentials is None:
        logger.warning("No authentication credentials provided in request")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Check if SUPABASE_JWT_SECRET is configured for local validation
    if settings.SUPABASE_JWT_SECRET:
        # Use local JWT validation (preferred method - faster and avoids 431 errors)
        try:
            logger.debug(f"Using local JWT validation for request to {request.url.path}")

            # Decode and validate JWT token
            # - Validates signature using SUPABASE_JWT_SECRET
            # - Validates expiration time (exp claim)
            # - Validates audience (must be "authenticated" for Supabase auth tokens)
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",  # Required for Supabase auth tokens
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_aud": True
                }
            )

            # Extract user data from token payload
            user_id = payload.get("sub")
            email = payload.get("email")
            user_metadata = payload.get("user_metadata", {})

            # Validate required claims
            if not user_id:
                logger.warning(f"Token missing 'sub' claim for path {request.url.path}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: missing user ID",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Optional: Validate issuer (iss) matches Supabase URL
            issuer = payload.get("iss")
            if issuer and not issuer.startswith(settings.SUPABASE_URL):
                logger.warning(f"Token issuer mismatch: expected {settings.SUPABASE_URL}, got {issuer}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: issuer mismatch",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            logger.debug(f"Successfully verified token locally for user {user_id} (email: {email})")

            return {
                "sub": user_id,
                "email": email,
                "user_metadata": user_metadata
            }

        except JWTError as e:
            # Handle JWT-specific errors with detailed messages
            error_type = type(e).__name__
            logger.error(f"Local JWT validation error ({error_type}) for path {request.url.path}: {str(e)}")
            logger.error(f"Token preview (first 20 chars): {token[:20] if token else 'None'}...")

            # Provide user-friendly error messages based on error type
            if "expired" in str(e).lower():
                detail = "Token has expired. Please log in again."
            elif "signature" in str(e).lower():
                detail = "Invalid token signature. Please log in again."
            elif "audience" in str(e).lower():
                detail = "Invalid token audience. Please log in again."
            else:
                detail = "Invalid authentication token. Please log in again."

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=detail,
                headers={"WWW-Authenticate": "Bearer"},
            )

    else:
        # Fallback to remote validation via Supabase API (legacy method)
        # This may fail with 431 errors for tokens with large metadata
        logger.warning(f"SUPABASE_JWT_SECRET not configured, falling back to remote validation for {request.url.path}")
        supabase = get_supabase()

        try:
            # Get user from Supabase using the token
            response = supabase.auth.get_user(token)

            if not response or not response.user:
                logger.warning(f"Remote token verification failed: No user returned from Supabase for path {request.url.path}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired authentication token",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            user = response.user
            logger.debug(f"Successfully verified token remotely for user {user.id} (email: {user.email})")

            return {
                "sub": user.id,
                "email": user.email,
                "user_metadata": user.user_metadata or {}
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Remote token verification error for path {request.url.path}: {str(e)}", exc_info=True)
            logger.error(f"Token preview (first 20 chars): {token[:20] if token else 'None'}...")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token verification failed: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )


def verify_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """Verify JWT token and return payload - uses Supabase Auth verification only"""
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
