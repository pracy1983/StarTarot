-- Migration 1028: Relax oracle application status reset on updates
-- =============================================================

CREATE OR REPLACE FUNCTION public.enforce_oracle_application_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only apply logic to oracles
    IF NEW.role = 'oracle' THEN
        
        -- A: If changing role FROM client TO oracle, FORCE 'pending'
        IF (TG_OP = 'UPDATE' AND OLD.role != 'oracle') OR (TG_OP = 'INSERT') THEN
            NEW.application_status := 'pending';
        END IF;

        -- B: If the oracle was REJECTED and is now updating critical fields, set to 'pending' to notify admin
        -- (This ensures the admin knows the oracle "fixed" their profile)
        IF (TG_OP = 'UPDATE' AND OLD.application_status = 'rejected' AND NEW.application_status = 'rejected') THEN
            IF (OLD.full_name IS DISTINCT FROM NEW.full_name) OR 
               (OLD.name_fantasy IS DISTINCT FROM NEW.name_fantasy) OR
               (OLD.bio IS DISTINCT FROM NEW.bio) OR
               (OLD.categories IS DISTINCT FROM NEW.categories) OR
               (OLD.topics IS DISTINCT FROM NEW.topics) OR
               (OLD.price_per_message IS DISTINCT FROM NEW.price_per_message)
            THEN
                NEW.application_status := 'pending';
                NEW.updated_at := now();
            END IF;
        END IF;

        -- C: If the oracle is APPROVED, keep them approved even if they change fields
        -- But we set has_unseen_changes = true so the admin knows something changed (visual cue in table)
        IF (TG_OP = 'UPDATE' AND OLD.application_status = 'approved' AND NEW.application_status = 'approved') THEN
            IF (OLD.full_name IS DISTINCT FROM NEW.full_name) OR 
               (OLD.name_fantasy IS DISTINCT FROM NEW.name_fantasy) OR
               (OLD.bio IS DISTINCT FROM NEW.bio) OR
               (OLD.categories IS DISTINCT FROM NEW.categories) OR
               (OLD.topics IS DISTINCT FROM NEW.topics) OR
               (OLD.price_per_message IS DISTINCT FROM NEW.price_per_message)
            THEN
                NEW.has_unseen_changes := true;
                NEW.updated_at := now();
            END IF;
        END IF;

        -- D: Strict fallback for any null/invalid status for oracles
        IF NEW.application_status IS NULL OR NEW.application_status NOT IN ('approved', 'rejected', 'waitlist', 'pending') THEN
            NEW.application_status := 'pending';
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
