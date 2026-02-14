import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// No Next.js com auth-helpers, o cliente já pega as variáveis de ambiente automaticamente
// se elas seguirem o padrão NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.
export const supabase = createClientComponentClient()

// Log para debug em produção
console.log('[Supabase Client] Inicializado via auth-helpers (Cookies habilitados)')
