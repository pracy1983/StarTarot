-- Migration: Add usage to transaction_type enum
-- ===========================================

-- 1. Add 'usage' to transaction_type enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'usage') THEN
        ALTER TYPE public.transaction_type ADD VALUE 'usage';
    END IF;

    -- Also adding balance_adjustment just in case for future manual fixes
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'balance_adjustment') THEN
        ALTER TYPE public.transaction_type ADD VALUE 'balance_adjustment';
    END IF;
END $$;
