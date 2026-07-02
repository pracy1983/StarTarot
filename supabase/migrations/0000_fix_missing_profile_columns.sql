-- ============================================================
-- StarTarot: Schema Fix - Add all missing columns to profiles
-- Run this on the internal PostgreSQL via Supabase SQL Editor
-- or Easypanel DB console
-- ============================================================

-- 1. Core profile columns (from original schema)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_ai BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS oracle_type TEXT DEFAULT 'human';

-- 2. Pricing columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS price_brl_per_minute DECIMAL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits_per_minute INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS initial_fee_brl DECIMAL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS initial_fee_credits INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS price_per_message INTEGER DEFAULT 0;

-- 3. Service capability flags (from migration 1009)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allows_video BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allows_text BOOLEAN DEFAULT true;

-- 4. Birth info columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_time TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_place TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requires_birthdate BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requires_birthtime BOOLEAN DEFAULT false;

-- 5. Billing columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_complement TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;

-- 6. Notification & moderation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_notification_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 7. AI-specific columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_prompt TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_thinking_delay_min INTEGER DEFAULT 10;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_thinking_delay_max INTEGER DEFAULT 30;

-- 8. Custom category/topic
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_category TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_topic TEXT;

-- 9. Metadata & unseen changes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unseen_changes BOOLEAN DEFAULT false;

-- 10. Force password change (from migration 1023)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false;

-- 11. Video/message enabled (legacy compatibility)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS video_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS message_enabled BOOLEAN DEFAULT true;

-- 12. Rating
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating DECIMAL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_consultations INTEGER DEFAULT 0;

-- ============================================================
-- Run the rest of full_schema.sql migrations
-- ============================================================

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
