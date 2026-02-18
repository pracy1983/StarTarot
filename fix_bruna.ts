
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zikogpmzbgvswwunjkqh.supabase.co'
// Chave SERVICE ROLE para ter permissão de escrita total
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppa29ncG16Ymd2c3d3dW5qa3FoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg1MTY5MywiZXhwIjoyMDg2NDI3NjkzfQ.lBX1kbd8hMyilkMTJa1FvEcglPJV7r-5Q8grDF5wQv4'
const supabase = createClient(supabaseUrl, supabaseKey)

async function fixBruna() {
    console.log('Corrigindo perfil da Bruna...')

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', '%Bruna%')

    if (error || !profiles || profiles.length === 0) {
        console.error('Bruna não encontrada ou erro:', error)
        return
    }

    const bruna = profiles[0]
    console.log(`Encontrada: ${bruna.full_name} (${bruna.id})`)
    console.log(`Estado atual: Role=${bruna.role}, Status=${bruna.application_status}`)

    if (bruna.role !== 'oracle' && bruna.application_status === 'approved') {
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'oracle' })
            .eq('id', bruna.id)

        if (updateError) {
            console.error('Erro ao atualizar role:', updateError)
        } else {
            console.log('SUCESSO: Role atualizado para "oracle".')
        }
    } else {
        console.log('Perfil já está correto ou não requer correção.')
    }
}

fixBruna()
