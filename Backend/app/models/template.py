from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class TemplateItemBase(BaseModel):
    """Base template item model"""
    category_id: Optional[str] = None
    catalog_item_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    unit: str
    quantity: float
    unit_price: float
    contractor_unit_cost: Optional[float] = None
    item_order: int = 0


class TemplateItemCreate(TemplateItemBase):
    """Model for creating a template item"""
    pass


class TemplateItemResponse(TemplateItemBase):
    """Model for template item response"""
    id: str
    template_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class QuoteTemplateBase(BaseModel):
    """Base quote template model"""
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    is_default: bool = False


class QuoteTemplateCreate(QuoteTemplateBase):
    """Model for creating a quote template"""
    items: List[TemplateItemCreate] = []


class QuoteTemplateUpdate(BaseModel):
    """Model for updating a quote template"""
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_default: Optional[bool] = None


class QuoteTemplateResponse(QuoteTemplateBase):
    """Model for quote template response"""
    id: str
    user_id: str
    items: List[TemplateItemResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class QuoteTemplateList(BaseModel):
    """Model for quote template list response"""
    templates: List[QuoteTemplateResponse]
    total: int
