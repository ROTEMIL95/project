from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.models.inquiry import CustomerInquiryCreate, CustomerInquiryUpdate, CustomerInquiryResponse, CustomerInquiryList
from app.middleware.auth_middleware import get_current_user, get_optional_user
from app.database import get_supabase
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/", response_model=CustomerInquiryResponse, status_code=status.HTTP_201_CREATED)
async def create_inquiry(
    inquiry: CustomerInquiryCreate,
    user_id: Optional[str] = Depends(get_optional_user)
):
    """Create a new customer inquiry (public endpoint)"""
    supabase = get_supabase()
    try:
        inquiry_data = inquiry.model_dump()
        response = supabase.table("customer_inquiries").insert(inquiry_data).execute()
        return response.data[0]
    except Exception as e:
        logger.error(f"Error creating inquiry: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create inquiry")


@router.get("/", response_model=CustomerInquiryList)
async def list_inquiries(
    user_id: str = Depends(get_current_user),
    status_filter: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """List all customer inquiries (requires authentication)"""
    supabase = get_supabase()
    try:
        query = supabase.table("customer_inquiries").select("*")
        if status_filter:
            # Frontend translates Hebrew to English before sending
            # Backend accepts only English status values
            logger.info(f"[list_inquiries] Filtering by status: '{status_filter}'")
            query = query.eq("status", status_filter)
        count_response = query.execute()
        total = len(count_response.data)
        response = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
        return CustomerInquiryList(inquiries=response.data, total=total)
    except Exception as e:
        logger.error(f"Error listing inquiries: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to list inquiries")


@router.put("/{inquiry_id}", response_model=CustomerInquiryResponse)
async def update_inquiry(
    inquiry_id: str,
    inquiry: CustomerInquiryUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update a customer inquiry"""
    supabase = get_supabase()
    try:
        existing = supabase.table("customer_inquiries").select("*").eq("id", inquiry_id).execute()
        if not existing.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inquiry not found")
        update_data = inquiry.model_dump(exclude_unset=True)
        if update_data:
            response = supabase.table("customer_inquiries").update(update_data).eq("id", inquiry_id).execute()
            return response.data[0]
        return existing.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating inquiry: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update inquiry")


@router.delete("/{inquiry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inquiry(inquiry_id: str, user_id: str = Depends(get_current_user)):
    """Delete a customer inquiry"""
    supabase = get_supabase()
    try:
        existing = supabase.table("customer_inquiries").select("*").eq("id", inquiry_id).execute()
        if not existing.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inquiry not found")
        supabase.table("customer_inquiries").delete().eq("id", inquiry_id).execute()
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting inquiry: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete inquiry")
