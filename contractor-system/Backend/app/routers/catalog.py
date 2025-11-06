from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.models.catalog import (
    CategoryCreate, CategoryUpdate, CategoryResponse,
    CatalogItemCreate, CatalogItemUpdate, CatalogItemResponse, CatalogItemList
)
from app.middleware.auth_middleware import get_current_user, get_optional_user
from app.database import get_supabase
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# CATEGORY ROUTES
# ============================================================================

@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(user_id: Optional[str] = Depends(get_optional_user)):
    """List all categories (public endpoint)"""
    supabase = get_supabase()

    try:
        response = supabase.table("categories")\
            .select("*")\
            .order("order")\
            .execute()
        return response.data
    except Exception as e:
        logger.error(f"Error listing categories: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list categories"
        )


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category: CategoryCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new category (admin only)"""
    supabase = get_supabase()

    try:
        category_data = category.model_dump()
        response = supabase.table("categories").insert(category_data).execute()
        return response.data[0]
    except Exception as e:
        logger.error(f"Error creating category: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create category"
        )


@router.get("/categories/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: str,
    user_id: Optional[str] = Depends(get_optional_user)
):
    """Get a specific category by ID"""
    supabase = get_supabase()

    try:
        response = supabase.table("categories")\
            .select("*")\
            .eq("id", category_id)\
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting category: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get category"
        )


@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category: CategoryUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update a category (admin only)"""
    supabase = get_supabase()

    try:
        # Check if category exists
        existing = supabase.table("categories")\
            .select("*")\
            .eq("id", category_id)\
            .execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )

        # Update category
        update_data = category.model_dump(exclude_unset=True)
        if update_data:
            response = supabase.table("categories")\
                .update(update_data)\
                .eq("id", category_id)\
                .execute()
            return response.data[0]

        return existing.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating category: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update category"
        )


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a category (admin only)"""
    supabase = get_supabase()

    try:
        # Check if category exists
        existing = supabase.table("categories")\
            .select("*")\
            .eq("id", category_id)\
            .execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )

        # Delete category
        supabase.table("categories").delete().eq("id", category_id).execute()
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting category: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete category"
        )


# ============================================================================
# CATALOG ITEM ROUTES
# ============================================================================

@router.post("/items", response_model=CatalogItemResponse, status_code=status.HTTP_201_CREATED)
async def create_catalog_item(
    item: CatalogItemCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new catalog item"""
    supabase = get_supabase()

    try:
        item_data = item.model_dump(exclude={"price_ranges"})

        # Insert catalog item
        response = supabase.table("catalog_items").insert(item_data).execute()
        catalog_item = response.data[0]

        # Insert price ranges if provided
        if item.price_ranges:
            price_ranges_data = [
                {**pr.model_dump(), "catalog_item_id": catalog_item["id"]}
                for pr in item.price_ranges
            ]
            ranges_response = supabase.table("price_ranges").insert(price_ranges_data).execute()
            catalog_item["price_ranges"] = ranges_response.data
        else:
            catalog_item["price_ranges"] = []

        return catalog_item
    except Exception as e:
        logger.error(f"Error creating catalog item: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create catalog item"
        )


@router.get("/items", response_model=CatalogItemList)
async def list_catalog_items(
    category_id: Optional[str] = None,
    is_active: bool = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: Optional[str] = None,
    user_id: Optional[str] = Depends(get_optional_user)
):
    """List all catalog items"""
    supabase = get_supabase()

    try:
        query = supabase.table("catalog_items").select("*, price_ranges(*)")

        if category_id:
            query = query.eq("category_id", category_id)

        if is_active is not None:
            query = query.eq("is_active", is_active)

        if search:
            query = query.or_(f"name.ilike.%{search}%,description.ilike.%{search}%")

        # Get total count
        count_response = query.execute()
        total = len(count_response.data)

        # Get paginated data
        response = query.range(skip, skip + limit - 1).execute()

        return CatalogItemList(items=response.data, total=total)
    except Exception as e:
        logger.error(f"Error listing catalog items: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list catalog items"
        )


@router.get("/items/{item_id}", response_model=CatalogItemResponse)
async def get_catalog_item(
    item_id: str,
    user_id: Optional[str] = Depends(get_optional_user)
):
    """Get a specific catalog item by ID"""
    supabase = get_supabase()

    try:
        response = supabase.table("catalog_items")\
            .select("*, price_ranges(*)")\
            .eq("id", item_id)\
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Catalog item not found"
            )

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting catalog item: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get catalog item"
        )


@router.put("/items/{item_id}", response_model=CatalogItemResponse)
async def update_catalog_item(
    item_id: str,
    item: CatalogItemUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update a catalog item"""
    supabase = get_supabase()

    try:
        # Check if item exists
        existing = supabase.table("catalog_items")\
            .select("*")\
            .eq("id", item_id)\
            .execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Catalog item not found"
            )

        # Update item
        update_data = item.model_dump(exclude_unset=True)
        if update_data:
            response = supabase.table("catalog_items")\
                .update(update_data)\
                .eq("id", item_id)\
                .execute()
            return response.data[0]

        return existing.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating catalog item: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update catalog item"
        )


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_catalog_item(
    item_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a catalog item"""
    supabase = get_supabase()

    try:
        # Check if item exists
        existing = supabase.table("catalog_items")\
            .select("*")\
            .eq("id", item_id)\
            .execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Catalog item not found"
            )

        # Delete item (cascade will delete price ranges)
        supabase.table("catalog_items").delete().eq("id", item_id).execute()
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting catalog item: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete catalog item"
        )
