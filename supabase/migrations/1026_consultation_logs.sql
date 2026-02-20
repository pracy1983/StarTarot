-- Migration: Adicionar tabela de logs de processamento de consultas IA
CREATE TABLE IF NOT EXISTS consultation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    event TEXT NOT NULL,           -- 'started', 'astrology_ok', 'astrology_error', 'generating_q1', 'answer_q1_ok', 'error', 'sent_to_client', 'completed'
    details TEXT,                   -- mensagem descritiva
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultation_logs_consultation_id ON consultation_logs(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_created_at ON consultation_logs(created_at DESC);

-- RLS: owner pode ver tudo, outros não veem
ALTER TABLE consultation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_can_see_all_logs" ON consultation_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'
        )
    );
