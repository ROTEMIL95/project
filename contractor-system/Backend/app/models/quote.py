from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date


class QuoteCreate(BaseModel):
    """
    Quote creation model - matches database schema exactly (51 fields)
    All fields optional except those with defaults
    Database triggers handle: quote_number, user_id, timestamps
    """

    # ===== CORE IDENTIFICATION FIELDS =====
    client_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: str = "draft"  # draft, sent, approved, rejected, expired

    # ===== FINANCIAL FIELDS (OLD SCHEMA) =====
    discount_percentage: Optional[float] = 0
    discount_amount: Optional[float] = 0
    tax_percentage: Optional[float] = 17  # Israeli VAT
    tax_amount: Optional[float] = 0
    total_cost: Optional[float] = 0
    total_price: Optional[float] = 0
    profit_amount: Optional[float] = 0
    profit_margin: Optional[float] = 0

    # ===== FINANCIAL FIELDS (EXTENDED SCHEMA) =====
    total_amount: Optional[float] = 0
    discount_percent: Optional[float] = 0
    price_increase: Optional[float] = 0
    final_amount: Optional[float] = 0
    estimated_work_days: Optional[float] = None
    estimated_cost: Optional[float] = 0
    estimated_profit_percent: Optional[float] = 0

    # ===== PROJECT INFORMATION FIELDS =====
    project_name: Optional[str] = None
    project_address: Optional[str] = None
    project_type: Optional[str] = None

    # ===== CLIENT INFORMATION FIELDS =====
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None

    # ===== DATE FIELDS =====
    work_days: Optional[float] = None
    general_start_date: Optional[date] = None
    general_end_date: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    valid_until: Optional[date] = None
    estimated_duration: Optional[int] = None

    # ===== JSONB FIELDS (stored as-is in database) =====
    items: List[Dict[str, Any]] = Field(default_factory=list)
    additional_costs: List[Dict[str, Any]] = Field(default_factory=list)
    payment_terms: List[Dict[str, Any]] = Field(default_factory=list)
    category_timings: Dict[str, Any] = Field(default_factory=dict)
    project_complexities: Dict[str, Any] = Field(default_factory=dict)
    company_info: Dict[str, Any] = Field(default_factory=dict)
    category_commitments: Dict[str, Any] = Field(default_factory=dict)
    tiling_work_types: List[Dict[str, Any]] = Field(default_factory=list)
    tiling_items: List[Dict[str, Any]] = Field(default_factory=list)

    # ===== TEXT FIELDS =====
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    created_by: Optional[str] = None

    class Config:
        # Allow extra fields for forward compatibility
        extra = "allow"
        json_schema_extra = {
            "example": {
                "project_name": "Kitchen Renovation",
                "client_name": "John Doe",
                "status": "draft",
                "final_amount": 50000,
                "items": [
                    {
                        "name": "Labor",
                        "quantity": 10,
                        "unit_price": 1000,
                        "total": 10000
                    }
                ]
            }
        }


class QuoteUpdate(BaseModel):
    """
    Quote update model - all fields optional
    Only fields provided will be updated
    """

    # Core fields
    client_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

    # Financial (old)
    discount_percentage: Optional[float] = None
    discount_amount: Optional[float] = None
    tax_percentage: Optional[float] = None
    tax_amount: Optional[float] = None
    total_cost: Optional[float] = None
    total_price: Optional[float] = None
    profit_amount: Optional[float] = None
    profit_margin: Optional[float] = None

    # Financial (extended)
    total_amount: Optional[float] = None
    discount_percent: Optional[float] = None
    price_increase: Optional[float] = None
    final_amount: Optional[float] = None
    estimated_work_days: Optional[float] = None
    estimated_cost: Optional[float] = None
    estimated_profit_percent: Optional[float] = None

    # Project
    project_name: Optional[str] = None
    project_address: Optional[str] = None
    project_type: Optional[str] = None

    # Client
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None

    # Dates
    work_days: Optional[float] = None
    general_start_date: Optional[date] = None
    general_end_date: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    valid_until: Optional[date] = None
    estimated_duration: Optional[int] = None

    # JSONB
    items: Optional[List[Dict[str, Any]]] = None
    additional_costs: Optional[List[Dict[str, Any]]] = None
    payment_terms: Optional[List[Dict[str, Any]]] = None
    category_timings: Optional[Dict[str, Any]] = None
    project_complexities: Optional[Dict[str, Any]] = None
    company_info: Optional[Dict[str, Any]] = None
    category_commitments: Optional[Dict[str, Any]] = None
    tiling_work_types: Optional[List[Dict[str, Any]]] = None
    tiling_items: Optional[List[Dict[str, Any]]] = None

    # Text
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None

    class Config:
        extra = "allow"


class QuoteResponse(BaseModel):
    """
    Quote response model - returned from API
    Includes all database fields plus auto-generated ones
    """

    # Auto-generated fields
    id: str
    user_id: str
    quote_number: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Core fields
    client_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: str

    # Financial (old)
    discount_percentage: Optional[float] = None
    discount_amount: Optional[float] = None
    tax_percentage: Optional[float] = None
    tax_amount: Optional[float] = None
    total_cost: Optional[float] = None
    total_price: Optional[float] = None
    profit_amount: Optional[float] = None
    profit_margin: Optional[float] = None

    # Financial (extended)
    total_amount: Optional[float] = None
    discount_percent: Optional[float] = None
    price_increase: Optional[float] = None
    final_amount: Optional[float] = None
    estimated_work_days: Optional[float] = None
    estimated_cost: Optional[float] = None
    estimated_profit_percent: Optional[float] = None

    # Project
    project_name: Optional[str] = None
    project_address: Optional[str] = None
    project_type: Optional[str] = None

    # Client
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None

    # Dates
    work_days: Optional[float] = None
    general_start_date: Optional[date] = None
    general_end_date: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    valid_until: Optional[date] = None
    estimated_duration: Optional[int] = None
    sent_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None

    # JSONB
    items: List[Dict[str, Any]] = Field(default_factory=list)
    additional_costs: List[Dict[str, Any]] = Field(default_factory=list)
    payment_terms: List[Dict[str, Any]] = Field(default_factory=list)
    category_timings: Dict[str, Any] = Field(default_factory=dict)
    project_complexities: Dict[str, Any] = Field(default_factory=dict)
    company_info: Dict[str, Any] = Field(default_factory=dict)
    category_commitments: Dict[str, Any] = Field(default_factory=dict)
    tiling_work_types: List[Dict[str, Any]] = Field(default_factory=list)
    tiling_items: List[Dict[str, Any]] = Field(default_factory=list)

    # Text
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    created_by: Optional[str] = None

    class Config:
        from_attributes = True
        extra = "allow"


class QuoteList(BaseModel):
    """Model for paginated quote list response"""
    quotes: List[QuoteResponse]
    total: int


class QuoteSummary(BaseModel):
    """Model for quote summary statistics (for future use)"""
    total_quotes: int
    draft_quotes: int
    sent_quotes: int
    approved_quotes: int
    rejected_quotes: int
    total_value: float
    average_value: float
