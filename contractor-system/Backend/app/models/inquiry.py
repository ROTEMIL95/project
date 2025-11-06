from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class CustomerInquiryBase(BaseModel):
    """Base customer inquiry model"""
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str
    status: str = "new"  # new, contacted, converted, closed


class CustomerInquiryCreate(CustomerInquiryBase):
    """Model for creating a customer inquiry"""
    pass


class CustomerInquiryUpdate(BaseModel):
    """Model for updating a customer inquiry"""
    status: Optional[str] = None
    notes: Optional[str] = None


class CustomerInquiryResponse(CustomerInquiryBase):
    """Model for customer inquiry response"""
    id: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CustomerInquiryList(BaseModel):
    """Model for customer inquiry list response"""
    inquiries: List[CustomerInquiryResponse]
    total: int
