import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export type UserRole = 'owner' | 'oracle' | 'client'

interface Profile {
  id: string
  email: string
  full_name: string | null
  name_fantasy: string | null
  avatar_url: string | null
  role: UserRole
  is_ai: boolean
  specialty: string | null
  credits?: number
  phone?: string | null
  video_enabled?: boolean
  message_enabled?: boolean
  initial_fee?: number
  application_status?: 'pending' | 'approved' | 'rejected' | 'waitlist'
  rejection_reason?: string | null
  bio?: string | null
  personality?: string | null
  // Birth Info
  birth_date?: string | null
  birth_time?: string | null
  birth_place?: string | null
  requires_birthdate?: boolean
  requires_birthtime?: boolean
  is_online?: boolean
  last_heartbeat_at?: string | null
  is_oracle?: boolean
  // Billing
  cpf?: string | null
  zip_code?: string | null
  address?: string | null
  address_number?: string | null
  address_complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  price_brl_per_minute?: number
  credits_per_minute?: number
  initial_fee_brl?: number
  initial_fee_credits?: number
  price_per_message?: number
  allows_video?: boolean
  allows_text?: boolean
  whatsapp_notification_enabled?: boolean
  suspended_until?: string | null
  categories?: string[]
  topics?: string[]
  custom_category?: string | null
  custom_topic?: string | null
  metadata?: any
}

interface AuthState {
  profile: Profile | null
  isAuthenticated: boolean
  isLoading: boolean
  checkAuth: () => Promise<void>
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, full_name: string, phone: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  setProfile: (profile: Profile) => void
  showAuthModal: boolean
  setShowAuthModal: (show: boolean) => void
  authMode: 'login' | 'register'
  setAuthMode: (mode: 'login' | 'register') => void
  registrationRole: UserRole
  setRegistrationRole: (role: UserRole) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  isAuthenticated: false,
  isLoading: true,

  checkAuth: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        // Usamos maybeSingle() para evitar erro 406/PGRST116 se o perfil não existir
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()

        if (error) {
          console.error('Erro ao buscar perfil (checkAuth):', error)
          set({ profile: null, isAuthenticated: false, isLoading: false })
          return
        }

        if (profile) {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', profile.id)
            .maybeSingle()

          set({
            profile: {
              ...profile,
              credits: wallet?.balance || 0
            },
            isAuthenticated: true,
            isLoading: false
          })
        } else {
          // Sessão existe mas perfil foi deletado (Sessão órfã)
          await supabase.auth.signOut()
          set({ profile: null, isAuthenticated: false, isLoading: false })
        }
      } else {
        set({ profile: null, isAuthenticated: false, isLoading: false })
      }
    } catch (error) {
      console.error('Erro no checkAuth:', error)
      set({ profile: null, isAuthenticated: false, isLoading: false })
    }
  },

  login: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      if (data.user) {
        // Query separada para evitar o erro 500 do Join observado no console
        const { data: profile, error: pError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle()

        if (pError) {
          console.error('Erro ao buscar perfil após login:', pError)
          throw new Error('Erro técnico ao buscar perfil.')
        }

        if (profile) {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', profile.id)
            .single()

          // Force offline on login to prevent lingering online state
          if (profile.role === 'oracle' || profile.role === 'owner') {
            await supabase.from('profiles').update({ is_online: false }).eq('id', profile.id)
            profile.is_online = false
          }

          set({
            profile: {
              ...profile,
              credits: wallet?.balance || 0
            },
            isAuthenticated: true
          })
          return { success: true }
        } else {
          // Self-Healing Strategy if profile not found
          console.warn('Perfil ausente, tentando auto-correção...')

          // Try to recover role from metadata or default to client
          const metadata = data.user.user_metadata || {}
          const fallbackRole = metadata.role || 'client'
          const fallbackName = metadata.full_name || 'Usuário'

          const { data: fixResult, error: fixError } = await supabase.rpc('ensure_user_profile', {
            p_user_id: data.user.id,
            p_email: data.user.email,
            p_full_name: fallbackName,
            p_role: fallbackRole
          })

          // Handle both JSONB (object) and TABLE (array) RPC returns
          const isSuccessful = Array.isArray(fixResult)
            ? (fixResult[0] as any)?.success
            : (fixResult as any)?.success

          if (isSuccessful) {
            // Retry fetch
            const { data: profileRetry } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single()

            if (profileRetry) {
              const { data: walletRetry } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', profileRetry.id)
                .maybeSingle()

              set({
                profile: {
                  ...profileRetry,
                  credits: walletRetry?.balance || 0
                },
                isAuthenticated: true
              })
              return { success: true }
            }
          }

          console.error('Falha na auto-correção:', fixError || fixResult)
          return { success: false, error: 'Perfil corrompido. Contate o suporte.' }
        }
      }
      return { success: false, error: 'Usuário autenticado mas perfil não localizado.' }
    } catch (error: any) {
      console.error('Erro detalhado no login:', error)
      let errorMessage = error.message || 'Erro ao fazer login'

      if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'E-mail ou senha incorretos.'
      } else if (errorMessage.includes('Email not confirmed')) {
        errorMessage = 'E-mail não confirmado. Verifique sua caixa de entrada.'
      }

      return { success: false, error: errorMessage }
    }
  },

  signUp: async (email: string, password: string, full_name: string, phone: string, role: UserRole = 'client') => {
    try {
      const safeRole = (role === 'owner') ? 'client' : role;

      console.log('[SignUp] Iniciando cadastro:', { email, full_name, safeRole, phone })

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
            phone,
            role: safeRole
          }
        }
      })

      console.log('[SignUp] Resposta do Supabase Auth:', {
        userId: data?.user?.id,
        error: error?.message,
        identities: data?.user?.identities?.length
      })

      if (error) throw error

      // IMPORTANTE: Supabase retorna user com identities=[] se o email já existe mas sem confirmação
      // Neste caso, data.user existe, mas identities é vazio = usuário fantasma
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        console.warn('[SignUp] Usuário fantasma detectado (identities vazio) - email já existe no Auth')
        return { success: false, error: 'User already registered' }
      }

      if (data.user) {
        console.log('[SignUp] Usuário criado no Auth! ID:', data.user.id)

        // 1. Aguarda um momento para a trigger rodar
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 2. Verifica se o perfil foi criado pela trigger
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role, application_status')
          .eq('id', data.user.id)
          .maybeSingle()

        console.log('[SignUp] Perfil após trigger:', profile)

        if (!profile) {
          console.log('[SignUp] Trigger falhou, criando perfil via RPC...')
          const { data: rpcData, error: rpcError } = await supabase.rpc('ensure_user_profile', {
            p_user_id: data.user.id,
            p_email: email.trim().toLowerCase(),
            p_full_name: full_name.trim(),
            p_role: safeRole
          })

          console.log('[SignUp] Resultado RPC:', { rpcData, rpcError: rpcError?.message })

          const isSuccessful = Array.isArray(rpcData)
            ? (rpcData[0] as any)?.success
            : (rpcData as any)?.success

          if (rpcError || !isSuccessful) {
            console.error('[SignUp] RPC fallback falhou:', rpcError || rpcData)
            console.log('[SignUp] Debug RPC Full Data:', rpcData)
            console.log('[SignUp] Debug RPC Error:', rpcError)
            return { success: false, error: 'Erro ao criar perfil de usuário. Tente novamente.' }
          } else {
            await supabase.from('profiles').update({ phone }).eq('id', data.user.id)
          }
        } else {
          if (safeRole === 'oracle' && profile.application_status !== 'pending') {
            console.warn('[SignUp] Oracle criado mas status é', profile.application_status)
          }
        }

        console.log('[SignUp] Cadastro completo com sucesso!')
        return { success: true }
      }

      console.error('[SignUp] data.user é null')
      return { success: false, error: 'Ocorreu um erro ao criar a conta.' }
    } catch (error: any) {
      console.error('[SignUp] Erro:', error.message)
      return { success: false, error: error.message || 'Erro ao criar conta' }
    }
  },

  logout: async () => {
    const profile = useAuthStore.getState().profile
    if (profile?.id && (profile.role === 'oracle' || profile.role === 'owner')) {
      await supabase.from('profiles').update({ is_online: false }).eq('id', profile.id)
    }
    await supabase.auth.signOut()
    set({ profile: null, isAuthenticated: false })
  },

  setProfile: (profile: Profile) => {
    set({ profile })
  },
  showAuthModal: false,
  setShowAuthModal: (show: boolean) => set({ showAuthModal: show }),
  authMode: 'login',
  setAuthMode: (mode: 'login' | 'register') => set({ authMode: mode }),
  registrationRole: 'client',
  setRegistrationRole: (role: UserRole) => set({ registrationRole: role })
}))
