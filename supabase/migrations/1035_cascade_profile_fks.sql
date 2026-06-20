-- Migration 1035: ON DELETE CASCADE em todas as FKs que apontam para profiles
-- ============================================================
-- Ao deletar um cadastro (perfil), o banco bloqueia se houver linhas filhas
-- referenciando aquele profile sem ON DELETE CASCADE (ex.: transactions,
-- wallets, consultations...). Erro observado:
--   "update or delete on table profiles violates foreign key constraint
--    transactions_user_id_fkey on table transactions"
--
-- O schema versionado tem cascade, mas o banco real divergiu (drift): várias
-- FKs foram criadas sem ação de delete. Em vez de listar tabela por tabela,
-- este bloco encontra TODAS as FKs que referenciam public.profiles(id) e que
-- hoje NÃO têm ação de delete (NO ACTION / RESTRICT) e as recria com CASCADE.
--
-- FKs já configuradas como SET NULL (ex.: admin_id em profile_snapshots) ou já
-- CASCADE são preservadas — não queremos apagar registros pelo lado errado.

DO $$
DECLARE
    r RECORD;
    v_col TEXT;
    v_refcol TEXT;
BEGIN
    FOR r IN
        SELECT
            con.oid          AS con_oid,
            con.conname      AS conname,
            rel.relname      AS table_name,
            nsp.nspname      AS schema_name
        FROM pg_constraint con
        JOIN pg_class rel        ON rel.oid = con.conrelid
        JOIN pg_namespace nsp    ON nsp.oid = rel.relnamespace
        JOIN pg_class refrel     ON refrel.oid = con.confrelid
        JOIN pg_namespace refnsp ON refnsp.oid = refrel.relnamespace
        WHERE con.contype = 'f'
          AND refrel.relname = 'profiles'
          AND refnsp.nspname = 'public'
          AND con.confdeltype IN ('a', 'r')   -- a = NO ACTION, r = RESTRICT
    LOOP
        -- Coluna local e coluna referenciada (assumindo FK de coluna única,
        -- que é o caso de todas as FKs para profiles(id) neste schema).
        SELECT a.attname INTO v_col
        FROM pg_attribute a
        WHERE a.attrelid = (r.schema_name || '.' || r.table_name)::regclass
          AND a.attnum = (
              SELECT conkey[1] FROM pg_constraint WHERE oid = r.con_oid
          );

        SELECT a.attname INTO v_refcol
        FROM pg_attribute a
        WHERE a.attrelid = 'public.profiles'::regclass
          AND a.attnum = (
              SELECT confkey[1] FROM pg_constraint WHERE oid = r.con_oid
          );

        EXECUTE format(
            'ALTER TABLE %I.%I DROP CONSTRAINT %I',
            r.schema_name, r.table_name, r.conname
        );

        EXECUTE format(
            'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.profiles(%I) ON DELETE CASCADE',
            r.schema_name, r.table_name, r.conname, v_col, v_refcol
        );

        RAISE NOTICE 'FK % em %.% recriada com ON DELETE CASCADE (coluna %)',
            r.conname, r.schema_name, r.table_name, v_col;
    END LOOP;
END $$;
