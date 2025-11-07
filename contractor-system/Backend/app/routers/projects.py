from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.models.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectList
from app.middleware.auth_middleware import get_current_user
from app.database import get_supabase
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(project: ProjectCreate, user_id: str = Depends(get_current_user)):
    """Create a new project"""
    supabase = get_supabase()
    try:
        project_data = project.model_dump()
        project_data["user_id"] = user_id
        response = supabase.table("projects").insert(project_data).execute()
        return response.data[0]
    except Exception as e:
        logger.error(f"Error creating project: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create project")


@router.get("/", response_model=ProjectList)
async def list_projects(
    user_id: str = Depends(get_current_user),
    status_filter: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """List all projects for the current user"""
    supabase = get_supabase()
    try:
        query = supabase.table("projects").select("*").eq("user_id", user_id)
        if status_filter:
            # Map Hebrew status to English for database query
            status_mapping = {
                'תכנון': 'planning',
                'פעיל': 'active',
                'בהמתנה': 'on-hold',
                'הושלם': 'completed',
                'בוטל': 'cancelled',
            }
            english_status = status_mapping.get(status_filter, status_filter)
            logger.info(f"[list_projects] Status filter: '{status_filter}' → '{english_status}'")
            query = query.eq("status", english_status)
        count_response = query.execute()
        total = len(count_response.data)
        response = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
        return ProjectList(projects=response.data, total=total)
    except Exception as e:
        logger.error(f"Error listing projects: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to list projects")


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, user_id: str = Depends(get_current_user)):
    """Get a specific project by ID"""
    supabase = get_supabase()
    try:
        response = supabase.table("projects").select("*").eq("id", project_id).eq("user_id", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting project: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get project")


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, project: ProjectUpdate, user_id: str = Depends(get_current_user)):
    """Update a project"""
    supabase = get_supabase()
    try:
        existing = supabase.table("projects").select("*").eq("id", project_id).eq("user_id", user_id).execute()
        if not existing.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        update_data = project.model_dump(exclude_unset=True)
        if update_data:
            response = supabase.table("projects").update(update_data).eq("id", project_id).execute()
            return response.data[0]
        return existing.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating project: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update project")


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str, user_id: str = Depends(get_current_user)):
    """Delete a project"""
    supabase = get_supabase()
    try:
        existing = supabase.table("projects").select("*").eq("id", project_id).eq("user_id", user_id).execute()
        if not existing.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        supabase.table("projects").delete().eq("id", project_id).execute()
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting project: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete project")
