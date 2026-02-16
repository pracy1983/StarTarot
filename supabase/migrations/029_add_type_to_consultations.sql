-- Migration 029: Add type to consultations
-- ======================================

ALTER TABLE public.consultations
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'message';

-- Update existing consultations to 'message' (though default handles it)
UPDATE public.consultations SET type = 'message' WHERE type IS NULL;

-- Index for searching (optional)
CREATE INDEX IF NOT EXISTS idx_consultations_type ON public.consultations(type);

COMMENT ON COLUMN public.consultations.type IS 'Type of consultation: message or video';
