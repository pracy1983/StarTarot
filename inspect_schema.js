const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function getEnv() {
    try {
        const envPath = path.join(process.cwd(), '.env.local')
        const envContent = fs.readFileSync(envPath, 'utf8')
        const env = {}
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=')
            if (key && value) env[key.trim()] = value.trim().replace(/^"|"$/g, '')
        })
        return env
    } catch (e) {
        console.error('Error reading .env.local:', e.message)
        return {}
    }
}

const env = getEnv()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
// Use Service Role Key to bypass RLS for inspection
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspect() {
    console.log('--- Inspecting Database Schema (JS Version) ---')

    const tables = ['profiles', 'specialties']

    for (const table of tables) {
        console.log(`\nChecking table [${table}]...`)
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1)
            if (error) {
                console.log(`Table [${table}] check FAILED:`, error.message)
                if (error.code) console.log(`Error Code: ${error.code}`)
            } else {
                console.log(`Table [${table}] check OK. Found ${data.length} rows.`)
                if (data.length > 0) {
                    console.log('Sample row keys:', Object.keys(data[0]).join(', '))
                } else {
                    console.log('Table is empty, cannot infer columns from data.')
                }
            }
        } catch (err) {
            console.error(`Unexpected error checking [${table}]:`, err)
        }
    }
}

inspect()
