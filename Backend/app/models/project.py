from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date


class ProjectBase(BaseModel):
    """Base project model"""
    client_id: Optional[str] = None
    quote_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    status: str = "planning"  # planning, active, on-hold, completed, cancelled
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    budget: Optional[float] = None
    actual_cost: float = 0
    address: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None


class ProjectCreate(ProjectBase):
    """Model for creating a project"""
    pass


class ProjectUpdate(BaseModel):
    """Model for updating a project"""
    client_id: Optional[str] = None
    quote_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    budget: Optional[float] = None
    actual_cost: Optional[float] = None
    address: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None


class ProjectResponse(ProjectBase):
    """Model for project response"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProjectList(BaseModel):
    """Model for project list response"""
    projects: List[ProjectResponse]
    total: int


class ProjectCostsBase(BaseModel):
    """Base project costs model"""
    project_id: str
    category: str  # labor, materials, equipment, subcontractors, other
    description: str
    amount: float
    date: date
    notes: Optional[str] = None


class ProjectCostsCreate(ProjectCostsBase):
    """Model for creating project costs"""
    pass


class ProjectCostsUpdate(BaseModel):
    """Model for updating project costs"""
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[date] = None
    notes: Optional[str] = None


class ProjectCostsResponse(ProjectCostsBase):
    """Model for project costs response"""
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
