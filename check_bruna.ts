
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkBruna() {
    console.log('Buscando usuários com nome "Bruna"...')

    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, application_status, is_online, last_heartbeat_at')
        .ilike('full_name', '%Bruna%')

    if (error) {
        console.error('Erro:', error)
        return
    }

    console.log('Resultados:', data)

    // Check admin query manually
    console.log('\nSimulando query do Admin...')
    const { data: adminData, error: adminError } = await supabase
        .from('profiles')
        .select('id, full_name, role, application_status')
        .or('role.in.(oracle,owner),application_status.in.(pending,waitlist)')
        .order('full_name', { ascending: true })

    if (adminError) {
        console.error('Admin Query Error:', adminError)
    } else {
        const brunaInAdmin = adminData?.filter(u => u.full_name?.toLowerCase().includes('bruna'))
        console.log('Bruna na query do Admin:', brunaInAdmin)
    }
}

checkBruna()
