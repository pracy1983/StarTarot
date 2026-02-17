-- Migration 1002: Add whatsapp notification preference to profiles
-- ===============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_notification_enabled BOOLEAN DEFAULT FALSE;

-- Optional: Comments
COMMENT ON COLUMN public.profiles.whatsapp_notification_enabled IS 'If true, the user wants to receive WhatsApp notifications for new messages/consultations.';
