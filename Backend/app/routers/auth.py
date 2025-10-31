from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import UserCreate, UserLogin, UserResponse, Token
from app.services import auth_service
from app.middleware.auth_middleware import get_current_user

router = APIRouter()


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    """Register a new user"""
    return await auth_service.register_user(user)


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login and get access token"""
    return await auth_service.login_user(credentials)


@router.get("/me", response_model=dict)
async def get_current_user_profile(user_id: str = Depends(get_current_user)):
    """Get current user profile"""
    return await auth_service.get_user_by_id(user_id)


@router.post("/refresh", response_model=Token)
async def refresh_token(user_id: str = Depends(get_current_user)):
    """Refresh access token"""
    access_token = auth_service.create_access_token(user_id)
    refresh_token = auth_service.create_refresh_token(user_id)
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )


@router.patch("/me", response_model=dict)
async def update_current_user_profile(
    user_data: dict,
    user_id: str = Depends(get_current_user)
):
    """Update current user profile"""
    return await auth_service.update_user_profile(user_id, user_data)
