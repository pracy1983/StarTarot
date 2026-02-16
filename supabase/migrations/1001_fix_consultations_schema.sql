-- Migration 1001: Fix consultations schema and enums
-- =================================================

-- 1. Ensure type column exists (Migration 029 might have run but let's be sure)
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'message';

-- 2. Add started_at and ended_at to consultations
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

-- 3. Add duration_seconds to consultations (Migration 038 has this but let's be sure)
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;

-- 4. Ensure transaction_type enum includes all needed values
-- Using a safe approach for enum updates
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'gift_send') THEN
        ALTER TYPE public.transaction_type ADD VALUE 'gift_send';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'gift_receive') THEN
        ALTER TYPE public.transaction_type ADD VALUE 'gift_receive';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'bonus') THEN
        ALTER TYPE public.transaction_type ADD VALUE 'bonus';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'earnings') THEN
        ALTER TYPE public.transaction_type ADD VALUE 'earnings';
    END IF;
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Skipping enum update: %', SQLERRM;
END $$;

-- 5. Fix finalize_video_consultation to use actual columns
CREATE OR REPLACE FUNCTION public.finalize_video_consultation(
    p_consultation_id UUID,
    p_duration_seconds INTEGER,
    p_end_reason TEXT DEFAULT 'normal'
) RETURNS VOID AS $$
BEGIN
    UPDATE public.consultations
    SET 
        status = 'completed',
        ended_at = now(),
        duration_seconds = p_duration_seconds,
        video_end_reason = p_end_reason
    WHERE id = p_consultation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
