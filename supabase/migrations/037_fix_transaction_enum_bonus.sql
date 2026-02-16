-- Fix transaction_type enum by adding missing values
-- We use a DO block to safely add values if they don't exist, compatible with transaction blocks in some contexts
-- However, inside a transaction block, ALTER TYPE ... ADD VALUE cannot be executed.
-- But since we are running this as a migration script, it should be fine if it's top level.
-- If it fails, we might need to use a separate connection or tool.

-- Attempt to add 'bonus'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'bonus') THEN
        ALTER TYPE public.transaction_type ADD VALUE 'bonus';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add enum value bonus: %', SQLERRM;
END$$;

-- Attempt to add 'gift'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'gift') THEN
        ALTER TYPE public.transaction_type ADD VALUE 'gift';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
         RAISE NOTICE 'Could not add enum value gift: %', SQLERRM;
END$$;

-- Attempt to add 'refund'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'refund') THEN
        ALTER TYPE public.transaction_type ADD VALUE 'refund';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
         RAISE NOTICE 'Could not add enum value refund: %', SQLERRM;
END$$;
