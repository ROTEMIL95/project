from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.models.quote import QuoteCreate, QuoteUpdate, QuoteResponse, QuoteList
from app.middleware.auth_middleware import get_current_user
from app.database import get_supabase_admin  # Changed to admin client to bypass PostgREST/RLS issues
from typing import Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


def generate_quote_number(user_id: str) -> str:
    """Generate unique quote number"""
    import random
    import string
    timestamp = datetime.now().strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.digits, k=4))
    return f"Q-{timestamp}-{random_str}"


@router.post("/", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
async def create_quote(
    quote: QuoteCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new quote"""
    supabase = get_supabase_admin()  # Use admin client

    try:
        # Prepare quote data including items as JSONB
        quote_data = quote.model_dump()
        quote_data["user_id"] = user_id
        quote_data["quote_number"] = generate_quote_number(user_id)

        # Insert quote with items stored in the JSONB 'items' column
        quote_response = supabase.table("quotes").insert(quote_data).execute()
        created_quote = quote_response.data[0]

        return created_quote
    except Exception as e:
        logger.error(f"Error creating quote: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create quote"
        )


@router.get("/", response_model=QuoteList)
async def list_quotes(
    user_id: str = Depends(get_current_user),
    status_filter: Optional[str] = None,
    client_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """List all quotes for the current user"""
    supabase = get_supabase_admin()  # Use admin client

    try:
        query = supabase.table("quotes").select("*").eq("user_id", user_id)

        if status_filter:
            query = query.eq("status", status_filter)

        if client_id:
            query = query.eq("client_id", client_id)

        # Get total count
        count_response = query.execute()
        total = len(count_response.data)

        # Get paginated data
        response = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()

        # Items are already stored in the JSONB 'items' column, no transformation needed
        return QuoteList(quotes=response.data, total=total)
    except Exception as e:
        logger.error(f"Error listing quotes: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list quotes"
        )


@router.get("/{quote_id}", response_model=QuoteResponse)
async def get_quote(
    quote_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get a specific quote by ID"""
    supabase = get_supabase_admin()  # Use admin client

    try:
        response = supabase.table("quotes")\
            .select("*")\
            .eq("id", quote_id)\
            .eq("user_id", user_id)\
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quote not found"
            )

        # Items are already stored in the JSONB 'items' column, no transformation needed
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting quote: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get quote"
        )


@router.put("/{quote_id}", response_model=QuoteResponse)
async def update_quote(
    quote_id: str,
    quote: QuoteUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update a quote"""
    supabase = get_supabase_admin()  # Use admin client

    try:
        # Check if quote exists and belongs to user
        existing = supabase.table("quotes")\
            .select("*")\
            .eq("id", quote_id)\
            .eq("user_id", user_id)\
            .execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quote not found"
            )

        # Update quote
        update_data = quote.model_dump(exclude_unset=True)
        if update_data:
            response = supabase.table("quotes")\
                .update(update_data)\
                .eq("id", quote_id)\
                .execute()

            # Get updated quote
            updated = supabase.table("quotes")\
                .select("*")\
                .eq("id", quote_id)\
                .execute()

            # Items are already stored in the JSONB 'items' column, no transformation needed
            return updated.data[0]

        return existing.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating quote: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update quote"
        )


@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote(
    quote_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a quote"""
    supabase = get_supabase_admin()  # Use admin client

    try:
        # Check if quote exists and belongs to user
        existing = supabase.table("quotes")\
            .select("*")\
            .eq("id", quote_id)\
            .eq("user_id", user_id)\
            .execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quote not found"
            )

        # Delete quote (cascade will delete items)
        supabase.table("quotes").delete().eq("id", quote_id).execute()
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting quote: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete quote"
        )
