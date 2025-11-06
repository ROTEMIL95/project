from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date


class FinancialTransactionBase(BaseModel):
    """Base financial transaction model"""
    type: str  # income, expense
    category: str  # quote_payment, project_cost, supplier_payment, salary, other
    amount: float
    description: str
    transaction_date: date
    payment_method: Optional[str] = None  # cash, bank_transfer, check, credit_card
    reference_number: Optional[str] = None
    project_id: Optional[str] = None
    quote_id: Optional[str] = None
    client_id: Optional[str] = None
    notes: Optional[str] = None


class FinancialTransactionCreate(FinancialTransactionBase):
    """Model for creating a financial transaction"""
    pass


class FinancialTransactionUpdate(BaseModel):
    """Model for updating a financial transaction"""
    type: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    transaction_date: Optional[date] = None
    payment_method: Optional[str] = None
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
