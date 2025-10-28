from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.models.contractor import ContractorPricingCreate, ContractorPricingUpdate, ContractorPricingResponse, ContractorPricingList
from app.middleware.auth_middleware import get_current_user
from app.database import get_supabase
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/", response_model=ContractorPricingResponse, status_code=status.HTTP_201_CREATED)
async def create_contractor_pricing(pricing: ContractorPricingCreate, user_id: str = Depends(get_current_user)):
    """Create a new contractor pricing entry"""
    supabase = get_supabase()
    try:
        pricing_data = pricing.model_dump()
        pricing_data["user_id"] = user_id
        response = supabase.table("contractor_pricing").insert(pricing_data).execute()
        return response.data[0]
    except Exception as e:
        logger.error(f"Error creating contractor pricing: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create contractor pricing")


@router.get("/", response_model=ContractorPricingList)
async def list_contractor_pricing(
    user_id: str = Depends(get_current_user),
    category_id: str = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """List all contractor pricing for the current user"""
    supabase = get_supabase()
    try:
        query = supabase.table("contractor_pricing").select("*").eq("user_id", user_id)
        if category_id:
            query = query.eq("category_id", category_id)
        count_response = query.execute()
        total = len(count_response.data)
        response = query.range(skip, skip + limit - 1).execute()
        return ContractorPricingList(pricing=response.data, total=total)
    except Exception as e:
        logger.error(f"Error listing contractor pricing: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to list contractor pricing")


@router.delete("/{pricing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contractor_pricing(pricing_id: str, user_id: str = Depends(get_current_user)):
    """Delete a contractor pricing entry"""
    supabase = get_supabase()
    try:
        existing = supabase.table("contractor_pricing").select("*").eq("id", pricing_id).eq("user_id", user_id).execute()
        if not existing.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contractor pricing not found")
        supabase.table("contractor_pricing").delete().eq("id", pricing_id).execute()
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting contractor pricing: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete contractor pricing")
