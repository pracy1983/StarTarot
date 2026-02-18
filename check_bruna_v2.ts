
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zikogpmzbgvswwunjkqh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppa29ncG16Ymd2c3d3dW5qa3FoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg1MTY5MywiZXhwIjoyMDg2NDI3NjkzfQ.lBX1kbd8hMyilkMTJa1FvEcglPJV7r-5Q8grDF5wQv4'
// Usando a chave SERVICE ROLE para bypassar RLS e ver tudo
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkBruna() {
    console.log('Buscando usuários com nome "Bruna"...')

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', '%Bruna%')

    if (error) {
        console.error('Erro:', error)
        return
    }

    console.log('Profiles encontrados:', profiles?.length)
    profiles?.forEach(p => {
        console.log(`\nID: ${p.id}`)
        console.log(`Nome: ${p.full_name}`)
        console.log(`Role: ${p.role}`)
        console.log(`Status App: ${p.application_status}`)
        console.log(`Online: ${p.is_online}`)
        console.log(`-------------------`)
    })

    // Check admin query manually
    console.log('\nSimulando query do Admin (Pending)...')
    const { data: pendingData, error: pendingError } = await supabase
        .from('profiles')
        .select('id, full_name, role, application_status')
        .or('role.in.(oracle,owner),application_status.in.(pending,waitlist)')

    if (pendingError) {
        console.error('Admin Query Error:', pendingError)
    } else {
        const brunaInPending = pendingData?.filter(u => u.full_name?.toLowerCase().includes('bruna'))
        console.log('Bruna na lista de Pendentes do Admin:', brunaInPending)

        if (!brunaInPending?.length && profiles?.length) {
            console.log('\nDIAGNÓSTICO: Bruna existe mas não aparece na query do Admin.')
            const p = profiles[0]
            if (p) {
                console.log(`Motivo provável: Role='${p.role}' e Status='${p.application_status}'`)
                const roleMatch = ['oracle', 'owner'].includes(p.role)
                const statusMatch = ['pending', 'waitlist'].includes(p.application_status)
                console.log(`Role Match (oracle/owner): ${roleMatch}`)
                console.log(`Status Match (pending/waitlist): ${statusMatch}`)
                console.log(`Query usa OR entre essas condições.`)
            }
        }
    }
}

checkBruna()
