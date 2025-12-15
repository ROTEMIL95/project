from datetime import datetime
from app.database import get_supabase_admin, get_supabase
from app.models.user import UserCreate, UserLogin, Token
from fastapi import HTTPException, status
import logging
import json
import os

logger = logging.getLogger(__name__)

# NOTE: This service uses Pure Supabase Auth
# - Frontend authenticates directly with Supabase Auth
# - Backend endpoints below are kept for compatibility but may not be actively used
# - Supabase handles password hashing, token generation, and session management
# - Tokens are issued by Supabase and validated in auth_middleware.py


async def register_user(user_data: UserCreate) -> dict:
    """Register a new user using Supabase Auth

    NOTE: Frontend typically handles registration directly with Supabase.
    This endpoint is kept for backward compatibility or server-side registration needs.
    """
    supabase = get_supabase_admin()  # Use admin client

    try:
        # Check if user already exists
        existing = supabase.table("user_profiles").select("*").eq("email", user_data.email).execute()
        if existing.data:
            logger.warning(f"Registration attempt for existing email: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create user in Supabase Auth
        logger.info(f"Creating new user in Supabase Auth: {user_data.email}")
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password
        })

        if not auth_response.user:
            logger.error(f"Supabase Auth failed to create user: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user in authentication system"
            )

        user_id = auth_response.user.id
        logger.info(f"User created successfully in Auth: {user_id}")

        # Load default pricing data for new users
        try:
            default_data_path = os.path.join(os.path.dirname(__file__), '../data/default_user_data.json')
            with open(default_data_path, 'r', encoding='utf-8') as f:
                default_data = json.load(f)
            logger.info(f"Loaded default user data from {default_data_path}")
        except Exception as e:
            logger.error(f"Failed to load default user data: {e}")
            # Continue with empty defaults if file is not available
            default_data = {}

        # Create user profile in user_profiles table with default pricing data
        user_profile = {
            "auth_user_id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "phone": user_data.phone,
            "role": "admin" if user_data.email in ["rotemiluz53@gmail.com", "avishaycohen11@gmail.com"] else "user",
            "contract_template": "",
            "contractor_commitments": "",
            "client_commitments": "",
            # Add default pricing data for all categories
            "plumbing_subcontractor_items": default_data.get("plumbing_subcontractor_items", []),
            "plumbing_defaults": default_data.get("plumbing_defaults", {"desiredProfitPercent": 30}),
            "electrical_subcontractor_items": default_data.get("electrical_subcontractor_items", []),
            "electrical_defaults": default_data.get("electrical_defaults", {"desiredProfitPercent": 40}),
            "construction_subcontractor_items": default_data.get("construction_subcontractor_items", []),
            "construction_defaults": default_data.get("construction_defaults", {"desiredProfitPercent": 30, "workerCostPerUnit": 1000}),
            "demolition_items": default_data.get("demolition_items", []),
            "demolition_defaults": default_data.get("demolition_defaults", {"laborCostPerDay": 1000, "profitPercent": 40}),
            "tiling_items": default_data.get("tiling_items", []),
            "tiling_user_defaults": default_data.get("tiling_user_defaults", {}),
            "paint_items": default_data.get("paint_items", []),
            "paint_user_defaults": default_data.get("paint_user_defaults", {})
        }

        profile_response = supabase.table("user_profiles").insert(user_profile).execute()
        logger.info(f"User profile created for: {user_id} with default data - {len(default_data.get('plumbing_subcontractor_items', []))} plumbing items, {len(default_data.get('electrical_subcontractor_items', []))} electrical items, {len(default_data.get('construction_subcontractor_items', []))} construction items, {len(default_data.get('demolition_items', []))} demolition items, {len(default_data.get('tiling_items', []))} tiling items, {len(default_data.get('paint_items', []))} paint items")

        # Return Supabase session tokens (if available from auth_response)
        # Note: Supabase returns session with access_token and refresh_token
        session_data = {
            "user": profile_response.data[0] if profile_response.data else user_profile,
            "token_type": "bearer"
        }

        # Add Supabase tokens if available in response
        if hasattr(auth_response, 'session') and auth_response.session:
            session_data["access_token"] = auth_response.session.access_token
            session_data["refresh_token"] = auth_response.session.refresh_token
            logger.info(f"Returning Supabase session tokens for user: {user_id}")
        else:
            logger.warning(f"No session returned from Supabase for user: {user_id}")

        return session_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register user: {str(e)}"
        )


async def login_user(credentials: UserLogin) -> Token:
    """Authenticate user and return Supabase tokens

    NOTE: Frontend typically handles login directly with Supabase.
    This endpoint is kept for backward compatibility or server-side login needs.
    Returns Supabase-issued tokens.
    """
    supabase = get_supabase_admin()  # Use admin client

    try:
        # Use Supabase Auth for login (it handles password verification)
        logger.info(f"Attempting login for user: {credentials.email}")
        auth_response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })

        if not auth_response.user:
            logger.warning(f"Login failed for user: {credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        user_id = auth_response.user.id
        logger.info(f"User authenticated successfully: {user_id}")

        # Get user profile from database
        response = supabase.table("user_profiles").select("*").eq("auth_user_id", user_id).execute()

        if not response.data:
            logger.error(f"User profile not found for authenticated user: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found. Please contact support."
            )

        # Update last login date
        supabase.table("user_profiles").update({
            "last_login_date": datetime.utcnow().isoformat()
        }).eq("auth_user_id", user_id).execute()

        # Return Supabase session tokens
        if not hasattr(auth_response, 'session') or not auth_response.session:
            logger.error(f"No session returned from Supabase for user: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication succeeded but no session was created"
            )

        logger.info(f"Returning Supabase tokens for user: {user_id}")
        return Token(
            access_token=auth_response.session.access_token,
            refresh_token=auth_response.session.refresh_token,
            token_type="bearer"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error for {credentials.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


async def get_user_by_id(user_id: str, auto_create: bool = False) -> dict:
    """Get user by ID
    
    Args:
        user_id: The auth_user_id from Supabase
        auto_create: If True, automatically create a profile if it doesn't exist
    """
    supabase = get_supabase_admin()  # Use admin client

    try:
        response = supabase.table("user_profiles").select("*").eq("auth_user_id", user_id).execute()

        if not response.data:
            # If auto_create is enabled, create a basic profile
            if auto_create:
                logger.info(f"Auto-creating profile for user: {user_id}")
                
                # Get user data from Supabase Auth
                try:
                    auth_user = supabase.auth.admin.get_user_by_id(user_id)
                    email = auth_user.user.email if auth_user and auth_user.user else None
                except Exception as auth_error:
                    logger.warning(f"Could not fetch auth user details: {auth_error}")
                    email = None
                
                if not email:
                    logger.error(f"Cannot auto-create profile without email for user: {user_id}")
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="User not found and cannot be auto-created (missing email)"
                    )

                # Load default pricing data for new users
                try:
                    default_data_path = os.path.join(os.path.dirname(__file__), '../data/default_user_data.json')
                    with open(default_data_path, 'r', encoding='utf-8') as f:
                        default_data = json.load(f)
                    logger.info(f"Loaded default user data for auto-created profile")
                except Exception as e:
                    logger.error(f"Failed to load default user data: {e}")
                    default_data = {}

                # Create basic user profile with default pricing data
                user_profile = {
                    "auth_user_id": user_id,
                    "email": email,
                    "full_name": email.split('@')[0],  # Use email prefix as default name
                    "phone": "",
                    "role": "admin" if email in ["rotemiluz53@gmail.com", "avishaycohen11@gmail.com"] else "user",
                    "contract_template": "",
                    "contractor_commitments": "",
                    "client_commitments": "",
                    # Add default pricing data for all categories
                    "plumbing_subcontractor_items": default_data.get("plumbing_subcontractor_items", []),
                    "plumbing_defaults": default_data.get("plumbing_defaults", {"desiredProfitPercent": 30}),
                    "electrical_subcontractor_items": default_data.get("electrical_subcontractor_items", []),
                    "electrical_defaults": default_data.get("electrical_defaults", {"desiredProfitPercent": 40}),
                    "construction_subcontractor_items": default_data.get("construction_subcontractor_items", []),
                    "construction_defaults": default_data.get("construction_defaults", {"desiredProfitPercent": 30, "workerCostPerUnit": 1000}),
                    "demolition_items": default_data.get("demolition_items", []),
                    "demolition_defaults": default_data.get("demolition_defaults", {"laborCostPerDay": 1000, "profitPercent": 40}),
                    "tiling_items": default_data.get("tiling_items", []),
                    "tiling_user_defaults": default_data.get("tiling_user_defaults", {}),
                    "paint_items": default_data.get("paint_items", []),
                    "paint_user_defaults": default_data.get("paint_user_defaults", {})
                }
                
                profile_response = supabase.table("user_profiles").insert(user_profile).execute()
                
                if profile_response.data:
                    logger.info(f"Profile auto-created successfully for: {user_id}")
                    return profile_response.data[0]
                else:
                    logger.error(f"Failed to auto-create profile for: {user_id}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to create user profile"
                    )
            else:
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
    supabase = get_supabase_admin()  # Use admin client for consistent database access

    try:
        logger.debug("Fetching all user profiles")
        response = supabase.table("user_profiles").select("*").order("created_at", desc=True).execute()
        logger.info(f"Retrieved {len(response.data) if response.data else 0} user profiles")
        return response.data or []

    except Exception as e:
        logger.error(f"List users error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list users: {str(e)}"
        )


async def update_user_profile(user_id: str, user_data: dict) -> dict:
    """Update user profile"""
    supabase = get_supabase_admin()  # Use admin client

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
    supabase = get_supabase_admin()  # Use admin client for database operations

    try:
        # Check if user exists
        logger.info(f"Attempting to delete user: {user_id}")
        existing = supabase.table("user_profiles").select("*").eq("auth_user_id", user_id).execute()

        if not existing.data:
            logger.warning(f"Delete attempt for non-existent user: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Delete user profile
        supabase.table("user_profiles").delete().eq("auth_user_id", user_id).execute()
        logger.info(f"User profile deleted successfully: {user_id}")

        # Note: Deleting from Supabase Auth requires admin privileges
        # This is handled through Supabase dashboard or admin API
        logger.warning(f"User profile deleted but Supabase Auth user still exists: {user_id}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete user error for {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )
