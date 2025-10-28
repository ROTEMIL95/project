from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CategoryBase(BaseModel):
    """Base category model"""
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    order: int = 0


class CategoryCreate(CategoryBase):
    """Model for creating a new category"""
    pass


class CategoryUpdate(BaseModel):
    """Model for updating a category"""
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    order: Optional[int] = None


class CategoryResponse(CategoryBase):
    """Model for category response"""
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PriceRangeBase(BaseModel):
    """Base price range model"""
    min_quantity: float
    max_quantity: Optional[float] = None
    price: float


class PriceRangeCreate(PriceRangeBase):
    """Model for creating a price range"""
    pass


class PriceRangeResponse(PriceRangeBase):
    """Model for price range response"""
    id: str

    class Config:
        from_attributes = True


class CatalogItemBase(BaseModel):
    """Base catalog item model"""
    category_id: str
    name: str
    description: Optional[str] = None
    unit: str
    base_price: float
    contractor_cost: Optional[float] = None
    complexity_factor: float = 1.0
    is_active: bool = True


class CatalogItemCreate(CatalogItemBase):
    """Model for creating a catalog item"""
    price_ranges: Optional[List[PriceRangeCreate]] = []


class CatalogItemUpdate(BaseModel):
    """Model for updating a catalog item"""
    category_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    base_price: Optional[float] = None
    contractor_cost: Optional[float] = None
    complexity_factor: Optional[float] = None
    is_active: Optional[bool] = None


class CatalogItemResponse(CatalogItemBase):
    """Model for catalog item response"""
    id: str
    price_ranges: List[PriceRangeResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CatalogItemList(BaseModel):
    """Model for catalog item list response"""
    items: List[CatalogItemResponse]
    total: int
