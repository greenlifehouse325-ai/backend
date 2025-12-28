-- =====================================================
-- Marhas Backend - Attendance Schema for Supabase
-- =====================================================
-- Run this SQL in Supabase SQL Editor to create attendance tables
-- =====================================================

-- =====================================================
-- Attendance Sessions Table
-- Stores attendance sessions created by users
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    qr_token VARCHAR(255) NOT NULL UNIQUE,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_sessions
CREATE POLICY "Creators can view own sessions"
    ON public.attendance_sessions FOR SELECT
    USING (auth.uid() = creator_id);

CREATE POLICY "Creators can update own sessions"
    ON public.attendance_sessions FOR UPDATE
    USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can insert sessions"
    ON public.attendance_sessions FOR INSERT
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own sessions"
    ON public.attendance_sessions FOR DELETE
    USING (auth.uid() = creator_id);

-- Service role can do everything (for backend)
CREATE POLICY "Service role full access sessions"
    ON public.attendance_sessions FOR ALL
    USING (auth.role() = 'service_role');

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_creator 
    ON public.attendance_sessions(creator_id);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_qr_token 
    ON public.attendance_sessions(qr_token);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_valid_until 
    ON public.attendance_sessions(valid_until) 
    WHERE is_active = TRUE;

-- =====================================================
-- Attendance Records Table
-- Stores individual check-ins for attendance sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'late', 'excused', 'absent')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate check-ins
    UNIQUE(session_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_records
-- Users can view their own attendance records
CREATE POLICY "Users can view own attendance"
    ON public.attendance_records FOR SELECT
    USING (auth.uid() = user_id);

-- Session creators can view all attendance records for their sessions
CREATE POLICY "Creators can view session attendance"
    ON public.attendance_records FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.attendance_sessions s 
            WHERE s.id = attendance_records.session_id 
            AND s.creator_id = auth.uid()
        )
    );

-- Users can insert their own attendance (check-in)
CREATE POLICY "Users can check in"
    ON public.attendance_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for backend)
CREATE POLICY "Service role full access records"
    ON public.attendance_records FOR ALL
    USING (auth.role() = 'service_role');

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_attendance_records_session 
    ON public.attendance_records(session_id);

CREATE INDEX IF NOT EXISTS idx_attendance_records_user 
    ON public.attendance_records(user_id);

CREATE INDEX IF NOT EXISTS idx_attendance_records_check_in 
    ON public.attendance_records(check_in_time);

-- =====================================================
-- Trigger: Auto-update updated_at for sessions
-- =====================================================
DROP TRIGGER IF EXISTS update_attendance_sessions_updated_at ON public.attendance_sessions;
CREATE TRIGGER update_attendance_sessions_updated_at
    BEFORE UPDATE ON public.attendance_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Function: Cleanup expired sessions (optional)
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    -- Mark sessions as inactive if they've expired
    UPDATE public.attendance_sessions
    SET is_active = FALSE, updated_at = NOW()
    WHERE is_active = TRUE 
    AND valid_until < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT ALL ON public.attendance_sessions TO anon, authenticated, service_role;
GRANT ALL ON public.attendance_records TO anon, authenticated, service_role;
