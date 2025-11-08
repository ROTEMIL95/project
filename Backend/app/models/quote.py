from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime, date
from decimal import Decimal


class QuoteItemBase(BaseModel):
    """Base quote item model"""
    category_id: Optional[str] = None
    catalog_item_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    unit: str
    quantity: float
    unit_price: float
    total_price: float
    contractor_unit_cost: Optional[float] = None
    contractor_total_cost: Optional[float] = None
    item_order: int = 0
    metadata: dict = {}


class QuoteItemCreate(QuoteItemBase):
    """Model for creating a quote item"""
    pass


class QuoteItemUpdate(BaseModel):
    """Model for updating a quote item"""
    name: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    contractor_unit_cost: Optional[float] = None
    contractor_total_cost: Optional[float] = None
    item_order: Optional[int] = None
    metadata: Optional[dict] = None


class QuoteItemResponse(QuoteItemBase):
    """Model for quote item response"""
    id: str
    quote_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class QuoteBase(BaseModel):
    """Base quote model"""
    client_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: str = "draft"  # draft, sent, approved, rejected, expired
    discount_percentage: float = 0
    discount_amount: float = 0
    tax_percentage: float = 17  # Israeli VAT
    tax_amount: float = 0
    total_cost: float = 0
    total_price: float = 0
    profit_amount: float = 0
    profit_margin: float = 0
    additional_costs: List[dict] = []
    payment_terms: List[dict] = []
    valid_until: Optional[date] = None
    start_date: Optional[date] = None
    estimated_duration: Optional[int] = None  # in days
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None


class QuoteCreate(QuoteBase):
    """Model for creating a quote"""
    items: List[QuoteItemCreate] = []


class QuoteUpdate(BaseModel):
    """Model for updating a quote"""
    client_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    discount_percentage: Optional[float] = None
    discount_amount: Optional[float] = None
    tax_percentage: Optional[float] = None
    tax_amount: Optional[float] = None
    total_cost: Optional[float] = None
    total_price: Optional[float] = None
    profit_amount: Optional[float] = None
    profit_margin: Optional[float] = None
    additional_costs: Optional[List[dict]] = None
    payment_terms: Optional[List[dict]] = None
    valid_until: Optional[date] = None
    start_date: Optional[date] = None
    estimated_duration: Optional[int] = None
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None


class QuoteResponse(QuoteBase):
    """Model for quote response"""
    id: str
    user_id: str
    quote_number: str
    items: List[dict] = []  # Changed from List[QuoteItemResponse] to support JSONB structure
    sent_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class QuoteList(BaseModel):
    """Model for quote list response"""
    quotes: List[QuoteResponse]
    total: int


class QuoteSummary(BaseModel):
    """Model for quote summary statistics"""
    total_quotes: int
    draft_quotes: int
    sent_quotes: int
    approved_quotes: int
    total_value: float
    average_value: float
