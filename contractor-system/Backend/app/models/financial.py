from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime, date


class FinancialTransactionBase(BaseModel):
    """Base financial transaction model"""
    # Original validated fields (now optional for backward compatibility with Finance.jsx)
    type: Optional[Literal['income', 'expense']] = None  # transaction_type_enum
    category: Optional[Literal['quote_payment', 'project_cost', 'supplier_payment', 'salary', 'other']] = None  # transaction_category_enum
    amount: Optional[float] = Field(None, gt=0)  # Must be greater than 0 if provided
    description: Optional[str] = None
    transaction_date: Optional[date] = None
    payment_method: Optional[Literal['cash', 'bank_transfer', 'check', 'credit_card']] = None  # payment_method_enum
    reference_number: Optional[str] = None
    
    # Related entities
    project_id: Optional[str] = None
    quote_id: Optional[str] = None
    client_id: Optional[str] = None
    notes: Optional[str] = None
    
    # New fields for Finance.jsx quote-related tracking
    revenue: Optional[float] = None
    estimated_cost: Optional[float] = None
    estimated_profit: Optional[float] = None
    status: Optional[str] = None
    project_type: Optional[str] = None


class FinancialTransactionCreate(FinancialTransactionBase):
    """Model for creating a financial transaction"""
    pass


class FinancialTransactionUpdate(BaseModel):
    """Model for updating a financial transaction"""
    # Match Supabase ENUM types exactly
    type: Optional[Literal['income', 'expense']] = None
    category: Optional[Literal['quote_payment', 'project_cost', 'supplier_payment', 'salary', 'other']] = None
    amount: Optional[float] = Field(None, gt=0)  # Must be greater than 0 if provided
    description: Optional[str] = None
    transaction_date: Optional[date] = None
    payment_method: Optional[Literal['cash', 'bank_transfer', 'check', 'credit_card']] = None
    reference_number: Optional[str] = None
    project_id: Optional[str] = None
    quote_id: Optional[str] = None
    client_id: Optional[str] = None
    notes: Optional[str] = None


class FinancialTransactionResponse(FinancialTransactionBase):
    """Model for financial transaction response"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Include all optional fields from base in response
    revenue: Optional[float] = None
    estimated_cost: Optional[float] = None
    estimated_profit: Optional[float] = None
    status: Optional[str] = None
    project_type: Optional[str] = None

    class Config:
        from_attributes = True


class FinancialTransactionList(BaseModel):
    """Model for financial transaction list response"""
    transactions: List[FinancialTransactionResponse]
    total: int


class FinancialSummary(BaseModel):
    """Model for financial summary statistics"""
    total_income: float
    total_expenses: float
    net_profit: float
    period_start: date
    period_end: date
    income_by_category: dict
    expenses_by_category: dict
