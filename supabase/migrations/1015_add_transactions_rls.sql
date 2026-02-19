-- Create RLS policies for transactions table if they don't exist
-- We can't easily check for existence in pure SQL without PL/pgSQL, so we'll drop and recreate to be safe,
-- or use DO block.

DO $$
BEGIN
    -- Enable RLS just in case
    ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies to avoid conflicts
    DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
    DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
    DROP POLICY IF EXISTS "Service role can manage all transactions" ON public.transactions;
    
    -- 1. Users can view their own transactions
    CREATE POLICY "Users can view their own transactions"
    ON public.transactions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

    -- 2. Service role (admin) can do anything (handled by bypass RLS, but explicit policy is good for internal users)
    -- Actually service role bypasses RLS, so this is mostly for 'postgres' or similar roles if needed.
    
    -- 3. Allow insert?
    -- Usually transactions are created by server-side logic (Asaas integration), which uses service role.
    -- But if we want to allow some manual insertion? Probably not.
    -- However, if 'credit_purchase' is created by API Route using supabaseAdmin, it bypasses RLS.
    
    -- 4. Allow insert for authenticated users?
    -- NO. Transactions should be immutable from client side.
    
END
$$;
