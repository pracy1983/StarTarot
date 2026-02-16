import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function getEnv() {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env: Record<string, string> = {};
    envContent.split('\n').forEach(line => {
        const [key, ...rest] = line.split('=');
        const value = rest.join('=');
        if (key && value) env[key.trim()] = value.trim().replace(/^"|"$/g, '');
    });
    return env;
}

const env = getEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    console.log('--- Checking Specialties ---');
    const { data: specs, error: sErr } = await supabase.from('specialties').select('*');
    if (sErr) console.error('Error fetching specialties:', sErr);
    else console.log('Specialties:', specs);

    console.log('--- Checking Racy Profile ---');
    const { data: racy, error: rErr } = await supabase.from('profiles').select('*').ilike('full_name', '%Racy%');
    if (rErr) console.error('Error fetching Racy:', rErr);
    else console.log('Racy Profile:', racy);

    console.log('--- Checking Tables and Columns ---');
    const tables = ['profiles', 'transactions', 'ratings', 'consultations', 'wallets', 'inbox_messages'];
    for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Table [${table}]: ERROR`, error.message, error.code);
        } else {
            console.log(`Table [${table}]: OK`);
        }
    }

    const specificCols = [
        { table: 'profiles', col: 'initial_fee_credits' },
        { table: 'profiles', col: 'application_status' },
        { table: 'profiles', col: 'allows_video' },
        { table: 'profiles', col: 'allows_text' },
        { table: 'transactions', col: 'description' }
    ];

    for (const item of specificCols) {
        const { error } = await supabase.from(item.table).select(item.col).limit(1);
        if (error) {
            console.log(`Column [${item.col}] in [${item.table}]: MISSING`, error.message);
        } else {
            console.log(`Column [${item.col}] in [${item.table}]: OK`);
        }
    }
}

run();
