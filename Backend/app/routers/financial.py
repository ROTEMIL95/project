from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.models.financial import FinancialTransactionCreate, FinancialTransactionUpdate, FinancialTransactionResponse, FinancialTransactionList
from app.middleware.auth_middleware import get_current_user
from app.database import get_supabase
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# POST /api/financial  וגם  /api/financial/
@router.post("", response_model=FinancialTransactionResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", include_in_schema=False)
async def create_transaction(transaction: FinancialTransactionCreate, user_id: str = Depends(get_current_user)):
    """Create a new financial transaction"""
    supabase = get_supabase()
    try:
        transaction_data = transaction.model_dump()
        transaction_data["user_id"] = user_id
        response = supabase.table("financial_transactions").insert(transaction_data).execute()
        return response.data[0]
    except Exception as e:
        logger.error(f"Error creating transaction: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create transaction")


# GET /api/financial  וגם  /api/financial/
@router.get("", response_model=FinancialTransactionList)
@router.get("/", include_in_schema=False)
async def list_transactions(
    user_id: str = Depends(get_current_user),
    type_filter: Optional[str] = None,
    category: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """List all financial transactions for the current user"""
    supabase = get_supabase()
    try:
        query = supabase.table("financial_transactions").select("*").eq("user_id", user_id)
        if type_filter:
            query = query.eq("type", type_filter)
        if category:
            query = query.eq("category", category)
        count_response = query.execute()
        total = len(count_response.data)
        response = query.order("transaction_date", desc=True).range(skip, skip + limit - 1).execute()
        return FinancialTransactionList(transactions=response.data, total=total)
    except Exception as e:
        logger.error(f"Error listing transactions: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to list transactions")


@router.get("/{transaction_id}", response_model=FinancialTransactionResponse)
async def get_transaction(transaction_id: str, user_id: str = Depends(get_current_user)):
    """Get a specific financial transaction by ID"""
    supabase = get_supabase()
    try:
        response = supabase.table("financial_transactions")\
            .select("*")\
            .eq("id", transaction_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting transaction: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get transaction"
        )


@router.put("/{transaction_id}", response_model=FinancialTransactionResponse)
async def update_transaction(
    transaction_id: str,
    transaction: FinancialTransactionUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update a financial transaction"""
    supabase = get_supabase()
    try:
        # Check if transaction exists and belongs to user
        existing = supabase.table("financial_transactions")\
            .select("*")\
            .eq("id", transaction_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        # Update transaction
        update_data = transaction.model_dump(exclude_unset=True)
        if update_data:
            response = supabase.table("financial_transactions")\
                .update(update_data)\
                .eq("id", transaction_id)\
                .execute()
            return response.data[0]
        
        return existing.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating transaction: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update transaction"
        )


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(transaction_id: str, user_id: str = Depends(get_current_user)):
    """Delete a financial transaction"""
    supabase = get_supabase()
    try:
        existing = supabase.table("financial_transactions").select("*").eq("id", transaction_id).eq("user_id", user_id).execute()
        if not existing.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
        supabase.table("financial_transactions").delete().eq("id", transaction_id).execute()
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting transaction: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete transaction")
