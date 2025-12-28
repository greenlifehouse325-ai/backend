-- =====================================================
-- Marhas Backend - Multi-Role Authentication Schema
-- =====================================================
-- Run this SQL in Supabase SQL Editor
-- This creates the complete auth system tables
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS
-- =====================================================

-- User roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'teacher', 'parent', 'admin', 'super_admin', 'oauth_user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User status
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Parent relationship
DO $$ BEGIN
    CREATE TYPE parent_relationship AS ENUM ('ayah', 'ibu', 'wali');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Registration type
DO $$ BEGIN
    CREATE TYPE registration_type AS ENUM ('student', 'teacher');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Registration status
DO $$ BEGIN
    CREATE TYPE registration_status AS ENUM ('pending', 'approved', 'rejected', 'needs_info');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Link status (for parent-student linking)
DO $$ BEGIN
    CREATE TYPE link_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Notification type
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('broadcast', 'targeted', 'system', 'parent_link');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Main users table (authentication)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role user_role NOT NULL DEFAULT 'oauth_user',
    status user_status NOT NULL DEFAULT 'pending',
    email_verified BOOLEAN DEFAULT FALSE,
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    must_change_password BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students profile table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    nisn VARCHAR(10) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    kelas VARCHAR(50) NOT NULL,
    jurusan VARCHAR(255) NOT NULL,
    wali_kelas VARCHAR(255),
    tahun_ajaran VARCHAR(20) NOT NULL,
    date_of_birth DATE,
    phone VARCHAR(20),
    address TEXT,
    avatar_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure NISN is 10 digits
    CONSTRAINT nisn_format CHECK (nisn ~ '^[0-9]{10}$')
);

-- Teachers profile table
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    nip VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    avatar_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parents profile table (1:1 with student)
CREATE TABLE IF NOT EXISTS public.parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    student_id UUID UNIQUE REFERENCES public.students(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    relationship parent_relationship NOT NULL,
    link_status link_status DEFAULT 'pending',
    link_requested_at TIMESTAMP WITH TIME ZONE,
    link_approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admins profile table
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    is_super_admin BOOLEAN DEFAULT FALSE,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- REGISTRATION & WORKFLOW TABLES
-- =====================================================

-- Registration requests (for students and teachers)
CREATE TABLE IF NOT EXISTS public.registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type registration_type NOT NULL,
    form_data JSONB NOT NULL,
    status registration_status DEFAULT 'pending',
    rejection_reason TEXT,
    generated_password VARCHAR(255),
    reviewed_by UUID REFERENCES public.users(id),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL DEFAULT 'system',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SECURITY TABLES
-- =====================================================

-- Device sessions (Perangkat Terhubung)
CREATE TABLE IF NOT EXISTS public.device_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    device_name VARCHAR(255),
    device_type VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    refresh_token_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Activity logs (Riwayat Aktivitas)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_oauth ON public.users(oauth_provider, oauth_id);

-- Students indexes
CREATE INDEX IF NOT EXISTS idx_students_nisn ON public.students(nisn);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_verified ON public.students(is_verified);
CREATE INDEX IF NOT EXISTS idx_students_kelas ON public.students(kelas);

-- Teachers indexes
CREATE INDEX IF NOT EXISTS idx_teachers_nip ON public.teachers(nip);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON public.teachers(user_id);

-- Parents indexes
CREATE INDEX IF NOT EXISTS idx_parents_user_id ON public.parents(user_id);
CREATE INDEX IF NOT EXISTS idx_parents_student_id ON public.parents(student_id);
CREATE INDEX IF NOT EXISTS idx_parents_link_status ON public.parents(link_status);

-- Registration requests indexes
CREATE INDEX IF NOT EXISTS idx_reg_requests_status ON public.registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_reg_requests_type ON public.registration_requests(type);
CREATE INDEX IF NOT EXISTS idx_reg_requests_user ON public.registration_requests(user_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Device sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.device_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.device_sessions(user_id, is_active);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_created ON public.activity_logs(created_at);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Service role has full access to all tables
CREATE POLICY "Service role full access" ON public.users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.students FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.teachers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.parents FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.admins FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.registration_requests FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.notifications FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.device_sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.activity_logs FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at function (if not exists from previous schema)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_students_updated_at ON public.students;
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teachers_updated_at ON public.teachers;
CREATE TRIGGER update_teachers_updated_at
    BEFORE UPDATE ON public.teachers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_parents_updated_at ON public.parents;
CREATE TRIGGER update_parents_updated_at
    BEFORE UPDATE ON public.parents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admins_updated_at ON public.admins;
CREATE TRIGGER update_admins_updated_at
    BEFORE UPDATE ON public.admins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_registration_requests_updated_at ON public.registration_requests;
CREATE TRIGGER update_registration_requests_updated_at
    BEFORE UPDATE ON public.registration_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to generate random password
CREATE OR REPLACE FUNCTION generate_random_password(length INTEGER DEFAULT 12)
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to validate NISN format
CREATE OR REPLACE FUNCTION validate_nisn(nisn TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN nisn ~ '^[0-9]{10}$';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL SUPER ADMIN SEEDING (Optional - run manually)
-- =====================================================
-- This is commented out. Run manually to create your first super admin.
-- Replace 'your-email@example.com' and password hash with your values.

/*
-- To generate password hash, use bcrypt in Node.js:
-- const bcrypt = require('bcrypt');
-- bcrypt.hashSync('YourSecurePassword123!', 10);

DO $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Insert user
    INSERT INTO public.users (email, password_hash, role, status, email_verified)
    VALUES (
        'admin@smkmarhas.sch.id',
        '$2b$10$YOUR_BCRYPT_HASH_HERE',
        'super_admin',
        'active',
        true
    )
    RETURNING id INTO new_user_id;
    
    -- Insert admin profile
    INSERT INTO public.admins (user_id, full_name, is_super_admin, permissions)
    VALUES (
        new_user_id,
        'Super Admin',
        true,
        '{"all": true}'::jsonb
    );
    
    RAISE NOTICE 'Super admin created with ID: %', new_user_id;
END $$;
*/

-- =====================================================
-- GRANTS
-- =====================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;
