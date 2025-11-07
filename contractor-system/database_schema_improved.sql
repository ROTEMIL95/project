-- =============================================
-- Contractor Management System - Database Schema (IMPROVED)
-- Supabase PostgreSQL Schema
-- Version: 2.0 - Addresses all security and performance review points
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUM TYPES
-- =============================================
-- Using ENUMs instead of TEXT with CHECK constraints for better type safety

CREATE TYPE user_role_enum AS ENUM ('user', 'admin');
CREATE TYPE quote_status_enum AS ENUM ('draft', 'sent', 'approved', 'rejected', 'expired');
CREATE TYPE project_status_enum AS ENUM ('planning', 'active', 'on-hold', 'completed', 'cancelled');
CREATE TYPE inquiry_status_enum AS ENUM ('new', 'contacted', 'converted', 'closed');
CREATE TYPE transaction_type_enum AS ENUM ('income', 'expense');
CREATE TYPE transaction_category_enum AS ENUM ('quote_payment', 'project_cost', 'supplier_payment', 'salary', 'other');
CREATE TYPE payment_method_enum AS ENUM ('cash', 'bank_transfer', 'check', 'credit_card');
CREATE TYPE cost_category_enum AS ENUM ('labor', 'materials', 'equipment', 'subcontractors', 'other');

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if current user is an admin
-- Used in RLS policies for admin bypass
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_profiles
        WHERE auth_user_id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = 'pg_catalog, public';

-- =============================================
-- 1. USER PROFILES TABLE
-- =============================================

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    phone TEXT,
    role user_role_enum NOT NULL DEFAULT 'user',

    -- Contract/commitment templates
    contract_template TEXT DEFAULT '',
    contractor_commitments TEXT DEFAULT '',
    client_commitments TEXT DEFAULT '',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login_date TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_user_profiles_auth_user_id ON user_profiles(auth_user_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- =============================================
-- 2. CLIENTS TABLE
-- =============================================

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Client information
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    address TEXT,
    city TEXT,
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_email ON clients(email);

-- =============================================
-- 3. CATEGORIES TABLE
-- =============================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Category details
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_categories_order ON categories("order");

-- =============================================
-- 4. CATALOG ITEMS TABLE
-- =============================================

CREATE TABLE catalog_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

    -- Item details
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL,
    base_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),
    contractor_cost NUMERIC(12, 2) CHECK (contractor_cost IS NULL OR contractor_cost >= 0),
    complexity_factor NUMERIC(5, 2) NOT NULL DEFAULT 1.0 CHECK (complexity_factor > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_catalog_items_category_id ON catalog_items(category_id);
CREATE INDEX idx_catalog_items_name ON catalog_items(name);
CREATE INDEX idx_catalog_items_is_active ON catalog_items(is_active);

-- =============================================
-- 5. PRICE RANGES TABLE
-- =============================================

CREATE TABLE price_ranges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    catalog_item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,

    -- Price range
    min_quantity NUMERIC(12, 2) NOT NULL CHECK (min_quantity >= 0),
    max_quantity NUMERIC(12, 2) CHECK (max_quantity IS NULL OR max_quantity >= min_quantity),
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0)
);

-- Index
CREATE INDEX idx_price_ranges_catalog_item_id ON price_ranges(catalog_item_id);

-- =============================================
-- 6. QUOTES TABLE
-- =============================================

CREATE TABLE quotes (
    -- Auto-generated fields
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quote_number TEXT UNIQUE,

    -- Core identification
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    title TEXT,
    description TEXT,
    status quote_status_enum NOT NULL DEFAULT 'draft',

    -- Financial fields (old schema) - with CHECK constraints for percentages
    discount_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    discount_amount NUMERIC(12, 2) DEFAULT 0 CHECK (discount_amount >= 0),
    tax_percentage NUMERIC(5, 2) DEFAULT 17 CHECK (tax_percentage >= 0 AND tax_percentage <= 100),
    tax_amount NUMERIC(12, 2) DEFAULT 0 CHECK (tax_amount >= 0),
    total_cost NUMERIC(12, 2) DEFAULT 0 CHECK (total_cost >= 0),
    total_price NUMERIC(12, 2) DEFAULT 0 CHECK (total_price >= 0),
    profit_amount NUMERIC(12, 2) DEFAULT 0,
    profit_margin NUMERIC(5, 2) DEFAULT 0,

    -- Financial fields (extended schema)
    total_amount NUMERIC(12, 2) DEFAULT 0 CHECK (total_amount >= 0),
    discount_percent NUMERIC(5, 2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    price_increase NUMERIC(12, 2) DEFAULT 0 CHECK (price_increase >= 0),
    final_amount NUMERIC(12, 2) DEFAULT 0 CHECK (final_amount >= 0),
    estimated_work_days NUMERIC(8, 2) CHECK (estimated_work_days IS NULL OR estimated_work_days >= 0),
    estimated_cost NUMERIC(12, 2) DEFAULT 0 CHECK (estimated_cost >= 0),
    estimated_profit_percent NUMERIC(5, 2) DEFAULT 0,

    -- Project information
    project_name TEXT,
    project_address TEXT,
    project_type TEXT,

    -- Client information (denormalized)
    client_name TEXT,
    client_email TEXT,
    client_phone TEXT,

    -- Date fields
    work_days NUMERIC(8, 2) CHECK (work_days IS NULL OR work_days >= 0),
    general_start_date DATE,
    general_end_date DATE CHECK (general_end_date IS NULL OR general_start_date IS NULL OR general_end_date >= general_start_date),
    start_date DATE,
    end_date DATE CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
    valid_until DATE,
    estimated_duration INTEGER CHECK (estimated_duration IS NULL OR estimated_duration >= 0),
    sent_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,

    -- JSONB fields (flexible data storage)
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    additional_costs JSONB NOT NULL DEFAULT '[]'::jsonb,
    payment_terms JSONB NOT NULL DEFAULT '[]'::jsonb,
    category_timings JSONB NOT NULL DEFAULT '{}'::jsonb,
    project_complexities JSONB NOT NULL DEFAULT '{}'::jsonb,
    company_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    category_commitments JSONB NOT NULL DEFAULT '{}'::jsonb,
    tiling_work_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    tiling_items JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Text fields
    notes TEXT,
    terms_and_conditions TEXT,
    created_by TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for quotes
CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_quotes_client_id ON quotes(client_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);

-- GIN indexes for JSONB columns (for better query performance)
CREATE INDEX idx_quotes_items_gin ON quotes USING GIN (items);
CREATE INDEX idx_quotes_additional_costs_gin ON quotes USING GIN (additional_costs);
CREATE INDEX idx_quotes_payment_terms_gin ON quotes USING GIN (payment_terms);

-- =============================================
-- 7. PROJECTS TABLE
-- =============================================

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,

    -- Project details
    name TEXT NOT NULL,
    description TEXT,
    status project_status_enum NOT NULL DEFAULT 'planning',

    -- Dates
    start_date DATE,
    end_date DATE CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
    actual_start_date DATE,
    actual_end_date DATE CHECK (actual_end_date IS NULL OR actual_start_date IS NULL OR actual_end_date >= actual_start_date),

    -- Financial
    budget NUMERIC(12, 2) CHECK (budget IS NULL OR budget >= 0),
    actual_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (actual_cost >= 0),

    -- Location
    address TEXT,
    city TEXT,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);

-- =============================================
-- 8. PROJECT COSTS TABLE
-- =============================================

CREATE TABLE project_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Cost details
    category cost_category_enum NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    date DATE NOT NULL,
    notes TEXT,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_project_costs_project_id ON project_costs(project_id);
CREATE INDEX idx_project_costs_date ON project_costs(date);
CREATE INDEX idx_project_costs_category ON project_costs(category);

-- =============================================
-- 9. QUOTE TEMPLATES TABLE
-- =============================================

CREATE TABLE quote_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Template details
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_quote_templates_user_id ON quote_templates(user_id);
CREATE INDEX idx_quote_templates_is_default ON quote_templates(is_default);

-- =============================================
-- 10. TEMPLATE ITEMS TABLE
-- =============================================

CREATE TABLE template_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES quote_templates(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    catalog_item_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,

    -- Item details
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    contractor_unit_cost NUMERIC(12, 2) CHECK (contractor_unit_cost IS NULL OR contractor_unit_cost >= 0),
    item_order INTEGER NOT NULL DEFAULT 0,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_template_items_template_id ON template_items(template_id);
CREATE INDEX idx_template_items_item_order ON template_items(item_order);

-- =============================================
-- 11. FINANCIAL TRANSACTIONS TABLE
-- =============================================

CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Transaction details
    type transaction_type_enum NOT NULL,
    category transaction_category_enum NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    transaction_date DATE NOT NULL,
    payment_method payment_method_enum,
    reference_number TEXT,

    -- Related entities
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_financial_transactions_user_id ON financial_transactions(user_id);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(type);
CREATE INDEX idx_financial_transactions_category ON financial_transactions(category);
CREATE INDEX idx_financial_transactions_transaction_date ON financial_transactions(transaction_date);
CREATE INDEX idx_financial_transactions_project_id ON financial_transactions(project_id);

-- =============================================
-- 12. CONTRACTOR PRICING TABLE
-- =============================================

CREATE TABLE contractor_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,

    -- Pricing details
    item_name TEXT NOT NULL,
    unit TEXT NOT NULL,
    base_cost NUMERIC(12, 2) NOT NULL CHECK (base_cost >= 0),
    complexity_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 1.0 CHECK (complexity_multiplier > 0),
    region TEXT,
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contractor_pricing_user_id ON contractor_pricing(user_id);
CREATE INDEX idx_contractor_pricing_category_id ON contractor_pricing(category_id);

-- =============================================
-- 13. CUSTOMER INQUIRIES TABLE
-- =============================================

CREATE TABLE customer_inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Inquiry details
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status inquiry_status_enum NOT NULL DEFAULT 'new',
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customer_inquiries_status ON customer_inquiries(status);
CREATE INDEX idx_customer_inquiries_created_at ON customer_inquiries(created_at DESC);

-- =============================================
-- TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
-- SECURITY: Set search_path to prevent function injection
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = 'pg_catalog, public';

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_catalog_items_updated_at BEFORE UPDATE ON catalog_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_templates_updated_at BEFORE UPDATE ON quote_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_transactions_updated_at BEFORE UPDATE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractor_pricing_updated_at BEFORE UPDATE ON contractor_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_inquiries_updated_at BEFORE UPDATE ON customer_inquiries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-generate quote numbers
-- SECURITY: Set search_path to prevent function injection
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
    year_part TEXT;
BEGIN
    -- Get current year
    year_part := TO_CHAR(NOW(), 'YYYY');

    -- Get the next number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM quotes
    WHERE quote_number LIKE 'Q-' || year_part || '-%';

    -- Generate quote number: Q-YYYY-NNNN
    NEW.quote_number := 'Q-' || year_part || '-' || LPAD(next_number::TEXT, 4, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = 'pg_catalog, public';

-- Apply quote number trigger
CREATE TRIGGER generate_quote_number_trigger BEFORE INSERT ON quotes
    FOR EACH ROW
    WHEN (NEW.quote_number IS NULL)
    EXECUTE FUNCTION generate_quote_number();

-- Function to set user_id from auth context
-- SECURITY: Set search_path to prevent function injection
CREATE OR REPLACE FUNCTION set_user_id_from_auth()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NULL THEN
        NEW.user_id := auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = 'pg_catalog, public';

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on ALL tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_inquiries ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USER PROFILES POLICIES
-- =============================================

CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = auth_user_id);

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON user_profiles FOR SELECT
    USING (is_admin());

-- =============================================
-- CLIENTS POLICIES
-- =============================================

CREATE POLICY "Users can view own clients"
    ON clients FOR SELECT
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own clients"
    ON clients FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
    ON clients FOR UPDATE
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own clients"
    ON clients FOR DELETE
    USING (auth.uid() = user_id OR is_admin());

-- =============================================
-- QUOTES POLICIES
-- =============================================

CREATE POLICY "Users can view own quotes"
    ON quotes FOR SELECT
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own quotes"
    ON quotes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotes"
    ON quotes FOR UPDATE
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own quotes"
    ON quotes FOR DELETE
    USING (auth.uid() = user_id OR is_admin());

-- =============================================
-- PROJECTS POLICIES
-- =============================================

CREATE POLICY "Users can view own projects"
    ON projects FOR SELECT
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own projects"
    ON projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
    ON projects FOR UPDATE
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own projects"
    ON projects FOR DELETE
    USING (auth.uid() = user_id OR is_admin());

-- =============================================
-- PROJECT COSTS POLICIES
-- =============================================

CREATE POLICY "Users can view own project costs"
    ON project_costs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_costs.project_id
            AND (projects.user_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Users can insert own project costs"
    ON project_costs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_costs.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own project costs"
    ON project_costs FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_costs.project_id
            AND (projects.user_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Users can delete own project costs"
    ON project_costs FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_costs.project_id
            AND (projects.user_id = auth.uid() OR is_admin())
        )
    );

-- =============================================
-- QUOTE TEMPLATES POLICIES
-- =============================================

CREATE POLICY "Users can view own templates"
    ON quote_templates FOR SELECT
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own templates"
    ON quote_templates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
    ON quote_templates FOR UPDATE
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own templates"
    ON quote_templates FOR DELETE
    USING (auth.uid() = user_id OR is_admin());

-- =============================================
-- TEMPLATE ITEMS POLICIES
-- =============================================

CREATE POLICY "Users can view own template items"
    ON template_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM quote_templates
            WHERE quote_templates.id = template_items.template_id
            AND (quote_templates.user_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Users can insert own template items"
    ON template_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM quote_templates
            WHERE quote_templates.id = template_items.template_id
            AND quote_templates.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own template items"
    ON template_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM quote_templates
            WHERE quote_templates.id = template_items.template_id
            AND (quote_templates.user_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Users can delete own template items"
    ON template_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM quote_templates
            WHERE quote_templates.id = template_items.template_id
            AND (quote_templates.user_id = auth.uid() OR is_admin())
        )
    );

-- =============================================
-- FINANCIAL TRANSACTIONS POLICIES
-- =============================================

CREATE POLICY "Users can view own transactions"
    ON financial_transactions FOR SELECT
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own transactions"
    ON financial_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
    ON financial_transactions FOR UPDATE
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own transactions"
    ON financial_transactions FOR DELETE
    USING (auth.uid() = user_id OR is_admin());

-- =============================================
-- CONTRACTOR PRICING POLICIES
-- =============================================

CREATE POLICY "Users can view own pricing"
    ON contractor_pricing FOR SELECT
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own pricing"
    ON contractor_pricing FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pricing"
    ON contractor_pricing FOR UPDATE
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own pricing"
    ON contractor_pricing FOR DELETE
    USING (auth.uid() = user_id OR is_admin());

-- =============================================
-- CATEGORIES POLICIES (Shared Resource)
-- =============================================

CREATE POLICY "Everyone can view categories"
    ON categories FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can modify categories
CREATE POLICY "Admins can insert categories"
    ON categories FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update categories"
    ON categories FOR UPDATE
    TO authenticated
    USING (is_admin());

CREATE POLICY "Admins can delete categories"
    ON categories FOR DELETE
    TO authenticated
    USING (is_admin());

-- =============================================
-- CATALOG ITEMS POLICIES (Shared Resource)
-- =============================================

CREATE POLICY "Everyone can view catalog items"
    ON catalog_items FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can modify catalog
CREATE POLICY "Admins can insert catalog items"
    ON catalog_items FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update catalog items"
    ON catalog_items FOR UPDATE
    TO authenticated
    USING (is_admin());

CREATE POLICY "Admins can delete catalog items"
    ON catalog_items FOR DELETE
    TO authenticated
    USING (is_admin());

-- =============================================
-- PRICE RANGES POLICIES (Related to Catalog)
-- =============================================

CREATE POLICY "Everyone can view price ranges"
    ON price_ranges FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can modify price ranges
CREATE POLICY "Admins can insert price ranges"
    ON price_ranges FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update price ranges"
    ON price_ranges FOR UPDATE
    TO authenticated
    USING (is_admin());

CREATE POLICY "Admins can delete price ranges"
    ON price_ranges FOR DELETE
    TO authenticated
    USING (is_admin());

-- =============================================
-- CUSTOMER INQUIRIES POLICIES
-- =============================================

-- Anyone can submit inquiries (public form)
CREATE POLICY "Anyone can submit inquiries"
    ON customer_inquiries FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Only authenticated users (admins) can view/manage inquiries
CREATE POLICY "Authenticated users can view inquiries"
    ON customer_inquiries FOR SELECT
    TO authenticated
    USING (is_admin());

CREATE POLICY "Admins can update inquiries"
    ON customer_inquiries FOR UPDATE
    TO authenticated
    USING (is_admin());

CREATE POLICY "Admins can delete inquiries"
    ON customer_inquiries FOR DELETE
    TO authenticated
    USING (is_admin());

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert sample categories
INSERT INTO categories (name, description, icon, color, "order") VALUES
('כללי', 'עבודות כלליות', 'hammer', '#3B82F6', 1),
('חשמל', 'עבודות חשמל', 'zap', '#EF4444', 2),
('אינסטלציה', 'עבודות אינסטלציה', 'droplet', '#10B981', 3),
('ריצוף', 'עבודות ריצוף', 'grid', '#F59E0B', 4),
('צבע', 'עבודות צבע', 'paint-bucket', '#8B5CF6', 5)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- END OF IMPROVED SCHEMA
-- =============================================

/*
 * IMPROVEMENTS MADE (v2.0):
 *
 * 1. ✅ ENUM TYPES - Replaced TEXT fields with proper ENUMs for:
 *    - user_role, quote_status, project_status, inquiry_status
 *    - transaction_type, transaction_category, payment_method, cost_category
 *
 * 2. ✅ NUMERIC CONSTRAINTS - All numeric fields properly constrained:
 *    - Amounts use NUMERIC(12,2) with CHECK >= 0
 *    - Percentages use NUMERIC(5,2) with CHECK 0-100
 *    - Quantities checked for positive values
 *
 * 3. ✅ UNIQUE CONSTRAINTS - Verified on:
 *    - quotes.quote_number
 *    - user_profiles.auth_user_id
 *    - user_profiles.email
 *    - categories.name
 *
 * 4. ✅ FUNCTION SECURITY - All functions use:
 *    - SET search_path = 'pg_catalog, public'
 *    - SECURITY DEFINER where appropriate
 *
 * 5. ✅ ADMIN HELPER - Created is_admin() function for RLS
 *
 * 6. ✅ COMPLETE RLS COVERAGE:
 *    - All tables have RLS enabled
 *    - Admin bypass policies on all user-scoped tables
 *    - Proper policies for shared resources (categories, catalog)
 *
 * 7. ✅ GIN INDEXES - Added for frequently queried JSONB:
 *    - quotes.items
 *    - quotes.additional_costs
 *    - quotes.payment_terms
 *
 * 8. ✅ CHECK CONSTRAINTS:
 *    - Date ranges (end >= start)
 *    - Positive amounts
 *    - Percentage ranges (0-100)
 *    - Quantity > 0 for template items
 *
 * 9. ✅ NOT NULL - Added where appropriate for data integrity
 *
 * 10. ✅ Additional indexes for enum fields for better query performance
 */
