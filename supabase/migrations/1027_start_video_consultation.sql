-- Função para iniciar a consulta de vídeo de forma atômica, evitando erros 406
CREATE OR REPLACE FUNCTION start_video_consultation(p_consultation_id UUID)
RETURNS JSON AS $$
DECLARE
    v_updated_row consultations%ROWTYPE;
BEGIN
    UPDATE consultations
    SET 
        status = 'active',
        started_at = COALESCE(started_at, NOW())
    WHERE id = p_consultation_id
      AND started_at IS NULL
    RETURNING * INTO v_updated_row;

    RETURN row_to_json(v_updated_row);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
