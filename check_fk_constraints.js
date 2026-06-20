/**
 * Script para verificar TODAS as foreign keys que referenciam a tabela profiles
 * e identificar quais NÃO têm ON DELETE CASCADE
 */

const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:wj8qimxarx7jd91yvwxd@startarot-db:5432/startarot'
});

async function checkConstraints() {
    await client.connect();
    console.log('✅ Conectado ao banco de dados\n');

    // 1. Verificar todas as FKs que referenciam profiles
    const fkQuery = `
        SELECT
            tc.table_name AS tabela_origem,
            kcu.column_name AS coluna_origem,
            ccu.table_name AS tabela_destino,
            ccu.column_name AS coluna_destino,
            tc.constraint_name AS constraint_name,
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
            AND ccu.table_name IN ('profiles', 'users')
        ORDER BY tc.table_name, kcu.column_name;
    `;

    const fkResult = await client.query(fkQuery);
    
    console.log('=== FOREIGN KEYS QUE REFERENCIAM PROFILES ===\n');
    
    const semCascade = [];
    const comCascade = [];
    
    fkResult.rows.forEach(row => {
        const info = `  📌 ${row.tabela_origem}.${row.coluna_origem} -> ${row.tabela_destino}.${row.coluna_destino}`;
        const constraint = `     Constraint: ${row.constraint_name} | ON DELETE: ${row.on_delete}`;
        
        if (row.on_delete !== 'CASCADE') {
            semCascade.push(row);
            console.log(`❌ ${info}`);
            console.log(constraint);
            console.log('');
        } else {
            comCascade.push(row);
            console.log(`✅ ${info}`);
            console.log(constraint);
            console.log('');
        }
    });

    console.log('\n=== RESUMO ===');
    console.log(`✅ Com CASCADE: ${comCascade.length}`);
    console.log(`❌ SEM CASCADE (precisam ser corrigidas): ${semCascade.length}`);
    
    if (semCascade.length > 0) {
        console.log('\n=== SQL PARA CORRIGIR TODAS AS FKs SEM CASCADE ===\n');
        semCascade.forEach(row => {
            console.log(`-- Corrigir ${row.tabela_origem}.${row.coluna_origem}`);
            console.log(`ALTER TABLE public.${row.tabela_origem}`);
            console.log(`    DROP CONSTRAINT IF EXISTS ${row.constraint_name},`);
            console.log(`    ADD CONSTRAINT ${row.constraint_name}`);
            console.log(`    FOREIGN KEY (${row.coluna_origem})`);
            console.log(`    REFERENCES public.${row.tabela_destino}(${row.coluna_destino})`);
            console.log(`    ON DELETE CASCADE;`);
            console.log('');
        });
    }

    // 2. Verificar também FKs que referenciam auth.users
    const authFkQuery = `
        SELECT
            tc.table_name AS tabela_origem,
            kcu.column_name AS coluna_origem,
            ccu.table_name AS tabela_destino,
            ccu.column_name AS coluna_destino,
            tc.constraint_name AS constraint_name,
            rc.delete_rule AS on_delete
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
            ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_schema = 'auth'
            AND ccu.table_name = 'users'
        ORDER BY tc.table_name;
    `;
    
    const authFkResult = await client.query(authFkQuery);
    
    if (authFkResult.rows.length > 0) {
        console.log('\n=== FOREIGN KEYS QUE REFERENCIAM auth.users ===\n');
        authFkResult.rows.forEach(row => {
            const cascade = row.on_delete === 'CASCADE' ? '✅' : '❌';
            console.log(`${cascade} ${row.tabela_origem}.${row.coluna_origem} -> auth.${row.tabela_destino}.${row.coluna_destino}`);
            console.log(`   Constraint: ${row.constraint_name} | ON DELETE: ${row.on_delete}`);
            console.log('');
        });
    }

    await client.end();
}

checkConstraints().catch(err => {
    console.error('Erro:', err.message);
    process.exit(1);
});
