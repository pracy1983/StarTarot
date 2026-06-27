-- Migration 1037: repair UTF-8 text that was stored as Windows-1252/Latin-1 mojibake.
-- Examples: "BÃºzios" -> "Búzios", "orÃ¡culo" -> "oráculo", "âœ¨" -> "✨".

CREATE OR REPLACE FUNCTION public._fix_mojibake_text(p_text TEXT)
RETURNS TEXT AS $$
DECLARE
    v_fixed TEXT;
BEGIN
    IF p_text IS NULL OR p_text !~ '(Ã|Â|â|ð)' THEN
        RETURN p_text;
    END IF;

    BEGIN
        v_fixed := convert_from(convert_to(p_text, 'WIN1252'), 'UTF8');
        RETURN v_fixed;
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            v_fixed := convert_from(convert_to(p_text, 'LATIN1'), 'UTF8');
            RETURN v_fixed;
        EXCEPTION WHEN OTHERS THEN
            RETURN p_text;
        END;
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public._fix_mojibake_column(p_table REGCLASS, p_column TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format(
        'UPDATE %s SET %I = public._fix_mojibake_text(%I) WHERE %I ~ %L',
        p_table,
        p_column,
        p_column,
        p_column,
        '(Ã|Â|â|ð)'
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public._fix_mojibake_text_array_column(p_table REGCLASS, p_column TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format(
        'UPDATE %1$s
         SET %2$I = (
             SELECT array_agg(public._fix_mojibake_text(value) ORDER BY ord)
             FROM unnest(%2$I) WITH ORDINALITY AS items(value, ord)
         )
         WHERE EXISTS (
             SELECT 1 FROM unnest(%2$I) AS value WHERE value ~ %3$L
         )',
        p_table,
        p_column,
        '(Ã|Â|â|ð)'
    );
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    v_column TEXT;
BEGIN
    FOREACH v_column IN ARRAY ARRAY[
        'full_name',
        'name_fantasy',
        'specialty',
        'custom_specialty',
        'custom_category',
        'custom_topic',
        'bio',
        'personality',
        'system_prompt'
    ]
    LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'profiles'
              AND column_name = v_column
        ) THEN
            PERFORM public._fix_mojibake_column('public.profiles', v_column);
        END IF;
    END LOOP;

    FOREACH v_column IN ARRAY ARRAY['categories', 'topics', 'specialties']
    LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'profiles'
              AND column_name = v_column
        ) THEN
            PERFORM public._fix_mojibake_text_array_column('public.profiles', v_column);
        END IF;
    END LOOP;

    IF to_regclass('public.oracle_categories') IS NOT NULL THEN
        PERFORM public._fix_mojibake_column('public.oracle_categories', 'name');
    END IF;

    IF to_regclass('public.oracle_specialties') IS NOT NULL THEN
        PERFORM public._fix_mojibake_column('public.oracle_specialties', 'name');
    END IF;
END $$;
