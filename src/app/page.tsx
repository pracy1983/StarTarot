'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { GlowInput } from '@/components/ui/GlowInput'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Sparkles, User, ArrowLeft, Phone, ShieldCheck, Search, Moon, Sun, Star, LogIn, LayoutDashboard } from 'lucide-react'
import { whatsappService } from '@/lib/whatsapp'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { OracleCard } from '@/components/client/OracleCard'

const countryCodes = [
  { code: '+55', country: 'Brasil', flag: '🇧🇷' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+1', country: 'EUA/Canadá', flag: '🇺🇸' },
  { code: '+34', country: 'Espanha', flag: '🇪🇸' },
  { code: '+44', country: 'Reino Unido', flag: '🇬🇧' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+598', country: 'Uruguai', flag: '🇺🇾' }
]

const TEST_PHONE = '11986224808'

export default function LandingPage() {
  const router = useRouter()
  const { login, signUp, isAuthenticated, isLoading, checkAuth, profile, logout } = useAuthStore()

  // UI States
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationRole, setRegistrationRole] = useState<'client' | 'oracle'>('client')

  // Form States
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [countryPrefix, setCountryPrefix] = useState('+55')
  const [error, setError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // OTP States
  const [showOtpScreen, setShowOtpScreen] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('')

  // Marketplace States
  const [oracles, setOracles] = useState<any[]>([])
  const [marketplaceLoading, setMarketplaceLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    checkAuth()
    fetchOracles()
  }, [checkAuth])

  const fetchOracles = async () => {
    try {
      // 1. Busca perfis de oraculistas
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*, allows_video, allows_text')
        .in('role', ['oracle', 'owner'])
        .eq('application_status', 'approved')
        .order('is_online', { ascending: false })

      if (pError) throw pError

      // 2. Busca todos os horários para esses oraculistas
      const { data: schedules, error: sError } = await supabase
        .from('schedules')
        .select('*')
        .in('oracle_id', profiles.map(p => p.id))

      // 3. Mapeia horários para cada perfil
      const oraclesWithSchedules = profiles.map(p => ({
        ...p,
        schedules: schedules?.filter(s => s.oracle_id === p.id) || []
      }))

      setOracles(oraclesWithSchedules)
    } catch (err) {
      console.error('Erro ao buscar oraculistas:', err)
    } finally {
      setMarketplaceLoading(false)
    }
  }

  const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  const handleStartRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFormLoading(true)

    try {
      const fullPhone = countryPrefix + whatsapp.replace(/\D/g, '')
      const isTestNumber = whatsapp.replace(/\D/g, '') === TEST_PHONE

      // 1. Verificação de duplicidade (Ignora se for o número de teste)
      if (!isTestNumber) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id, email, phone')
          .or(`email.eq.${email.trim().toLowerCase()},phone.eq.${fullPhone}`)
          .maybeSingle()

        if (existingUser) {
          if (registrationRole === 'oracle') {
            // Se está tentando se cadastrar como oráculo mas já existe como membro
            setError('Você já possui uma conta de membro. Deseja tornar-se um oraculista? Faça login e use a opção no menu lateral.')
            setFormLoading(false)
            return
          }

          if (existingUser.email === email.trim().toLowerCase()) {
            setError('Este e-mail já está em uso.')
          } else {
            setError('Este número de WhatsApp já está cadastrado.')
          }
          setFormLoading(false)
          return
        }
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

    const isTestNumber = whatsapp.replace(/\D/g, '') === TEST_PHONE

    // Se for número de teste, aceita qualquer código ou o código gerado
    if (!isTestNumber && otpCode !== generatedOtp) {
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
          setShowAuthModal(false)
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
        setShowAuthModal(false)
        router.push('/app')
      }
    } catch (err) {
      console.error('Error in login:', err)
      setError('Erro ao entrar no portal')
    } finally {
      setFormLoading(false)
    }
  }

  const filteredOracles = oracles.filter(o => {
    const matchesSearch = (o.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.specialty?.toLowerCase().includes(searchTerm.toLowerCase()))

    if (filter === 'all') return matchesSearch
    if (filter === 'online') return matchesSearch && o.is_online
    if (filter === 'tarot') return matchesSearch && o.specialty === 'Tarot'
    return matchesSearch
  })

  const openAuth = (role: 'client' | 'oracle' = 'client', register: boolean = false) => {
    setRegistrationRole(role)
    setIsRegistering(register)
    setShowAuthModal(true)
    setShowOtpScreen(false)
    setError('')
  }

  return (
    <div className="min-h-screen bg-deep-space relative overflow-x-hidden">
      {/* Background Decorativo */}
      <div className="stars-overlay fixed inset-0 pointer-events-none" />
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-purple/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-cyan/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Header Sticky */}
      <nav className="sticky top-0 z-50 w-full glass-header py-4 px-6 border-b border-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push('/')}>
            <img src="/logo.png" alt="StarTarot" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold tracking-tighter text-white">Star<span className="text-neon-purple">Tarot</span></span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {isAuthenticated ? (
              <NeonButton variant="purple" size="sm" onClick={() => router.push('/app')}>
                <LayoutDashboard size={16} className="mr-2" /> Meu Portal
              </NeonButton>
            ) : (
              <div className="flex items-center space-x-4">
                <button onClick={() => openAuth('client', false)} className="text-sm font-bold text-white hover:text-neon-purple transition-all">
                  Entrar
                </button>
                <NeonButton variant="purple" size="sm" onClick={() => openAuth('client', true)}>
                  Cadastre-se
                </NeonButton>
              </div>
            )}
          </div>

          <div className="md:hidden">
            <button onClick={() => openAuth('client', false)} className="text-neon-purple">
              <LogIn size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <main className="max-w-7xl mx-auto px-6 pt-12 pb-24 relative z-10">
        <header className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-neon-gold text-[10px] uppercase font-bold tracking-[0.2em] mb-6"
          >
            <Sparkles size={12} />
            <span>Bem-vindo ao Novo Amanhecer</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold font-raleway text-white mb-6 leading-[1.1]"
          >
            A orientação cósmica que <br />
            <span className="neon-text-purple">você busca está aqui.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10"
          >
            Conecte-se com os melhores oraculistas do Brasil em consultas em tempo real ou mensagens exclusivas.
          </motion.p>

          {!isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <NeonButton variant="purple" size="lg" className="min-w-[220px]" onClick={() => openAuth('client', true)}>
                Iniciar Minha Jornada
              </NeonButton>
            </motion.div>
          )}
        </header>

        {/* Marketplace Filter */}
        <section className="space-y-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Sun className="mr-3 text-neon-gold" /> Oraculistas Online
            </h2>

            <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              {[
                { id: 'all', label: 'Todos', icon: <Sun size={14} /> },
                { id: 'online', label: 'Online', icon: <Moon size={14} /> },
                { id: 'tarot', label: 'Tarot', icon: <Star size={14} /> },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFilter(item.id)}
                  className={`flex items-center space-x-2 px-5 py-2 rounded-full border transition-all whitespace-nowrap ${filter === item.id
                    ? 'bg-neon-purple text-white border-neon-purple shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                >
                  {item.icon}
                  <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {marketplaceLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass h-80 animate-pulse bg-white/5 border-white/5 rounded-3xl" />
              ))
            ) : filteredOracles.length > 0 ? (
              <AnimatePresence>
                {filteredOracles.map((oracle, idx) => (
                  <motion.div
                    key={oracle.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <OracleCard oracle={oracle} />
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="col-span-full py-20 text-center glass border-white/5 rounded-3xl">
                <Search size={48} className="mx-auto text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Nenhum oráculo disponível agora</h3>
                <p className="text-slate-500">Tente ajustar seus filtros para encontrar outros guias.</p>
              </div>
            )}
          </div>
        </section>

        {/* CTA Banner Section */}
        {!isAuthenticated && (
          <section className="mt-24 relative rounded-[40px] overflow-hidden p-12 text-center md:text-left">
            <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 backdrop-blur-2xl z-0" />
            <div className="absolute inset-0 border border-white/10 rounded-[40px] pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="max-w-xl">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Sua primeira consulta <br /><span className="text-neon-gold">pode mudar tudo.</span></h2>
                <p className="text-slate-300">Cadastre-se hoje e ganhe bônus de créditos para sua primeira orientação.</p>
              </div>
              <NeonButton variant="gold" size="lg" className="px-10" onClick={() => openAuth('client', true)}>
                Resgatar Bônus Agara
              </NeonButton>
            </div>
          </section>
        )}
      </main>

      {/* Footer Minimalist */}
      <footer className="py-12 px-6 border-t border-white/5 mt-24 text-center space-y-6">
        <p className="text-slate-500 text-xs uppercase tracking-[0.2em] font-bold">
          © 2026 StarTarot Portal - Todos os direitos reservados
        </p>
      </footer>

      {/* Auth Modal Overlay */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => !formLoading && setShowAuthModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md relative z-10"
            >
              <GlassCard glowColor={registrationRole === 'oracle' ? 'gold' : 'purple'} className="p-8">
                {showOtpScreen ? (
                  <form onSubmit={handleVerifyOtp} className="space-y-6">
                    <div className="text-center space-y-2 mb-4">
                      <h2 className="text-2xl font-bold text-white">Verificação Especial</h2>
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

                    <NeonButton type="submit" variant="purple" fullWidth loading={formLoading} size="lg">
                      Confirmar e Entrar
                    </NeonButton>

                    <button
                      type="button"
                      onClick={() => setShowOtpScreen(false)}
                      className="w-full text-xs text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-1"
                    >
                      <ArrowLeft size={12} /> Digitei o número errado
                    </button>
                  </form>
                ) : isRegistering ? (
                  <form onSubmit={handleStartRegister} className="space-y-4">
                    <h2 className="text-2xl font-bold text-center mb-6">
                      {registrationRole === 'oracle' ? 'Cadastro de Oraculista' : 'Criar Nova Conta'}
                    </h2>
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
                            <option key={c.code} value={c.code} className="bg-deep-space">{c.flag} {c.code}</option>
                          ))}
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
                    {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20 text-center">{error}</div>}
                    <NeonButton type="submit" variant={registrationRole === 'oracle' ? 'gold' : 'purple'} fullWidth loading={formLoading} size="lg">
                      Gerar Código WhatsApp
                    </NeonButton>
                    <button type="button" onClick={() => setIsRegistering(false)} className="w-full text-sm text-slate-400 hover:text-white flex items-center justify-center pt-2">
                      <ArrowLeft size={14} className="mr-2" /> Já tenho uma conta
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSubmitLogin} className="space-y-6">
                    <h2 className="text-2xl font-bold text-center mb-6 text-white">Acesse o Portal</h2>
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
                    {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20 text-center">{error}</div>}
                    <NeonButton type="submit" variant="purple" fullWidth loading={formLoading} size="lg">
                      Entrar no Portal
                    </NeonButton>
                    <div className="pt-4 flex flex-col space-y-4 text-center">
                      <p className="text-sm text-slate-500">
                        Novo no templo? <button type="button" onClick={() => setIsRegistering(true)} className="text-neon-gold hover:underline">Iniciar jornada</button>
                      </p>
                    </div>
                  </form>
                )}
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
