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
  force_password_change?: boolean
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
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>
  requestPasswordReset: (email: string, phone: string) => Promise<{ success: boolean; error?: string }>
  verifyResetOtp: (phone: string, code: string) => Promise<{ success: boolean; userId?: string; error?: string }>
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
            .eq('user_id', session.user.id)
            .maybeSingle()

          set({
            profile: { ...profile, credits: wallet?.balance || 0 },
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
    } catch (err) {
      console.error('Erro no checkAuth:', err)
      set({ profile: null, isAuthenticated: false, isLoading: false })
    }
  },

  updatePassword: async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      // Limpa flag de troca obrigatória
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ force_password_change: false })
          .eq('id', user.id)

        // Atualiza estado local
        const currentProfile = useAuthStore.getState().profile
        if (currentProfile) {
          set({ profile: { ...currentProfile, force_password_change: false } })
        }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  requestPasswordReset: async (email: string, phone: string) => {
    try {
      const cleanPhone = phone.replace(/\D/g, '')
      const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone

      // 1. Gerar OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min

      // 2. Chama o banco usando a nova RPC para bypass de RLS
      const { data: rpcData, error: rpcError } = await supabase.rpc('request_password_reset', {
        p_email: email,
        p_phone: fullPhone,
        p_otp_code: otp,
        p_expires_at: expiresAt
      })

      if (rpcError) throw new Error(rpcError.message)
      
      const result = Array.isArray(rpcData) ? rpcData[0] : rpcData
      if (!result || !result.success) {
        throw new Error(result?.error || 'Dados não conferem. Verifique seu e-mail e telefone.')
      }

      // 3. Envia via WhatsApp (agora temos o nome e o telefone correto do banco)
      const EvolutionWhatsAppService = (await import('@/lib/whatsapp')).whatsappService
      const success = await EvolutionWhatsAppService.sendTextMessage({
        phone: result.user_phone || fullPhone,
        message: `🔐 *Recuperação de Senha - Star Tarot* \n\nOlá ${result.full_name}, seu código para redefinir sua senha é: *${otp}*\n\nEste código expira em 15 minutos.`
      })

      if (!success) throw new Error('Não foi possível enviar o código para o WhatsApp.')

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  verifyResetOtp: async (phone: string, code: string) => {
    try {
      const cleanPhone = phone.replace(/\D/g, '')
      const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone

      const { data, error } = await supabase.rpc('verify_password_reset_otp', {
        p_phone: '+' + fullPhone,
        p_otp_code: code
      })

      if (error) throw error

      const result = Array.isArray(data) ? data[0] : data
      if (!result.success) throw new Error(result.error)

      return { success: true, userId: result.user_id }
    } catch (error: any) {
      return { success: false, error: error.message }
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

      if (error) throw error

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        return { success: false, error: 'User already registered' }
      }

      if (data.user) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role, application_status')
          .eq('id', data.user.id)
          .maybeSingle()

        if (!profile) {
          const { data: rpcData, error: rpcError } = await supabase.rpc('ensure_user_profile', {
            p_user_id: data.user.id,
            p_email: email.trim().toLowerCase(),
            p_full_name: full_name.trim(),
            p_role: safeRole
          })

          const isSuccessful = Array.isArray(rpcData)
            ? (rpcData[0] as any)?.success
            : (rpcData as any)?.success

          if (rpcError || !isSuccessful) {
            console.error('Failed to create profile via RPC fallback:', rpcError || rpcData)
            return { success: false, error: 'Erro ao criar perfil de usuário. Tente novamente.' }
          } else {
            await supabase.from('profiles').update({ phone }).eq('id', data.user.id)
          }
        } else {
          if (safeRole === 'oracle' && profile.application_status !== 'pending') {
            console.warn('Oracle created but status is', profile.application_status)
          }
        }

        return { success: true }
      }

      return { success: false, error: 'Ocorreu um erro ao criar a conta.' }
    } catch (error: any) {
      console.error('Erro no signUp:', error.message)
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
