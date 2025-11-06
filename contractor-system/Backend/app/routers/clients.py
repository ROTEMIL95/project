from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.models.client import ClientCreate, ClientUpdate, ClientResponse, ClientList
from app.middleware.auth_middleware import get_current_user
from app.database import get_supabase
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client: ClientCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new client"""
    supabase = get_supabase()

    try:
        client_data = client.model_dump()
        client_data["user_id"] = user_id

        response = supabase.table("clients").insert(client_data).execute()
        return response.data[0]
    except Exception as e:
        logger.error(f"Error creating client: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create client"
        )


@router.get("/", response_model=ClientList)
async def list_clients(
    user_id: str = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: Optional[str] = None
):
    """List all clients for the current user"""
    supabase = get_supabase()

    try:
        query = supabase.table("clients").select("*").eq("user_id", user_id)

        if search:
            query = query.or_(f"name.ilike.%{search}%,email.ilike.%{search}%,phone.ilike.%{search}%")

        # Get total count
        count_response = query.execute()
        total = len(count_response.data)

        # Get paginated data
        response = query.range(skip, skip + limit - 1).execute()

        return ClientList(clients=response.data, total=total)
    except Exception as e:
        logger.error(f"Error listing clients: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list clients"
        )


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get a specific client by ID"""
    supabase = get_supabase()

    try:
        response = supabase.table("clients")\
            .select("*")\
            .eq("id", client_id)\
            .eq("user_id", user_id)\
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting client: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get client"
        )


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    client: ClientUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update a client"""
    supabase = get_supabase()

    try:
        # Check if client exists and belongs to user
        existing = supabase.table("clients")\
            .select("*")\
            .eq("id", client_id)\
            .eq("user_id", user_id)\
            .execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )

        # Update client
        update_data = client.model_dump(exclude_unset=True)
        if update_data:
            response = supabase.table("clients")\
                .update(update_data)\
                .eq("id", client_id)\
                .execute()
            return response.data[0]

        return existing.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating client: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update client"
        )


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a client"""
    supabase = get_supabase()

    try:
        # Check if client exists and belongs to user
        existing = supabase.table("clients")\
            .select("*")\
            .eq("id", client_id)\
            .eq("user_id", user_id)\
            .execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )

        # Delete client
        supabase.table("clients").delete().eq("id", client_id).execute()
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting client: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete client"
        )
