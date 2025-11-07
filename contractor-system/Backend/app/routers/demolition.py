from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from app.middleware.auth_middleware import get_current_user
from app.database import get_supabase_admin
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# =============================================
# PYDANTIC MODELS
# =============================================

class DemolitionItem(BaseModel):
    """Single demolition item with pricing details"""
    id: str
    name: str
    description: Optional[str] = ""
    unit: str = "יחידה"  # יחידה, מ'ר, מטר רץ
    hoursPerUnit: float = Field(gt=0, description="Hours of labor required per unit")

class DemolitionDefaults(BaseModel):
    """Default settings for demolition pricing calculations"""
    laborCostPerDay: float = Field(default=1000, gt=0, description="Cost per 8-hour work day in ₪")
    profitPercent: float = Field(default=40, ge=0, le=100, description="Markup percentage for profit")

class DemolitionData(BaseModel):
    """Complete demolition data for a user"""
    demolition_items: List[DemolitionItem] = []
    demolition_defaults: DemolitionDefaults = DemolitionDefaults()

class UpdateDemolitionItemsRequest(BaseModel):
    """Request to update user's demolition items"""
    demolition_items: List[DemolitionItem]

class UpdateDemolitionDefaultsRequest(BaseModel):
    """Request to update user's demolition default settings"""
    demolition_defaults: DemolitionDefaults


# =============================================
# API ENDPOINTS
# =============================================

@router.get("/", response_model=DemolitionData)
async def get_demolition_data(current_user_id: str = Depends(get_current_user)):
    """
    Get user's demolition items and default settings

    Returns:
    - demolition_items: Array of demolition items with pricing details
    - demolition_defaults: Default labor cost and profit percentage
    """
    supabase = get_supabase_admin()

    try:
        logger.info(f"Fetching demolition data for user: {current_user_id}")

        response = supabase.table("user_profiles").select(
            "demolition_items, demolition_defaults"
        ).eq("auth_user_id", current_user_id).execute()

        if not response.data:
            logger.error(f"User profile not found: {current_user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )

        user_data = response.data[0]

        # Parse and validate data
        demolition_items = user_data.get("demolition_items", [])
        demolition_defaults = user_data.get("demolition_defaults", {})

        # Ensure defaults have required fields
        if not demolition_defaults:
            demolition_defaults = {"laborCostPerDay": 1000, "profitPercent": 40}

        logger.info(f"Retrieved {len(demolition_items)} demolition items for user {current_user_id}")

        return {
            "demolition_items": demolition_items,
            "demolition_defaults": demolition_defaults
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching demolition data for {current_user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch demolition data: {str(e)}"
        )


@router.put("/items", response_model=dict)
async def update_demolition_items(
    request: UpdateDemolitionItemsRequest,
    current_user_id: str = Depends(get_current_user)
):
    """
    Update user's demolition items

    Body:
    - demolition_items: Array of demolition items to save

    Returns:
    - success: True if update succeeded
    - item_count: Number of items saved
    """
    supabase = get_supabase_admin()

    try:
        logger.info(f"Updating demolition items for user: {current_user_id}")

        # Convert Pydantic models to dicts for JSON storage
        items_dict = [item.model_dump() for item in request.demolition_items]

        response = supabase.table("user_profiles").update({
            "demolition_items": items_dict
        }).eq("auth_user_id", current_user_id).execute()

        if not response.data:
            logger.error(f"Failed to update demolition items for user: {current_user_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update demolition items"
            )

        logger.info(f"Successfully updated {len(items_dict)} demolition items for user {current_user_id}")

        return {
            "success": True,
            "item_count": len(items_dict),
            "message": f"Updated {len(items_dict)} demolition items"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating demolition items for {current_user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update demolition items: {str(e)}"
        )


@router.put("/defaults", response_model=dict)
async def update_demolition_defaults(
    request: UpdateDemolitionDefaultsRequest,
    current_user_id: str = Depends(get_current_user)
):
    """
    Update user's demolition default settings

    Body:
    - demolition_defaults: Object with laborCostPerDay and profitPercent

    Returns:
    - success: True if update succeeded
    - defaults: The updated default settings
    """
    supabase = get_supabase_admin()

    try:
        logger.info(f"Updating demolition defaults for user: {current_user_id}")

        # Convert Pydantic model to dict
        defaults_dict = request.demolition_defaults.model_dump()

        response = supabase.table("user_profiles").update({
            "demolition_defaults": defaults_dict
        }).eq("auth_user_id", current_user_id).execute()

        if not response.data:
            logger.error(f"Failed to update demolition defaults for user: {current_user_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update demolition defaults"
            )

        logger.info(f"Successfully updated demolition defaults for user {current_user_id}")

        return {
            "success": True,
            "defaults": defaults_dict,
            "message": "Demolition defaults updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating demolition defaults for {current_user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update demolition defaults: {str(e)}"
        )


@router.delete("/items/{item_id}", response_model=dict)
async def delete_demolition_item(
    item_id: str,
    current_user_id: str = Depends(get_current_user)
):
    """
    Delete a specific demolition item

    Path:
    - item_id: ID of the item to delete

    Returns:
    - success: True if deletion succeeded
    - deleted_item_id: ID of the deleted item
    """
    supabase = get_supabase_admin()

    try:
        logger.info(f"Deleting demolition item {item_id} for user: {current_user_id}")

        # First, fetch current items
        response = supabase.table("user_profiles").select(
            "demolition_items"
        ).eq("auth_user_id", current_user_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )

        current_items = response.data[0].get("demolition_items", [])

        # Filter out the item to delete
        updated_items = [item for item in current_items if item.get("id") != item_id]

        if len(updated_items) == len(current_items):
            logger.warning(f"Item {item_id} not found for user {current_user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Demolition item {item_id} not found"
            )

        # Update with filtered items
        update_response = supabase.table("user_profiles").update({
            "demolition_items": updated_items
        }).eq("auth_user_id", current_user_id).execute()

        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete demolition item"
            )

        logger.info(f"Successfully deleted demolition item {item_id} for user {current_user_id}")

        return {
            "success": True,
            "deleted_item_id": item_id,
            "remaining_count": len(updated_items),
            "message": f"Deleted demolition item {item_id}"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting demolition item {item_id} for {current_user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete demolition item: {str(e)}"
        )


@router.post("/reset-defaults", response_model=dict)
async def reset_to_default_items(current_user_id: str = Depends(get_current_user)):
    """
    Reset user's demolition items to the 5 default items

    This will:
    - Replace all current items with 5 default demolition items
    - Reset default settings to laborCostPerDay=1000, profitPercent=40

    Returns:
    - success: True if reset succeeded
    - item_count: Number of default items (5)
    """
    supabase = get_supabase_admin()

    DEFAULT_ITEMS = [
        {
            "id": f"default_demo_1",
            "name": "פירוק קיר גבס",
            "description": "פירוק קיר גבס רגיל כולל סילוק פסולת",
            "unit": "מ'ר",
            "hoursPerUnit": 0.5
        },
        {
            "id": f"default_demo_2",
            "name": "פירוק ריצוף קרמיקה",
            "description": "פירוק ריצוף קרמיקה/גרניט כולל פסולת",
            "unit": "מ'ר",
            "hoursPerUnit": 1.2
        },
        {
            "id": f"default_demo_3",
            "name": "פירוק חיפוי קירות",
            "description": "פירוק חיפוי קרמיקה מקירות כולל פסולת",
            "unit": "מ'ר",
            "hoursPerUnit": 1.5
        },
        {
            "id": f"default_demo_4",
            "name": "פירוק דלת פנים",
            "description": "פירוק דלת פנים כולל משקוף",
            "unit": "יחידה",
            "hoursPerUnit": 1.0
        },
        {
            "id": f"default_demo_5",
            "name": "פירוק ארון מטבח",
            "description": "פירוק ארון מטבח כולל משטח עבודה",
            "unit": "מטר רץ",
            "hoursPerUnit": 2.0
        }
    ]

    DEFAULT_SETTINGS = {
        "laborCostPerDay": 1000,
        "profitPercent": 40
    }

    try:
        logger.info(f"Resetting demolition items to defaults for user: {current_user_id}")

        response = supabase.table("user_profiles").update({
            "demolition_items": DEFAULT_ITEMS,
            "demolition_defaults": DEFAULT_SETTINGS
        }).eq("auth_user_id", current_user_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to reset demolition items"
            )

        logger.info(f"Successfully reset demolition items for user {current_user_id}")

        return {
            "success": True,
            "item_count": len(DEFAULT_ITEMS),
            "message": f"Reset to {len(DEFAULT_ITEMS)} default demolition items"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting demolition items for {current_user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset demolition items: {str(e)}"
        )
