const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) env[match[1]] = (match[2] || '').replace(/^"|"$/g, '');
});
const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'];
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
    console.log('Buckets:', buckets?.map(b => ({ name: b.name, public: b.public })), bucketErr);

    const { data: leandro, error: leandroErr } = await supabase.from('profiles').select('id, full_name, avatar_url, role').ilike('full_name', '%leandro%');
    console.log('Leandro Profiles:', leandro, leandroErr);
}
run();
