import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

function getEnv() {
    const envPath = path.join(process.cwd(), '.env.local')
    const envContent = fs.readFileSync(envPath, 'utf8')
    const env: Record<string, string> = {}
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=')
        if (key && value) env[key.trim()] = value.trim().replace(/^"|"$/g, '')
    })
    return env
}

const env = getEnv()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
    console.log('--- Debugging Supabase Connection ---')
    console.log('URL:', supabaseUrl)

    // 1. Test profiles table
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)

    if (pError) {
        console.error('Error fetching profiles:', pError)
    } else {
        console.log('Profiles table accessible. Found:', profiles?.length)
    }

    // 2. Test wallets table
    const { data: wallets, error: wError } = await supabase
        .from('wallets')
        .select('*')
        .limit(1)

    if (wError) {
        console.error('Error fetching wallets:', wError)
    } else {
        console.log('Wallets table accessible. Found:', wallets?.length)
    }

    // 3. Test Join (The one that failed)
    const { data: join, error: jError } = await supabase
        .from('profiles')
        .select('*, wallets(balance)')
        .limit(1)

    if (jError) {
        console.error('Error on Join query:', jError)
        console.error('Full jError:', JSON.stringify(jError, null, 2))
    } else {
        console.log('Join query success!')
    }
}

debug()
