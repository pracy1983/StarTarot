import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function setUserAsAdmin() {
  const { data: { user }, error } = await supabase.auth.updateUser({
    data: { isAdmin: true }
  })

  if (error) {
    console.error('Erro ao atualizar usuário:', error.message)
    return
  }

  console.log('Usuário atualizado com sucesso:', user)
}
