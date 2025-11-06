<!-- 7b57ac06-4daf-44c3-91ac-40c1a70ea6f5 68c2cfa9-34f9-48de-a124-ac5d0d7174b7 -->
# Create User Profile Table in Supabase

## 1. Table Creation SQL

```sql
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    desired_daily_profit NUMERIC,
    contract_template TEXT NOT NULL,
    contractor_commitments TEXT NOT NULL,
    client_commitments TEXT NOT NULL,
    default_payment_terms JSONB NOT NULL,
    company_info JSONB NOT NULL,
    last_login_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    tiling_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    paint_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    paint_work_category_preference TEXT,
    room_estimates JSONB NOT NULL DEFAULT '[]'::jsonb,
    tiling_user_defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
    demolition_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    demolition_defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
    plumbing_subcontractor_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    plumbing_defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
    electrical_subcontractor_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    electrical_defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
    paint_user_defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
    construction_subcontractor_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    construction_defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
    category_commitments JSONB NOT NULL DEFAULT '{}'::jsonb,
    pricebook_general_notes TEXT,
    category_active_map JSONB NOT NULL DEFAULT '{}'::jsonb,
    additional_cost_defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_profiles_auth_user_id ON user_profiles(auth_user_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

## 2. RLS Policies

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Admin users can view all profiles"
    ON user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE auth_user_id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Admin users can update all profiles"
    ON user_profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE auth_user_id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Admin users can insert profiles"
    ON user_profiles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE auth_user_id = auth.uid()
            AND role = 'admin'
        )
    );
```

## 3. Implementation Steps

1. Execute the table creation SQL in Supabase SQL editor
2. Execute the RLS policies
3. Test the table creation and policies
4. Update the backend API to use the new table structure
5. Migrate existing user data if needed

## 4. Security Considerations

- All access must go through RLS policies
- Only authenticated users can access their own profiles
- Admin users have full access to all profiles
- Email must be unique per user
- All sensitive operations are logged via updated_at timestamp

### To-dos

- [ ] Create user_profiles table with all specified fields
- [ ] Create necessary indexes for performance optimization
- [ ] Create updated_at trigger for change tracking
- [ ] Enable and configure Row Level Security policies
- [ ] Test RLS policies with different user roles