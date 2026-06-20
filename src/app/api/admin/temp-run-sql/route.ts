import { NextResponse } from 'next/server';
import { Client } from 'pg';

const DB_URL = 'postgresql://postgres:wj8qimxarx7jd91yvwxd@startarot-db:5432/startarot';
const SECRET = 'wj8qimxarx7jd91yvwxd';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    const mode = searchParams.get('mode') || 'fix'; // 'check' ou 'fix'

    if (secret !== SECRET) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const client = new Client({ connectionString: DB_URL });

    try {
        await client.connect();

        // 1. Buscar todas as FKs que referenciam profiles SEM CASCADE
        const fkQuery = `
            SELECT
                tc.table_name AS source_table,
                kcu.column_name AS source_column,
                ccu.table_name AS ref_table,
                ccu.column_name AS ref_column,
                tc.constraint_name,
                rc.delete_rule AS on_delete
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            JOIN information_schema.referential_constraints AS rc
                ON rc.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = 'public'
                AND ccu.table_name = 'profiles'
            ORDER BY tc.table_name;
        `;

        const result = await client.query(fkQuery);
        const allFKs = result.rows;

        const withCascade = allFKs.filter(r => r.on_delete === 'CASCADE');
        const withoutCascade = allFKs.filter(r => r.on_delete !== 'CASCADE');

        if (mode === 'check') {
            await client.end();
            return NextResponse.json({
                success: true,
                total_fks: allFKs.length,
                with_cascade: withCascade.length,
                without_cascade: withoutCascade.length,
                fks_without_cascade: withoutCascade.map(r => ({
                    table: r.source_table,
                    column: r.source_column,
                    constraint: r.constraint_name,
                    on_delete: r.on_delete
                })),
                fks_with_cascade: withCascade.map(r => ({
                    table: r.source_table,
                    column: r.source_column,
                    constraint: r.constraint_name
                }))
            });
        }

        // mode === 'fix' — corrigir todas as FKs sem CASCADE
        const fixed = [];
        const errors = [];

        for (const fk of withoutCascade) {
            try {
                await client.query(`
                    ALTER TABLE public.${fk.source_table}
                    DROP CONSTRAINT IF EXISTS ${fk.constraint_name},
                    ADD CONSTRAINT ${fk.constraint_name}
                    FOREIGN KEY (${fk.source_column})
                    REFERENCES public.${fk.ref_table}(${fk.ref_column})
                    ON DELETE CASCADE;
                `);
                fixed.push(`${fk.source_table}.${fk.source_column} (${fk.constraint_name})`);
            } catch (err: any) {
                errors.push({ constraint: fk.constraint_name, error: err.message });
            }
        }

        await client.end();

        return NextResponse.json({
            success: true,
            message: `Verificação concluída.`,
            already_had_cascade: withCascade.map(r => `${r.source_table}.${r.source_column}`),
            fixed,
            errors,
            summary: {
                total: allFKs.length,
                already_ok: withCascade.length,
                fixed: fixed.length,
                failed: errors.length
            }
        });

    } catch (err: any) {
        try { await client.end(); } catch {}
        console.error('Error:', err);
        return NextResponse.json({
            success: false,
            error: err.message
        }, { status: 500 });
    }
}
