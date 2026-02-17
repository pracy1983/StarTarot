-- Migration 1003: Add user favorites and notifications
-- =================================================

CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    oracle_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notify_online BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, oracle_id)
);

-- RLS
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own favorites"
    ON public.user_favorites
    FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can see who favored them (oracle perspective)"
    ON public.user_favorites
    FOR SELECT
    USING (auth.uid() = oracle_id);
