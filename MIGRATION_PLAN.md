# Comprehensive Plan: Performance Improvements and Migration to Python Backend with Supabase

## Table of Contents
1. [Overview](#overview)
2. [Phase 1: Analyze & Document Large Files](#phase-1-analyze--document-large-files)
3. [Phase 2: Python Backend Setup with Supabase](#phase-2-python-backend-setup-with-supabase)
4. [Phase 3: Database Schema (Supabase)](#phase-3-database-schema-supabase)
5. [Phase 4: Third-Party Integrations Analysis](#phase-4-third-party-integrations-analysis)
6. [Phase 5: Frontend Migration Strategy](#phase-5-frontend-migration-strategy)
7. [Phase 6: Remove All Base44 References](#phase-6-remove-all-base44-references)
8. [Phase 7: Environment Configuration](#phase-7-environment-configuration)
9. [Implementation Steps Summary](#implementation-steps-summary)
10. [Timeline Estimate](#timeline-estimate)

---

## Overview

### Current System Architecture
This is a contractor expense calculation system currently built with:
- **Frontend**: React + Vite using Base44 SDK (@base44/sdk)
- **Backend**: Currently empty folder, needs new Python implementation
- **Database**: Currently using Base44, migrating to Supabase

### Goals
1. **Performance**: Identify and split large component files (>500 lines)
2. **Backend Migration**: Set up new Python/FastAPI backend
3. **Database Migration**: Move from Base44 to Supabase
4. **Remove Dependencies**: Eliminate all Base44 references
5. **Modern Architecture**: Implement clean, scalable backend structure

### Current Entity Structure (from Frontend/src/api/entities.js)
The system manages these entities:
- **Category** - Service categories (painting, tiling, electrical, etc.)
- **CatalogItem** - Items in catalog with pricing
- **PriceRange** - Tiered pricing for catalog items
- **Client** - Customer information
- **Quote** - Price quotes for clients
- **QuoteItem** - Individual items in a quote
- **Project** - Active construction projects
- **QuoteTemplate** - Reusable quote templates
- **TemplateItem** - Items in templates
- **ContractorPricing** - Contractor cost data
- **ProjectCosts** - Project expense tracking
- **FinancialTransaction** - Income and expense records
- **CustomerInquiry** - Customer contact form submissions
- **User** - Authentication (Base44 Auth SDK)

---

## Phase 1: Analyze & Document Large Files (Performance Analysis)

### 1.1 Identify Large Component Files

Based on the initial analysis, these files are likely candidates for splitting:

#### High Priority Files to Split

**QuoteBuilder Components** (`Frontend/src/components/quotes/QuoteBuilder/`)
- `TilingSimulator.jsx` - Estimated ~1000+ lines
  - Complex tiling calculation logic
  - Multiple view states (editor, summary)
  - Settings management
  - Room-by-room calculations

- `PaintSimulator.jsx` / `PaintSimulatorV2.jsx` - Estimated ~800+ lines
  - Paint calculation logic
  - Room management
  - Cost breakdowns

- `ConstructionCategory.jsx` - Unknown size
  - Construction-specific item management

- `ElectricalCategory.jsx` - Unknown size
  - Electrical work management

- `PlumbingCategory.jsx` - Unknown size
  - Plumbing work management

**Page Components** (`Frontend/src/pages/`)
- `QuoteCreate.jsx` - Estimated ~1500+ lines based on imports
  - Imports 40+ components
  - Complex state management
  - Multi-step quote creation workflow

- `Dashboard.jsx` - Moderate complexity
  - Multiple chart components
  - Data aggregation

### 1.2 Recommended File Splitting Strategy

#### TilingSimulator.jsx Split Plan
```
Frontend/src/components/quotes/QuoteBuilder/TilingSimulator/
├── index.jsx                    # Main component (200 lines)
│   └── Orchestrates sub-components and state
├── hooks/
│   ├── useTilingCalculations.js  # Custom hook for calculations (200 lines)
│   ├── useRoomManagement.js      # Room CRUD operations (150 lines)
│   └── useTilingSettings.js      # Settings state management (100 lines)
├── components/
│   ├── RoomEditor.jsx            # Room configuration form (300 lines)
│   ├── RoomCard.jsx              # Display single room (150 lines)
│   ├── SettingsDialog.jsx        # Settings UI (200 lines)
│   ├── Summary.jsx               # Summary view (200 lines)
│   └── PanelCalculator.jsx       # Panel-specific calculations (150 lines)
└── utils/
    ├── tilingCalculations.js     # Pure calculation functions (200 lines)
    └── constants.js              # Default values, types (50 lines)
```

#### QuoteCreate.jsx Split Plan
```
Frontend/src/pages/QuoteCreate/
├── index.jsx                     # Main page component (300 lines)
│   └── Orchestrates workflow steps
├── components/
│   ├── ClientInfoForm.jsx        # Client selection/creation (200 lines)
│   ├── CategorySelection.jsx     # Category picker (150 lines)
│   ├── ItemsEditor.jsx           # Items management (200 lines)
│   ├── AdditionalCosts.jsx       # Extra costs form (150 lines)
│   ├── SummaryPreview.jsx        # Quote summary (200 lines)
│   └── QuoteActions.jsx          # Save/Send buttons (100 lines)
├── hooks/
│   ├── useQuoteState.js          # Quote state management (200 lines)
│   ├── useQuoteValidation.js     # Validation logic (150 lines)
│   └── useQuoteSubmit.js         # Save/send logic (150 lines)
└── utils/
    ├── quoteCalculations.js      # Quote totals, margins (150 lines)
    └── quoteHelpers.js           # Utility functions (100 lines)
```

#### Shared Calculations Module
```
Frontend/src/utils/calculations/
├── index.js                      # Export all calculators
├── paintCalculations.js          # Paint-specific logic (300 lines)
├── tilingCalculations.js         # Tiling-specific logic (300 lines)
├── electricalCalculations.js     # Electrical-specific logic (200 lines)
├── plumbingCalculations.js       # Plumbing-specific logic (200 lines)
├── demolitionCalculations.js     # Demolition-specific logic (200 lines)
├── profitCalculations.js         # Profit margin logic (150 lines)
└── commonCalculations.js         # Shared calculation utilities (200 lines)
```

### 1.3 Code Duplication to Eliminate

**Common Patterns Found:**
1. **Category Editors** - Similar structure across Tiling, Paint, Electrical, Plumbing
   - Create generic `CategoryEditor` component with configuration
   - Each category provides its config object

2. **Item Dialogs** - Multiple similar dialog components
   - `ElectricalItemDialog.jsx`
   - `PlumbingItemDialog.jsx`
   - `DemolitionItemDialog.jsx`
   - `TilingManualItemDialog.jsx`
   - Consolidate into `ItemDialog.jsx` with category-specific configurations

3. **Manual Item Forms** - Duplicate form logic
   - `ElectricalManualItemDialog.jsx`
   - `ConstructionManualItemDialog.jsx`
   - `TilingManualItemDialog.jsx`
   - Create single `ManualItemForm` component with category props

### 1.4 Lazy Loading Opportunities

Implement React lazy loading for:
- All page components in `Frontend/src/pages/`
- Large calculator components (TilingSimulator, PaintSimulator)
- Chart components (RevenueChart, MonthlyCashFlowChart, ProjectCashFlowChart)
- PDF generation components (QuotePDF, QuoteToHTML)

**Example Implementation:**
```javascript
// Frontend/src/pages/index.jsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./Dashboard'));
const QuoteCreate = lazy(() => import('./QuoteCreate'));
const TilingSimulator = lazy(() => import('./components/quotes/QuoteBuilder/TilingSimulator'));

// Wrap in Suspense with loading fallback
<Suspense fallback={<LoadingSpinner />}>
  <Route path="/Dashboard" element={<Dashboard />} />
</Suspense>
```

### 1.5 Performance Recommendations Document

Create `Frontend/PERFORMANCE_RECOMMENDATIONS.md` with:
- List of files >500 lines
- Splitting recommendations for each
- Before/after bundle size estimates
- Lazy loading implementation guide
- Code duplication report
- Memoization opportunities (React.memo, useMemo, useCallback)

---

## Phase 2: Python Backend Setup with Supabase

### 2.1 Backend Directory Structure

```
Backend/
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI application entry point
│   ├── config.py                    # Configuration management (env vars)
│   ├── database.py                  # Supabase client initialization
│   │
│   ├── models/                      # Pydantic models for request/response
│   │   ├── __init__.py
│   │   ├── user.py                  # User, UserProfile models
│   │   ├── quote.py                 # Quote, QuoteCreate, QuoteUpdate models
│   │   ├── quote_item.py            # QuoteItem models
│   │   ├── client.py                # Client models
│   │   ├── catalog.py               # Category, CatalogItem, PriceRange models
│   │   ├── project.py               # Project, ProjectCosts models
│   │   ├── template.py              # QuoteTemplate, TemplateItem models
│   │   ├── financial.py             # FinancialTransaction models
│   │   ├── contractor.py            # ContractorPricing models
│   │   └── inquiry.py               # CustomerInquiry models
│   │
│   ├── routers/                     # API route handlers
│   │   ├── __init__.py
│   │   ├── auth.py                  # Authentication endpoints
│   │   ├── quotes.py                # Quote CRUD operations
│   │   ├── clients.py               # Client CRUD operations
│   │   ├── catalog.py               # Catalog & category endpoints
│   │   ├── projects.py              # Project management endpoints
│   │   ├── templates.py             # Quote template endpoints
│   │   ├── financial.py             # Financial transaction endpoints
│   │   ├── contractor_pricing.py   # Contractor pricing endpoints
│   │   └── inquiries.py             # Customer inquiry endpoints
│   │
│   ├── services/                    # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py          # Auth logic (register, login, tokens)
│   │   ├── quote_service.py         # Quote business logic
│   │   ├── calculation_service.py   # Calculation utilities
│   │   ├── email_service.py         # Email sending (SendGrid/SES)
│   │   ├── file_service.py          # File upload/download (Supabase Storage)
│   │   ├── llm_service.py           # AI/LLM integration (optional)
│   │   └── pdf_service.py           # PDF generation
│   │
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── auth_middleware.py       # JWT token validation
│   │   ├── cors_middleware.py       # CORS configuration
│   │   └── error_handler.py         # Global error handling
│   │
│   └── utils/
│       ├── __init__.py
│       ├── supabase_helper.py       # Supabase utility functions
│       ├── validators.py            # Custom validation functions
│       └── helpers.py               # General utility functions
│
├── tests/                           # Test suite
│   ├── __init__.py
│   ├── conftest.py                  # Pytest fixtures
│   ├── test_auth.py                 # Authentication tests
│   ├── test_quotes.py               # Quote endpoint tests
│   ├── test_clients.py              # Client endpoint tests
│   ├── test_calculations.py         # Calculation logic tests
│   └── test_services.py             # Service layer tests
│
├── alembic/                         # Database migrations (if needed)
│   ├── versions/
│   ├── env.py
│   └── alembic.ini
│
├── scripts/                         # Utility scripts
│   ├── seed_data.py                 # Seed database with initial data
│   └── migrate_from_base44.py       # Migration script from Base44
│
├── requirements.txt                 # Python dependencies
├── requirements-dev.txt             # Development dependencies
├── .env.example                     # Example environment variables
├── .gitignore
├── README.md                        # Backend documentation
└── Dockerfile                       # Docker configuration (optional)
```

### 2.2 Core Dependencies

**requirements.txt:**
```txt
# Web Framework
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6

# Database
supabase==2.3.4
postgrest-py==0.13.2

# Authentication
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0

# Validation
pydantic==2.5.3
pydantic-settings==2.1.0
email-validator==2.1.0

# Email Service
sendgrid==6.11.0
# OR
boto3==1.34.30  # for AWS SES

# File Handling
python-magic==0.4.27
pillow==10.2.0

# PDF Generation
reportlab==4.0.9
weasyprint==60.2

# AI/LLM (Optional)
openai==1.10.0
anthropic==0.8.1

# Utilities
httpx==0.26.0
pytz==2024.1
```

**requirements-dev.txt:**
```txt
# Testing
pytest==7.4.4
pytest-asyncio==0.23.3
pytest-cov==4.1.0
httpx==0.26.0  # For TestClient

# Code Quality
black==24.1.1
flake8==7.0.0
mypy==1.8.0
pylint==3.0.3

# Development
ipython==8.20.0
```

### 2.3 Core File Implementations

#### app/main.py
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import (
    auth, quotes, clients, catalog, projects,
    templates, financial, contractor_pricing, inquiries
)
from app.middleware.error_handler import error_handler_middleware

app = FastAPI(
    title="Contractor Management System API",
    description="Backend API for contractor expense calculation system",
    version="1.0.0",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Error Handler
app.middleware("http")(error_handler_middleware)

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(quotes.router, prefix="/api/quotes", tags=["Quotes"])
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(catalog.router, prefix="/api/catalog", tags=["Catalog"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(templates.router, prefix="/api/templates", tags=["Templates"])
app.include_router(financial.router, prefix="/api/financial", tags=["Financial"])
app.include_router(contractor_pricing.router, prefix="/api/contractor-pricing", tags=["Contractor Pricing"])
app.include_router(inquiries.router, prefix="/api/inquiries", tags=["Inquiries"])

@app.get("/")
async def root():
    return {
        "message": "Contractor Management System API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

#### app/config.py
```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Contractor Management System"
    DEBUG: bool = False

    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION: int = 3600  # 1 hour
    JWT_REFRESH_EXPIRATION: int = 604800  # 7 days

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Email Service (SendGrid)
    SENDGRID_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@contractorapp.com"

    # AWS SES (alternative)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"

    # AI Services (Optional)
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # File Upload
    MAX_FILE_SIZE: int = 10485760  # 10MB
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".jpg", ".jpeg", ".png", ".docx", ".xlsx"]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

#### app/database.py
```python
from supabase import create_client, Client
from app.config import settings

# Initialize Supabase client
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_KEY
)

# Admin client (for operations that bypass RLS)
supabase_admin: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_KEY
)

def get_supabase() -> Client:
    """Dependency for getting Supabase client"""
    return supabase

def get_supabase_admin() -> Client:
    """Dependency for getting Supabase admin client"""
    return supabase_admin
```

#### app/models/user.py
```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: str
    email: str
```

#### app/routers/auth.py
```python
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import UserCreate, UserLogin, UserResponse, Token
from app.services.auth_service import AuthService
from app.database import get_supabase

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    auth_service: AuthService = Depends()
):
    """Register a new user"""
    try:
        user = await auth_service.register(user_data)
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    auth_service: AuthService = Depends()
):
    """Login and get access tokens"""
    try:
        token = await auth_service.login(credentials)
        return token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    auth_service: AuthService = Depends()
):
    """Refresh access token"""
    try:
        token = await auth_service.refresh_token(refresh_token)
        return token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user(
    user: UserResponse = Depends(AuthService.get_current_user)
):
    """Get current authenticated user"""
    return user

@router.post("/logout")
async def logout(
    user: UserResponse = Depends(AuthService.get_current_user)
):
    """Logout user"""
    # With JWT, logout is handled client-side by removing tokens
    return {"message": "Successfully logged out"}
```

#### app/services/auth_service.py
```python
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.user import UserCreate, UserLogin, UserResponse, Token, TokenData
from app.database import get_supabase
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

class AuthService:
    def __init__(self, supabase=Depends(get_supabase)):
        self.supabase = supabase

    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(seconds=settings.JWT_EXPIRATION))
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    @staticmethod
    def create_refresh_token(data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(seconds=settings.JWT_REFRESH_EXPIRATION)
        to_encode.update({"exp": expire, "type": "refresh"})
        return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    async def register(self, user_data: UserCreate) -> UserResponse:
        """Register a new user with Supabase Auth"""
        try:
            # Use Supabase Auth to create user
            auth_response = self.supabase.auth.sign_up({
                "email": user_data.email,
                "password": user_data.password,
                "options": {
                    "data": {
                        "full_name": user_data.full_name,
                        "phone": user_data.phone
                    }
                }
            })

            if auth_response.user:
                return UserResponse(
                    id=auth_response.user.id,
                    email=auth_response.user.email,
                    full_name=user_data.full_name,
                    phone=user_data.phone,
                    created_at=datetime.now()
                )
            else:
                raise Exception("Failed to create user")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Registration failed: {str(e)}"
            )

    async def login(self, credentials: UserLogin) -> Token:
        """Login with email and password"""
        try:
            # Use Supabase Auth
            auth_response = self.supabase.auth.sign_in_with_password({
                "email": credentials.email,
                "password": credentials.password
            })

            if auth_response.user:
                # Create custom JWT tokens
                access_token = self.create_access_token({
                    "sub": auth_response.user.id,
                    "email": auth_response.user.email
                })
                refresh_token = self.create_refresh_token({
                    "sub": auth_response.user.id,
                    "email": auth_response.user.email
                })

                return Token(
                    access_token=access_token,
                    refresh_token=refresh_token
                )
            else:
                raise Exception("Invalid credentials")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

    async def refresh_token(self, refresh_token: str) -> Token:
        """Refresh access token"""
        try:
            payload = jwt.decode(
                refresh_token,
                settings.JWT_SECRET,
                algorithms=[settings.JWT_ALGORITHM]
            )

            if payload.get("type") != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )

            user_id: str = payload.get("sub")
            email: str = payload.get("email")

            if user_id is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token"
                )

            # Create new tokens
            new_access_token = self.create_access_token({"sub": user_id, "email": email})
            new_refresh_token = self.create_refresh_token({"sub": user_id, "email": email})

            return Token(
                access_token=new_access_token,
                refresh_token=new_refresh_token
            )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )

    @staticmethod
    async def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        supabase = Depends(get_supabase)
    ) -> UserResponse:
        """Get current user from JWT token"""
        try:
            token = credentials.credentials
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=[settings.JWT_ALGORITHM]
            )

            if payload.get("type") != "access":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )

            user_id: str = payload.get("sub")
            email: str = payload.get("email")

            if user_id is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials"
                )

            # Get user data from Supabase
            user_response = supabase.auth.get_user(token)

            if user_response.user:
                return UserResponse(
                    id=user_response.user.id,
                    email=user_response.user.email,
                    full_name=user_response.user.user_metadata.get("full_name"),
                    phone=user_response.user.user_metadata.get("phone"),
                    created_at=datetime.fromisoformat(user_response.user.created_at)
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found"
                )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
```

### 2.4 Running the Backend

**Development:**
```bash
cd Backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Create .env file with credentials
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Production:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## Phase 3: Database Schema (Supabase)

### 3.1 Complete Database Schema

Create these tables in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    base_color TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_categories_name ON categories(name);

-- ============================================================================
-- CATALOG ITEMS TABLE
-- ============================================================================
CREATE TABLE catalog_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL, -- 'sqm', 'unit', 'meter', 'hour', etc.
    base_price DECIMAL(10,2) NOT NULL,
    contractor_cost DECIMAL(10,2),
    labor_hours DECIMAL(5,2),
    material_cost DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_catalog_items_category ON catalog_items(category_id);
CREATE INDEX idx_catalog_items_name ON catalog_items(name);
CREATE INDEX idx_catalog_items_active ON catalog_items(is_active);

-- ============================================================================
-- PRICE RANGES TABLE (for tiered pricing)
-- ============================================================================
CREATE TABLE price_ranges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    catalog_item_id UUID REFERENCES catalog_items(id) ON DELETE CASCADE,
    min_quantity DECIMAL(10,2) NOT NULL,
    max_quantity DECIMAL(10,2),
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_price_ranges_item ON price_ranges(catalog_item_id);

-- ============================================================================
-- CLIENTS TABLE
-- ============================================================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_clients_user ON clients(user_id);
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_email ON clients(email);

-- ============================================================================
-- QUOTES TABLE
-- ============================================================================
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    quote_number TEXT UNIQUE NOT NULL,
    title TEXT,
    description TEXT,
    status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'approved', 'rejected', 'expired'

    -- Pricing
    subtotal DECIMAL(12,2) DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 17, -- Israeli VAT
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(12,2) DEFAULT 0, -- Total contractor cost
    total_price DECIMAL(12,2) DEFAULT 0, -- Total client price
    profit_amount DECIMAL(12,2) DEFAULT 0,
    profit_margin DECIMAL(5,2) DEFAULT 0,

    -- Additional costs
    additional_costs JSONB DEFAULT '[]'::jsonb,

    -- Payment terms
    payment_terms JSONB DEFAULT '[]'::jsonb,

    -- Dates
    valid_until DATE,
    start_date DATE,
    estimated_duration INTEGER, -- in days

    -- Metadata
    notes TEXT,
    terms_and_conditions TEXT,
    sent_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_quotes_user ON quotes(user_id);
CREATE INDEX idx_quotes_client ON quotes(client_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_number ON quotes(quote_number);
CREATE INDEX idx_quotes_created ON quotes(created_at);

-- ============================================================================
-- QUOTE ITEMS TABLE
-- ============================================================================
CREATE TABLE quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    catalog_item_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,

    -- Item details
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,

    -- Pricing
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    contractor_unit_cost DECIMAL(10,2),
    contractor_total_cost DECIMAL(10,2),

    -- Metadata
    item_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX idx_quote_items_category ON quote_items(category_id);
CREATE INDEX idx_quote_items_order ON quote_items(quote_id, item_order);

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,

    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'planning', -- 'planning', 'active', 'on-hold', 'completed', 'cancelled'

    -- Dates
    start_date DATE,
    end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,

    -- Financial
    budget DECIMAL(12,2),
    actual_cost DECIMAL(12,2) DEFAULT 0,

    -- Location
    address TEXT,
    city TEXT,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);

-- ============================================================================
-- PROJECT COSTS TABLE
-- ============================================================================
CREATE TABLE project_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    cost_type TEXT, -- 'material', 'labor', 'equipment', 'other'
    cost_date DATE NOT NULL,

    -- Receipt/invoice tracking
    receipt_number TEXT,
    vendor TEXT,
    payment_method TEXT,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_project_costs_project ON project_costs(project_id);
CREATE INDEX idx_project_costs_date ON project_costs(cost_date);
CREATE INDEX idx_project_costs_category ON project_costs(category_id);

-- ============================================================================
-- QUOTE TEMPLATES TABLE
-- ============================================================================
CREATE TABLE quote_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    description TEXT,
    is_global BOOLEAN DEFAULT FALSE, -- If true, available to all users

    -- Default values
    default_discount_percentage DECIMAL(5,2) DEFAULT 0,
    default_profit_margin DECIMAL(5,2) DEFAULT 25,
    default_payment_terms JSONB DEFAULT '[]'::jsonb,
    default_terms_and_conditions TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_quote_templates_user ON quote_templates(user_id);
CREATE INDEX idx_quote_templates_global ON quote_templates(is_global);

-- ============================================================================
-- TEMPLATE ITEMS TABLE
-- ============================================================================
CREATE TABLE template_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES quote_templates(id) ON DELETE CASCADE,
    catalog_item_id UUID REFERENCES catalog_items(id) ON DELETE CASCADE,

    default_quantity DECIMAL(10,2),
    item_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_template_items_template ON template_items(template_id);
CREATE INDEX idx_template_items_order ON template_items(template_id, item_order);

-- ============================================================================
-- CONTRACTOR PRICING TABLE
-- ============================================================================
CREATE TABLE contractor_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,

    item_name TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL,
    cost DECIMAL(10,2) NOT NULL,

    -- Additional details
    supplier TEXT,
    supplier_phone TEXT,
    last_updated_price TIMESTAMPTZ,

    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contractor_pricing_user ON contractor_pricing(user_id);
CREATE INDEX idx_contractor_pricing_category ON contractor_pricing(category_id);
CREATE INDEX idx_contractor_pricing_active ON contractor_pricing(is_active);

-- ============================================================================
-- FINANCIAL TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    type TEXT NOT NULL, -- 'income' or 'expense'
    category TEXT, -- 'payment', 'refund', 'material', 'labor', etc.
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,

    -- Payment details
    payment_method TEXT, -- 'cash', 'check', 'bank_transfer', 'credit_card'
    reference_number TEXT,

    transaction_date DATE NOT NULL,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_financial_transactions_user ON financial_transactions(user_id);
CREATE INDEX idx_financial_transactions_project ON financial_transactions(project_id);
CREATE INDEX idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(type);

-- ============================================================================
-- CUSTOMER INQUIRIES TABLE
-- ============================================================================
CREATE TABLE customer_inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,

    status TEXT DEFAULT 'new', -- 'new', 'contacted', 'quoted', 'converted', 'closed'
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Follow-up
    follow_up_date DATE,
    response TEXT,
    responded_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customer_inquiries_status ON customer_inquiries(status);
CREATE INDEX idx_customer_inquiries_email ON customer_inquiries(email);
CREATE INDEX idx_customer_inquiries_created ON customer_inquiries(created_at);

-- ============================================================================
-- USER PROFILES TABLE (Extended user data)
-- ============================================================================
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    company_name TEXT,
    business_license TEXT,
    tax_id TEXT,

    -- Contact
    phone TEXT,
    mobile TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,

    -- Business settings
    default_profit_margin DECIMAL(5,2) DEFAULT 25,
    default_tax_percentage DECIMAL(5,2) DEFAULT 17,
    currency TEXT DEFAULT 'ILS',

    -- UI preferences
    theme TEXT DEFAULT 'light',
    language TEXT DEFAULT 'he',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_catalog_items_updated_at BEFORE UPDATE ON catalog_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_templates_updated_at BEFORE UPDATE ON quote_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractor_pricing_updated_at BEFORE UPDATE ON contractor_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_inquiries_updated_at BEFORE UPDATE ON customer_inquiries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.2 Row Level Security (RLS) Policies

Enable RLS and create policies:

```sql
-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Categories: Public read, admin write
CREATE POLICY "Categories are viewable by authenticated users"
    ON categories FOR SELECT
    USING (auth.role() = 'authenticated');

-- Catalog Items: Public read, admin write
CREATE POLICY "Catalog items are viewable by authenticated users"
    ON catalog_items FOR SELECT
    USING (auth.role() = 'authenticated');

-- Price Ranges: Public read, admin write
CREATE POLICY "Price ranges are viewable by authenticated users"
    ON price_ranges FOR SELECT
    USING (auth.role() = 'authenticated');

-- Clients: Users can only see their own clients
CREATE POLICY "Users can view their own clients"
    ON clients FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients"
    ON clients FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
    ON clients FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
    ON clients FOR DELETE
    USING (auth.uid() = user_id);

-- Quotes: Users can only see their own quotes
CREATE POLICY "Users can view their own quotes"
    ON quotes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quotes"
    ON quotes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotes"
    ON quotes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quotes"
    ON quotes FOR DELETE
    USING (auth.uid() = user_id);

-- Quote Items: Access through parent quote
CREATE POLICY "Users can view quote items of their quotes"
    ON quote_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM quotes
        WHERE quotes.id = quote_items.quote_id
        AND quotes.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert quote items to their quotes"
    ON quote_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM quotes
        WHERE quotes.id = quote_items.quote_id
        AND quotes.user_id = auth.uid()
    ));

CREATE POLICY "Users can update quote items of their quotes"
    ON quote_items FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM quotes
        WHERE quotes.id = quote_items.quote_id
        AND quotes.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete quote items of their quotes"
    ON quote_items FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM quotes
        WHERE quotes.id = quote_items.quote_id
        AND quotes.user_id = auth.uid()
    ));

-- Projects: Users can only see their own projects
CREATE POLICY "Users can view their own projects"
    ON projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
    ON projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
    ON projects FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
    ON projects FOR DELETE
    USING (auth.uid() = user_id);

-- Project Costs: Access through parent project
CREATE POLICY "Users can view costs of their projects"
    ON project_costs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = project_costs.project_id
        AND projects.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert costs to their projects"
    ON project_costs FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = project_costs.project_id
        AND projects.user_id = auth.uid()
    ));

CREATE POLICY "Users can update costs of their projects"
    ON project_costs FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = project_costs.project_id
        AND projects.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete costs of their projects"
    ON project_costs FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = project_costs.project_id
        AND projects.user_id = auth.uid()
    ));

-- Quote Templates: Users see their own + global templates
CREATE POLICY "Users can view their own and global templates"
    ON quote_templates FOR SELECT
    USING (auth.uid() = user_id OR is_global = true);

CREATE POLICY "Users can insert their own templates"
    ON quote_templates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
    ON quote_templates FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
    ON quote_templates FOR DELETE
    USING (auth.uid() = user_id);

-- Template Items: Access through parent template
CREATE POLICY "Users can view items of accessible templates"
    ON template_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM quote_templates
        WHERE quote_templates.id = template_items.template_id
        AND (quote_templates.user_id = auth.uid() OR quote_templates.is_global = true)
    ));

CREATE POLICY "Users can insert items to their templates"
    ON template_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM quote_templates
        WHERE quote_templates.id = template_items.template_id
        AND quote_templates.user_id = auth.uid()
    ));

CREATE POLICY "Users can update items of their templates"
    ON template_items FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM quote_templates
        WHERE quote_templates.id = template_items.template_id
        AND quote_templates.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete items of their templates"
    ON template_items FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM quote_templates
        WHERE quote_templates.id = template_items.template_id
        AND quote_templates.user_id = auth.uid()
    ));

-- Contractor Pricing: Users can only see their own pricing
CREATE POLICY "Users can view their own contractor pricing"
    ON contractor_pricing FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contractor pricing"
    ON contractor_pricing FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contractor pricing"
    ON contractor_pricing FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contractor pricing"
    ON contractor_pricing FOR DELETE
    USING (auth.uid() = user_id);

-- Financial Transactions: Users can only see their own transactions
CREATE POLICY "Users can view their own transactions"
    ON financial_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
    ON financial_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
    ON financial_transactions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
    ON financial_transactions FOR DELETE
    USING (auth.uid() = user_id);

-- Customer Inquiries: Public insert, authenticated read/update
CREATE POLICY "Anyone can submit an inquiry"
    ON customer_inquiries FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Authenticated users can view all inquiries"
    ON customer_inquiries FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update inquiries"
    ON customer_inquiries FOR UPDATE
    USING (auth.role() = 'authenticated');

-- User Profiles: Users can only see and edit their own profile
CREATE POLICY "Users can view their own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);
```

### 3.3 Seed Data

Create initial data for categories:

```sql
-- Insert default categories
INSERT INTO categories (name, description, icon, base_color, display_order) VALUES
('צבע ושפכטל', 'עבודות צבע ושפכטל', 'paintbrush', 'blue', 1),
('ריצוף וחיפוי', 'ריצוף, חיפוי ועבודות קירמיקה', 'building', 'orange', 2),
('חשמל', 'עבודות חשמל והתקנת גופי תאורה', 'lightbulb', 'yellow', 3),
('אינסטלציה', 'עבודות אינסטלציה וצנרת', 'wrench', 'cyan', 4),
('בנייה', 'עבודות בנייה כלליות', 'construction', 'gray', 5),
('הריסות', 'עבודות הריסה ופינוי', 'demolition', 'red', 6);
```

---

## Phase 4: Third-Party Integrations Analysis

### 4.1 Current Base44 Integrations

From `Frontend/src/api/integrations.js`, the system currently uses:

1. **InvokeLLM** - AI/LLM integration
   - Currently used in: `Support.jsx`
   - Purpose: AI-powered support/assistance

2. **SendEmail** - Email sending capability
   - Purpose: Send quotes to clients, notifications

3. **UploadFile** - File upload functionality
   - Purpose: Upload images, documents, receipts

4. **GenerateImage** - Image generation
   - Purpose: Generate visualizations, thumbnails

5. **ExtractDataFromUploadedFile** - File data extraction
   - Purpose: Parse data from uploaded PDFs/Excel files

6. **CreateFileSignedUrl** - Secure file URL generation
   - Purpose: Secure file sharing

7. **UploadPrivateFile** - Private file storage
   - Purpose: Store sensitive documents

### 4.2 Migration Strategy for Each Integration

#### 4.2.1 Email Service (SendEmail)

**Option 1: SendGrid (Recommended)**
```python
# app/services/email_service.py
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from app.config import settings

class EmailService:
    def __init__(self):
        self.client = SendGridAPIClient(settings.SENDGRID_API_KEY)

    async def send_quote_email(
        self,
        to_email: str,
        to_name: str,
        quote_number: str,
        pdf_content: bytes,
        subject: str = None
    ):
        """Send quote via email with PDF attachment"""
        subject = subject or f"הצעת מחיר מספר {quote_number}"

        message = Mail(
            from_email=Email(settings.FROM_EMAIL, "מערכת הצעות מחיר"),
            to_emails=To(to_email, to_name),
            subject=subject,
            html_content=Content("text/html", self._get_quote_email_template(quote_number))
        )

        # Attach PDF
        import base64
        encoded_pdf = base64.b64encode(pdf_content).decode()
        message.attachment = Attachment(
            file_content=FileContent(encoded_pdf),
            file_name=FileName(f"quote_{quote_number}.pdf"),
            file_type=FileType("application/pdf"),
            disposition=Disposition("attachment")
        )

        response = self.client.send(message)
        return response.status_code == 202

    def _get_quote_email_template(self, quote_number: str) -> str:
        """Generate HTML email template"""
        return f"""
        <html dir="rtl">
        <body style="font-family: Arial, sans-serif;">
            <h2>שלום,</h2>
            <p>מצורפת הצעת מחיר מספר {quote_number}</p>
            <p>נשמח לעמוד לשירותכם לכל שאלה.</p>
            <br>
            <p>בברכה,<br>צוות הקבלנים</p>
        </body>
        </html>
        """
```

**Option 2: AWS SES**
```python
import boto3
from botocore.exceptions import ClientError

class EmailService:
    def __init__(self):
        self.client = boto3.client(
            'ses',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
```

#### 4.2.2 File Storage (Upload/Download)

Use **Supabase Storage**:

```python
# app/services/file_service.py
from app.database import get_supabase
from fastapi import UploadFile, HTTPException
from typing import Optional
import uuid

class FileService:
    def __init__(self):
        self.supabase = get_supabase()
        self.bucket_name = "contractor-files"

    async def upload_file(
        self,
        file: UploadFile,
        user_id: str,
        folder: str = "general"
    ) -> dict:
        """Upload file to Supabase Storage"""
        # Validate file
        self._validate_file(file)

        # Generate unique filename
        file_ext = file.filename.split('.')[-1]
        unique_filename = f"{folder}/{user_id}/{uuid.uuid4()}.{file_ext}"

        # Read file content
        content = await file.read()

        # Upload to Supabase
        response = self.supabase.storage.from_(self.bucket_name).upload(
            path=unique_filename,
            file=content,
            file_options={"content-type": file.content_type}
        )

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="File upload failed")

        # Get public URL
        file_url = self.supabase.storage.from_(self.bucket_name).get_public_url(unique_filename)

        return {
            "filename": file.filename,
            "path": unique_filename,
            "url": file_url,
            "size": len(content),
            "content_type": file.content_type
        }

    async def upload_private_file(
        self,
        file: UploadFile,
        user_id: str,
        folder: str = "private"
    ) -> dict:
        """Upload private file (requires authentication to access)"""
        # Similar to upload_file but in private bucket
        pass

    async def get_signed_url(
        self,
        file_path: str,
        expires_in: int = 3600
    ) -> str:
        """Get signed URL for private file access"""
        signed_url = self.supabase.storage.from_(self.bucket_name).create_signed_url(
            path=file_path,
            expires_in=expires_in
        )
        return signed_url['signedURL']

    async def delete_file(self, file_path: str) -> bool:
        """Delete file from storage"""
        response = self.supabase.storage.from_(self.bucket_name).remove([file_path])
        return response.status_code == 200

    def _validate_file(self, file: UploadFile):
        """Validate file size and extension"""
        # Check file extension
        file_ext = f".{file.filename.split('.')[-1].lower()}"
        if file_ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_ext} not allowed"
            )
```

**Router endpoint:**
```python
# app/routers/files.py
from fastapi import APIRouter, UploadFile, File, Depends
from app.services.file_service import FileService
from app.services.auth_service import AuthService
from app.models.user import UserResponse

router = APIRouter()

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    folder: str = "general",
    current_user: UserResponse = Depends(AuthService.get_current_user),
    file_service: FileService = Depends()
):
    """Upload a file"""
    result = await file_service.upload_file(file, current_user.id, folder)
    return result

@router.post("/upload/private")
async def upload_private_file(
    file: UploadFile = File(...),
    folder: str = "private",
    current_user: UserResponse = Depends(AuthService.get_current_user),
    file_service: FileService = Depends()
):
    """Upload a private file"""
    result = await file_service.upload_private_file(file, current_user.id, folder)
    return result

@router.get("/signed-url/{file_path:path}")
async def get_signed_url(
    file_path: str,
    expires_in: int = 3600,
    current_user: UserResponse = Depends(AuthService.get_current_user),
    file_service: FileService = Depends()
):
    """Get signed URL for private file"""
    url = await file_service.get_signed_url(file_path, expires_in)
    return {"url": url}
```

#### 4.2.3 AI/LLM Integration (InvokeLLM)

**Option 1: OpenAI API**
```python
# app/services/llm_service.py
from openai import AsyncOpenAI
from app.config import settings

class LLMService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def invoke_llm(
        self,
        prompt: str,
        system_message: str = None,
        model: str = "gpt-4",
        temperature: float = 0.7
    ) -> str:
        """Invoke LLM with prompt"""
        messages = []

        if system_message:
            messages.append({"role": "system", "content": system_message})

        messages.append({"role": "user", "content": prompt})

        response = await self.client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature
        )

        return response.choices[0].message.content

    async def generate_quote_description(
        self,
        quote_items: list,
        client_name: str
    ) -> str:
        """Generate professional quote description"""
        prompt = f"""
        Generate a professional Hebrew description for a contractor quote.

        Client: {client_name}
        Items: {', '.join([item['name'] for item in quote_items])}

        Create a 2-3 sentence description that sounds professional and highlights the value.
        """

        system = "You are a professional Israeli contractor writing quote descriptions in Hebrew."

        return await self.invoke_llm(prompt, system)
```

**Option 2: Anthropic Claude API**
```python
from anthropic import AsyncAnthropic

class LLMService:
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def invoke_llm(
        self,
        prompt: str,
        system_message: str = None,
        model: str = "claude-3-sonnet-20240229",
        max_tokens: int = 1024
    ) -> str:
        """Invoke Claude with prompt"""
        message = await self.client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system_message,
            messages=[{"role": "user", "content": prompt}]
        )

        return message.content[0].text
```

#### 4.2.4 Image Generation (GenerateImage)

**Option 1: DALL-E (OpenAI)**
```python
# app/services/image_service.py
from openai import AsyncOpenAI

class ImageService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def generate_image(
        self,
        prompt: str,
        size: str = "1024x1024",
        quality: str = "standard"
    ) -> str:
        """Generate image using DALL-E"""
        response = await self.client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size=size,
            quality=quality,
            n=1
        )

        return response.data[0].url
```

**Option 2: Stable Diffusion (via Replicate)**
```python
import replicate

class ImageService:
    async def generate_image(self, prompt: str) -> str:
        """Generate image using Stable Diffusion"""
        output = replicate.run(
            "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
            input={"prompt": prompt}
        )
        return output[0]
```

#### 4.2.5 File Data Extraction (ExtractDataFromUploadedFile)

```python
# app/services/extraction_service.py
import PyPDF2
import pandas as pd
from docx import Document
from fastapi import UploadFile

class ExtractionService:
    async def extract_data(self, file: UploadFile) -> dict:
        """Extract data from uploaded file"""
        file_ext = file.filename.split('.')[-1].lower()

        if file_ext == 'pdf':
            return await self._extract_from_pdf(file)
        elif file_ext in ['xlsx', 'xls']:
            return await self._extract_from_excel(file)
        elif file_ext == 'docx':
            return await self._extract_from_docx(file)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")

    async def _extract_from_pdf(self, file: UploadFile) -> dict:
        """Extract text from PDF"""
        content = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))

        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()

        return {"text": text, "pages": len(pdf_reader.pages)}

    async def _extract_from_excel(self, file: UploadFile) -> dict:
        """Extract data from Excel"""
        content = await file.read()
        df = pd.read_excel(io.BytesIO(content))

        return {
            "data": df.to_dict('records'),
            "columns": list(df.columns),
            "rows": len(df)
        }

    async def _extract_from_docx(self, file: UploadFile) -> dict:
        """Extract text from Word document"""
        content = await file.read()
        doc = Document(io.BytesIO(content))

        text = "\n".join([para.text for para in doc.paragraphs])

        return {"text": text, "paragraphs": len(doc.paragraphs)}
```

### 4.3 Integration Summary Table

| Base44 Integration | Replacement Service | Python Library | Configuration Required |
|-------------------|---------------------|----------------|----------------------|
| SendEmail | SendGrid or AWS SES | sendgrid / boto3 | API Key / AWS Credentials |
| UploadFile | Supabase Storage | supabase-py | Supabase credentials |
| UploadPrivateFile | Supabase Storage | supabase-py | Supabase credentials |
| CreateFileSignedUrl | Supabase Storage | supabase-py | Supabase credentials |
| InvokeLLM | OpenAI or Anthropic | openai / anthropic | API Key |
| GenerateImage | DALL-E or Stable Diffusion | openai / replicate | API Key |
| ExtractDataFromUploadedFile | Custom Python | PyPDF2, pandas, python-docx | None |

---

## Phase 5: Frontend Migration Strategy

### 5.1 Create New API Client

Replace Base44 SDK with custom API client:

**Frontend/src/api/client.js:**
```javascript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: newRefreshToken } = response.data;

          localStorage.setItem('auth_token', access_token);
          localStorage.setItem('refresh_token', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### 5.2 Create Service Modules for Each Entity

#### Frontend/src/api/services/authService.js
```javascript
import apiClient from '../client';

export const AuthService = {
  async register(userData) {
    const response = await apiClient.post('/api/auth/register', userData);
    return response.data;
  },

  async login(email, password) {
    const response = await apiClient.post('/api/auth/login', {
      email,
      password,
    });

    const { access_token, refresh_token } = response.data;
    localStorage.setItem('auth_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);

    return response.data;
  },

  async logout() {
    await apiClient.post('/api/auth/logout');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  },

  async getCurrentUser() {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },

  async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    const response = await apiClient.post('/api/auth/refresh', {
      refresh_token: refreshToken,
    });

    const { access_token, refresh_token: newRefreshToken } = response.data;
    localStorage.setItem('auth_token', access_token);
    localStorage.setItem('refresh_token', newRefreshToken);

    return response.data;
  },
};
```

#### Frontend/src/api/services/quoteService.js
```javascript
import apiClient from '../client';

export const QuoteService = {
  async getAll(filters = {}) {
    const response = await apiClient.get('/api/quotes', { params: filters });
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/api/quotes/${id}`);
    return response.data;
  },

  async create(quoteData) {
    const response = await apiClient.post('/api/quotes', quoteData);
    return response.data;
  },

  async update(id, quoteData) {
    const response = await apiClient.put(`/api/quotes/${id}`, quoteData);
    return response.data;
  },

  async delete(id) {
    await apiClient.delete(`/api/quotes/${id}`);
  },

  async sendToClient(id, emailData) {
    const response = await apiClient.post(`/api/quotes/${id}/send`, emailData);
    return response.data;
  },

  async generatePDF(id) {
    const response = await apiClient.get(`/api/quotes/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async duplicate(id) {
    const response = await apiClient.post(`/api/quotes/${id}/duplicate`);
    return response.data;
  },

  async getItems(quoteId) {
    const response = await apiClient.get(`/api/quotes/${quoteId}/items`);
    return response.data;
  },

  async addItem(quoteId, itemData) {
    const response = await apiClient.post(`/api/quotes/${quoteId}/items`, itemData);
    return response.data;
  },

  async updateItem(quoteId, itemId, itemData) {
    const response = await apiClient.put(`/api/quotes/${quoteId}/items/${itemId}`, itemData);
    return response.data;
  },

  async deleteItem(quoteId, itemId) {
    await apiClient.delete(`/api/quotes/${quoteId}/items/${itemId}`);
  },
};
```

#### Frontend/src/api/services/clientService.js
```javascript
import apiClient from '../client';

export const ClientService = {
  async getAll(search = '') {
    const response = await apiClient.get('/api/clients', {
      params: { search },
    });
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/api/clients/${id}`);
    return response.data;
  },

  async create(clientData) {
    const response = await apiClient.post('/api/clients', clientData);
    return response.data;
  },

  async update(id, clientData) {
    const response = await apiClient.put(`/api/clients/${id}`, clientData);
    return response.data;
  },

  async delete(id) {
    await apiClient.delete(`/api/clients/${id}`);
  },

  async getQuotes(clientId) {
    const response = await apiClient.get(`/api/clients/${clientId}/quotes`);
    return response.data;
  },
};
```

#### Frontend/src/api/services/catalogService.js
```javascript
import apiClient from '../client';

export const CatalogService = {
  // Categories
  async getCategories() {
    const response = await apiClient.get('/api/catalog/categories');
    return response.data;
  },

  async getCategoryById(id) {
    const response = await apiClient.get(`/api/catalog/categories/${id}`);
    return response.data;
  },

  // Catalog Items
  async getItems(categoryId = null) {
    const response = await apiClient.get('/api/catalog/items', {
      params: { category_id: categoryId },
    });
    return response.data;
  },

  async getItemById(id) {
    const response = await apiClient.get(`/api/catalog/items/${id}`);
    return response.data;
  },

  async createItem(itemData) {
    const response = await apiClient.post('/api/catalog/items', itemData);
    return response.data;
  },

  async updateItem(id, itemData) {
    const response = await apiClient.put(`/api/catalog/items/${id}`, itemData);
    return response.data;
  },

  async deleteItem(id) {
    await apiClient.delete(`/api/catalog/items/${id}`);
  },

  // Price Ranges
  async getPriceRanges(itemId) {
    const response = await apiClient.get(`/api/catalog/items/${itemId}/price-ranges`);
    return response.data;
  },

  async addPriceRange(itemId, rangeData) {
    const response = await apiClient.post(`/api/catalog/items/${itemId}/price-ranges`, rangeData);
    return response.data;
  },
};
```

#### Frontend/src/api/services/projectService.js
```javascript
import apiClient from '../client';

export const ProjectService = {
  async getAll(filters = {}) {
    const response = await apiClient.get('/api/projects', { params: filters });
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/api/projects/${id}`);
    return response.data;
  },

  async create(projectData) {
    const response = await apiClient.post('/api/projects', projectData);
    return response.data;
  },

  async update(id, projectData) {
    const response = await apiClient.put(`/api/projects/${id}`, projectData);
    return response.data;
  },

  async delete(id) {
    await apiClient.delete(`/api/projects/${id}`);
  },

  // Project Costs
  async getCosts(projectId) {
    const response = await apiClient.get(`/api/projects/${projectId}/costs`);
    return response.data;
  },

  async addCost(projectId, costData) {
    const response = await apiClient.post(`/api/projects/${projectId}/costs`, costData);
    return response.data;
  },

  async updateCost(projectId, costId, costData) {
    const response = await apiClient.put(`/api/projects/${projectId}/costs/${costId}`, costData);
    return response.data;
  },

  async deleteCost(projectId, costId) {
    await apiClient.delete(`/api/projects/${projectId}/costs/${costId}`);
  },
};
```

#### Frontend/src/api/services/templateService.js
```javascript
import apiClient from '../client';

export const TemplateService = {
  async getAll() {
    const response = await apiClient.get('/api/templates');
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/api/templates/${id}`);
    return response.data;
  },

  async create(templateData) {
    const response = await apiClient.post('/api/templates', templateData);
    return response.data;
  },

  async update(id, templateData) {
    const response = await apiClient.put(`/api/templates/${id}`, templateData);
    return response.data;
  },

  async delete(id) {
    await apiClient.delete(`/api/templates/${id}`);
  },

  async applyToQuote(templateId, quoteId) {
    const response = await apiClient.post(`/api/templates/${templateId}/apply`, {
      quote_id: quoteId,
    });
    return response.data;
  },
};
```

#### Frontend/src/api/services/fileService.js
```javascript
import apiClient from '../client';

export const FileService = {
  async uploadFile(file, folder = 'general') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await apiClient.post('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async uploadPrivateFile(file, folder = 'private') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await apiClient.post('/api/files/upload/private', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getSignedUrl(filePath, expiresIn = 3600) {
    const response = await apiClient.get(`/api/files/signed-url/${filePath}`, {
      params: { expires_in: expiresIn },
    });
    return response.data.url;
  },

  async deleteFile(filePath) {
    await apiClient.delete(`/api/files/${filePath}`);
  },
};
```

### 5.3 Update entities.js

Replace Base44 entity exports with new service exports:

**Frontend/src/api/entities.js:**
```javascript
// Export all services
export { AuthService as User } from './services/authService';
export { QuoteService as Quote } from './services/quoteService';
export { QuoteService as QuoteItem } from './services/quoteService'; // Items are part of Quote service
export { ClientService as Client } from './services/clientService';
export { CatalogService as Category } from './services/catalogService';
export { CatalogService as CatalogItem } from './services/catalogService';
export { CatalogService as PriceRange } from './services/catalogService';
export { ProjectService as Project } from './services/projectService';
export { ProjectService as ProjectCosts } from './services/projectService';
export { TemplateService as QuoteTemplate } from './services/templateService';
export { TemplateService as TemplateItem } from './services/templateService';

// Financial and other services
export { default as FinancialService } from './services/financialService';
export { default as ContractorPricingService } from './services/contractorPricingService';
export { default as InquiryService } from './services/inquiryService';
export { FileService } from './services/fileService';
```

### 5.4 Update Component Imports

**Before (Base44):**
```javascript
import { Quote, Client, User } from '@/api/entities';

// Using Base44 SDK methods
const quotes = await Quote.find();
const newQuote = await Quote.create({ title: 'New Quote' });
```

**After (New API):**
```javascript
import { Quote, Client, User } from '@/api/entities';

// Using new service methods
const quotes = await Quote.getAll();
const newQuote = await Quote.create({ title: 'New Quote' });
```

### 5.5 Migration Checklist

For each component that uses Base44:

1. **Identify Base44 usage:**
   - Search for imports from `@/api/entities`
   - Look for `.find()`, `.create()`, `.update()`, `.delete()` methods
   - Check for Base44-specific patterns

2. **Replace with new service methods:**
   ```javascript
   // Base44 pattern
   const quotes = await Quote.find({ status: 'draft' });

   // New pattern
   const quotes = await Quote.getAll({ status: 'draft' });
   ```

3. **Update error handling:**
   ```javascript
   // Base44 might have different error structure
   try {
     await Quote.create(data);
   } catch (error) {
     // Check error.response.data instead of error.message
     console.error(error.response?.data?.detail || error.message);
   }
   ```

4. **Test the component:**
   - Ensure data loads correctly
   - Test create/update/delete operations
   - Verify error handling

### 5.6 Create Migration Helper Script

**scripts/migrate-components.js:**
```javascript
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Map of Base44 methods to new service methods
const methodMapping = {
  'find': 'getAll',
  'findOne': 'getById',
  'findById': 'getById',
  'create': 'create',
  'update': 'update',
  'delete': 'delete',
  'remove': 'delete',
};

async function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace Base44 method calls
  for (const [oldMethod, newMethod] of Object.entries(methodMapping)) {
    const regex = new RegExp(`\\.${oldMethod}\\(`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, `.${newMethod}(`);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Migrated: ${filePath}`);
  }
}

async function main() {
  const files = await glob('src/**/*.{js,jsx}', { ignore: 'node_modules/**' });

  console.log(`Found ${files.length} files to check...`);

  for (const file of files) {
    await migrateFile(file);
  }

  console.log('Migration complete!');
}

main();
```

---

## Phase 6: Remove All Base44 References

### 6.1 Files to Delete

1. **Frontend/src/api/base44Client.js** - Delete entirely
2. **Frontend/src/api/integrations.js** - Delete or replace with new integrations

### 6.2 Files to Update

#### package.json
```json
// Remove this dependency:
"@base44/sdk": "^0.1.2"

// No new dependencies needed (using axios which is already included)
```

Run after removing:
```bash
cd Frontend
npm uninstall @base44/sdk
npm install
```

#### README.md

**Before:**
```markdown
# Base44 App

This app was created automatically by Base44.
It's a Vite+React app that communicates with the Base44 API.

## Running the app

```bash
npm install
npm run dev
```

For more information and support, please contact Base44 support at app@base44.com.
```

**After:**
```markdown
# Contractor Management System

A comprehensive contractor expense calculation and quote management system.

## Features
- Quote creation and management
- Client management
- Catalog of services and materials
- Project tracking
- Financial reporting
- Contractor pricing management

## Tech Stack
- **Frontend**: React + Vite
- **Backend**: Python + FastAPI
- **Database**: Supabase (PostgreSQL)
- **UI**: shadcn/ui + Tailwind CSS

## Setup

### Frontend
```bash
cd Frontend
npm install
cp .env.example .env
# Edit .env with your API URL and Supabase credentials
npm run dev
```

### Backend
```bash
cd Backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Supabase credentials
uvicorn app.main:app --reload
```

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Backend (.env)
See `.env.example` for complete list.

## Development

- Frontend runs on http://localhost:5173
- Backend API runs on http://localhost:8000
- API documentation available at http://localhost:8000/docs

## License
MIT
```

### 6.3 Search and Replace Operations

Run these search operations across the Frontend codebase:

1. **Search for Base44 references:**
   ```bash
   cd Frontend/src
   grep -r "base44" .
   grep -r "Base44" .
   grep -r "@base44" .
   ```

2. **Replace import statements:**
   - Find: `import { base44 } from './base44Client'`
   - Replace: Remove the line

3. **Update any direct SDK usage:**
   - Find: `base44.`
   - Should return no results after migration

### 6.4 Verification Script

Create a script to verify Base44 has been fully removed:

**scripts/verify-migration.js:**
```javascript
import fs from 'fs';
import { glob } from 'glob';

async function verifyNoBase44References() {
  const files = await glob('src/**/*.{js,jsx}', { ignore: 'node_modules/**' });
  const issues = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');

    if (content.includes('base44') || content.includes('Base44')) {
      issues.push({
        file,
        lines: content.split('\n')
          .map((line, idx) => ({ line: line, number: idx + 1 }))
          .filter(({ line }) => line.includes('base44') || line.includes('Base44'))
      });
    }
  }

  if (issues.length > 0) {
    console.log('❌ Base44 references still found:\n');
    issues.forEach(({ file, lines }) => {
      console.log(`File: ${file}`);
      lines.forEach(({ line, number }) => {
        console.log(`  Line ${number}: ${line.trim()}`);
      });
      console.log('');
    });
    process.exit(1);
  } else {
    console.log('✅ No Base44 references found!');
  }
}

// Check package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (packageJson.dependencies['@base44/sdk']) {
  console.log('❌ @base44/sdk still in package.json dependencies');
  process.exit(1);
}

console.log('✅ @base44/sdk removed from package.json');

verifyNoBase44References();
```

Run verification:
```bash
cd Frontend
node scripts/verify-migration.js
```

---

## Phase 7: Environment Configuration

### 7.1 Backend Environment Variables

**Backend/.env.example:**
```env
# Application
APP_NAME=Contractor Management System
DEBUG=False

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-role-key

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_ALGORITHM=HS256
JWT_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=604800

# CORS Configuration
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000","https://yourapp.com"]

# Email Service (Choose one)
# Option 1: SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourapp.com

# Option 2: AWS SES
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# AI Services (Optional)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_EXTENSIONS=[".pdf",".jpg",".jpeg",".png",".docx",".xlsx"]

# Production Settings
ENVIRONMENT=development
LOG_LEVEL=INFO
```

### 7.2 Frontend Environment Variables

**Frontend/.env.example:**
```env
# Backend API
VITE_API_URL=http://localhost:8000

# Supabase (for direct client access if needed)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Feature Flags
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_IMAGE_GENERATION=false

# Environment
VITE_ENVIRONMENT=development
```

### 7.3 Development Setup Script

**scripts/setup-dev.sh:**
```bash
#!/bin/bash

echo "Setting up Contractor Management System..."

# Backend setup
echo "Setting up Backend..."
cd Backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
if [[ "$OSTYPE" == "msys" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Create .env file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Please edit Backend/.env with your Supabase credentials"
fi

cd ..

# Frontend setup
echo "Setting up Frontend..."
cd Frontend

# Install dependencies
npm install

# Create .env file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Please edit Frontend/.env with your API URL"
fi

cd ..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit Backend/.env with your Supabase credentials"
echo "2. Edit Frontend/.env with your API URL"
echo "3. Set up Supabase database schema (see MIGRATION_PLAN.md Phase 3)"
echo "4. Start the backend: cd Backend && uvicorn app.main:app --reload"
echo "5. Start the frontend: cd Frontend && npm run dev"
```

Make it executable:
```bash
chmod +x scripts/setup-dev.sh
```

### 7.4 Docker Configuration (Optional)

**Backend/Dockerfile:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Frontend/Dockerfile:**
```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build application
RUN npm run build

# Production image
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./Backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    env_file:
      - ./Backend/.env
    volumes:
      - ./Backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build:
      context: ./Frontend
      dockerfile: Dockerfile
    ports:
      - "5173:80"
    depends_on:
      - backend
    environment:
      - VITE_API_URL=http://localhost:8000
```

### 7.5 Production Deployment Checklist

1. **Security:**
   - [ ] Change all default secrets in .env
   - [ ] Use strong JWT_SECRET (min 32 characters)
   - [ ] Enable HTTPS
   - [ ] Set DEBUG=False
   - [ ] Configure proper CORS_ORIGINS
   - [ ] Enable Supabase RLS policies
   - [ ] Set secure cookie options

2. **Backend:**
   - [ ] Set ENVIRONMENT=production
   - [ ] Configure proper logging
   - [ ] Set up error monitoring (Sentry, etc.)
   - [ ] Configure rate limiting
   - [ ] Set up database backups
   - [ ] Configure CDN for file storage

3. **Frontend:**
   - [ ] Set production API URL
   - [ ] Build optimized bundle: `npm run build`
   - [ ] Configure CDN for static assets
   - [ ] Enable service worker (if needed)
   - [ ] Set up error tracking

4. **Infrastructure:**
   - [ ] Set up SSL certificates
   - [ ] Configure load balancer (if needed)
   - [ ] Set up monitoring and alerts
   - [ ] Configure backup strategy
   - [ ] Document deployment process

---

## Implementation Steps Summary

### Step-by-Step Execution Order

1. **Analysis Phase (Days 1-2)**
   - [ ] Read all large component files (>500 lines)
   - [ ] Document file sizes and complexity
   - [ ] Create PERFORMANCE_RECOMMENDATIONS.md
   - [ ] Plan file splitting strategy
   - [ ] Identify code duplication

2. **Backend Setup (Days 3-5)**
   - [ ] Create Backend directory structure
   - [ ] Set up Python virtual environment
   - [ ] Install dependencies (FastAPI, Supabase, etc.)
   - [ ] Create config.py and database.py
   - [ ] Implement authentication (register, login, JWT)
   - [ ] Create user models and routes
   - [ ] Test authentication endpoints

3. **Database Setup (Days 6-7)**
   - [ ] Create Supabase project
   - [ ] Run database schema SQL scripts
   - [ ] Enable Row Level Security
   - [ ] Create RLS policies for all tables
   - [ ] Insert seed data (categories)
   - [ ] Test database connections
   - [ ] Verify RLS policies work correctly

4. **Backend API Development (Days 8-12)**
   - [ ] Implement Quote endpoints (CRUD)
   - [ ] Implement Client endpoints (CRUD)
   - [ ] Implement Catalog endpoints (CRUD)
   - [ ] Implement Project endpoints (CRUD)
   - [ ] Implement Template endpoints (CRUD)
   - [ ] Implement Financial endpoints (CRUD)
   - [ ] Implement Contractor Pricing endpoints (CRUD)
   - [ ] Implement Inquiry endpoints (CRUD)
   - [ ] Add file upload endpoints
   - [ ] Add PDF generation endpoint
   - [ ] Test all endpoints with Postman/curl

5. **Third-Party Integrations (Days 13-15)**
   - [ ] Set up email service (SendGrid or SES)
   - [ ] Configure Supabase Storage
   - [ ] Implement file upload service
   - [ ] Implement file download/signed URLs
   - [ ] Add LLM integration (optional)
   - [ ] Add image generation (optional)
   - [ ] Test all integrations

6. **Frontend Migration (Days 16-20)**
   - [ ] Create new API client (axios)
   - [ ] Create service modules (auth, quote, client, etc.)
   - [ ] Update entities.js exports
   - [ ] Migrate authentication components
   - [ ] Migrate quote components
   - [ ] Migrate client components
   - [ ] Migrate catalog components
   - [ ] Migrate project components
   - [ ] Test each migrated component
   - [ ] Fix any issues

7. **Remove Base44 (Days 21-22)**
   - [ ] Search for all Base44 references
   - [ ] Delete base44Client.js
   - [ ] Update integrations.js
   - [ ] Remove @base44/sdk from package.json
   - [ ] Update README.md
   - [ ] Run verification script
   - [ ] Ensure no Base44 code remains

8. **Testing & Bug Fixes (Days 23-25)**
   - [ ] Test user registration and login
   - [ ] Test quote creation end-to-end
   - [ ] Test client management
   - [ ] Test catalog management
   - [ ] Test project tracking
   - [ ] Test financial reporting
   - [ ] Test file uploads
   - [ ] Test email sending
   - [ ] Fix any bugs found

9. **Performance Optimization (Days 26-28)**
   - [ ] Split large components identified in Phase 1
   - [ ] Implement lazy loading for routes
   - [ ] Optimize bundle size
   - [ ] Add React.memo where needed
   - [ ] Optimize database queries
   - [ ] Add caching where appropriate
   - [ ] Test performance improvements

10. **Documentation & Deployment (Days 29-30)**
    - [ ] Complete README.md
    - [ ] Document API endpoints
    - [ ] Create deployment guide
    - [ ] Set up environment variables
    - [ ] Deploy backend to production
    - [ ] Deploy frontend to production
    - [ ] Test production deployment
    - [ ] Create backup strategy

---

## Timeline Estimate

| Phase | Tasks | Duration | Days |
|-------|-------|----------|------|
| **Phase 1** | Performance Analysis | Document large files, create recommendations | 1-2 days |
| **Phase 2** | Backend Setup | Create structure, install dependencies, implement auth | 2-3 days |
| **Phase 3** | Database Schema | Create tables, RLS, seed data | 1-2 days |
| **Phase 4** | Integrations | Email, file storage, AI services | 2-3 days |
| **Phase 5** | Frontend Migration | Create services, migrate components | 3-5 days |
| **Phase 6** | Remove Base44 | Clean up references, verify removal | 1-2 days |
| **Phase 7** | Configuration | Environment setup, deployment config | 1-2 days |
| **Phase 8** | Testing | End-to-end testing, bug fixes | 2-3 days |
| **Phase 9** | Optimization | Split files, lazy loading, performance | 2-3 days |
| **Phase 10** | Documentation | Complete docs, deploy | 1-2 days |

**Total Estimated Time: 16-27 days**

With a team of 2 developers working in parallel, this could be reduced to approximately 10-15 days.

---

## Risk Assessment & Mitigation

### High Risk Items

1. **Data Migration from Base44**
   - **Risk**: Loss of existing data during migration
   - **Mitigation**:
     - Create data export scripts from Base44
     - Test migration on copy of data first
     - Keep Base44 accessible during transition period

2. **Breaking Changes in Components**
   - **Risk**: Components break after API migration
   - **Mitigation**:
     - Migrate components incrementally
     - Keep both old and new code during transition
     - Comprehensive testing of each component

3. **Authentication Issues**
   - **Risk**: Users locked out after migration
   - **Mitigation**:
     - Implement fallback authentication
     - Test thoroughly with multiple user accounts
     - Have rollback plan ready

### Medium Risk Items

1. **Performance Degradation**
   - **Risk**: New backend slower than Base44
   - **Mitigation**:
     - Benchmark current performance
     - Optimize database queries
     - Implement caching strategy

2. **Integration Failures**
   - **Risk**: Third-party services don't work as expected
   - **Mitigation**:
     - Test integrations early
     - Have backup providers ready
     - Implement graceful fallbacks

### Low Risk Items

1. **File Size Issues**
   - **Risk**: Splitting files causes import issues
   - **Mitigation**:
     - Use barrel exports
     - Update imports systematically
     - Use IDE refactoring tools

---

## Success Criteria

The migration will be considered successful when:

1. **Functionality:**
   - [ ] All existing features work as before
   - [ ] Authentication works correctly
   - [ ] All CRUD operations function properly
   - [ ] File uploads/downloads work
   - [ ] Email sending works
   - [ ] PDF generation works

2. **Performance:**
   - [ ] Page load times ≤ current system
   - [ ] API response times < 500ms
   - [ ] Large files split into smaller modules
   - [ ] Bundle size reduced by at least 20%

3. **Code Quality:**
   - [ ] No Base44 references remain
   - [ ] All components use new API services
   - [ ] Code is well-documented
   - [ ] No critical bugs

4. **Security:**
   - [ ] All endpoints protected with authentication
   - [ ] RLS policies working correctly
   - [ ] Sensitive data encrypted
   - [ ] Input validation in place

5. **Deployment:**
   - [ ] Backend deployed and accessible
   - [ ] Frontend deployed and accessible
   - [ ] Environment variables configured
   - [ ] Backups configured

---

## Rollback Plan

If critical issues arise during migration:

1. **Immediate Actions:**
   - Stop deployment process
   - Document the issue
   - Assess impact on users

2. **Quick Rollback (< 1 hour):**
   - Revert to previous version from git
   - Restore Base44 connections
   - Notify users of temporary issue

3. **Data Rollback:**
   - Restore database from backup
   - Re-import any lost data
   - Verify data integrity

4. **Post-Rollback:**
   - Analyze what went wrong
   - Fix issues in development
   - Plan new deployment date

---

## Support & Maintenance

### Post-Migration Support

1. **Week 1:**
   - Monitor all endpoints for errors
   - Watch for user-reported issues
   - Quick bug fixes as needed
   - Performance monitoring

2. **Week 2-4:**
   - Address remaining minor issues
   - Optimize based on usage patterns
   - Gather user feedback
   - Document known issues

3. **Ongoing:**
   - Regular database backups
   - Monitor API performance
   - Update dependencies
   - Security patches

### Resources & Contacts

- **Supabase Documentation**: https://supabase.com/docs
- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **React Documentation**: https://react.dev/

---

## Appendix

### A. Useful Commands

**Backend:**
```bash
# Create virtual environment
python -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload

# Run tests
pytest

# Generate coverage report
pytest --cov=app tests/
```

**Frontend:**
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

**Database:**
```bash
# Connect to Supabase CLI
supabase login

# Init project
supabase init

# Generate migration
supabase migration new migration_name

# Apply migrations
supabase db push
```

### B. Common Issues & Solutions

1. **CORS Errors**
   - Check CORS_ORIGINS in backend .env
   - Ensure frontend URL is in allowed origins
   - Verify preflight requests are handled

2. **Authentication Errors**
   - Verify JWT_SECRET is set
   - Check token expiration times
   - Ensure Authorization header is sent

3. **Database Connection Issues**
   - Verify Supabase credentials
   - Check network connectivity
   - Ensure RLS policies are correct

4. **File Upload Fails**
   - Check MAX_FILE_SIZE setting
   - Verify file extension is allowed
   - Ensure storage bucket exists

### C. Performance Optimization Tips

1. **Backend:**
   - Use database indexes
   - Implement caching (Redis)
   - Use connection pooling
   - Optimize N+1 queries

2. **Frontend:**
   - Code splitting
   - Lazy loading
   - Image optimization
   - Use React.memo
   - Debounce user input

3. **Database:**
   - Create proper indexes
   - Use query optimization
   - Regular VACUUM
   - Monitor slow queries

---

## Conclusion

This migration plan provides a comprehensive roadmap for:
1. Improving performance by identifying and splitting large files
2. Setting up a modern Python/FastAPI backend with Supabase
3. Migrating from Base44 to custom API services
4. Removing all Base44 dependencies

Follow the phases in order, test thoroughly at each step, and maintain good communication with stakeholders throughout the process.

**Good luck with your migration!**
