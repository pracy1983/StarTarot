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
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspect() {
    console.log('--- Inspecting Database Schema ---')

    const tables = ['profiles', 'wallets', 'user_favorites']

    for (const table of tables) {
        console.log(`\nChecking table [${table}]...`)
        const { data, error } = await supabase.from(table).select('*').limit(1)
        if (error) {
            console.log(`Table [${table}] check FAILED:`, error.message)
        } else {
            console.log(`Table [${table}] check OK. Found ${data.length} rows.`)
        }
    }
}

inspect()
