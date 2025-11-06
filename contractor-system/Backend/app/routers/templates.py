from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.models.template import QuoteTemplateCreate, QuoteTemplateUpdate, QuoteTemplateResponse, QuoteTemplateList
from app.middleware.auth_middleware import get_current_user
from app.database import get_supabase
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/", response_model=QuoteTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(template: QuoteTemplateCreate, user_id: str = Depends(get_current_user)):
    """Create a new quote template"""
    supabase = get_supabase()
    try:
        template_data = template.model_dump(exclude={"items"})
        template_data["user_id"] = user_id
        template_response = supabase.table("quote_templates").insert(template_data).execute()
        created_template = template_response.data[0]
        if template.items:
            items_data = [{**item.model_dump(), "template_id": created_template["id"]} for item in template.items]
            items_response = supabase.table("template_items").insert(items_data).execute()
            created_template["items"] = items_response.data
        else:
            created_template["items"] = []
        return created_template
    except Exception as e:
        logger.error(f"Error creating template: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create template")


@router.get("/", response_model=QuoteTemplateList)
async def list_templates(
    user_id: str = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """List all quote templates for the current user"""
    supabase = get_supabase()
    try:
        query = supabase.table("quote_templates").select("*, template_items(*)").eq("user_id", user_id)
        count_response = query.execute()
        total = len(count_response.data)
        response = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
        for template in response.data:
            template["items"] = template.pop("template_items", [])
        return QuoteTemplateList(templates=response.data, total=total)
    except Exception as e:
        logger.error(f"Error listing templates: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to list templates")


@router.get("/{template_id}", response_model=QuoteTemplateResponse)
async def get_template(template_id: str, user_id: str = Depends(get_current_user)):
    """Get a specific quote template by ID"""
    supabase = get_supabase()
    try:
        response = supabase.table("quote_templates").select("*, template_items(*)").eq("id", template_id).eq("user_id", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        template = response.data[0]
        template["items"] = template.pop("template_items", [])
        return template
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting template: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get template")


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(template_id: str, user_id: str = Depends(get_current_user)):
    """Delete a quote template"""
    supabase = get_supabase()
    try:
        existing = supabase.table("quote_templates").select("*").eq("id", template_id).eq("user_id", user_id).execute()
        if not existing.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        supabase.table("quote_templates").delete().eq("id", template_id).execute()
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting template: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete template")
