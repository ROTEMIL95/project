from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.models.quote import QuoteCreate, QuoteUpdate, QuoteResponse, QuoteList
from app.middleware.auth_middleware import get_current_user
from app.database import get_supabase_admin
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
async def create_quote(
    quote: QuoteCreate,
    user_id: str = Depends(get_current_user)
):
    """
    Create a new quote

    - Database triggers handle: quote_number generation, user_id setting, timestamps
    - Items stored as JSONB array in the same table
    - All 51 fields supported
    """
    supabase = get_supabase_admin()

    try:
        # Convert Pydantic model to dict, exclude None values
        quote_data = quote.model_dump(exclude_none=True)

        # Set user_id (also set by trigger, but explicit is better)
        quote_data["user_id"] = user_id

        # Don't set quote_number - trigger will generate it
        # Don't set created_at/updated_at - triggers handle it

        logger.info(f"[create_quote] Creating quote for user {user_id}: project_name={quote_data.get('project_name')}, items_count={len(quote_data.get('items', []))}")

        # Single table insert - items are JSONB
        response = supabase.table("quotes").insert(quote_data).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create quote - no data returned"
            )

        created_quote = response.data[0]
        logger.info(f"[create_quote] Quote created: id={created_quote.get('id')}, quote_number={created_quote.get('quote_number')}")

        return created_quote

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating quote: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create quote: {str(e)}"
        )


@router.get("/", response_model=QuoteList)
async def list_quotes(
    user_id: str = Depends(get_current_user),
    status_filter: Optional[str] = None,
    client_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """
    List all quotes for the current user

    - Supports filtering by status and client_id
    - Paginated results
    - No joins needed (items in same table as JSONB)
    """
    supabase = get_supabase_admin()

    try:
        # Build query
        query = supabase.table("quotes").select("*").eq("user_id", user_id)

        if status_filter:
            # Map Hebrew status to English for database query
            # Frontend sends Hebrew labels, but database uses English ENUM values
            status_mapping = {
                'אושר': 'approved',
                'טיוטה': 'draft',
                'נשלח': 'sent',
                'נדחה': 'rejected',
                'בוטל': 'cancelled',
                'פג תוקף': 'expired',
            }
            # Use mapped value if it's Hebrew, otherwise use as-is (for English values)
            english_status = status_mapping.get(status_filter, status_filter)
            logger.info(f"[list_quotes] Status filter: '{status_filter}' → '{english_status}'")
            query = query.eq("status", english_status)

        if client_id:
            query = query.eq("client_id", client_id)

        # Get total count
        count_response = query.execute()
        total = len(count_response.data)

        # Get paginated data
        response = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()

        logger.info(f"[list_quotes] Found {len(response.data)} quotes for user {user_id} (total: {total})")

        return QuoteList(quotes=response.data, total=total)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing quotes: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list quotes: {str(e)}"
        )


@router.get("/{quote_id}", response_model=QuoteResponse)
async def get_quote(
    quote_id: str,
    user_id: str = Depends(get_current_user)
):
    """
    Get a specific quote by ID

    - Returns full quote with all fields including items (JSONB)
    - Verifies quote belongs to user
    """
    supabase = get_supabase_admin()

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

        logger.info(f"[get_quote] Retrieved quote {quote_id} for user {user_id}")

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting quote: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get quote: {str(e)}"
        )


@router.put("/{quote_id}", response_model=QuoteResponse)
async def update_quote(
    quote_id: str,
    quote: QuoteUpdate,
    user_id: str = Depends(get_current_user)
):
    """
    Update a quote

    - Only provided fields will be updated
    - updated_at timestamp automatically updated by trigger
    - Supports updating items (JSONB array)
    """
    supabase = get_supabase_admin()

    try:
        # Check if quote exists and belongs to user
        existing = supabase.table("quotes")\
            .select("id")\
            .eq("id", quote_id)\
            .eq("user_id", user_id)\
            .execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quote not found"
            )

        # Update quote - exclude unset and None values
        update_data = quote.model_dump(exclude_unset=True, exclude_none=True)

        if not update_data:
            # No updates provided, return existing quote
            response = supabase.table("quotes").select("*").eq("id", quote_id).execute()
            return response.data[0]

        logger.info(f"[update_quote] Updating quote {quote_id}: {len(update_data)} fields")

        response = supabase.table("quotes")\
            .update(update_data)\
            .eq("id", quote_id)\
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update quote - no data returned"
            )

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating quote: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update quote: {str(e)}"
        )


@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote(
    quote_id: str,
    user_id: str = Depends(get_current_user)
):
    """
    Delete a quote

    - Permanently deletes the quote
    - Verifies quote belongs to user
    """
    supabase = get_supabase_admin()

    try:
        # Check if quote exists and belongs to user
        existing = supabase.table("quotes")\
            .select("id")\
            .eq("id", quote_id)\
            .eq("user_id", user_id)\
            .execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quote not found"
            )

        # Delete quote
        supabase.table("quotes").delete().eq("id", quote_id).execute()

        logger.info(f"[delete_quote] Deleted quote {quote_id} for user {user_id}")

        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting quote: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete quote: {str(e)}"
        )
