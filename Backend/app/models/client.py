from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class ClientBase(BaseModel):
    """Base client model"""
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    """Model for creating a new client"""
    pass


class ClientUpdate(BaseModel):
    """Model for updating a client"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None


class ClientResponse(ClientBase):
    """Model for client response"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ClientList(BaseModel):
    """Model for client list response"""
    clients: list[ClientResponse]
    total: int
