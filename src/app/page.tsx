'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { GlowInput } from '@/components/ui/GlowInput'
import { motion } from 'framer-motion'
import { Mail, Lock, Sparkles, User, ArrowLeft, Phone, ShieldCheck } from 'lucide-react'
import { whatsappService } from '@/lib/whatsapp'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const countryCodes = [
  { code: '+55', country: 'Brasil', flag: '🇧🇷' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+1', country: 'EUA/Canadá', flag: '🇺🇸' },
  { code: '+34', country: 'Espanha', flag: '🇪🇸' },
  { code: '+44', country: 'Reino Unido', flag: '🇬🇧' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+598', country: 'Uruguai', flag: '🇺🇾' }
]

export default function LoginPage() {
  const router = useRouter()
  const { login, signUp, isAuthenticated, isLoading, checkAuth, profile } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [countryPrefix, setCountryPrefix] = useState('+55')
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationRole, setRegistrationRole] = useState<'client' | 'oracle'>('client')
  const [error, setError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // OTP States
  const [showOtpScreen, setShowOtpScreen] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('')

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isLoading && isAuthenticated && profile) {
      const targetPath = profile.role === 'owner' ? '/admin' : (profile.role === 'oracle' ? '/app' : '/app')
      router.push(targetPath)
    }
  }, [isAuthenticated, isLoading, profile, router])

  const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  const handleStartRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFormLoading(true)

    try {
      const fullPhone = countryPrefix + whatsapp.replace(/\D/g, '')

      // 1. Verificação de duplicidade antes de enviar o código
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id, email, phone')
        .or(`email.eq.${email.trim().toLowerCase()},phone.eq.${fullPhone}`)
        .maybeSingle()

      if (existingUser) {
        if (existingUser.email === email.trim().toLowerCase()) {
          setError('Este e-mail já está em uso.')
        } else {
          setError('Este número de WhatsApp já está cadastrado.')
        }
        setFormLoading(false)
        return
      }

      const code = generateOtp()
      setGeneratedOtp(code)

      // 2. Envia via WhatsApp
      const success = await whatsappService.sendTextMessage({
        phone: fullPhone,
        message: `✨ *Star Tarot* \n\nSeu código de verificação é: *${code}*\n\nNão compartilhe este código com ninguém.`
      })

      if (success) {
        setShowOtpScreen(true)
        toast.success(`Código enviado para o WhatsApp ${fullPhone}`)
      } else {
        setError('Erro ao enviar código para o WhatsApp. Verifique o número.')
      }
    } catch (err) {
      console.error('Error starting registration:', err)
      setError('Ocorreu um erro inesperado')
    } finally {
      setFormLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFormLoading(true)

    if (otpCode !== generatedOtp) {
      setError('Código inválido. Verifique o WhatsApp.')
      setFormLoading(false)
      return
    }

    try {
      const fullPhone = countryPrefix + whatsapp.replace(/\D/g, '')
      const result = await signUp(email, password, fullName, fullPhone, registrationRole)
      if (!result.success) {
        setError(result.error || 'Erro ao criar conta')
      } else {
        const loginResult = await login(email, password)
        if (loginResult.success) {
          toast.success('Bem-vindo ao Templo!')
          router.push('/app')
        } else {
          setError('Conta criada! Por favor, faça login.')
          setIsRegistering(false)
          setShowOtpScreen(false)
        }
      }
    } catch (err) {
      console.error('Error verifying OTP:', err)
      setError('Erro na finalização do cadastro')
    } finally {
      setFormLoading(false)
    }
  }

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFormLoading(true)

    try {
      const result = await login(email, password)
      if (!result.success) {
        setError(result.error || 'Erro ao fazer login')
      } else {
        router.push('/app')
      }
    } catch (err) {
      console.error('Error in login:', err)
      setError('Erro ao entrar no portal')
    } finally {
      setFormLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-deep-space flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-neon-purple"
        >
          <Sparkles size={48} />
        </motion.div>
      </div>
    )
  }

  return (
    <main className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background Decorativo */}
      <div className="stars-overlay" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-purple/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-cyan/20 blur-[120px] rounded-full" />

      {/* Link para Oraculista */}
      {!isRegistering && !showOtpScreen && (
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={() => {
              setIsRegistering(true)
              setRegistrationRole('oracle')
              setFullName('')
              setEmail('')
              setWhatsapp('')
              setPassword('')
              setError('')
            }}
            className="text-xs font-bold text-slate-400 hover:text-neon-purple transition-all flex items-center bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md"
          >
            <Sparkles size={14} className="mr-2 text-neon-gold" />
            Seja um oraculista StarTarot
          </button>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 mx-auto mb-6 relative"
          >
            <div className="absolute inset-0 bg-neon-purple blur-2xl opacity-20 animate-pulse" />
            <img
              src="/logo.png"
              alt="Star Tarot Logo"
              className="w-full h-full object-contain relative z-10"
            />
          </motion.div>
          <h1 className="text-4xl font-bold tracking-tighter mb-2">
            <span className="text-white">Star</span>
            <span className="neon-text-purple ml-2">Tarot</span>
          </h1>
          <p className="text-slate-400 font-medium text-center">
            {showOtpScreen ? 'Verificação de Segurança' : (isRegistering
              ? (registrationRole === 'oracle' ? 'Inicie sua jornada como guia espiritual.' : 'Crie sua conta para receber orientação.')
              : 'O universo tem algo a lhe dizer.')}
          </p>
        </div>

        <GlassCard glowColor={registrationRole === 'oracle' ? 'gold' : 'purple'}>
          {showOtpScreen ? (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-center space-y-2 mb-4">
                <p className="text-sm text-slate-300">Enviamos um código para o seu WhatsApp.</p>
                <p className="text-xs text-neon-cyan font-mono font-bold">{countryPrefix} {whatsapp}</p>
              </div>

              <GlowInput
                label="Código de 6 dígitos"
                type="text"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                icon={<ShieldCheck size={18} />}
                required
                className="text-center tracking-[0.5em] text-2xl font-bold"
              />

              {error && (
                <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20 text-center">
                  {error}
                </div>
              )}

              <NeonButton
                type="submit"
                variant="purple"
                fullWidth
                loading={formLoading}
                size="lg"
              >
                Confirmar e Entrar
              </NeonButton>

              <button
                type="button"
                onClick={() => setShowOtpScreen(false)}
                className="w-full text-sm text-slate-500 hover:text-white transition-colors"
              >
                Alterar número de telefone
              </button>
            </form>
          ) : isRegistering ? (
            <form onSubmit={handleStartRegister} className="space-y-4">
              <GlowInput
                label="Nome Completo"
                type="text"
                placeholder="Seu nome"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                icon={<User size={18} />}
                required
              />

              <GlowInput
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={18} />}
                required
              />

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-400 ml-1">WhatsApp</label>
                <div className="flex gap-2">
                  <select
                    value={countryPrefix}
                    onChange={(e) => setCountryPrefix(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-2 py-3 text-white text-sm outline-none focus:border-neon-purple/50 transition-all cursor-pointer"
                  >
                    {countryCodes.map(c => (
                      <option key={c.code} value={c.code} className="bg-deep-space">
                        {c.flag} {c.code}
                      </option>
                    ))}
                    <option value="" className="bg-deep-space">🏳️ Outro</option>
                  </select>
                  <GlowInput
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    icon={<Phone size={18} />}
                    required
                  />
                </div>
              </div>

              <GlowInput
                label="Senha"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock size={18} />}
                required
              />

              {error && (
                <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20 text-center">
                  {error}
                </div>
              )}

              <NeonButton
                type="submit"
                variant={registrationRole === 'oracle' ? 'gold' : 'purple'}
                fullWidth
                loading={formLoading}
                size="lg"
              >
                Gerar Código WhatsApp
              </NeonButton>

              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="w-full text-sm text-slate-400 hover:text-white flex items-center justify-center pt-2"
              >
                <ArrowLeft size={14} className="mr-2" /> Já tenho uma conta
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmitLogin} className="space-y-6">
              <GlowInput
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={18} />}
                required
              />

              <GlowInput
                label="Senha"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock size={18} />}
                required
              />

              {error && (
                <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20 text-center">
                  {error}
                </div>
              )}

              <NeonButton
                type="submit"
                variant="purple"
                fullWidth
                loading={formLoading}
                size="lg"
              >
                Entrar no Portal
              </NeonButton>

              <div className="pt-4 flex flex-col space-y-4 text-center">
                <button type="button" className="text-sm text-slate-400 hover:text-neon-cyan transition-colors">
                  Esqueceu sua chave de acesso?
                </button>
                <div className="h-px bg-white/10 w-full" />
                <p className="text-sm text-slate-500">
                  Novo no templo? <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(true)
                      setRegistrationRole('client')
                      setError('')
                    }}
                    className="text-neon-gold hover:underline"
                  >
                    Iniciar jornada
                  </button>
                </p>
              </div>
            </form>
          )}
        </GlassCard>
      </motion.div>
    </main>
  )
}
