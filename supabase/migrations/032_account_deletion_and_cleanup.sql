-- Migration 032: Account Deletion Support
-- ================================================

-- Function to allow users to delete their own account
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void AS $$
BEGIN
    -- Delete from auth.users (this will cascade to profiles, wallets, etc. if ON DELETE CASCADE is set)
    -- But since we are in public schema, we need to be careful with permissions.
    -- A better way is to mark as deleted or delete from profiles and have a background service.
    -- However, for this project, we want an immediate action if possible.
    
    -- Option: Hard delete from auth.users via service_role-like function
    DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

-- Ensure ON DELETE CASCADE is set on essential tables (profiles already references auth.users ON DELETE CASCADE in 001)
-- Check other tables if they need it.
ALTER TABLE IF EXISTS public.inbox_messages DROP CONSTRAINT IF EXISTS inbox_messages_recipient_id_fkey,
ADD CONSTRAINT inbox_messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey,
ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
