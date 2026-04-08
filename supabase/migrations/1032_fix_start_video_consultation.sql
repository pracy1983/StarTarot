-- Fix start_video_consultation returning null values instead of actual row
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

    IF v_updated_row.id IS NULL THEN
        -- It was already started, so just return it as is.
        SELECT * INTO v_updated_row FROM consultations WHERE id = p_consultation_id;
    END IF;

    IF v_updated_row.id IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN row_to_json(v_updated_row);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
