-- Função para conceder créditos de recompensa
CREATE OR REPLACE FUNCTION public.grant_reward_credits(
    user_id UUID,
    amount INTEGER,
    description TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Atualizar ou inserir saldo na carteira
    INSERT INTO public.wallets (user_id, balance, updated_at)
    VALUES (user_id, amount, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET balance = wallets.balance + EXCLUDED.balance,
        updated_at = NOW();

    -- Registrar transação
    INSERT INTO public.transactions (user_id, amount, type, status, metadata)
    VALUES (
        user_id,
        amount,
        'bonus', -- ou 'reward' se preferir criar um tipo específico
        'confirmed',
        jsonb_build_object('description', description)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
