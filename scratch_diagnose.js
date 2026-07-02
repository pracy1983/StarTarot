const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) env[match[1]] = (match[2] || '').replace(/^"|"$/g, '');
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

console.log('=== DIAGNÓSTICO StarTarot ===');
console.log('URL:', supabaseUrl);
console.log('Service Key (primeiros 20 chars):', supabaseServiceKey?.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
    // 1. Test connection
    console.log('\n--- 1. Testando conexão com Supabase ---');
    const { data: healthCheck, error: healthErr } = await supabase
        .from('profiles')
        .select('id, email, role, full_name')
        .limit(3);
    
    if (healthErr) {
        console.error('ERRO ao conectar:', healthErr.message, healthErr.code, healthErr.details);
    } else {
        console.log('Conexão OK! Profiles encontrados:', healthCheck?.length);
        healthCheck?.forEach(p => console.log(`  - ${p.email} | role: ${p.role} | nome: ${p.full_name}`));
    }

    // 2. Check if allows_video column exists
    console.log('\n--- 2. Testando coluna allows_video ---');
    const { data: videoCheck, error: videoErr } = await supabase
        .from('profiles')
        .select('id, allows_video, allows_text')
        .limit(1);
    
    if (videoErr) {
        console.error('ERRO allows_video:', videoErr.message, videoErr.code);
    } else {
        console.log('Coluna allows_video OK:', videoCheck);
    }

    // 3. Test login with admin credentials
    console.log('\n--- 3. Testando login admin (paularacy@gmail.com / adm@123) ---');
    const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
        email: 'paularacy@gmail.com',
        password: 'adm@123'
    });
    
    if (loginErr) {
        console.error('ERRO login:', loginErr.message, loginErr.status);
    } else {
        console.log('Login OK! User ID:', loginData?.user?.id);
        console.log('Email:', loginData?.user?.email);
    }

    // 4. Check if user exists in auth.users
    console.log('\n--- 4. Verificando usuário no auth.users ---');
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
    
    if (authErr) {
        console.error('ERRO listUsers:', authErr.message);
    } else {
        const adminUser = authUsers?.users?.find(u => u.email === 'paularacy@gmail.com');
        if (adminUser) {
            console.log('Usuário admin encontrado no Auth!');
            console.log('  ID:', adminUser.id);
            console.log('  Email:', adminUser.email);
            console.log('  Created:', adminUser.created_at);
            console.log('  Last Sign In:', adminUser.last_sign_in_at);
        } else {
            console.log('USUÁRIO ADMIN NÃO ENCONTRADO no auth.users!');
            console.log('Total de usuários:', authUsers?.users?.length);
            authUsers?.users?.forEach(u => console.log(`  - ${u.email} (${u.id})`));
        }
    }

    // 5. Check profiles table for admin
    console.log('\n--- 5. Verificando perfil admin na tabela profiles ---');
    const { data: adminProfile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'paularacy@gmail.com')
        .single();
    
    if (profErr) {
        console.error('ERRO perfil admin:', profErr.message, profErr.code);
    } else {
        console.log('Perfil admin encontrado:');
        console.log('  ID:', adminProfile?.id);
        console.log('  Role:', adminProfile?.role);
        console.log('  Force Password Change:', adminProfile?.force_password_change);
        console.log('  allows_video:', adminProfile?.allows_video);
        console.log('  allows_text:', adminProfile?.allows_text);
    }
}

diagnose().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
