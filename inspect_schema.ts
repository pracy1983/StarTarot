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

async function inspect() {
    console.log('--- Inspecting Database Schema ---')

    // No Supabase, podemos tentar pesquisar informações de esquema via RPC ou via erros propositais
    // Mas a forma mais fácil de ver se a coluna existe é dar um select especificando as colunas.

    const profileCols = ['id', 'email', 'full_name', 'role', 'is_ai', 'oracle_type', 'specialty', 'bio', 'system_prompt', 'is_online', 'credits_per_minute']

    for (const col of profileCols) {
        const { error } = await supabase.from('profiles').select(col).limit(1)
        if (error) {
            console.log(`Column [${col}] in [profiles]: FAILED`, error.message)
        } else {
            console.log(`Column [${col}] in [profiles]: OK`)
        }
    }

    const walletCols = ['id', 'user_id', 'balance']
    for (const col of walletCols) {
        const { error } = await supabase.from('wallets').select(col).limit(1)
        if (error) {
            console.log(`Column [${col}] in [wallets]: FAILED`, error.message)
        } else {
            console.log(`Column [${col}] in [wallets]: OK`)
        }
    }
}

inspect()
