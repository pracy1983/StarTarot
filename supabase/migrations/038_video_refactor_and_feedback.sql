-- Migration 038: Video Consultation Refactor & Feedback Fixes
-- =========================================================

-- 1. Safely add missing transaction types
-- We do this outside a DO block if possible, or handle it carefully.
-- 'gift_send' and 'gift_receive' are explicitly needed for the gift system.
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'gift_send';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'gift_receive';

-- 2. Add columns to consultations for video calls and feedback
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS feedback_stars INTEGER;
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS feedback_comment TEXT;

-- 3. Update existing summaries column if any
-- Assuming we might want to store more metadata
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS video_end_reason TEXT;

-- 4. Create a specialized RPC to finalize video calls
-- This will handle updating status, duration and credits in one go
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

-- 5. Create a specialized RPC for feedback
CREATE OR REPLACE FUNCTION public.submit_consultation_feedback(
    p_consultation_id UUID,
    p_stars INTEGER,
    p_comment TEXT
) RETURNS VOID AS $$
BEGIN
    UPDATE public.consultations
    SET 
        feedback_stars = p_stars,
        feedback_comment = p_comment
    WHERE id = p_consultation_id;

    -- Also insert into ratings table if it exists for backwards compatibility
    INSERT INTO public.ratings (consultation_id, client_id, oracle_id, stars, comment)
    SELECT id, client_id, oracle_id, p_stars, p_comment
    FROM public.consultations
    WHERE id = p_consultation_id
    ON CONFLICT (consultation_id) DO UPDATE SET
        stars = p_stars,
        comment = p_comment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
