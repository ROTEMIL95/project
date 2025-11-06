from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ContractorPricingBase(BaseModel):
    """Base contractor pricing model"""
    category_id: str
    item_name: str
    unit: str
    base_cost: float
    complexity_multiplier: float = 1.0
    region: Optional[str] = None
    notes: Optional[str] = None


class ContractorPricingCreate(ContractorPricingBase):
    """Model for creating contractor pricing"""
    pass


class ContractorPricingUpdate(BaseModel):
    """Model for updating contractor pricing"""
    category_id: Optional[str] = None
    item_name: Optional[str] = None
    unit: Optional[str] = None
    base_cost: Optional[float] = None
    complexity_multiplier: Optional[float] = None
    region: Optional[str] = None
    notes: Optional[str] = None


class ContractorPricingResponse(ContractorPricingBase):
    """Model for contractor pricing response"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ContractorPricingList(BaseModel):
    """Model for contractor pricing list response"""
    pricing: List[ContractorPricingResponse]
    total: int
