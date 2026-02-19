'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { GlowInput } from '@/components/ui/GlowInput'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Sparkles, User, ArrowLeft, Phone, ShieldCheck, Search, Moon, Sun, Star, LogIn, LayoutDashboard, ChevronDown, Check, X, Clock, MessageSquare, Video, Smartphone } from 'lucide-react'
import { whatsappService } from '@/lib/whatsapp'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { OracleCard } from '@/components/client/OracleCard'
import { OracleFilters } from '@/components/client/OracleFilters'
import { AuthModal } from '@/components/auth/AuthModal'

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
  const { login, signUp, isAuthenticated, isLoading, checkAuth, profile, logout, showAuthModal, setShowAuthModal, setAuthMode, setRegistrationRole } = useAuthStore()

  // Marketplace States
  const [oracles, setOracles] = useState<any[]>([])
  const [marketplaceLoading, setMarketplaceLoading] = useState(true)
  const [filter, setFilter] = useState('all') // online, all
  const [searchTerm, setSearchTerm] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('all')
  const [specialties, setSpecialties] = useState<string[]>([])
  const [favorites, setFavorites] = useState<string[]>([])

  // Global Settings
  const [settings, setSettings] = useState({
    commission: 70,
    signupBonus: 50
  })
  const [showGanhosModal, setShowGanhosModal] = useState(false)


  useEffect(() => {
    checkAuth()
    fetchOracles()
    fetchSpecialties()
    fetchGlobalSettings()
    if (isAuthenticated) fetchFavorites()
  }, [checkAuth, isAuthenticated])

  const fetchGlobalSettings = async () => {
    try {
      const { data } = await supabase.from('global_settings').select('key, value')
      if (data) {
        const commission = data.find(s => s.key === 'oracle_commission_pc')?.value
        const bonus = data.find(s => s.key === 'signup_bonus_credits')?.value
        setSettings({
          commission: commission ? parseInt(commission) : 70,
          signupBonus: bonus ? parseInt(bonus) : 50
        })
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
    }
  }

  const fetchSpecialties = async () => {
    // Correct table names: specialties and categories
    const [cats, tops] = await Promise.all([
      supabase.from('categories').select('name').order('name'),
      supabase.from('specialties').select('name').order('name')
    ])

    const combined = Array.from(new Set([
      ...(cats.data || []).map(s => s.name),
      ...(tops.data || []).map(s => s.name)
    ]))
    setSpecialties(combined)
  }

  const fetchFavorites = async () => {
    if (!profile?.id) return
    const { data } = await supabase
      .from('user_favorites')
      .select('oracle_id')
      .eq('user_id', profile.id)

    if (data) setFavorites(data.map(f => f.oracle_id))
  }

  const fetchOracles = async () => {
    try {
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*, allows_video, allows_text')
        .in('role', ['oracle', 'owner'])
        .eq('application_status', 'approved')

      if (pError) throw pError

      const activeProfiles = profiles.filter(p => p.allows_video || p.allows_text)

      const { data: schedules } = await supabase
        .from('schedules')
        .select('*')
        .in('oracle_id', activeProfiles.map(p => p.id))

      const oraclesWithSchedules = activeProfiles.map(p => ({
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

  const isOnline = (o: any) => {
    const now = new Date()
    const currentDay = now.getDay()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    const todaySchedules = (o.schedules || []).filter((s: any) => s.day_of_week === currentDay && s.is_active)

    const isInSchedule = todaySchedules.some((s: any) => {
      const [startH, startM] = s.start_time.split(':').map(Number)
      const [endH, endM] = s.end_time.split(':').map(Number)
      return currentTime >= (startH * 60 + startM) && currentTime <= (endH * 60 + endM)
    })

    if (o.is_ai || o.oracle_type === 'ai') {
      return isInSchedule
    }

    if (!o.is_online || !o.last_heartbeat_at) return false
    const lastPulse = new Date(o.last_heartbeat_at).getTime()
    return (now.getTime() - lastPulse) < 120000 // 2 minutes
  }

  const getSortedOracles = (list: any[]) => {
    const favoritesList = list.filter(o => favorites.includes(o.id))
    const remaining = list.filter(o => !favorites.includes(o.id))

    const onlineList = remaining.filter(o => isOnline(o)).sort(() => Math.random() - 0.5)
    const offlineList = remaining.filter(o => !isOnline(o))

    return [...favoritesList, ...onlineList, ...offlineList]
  }

  const filteredOracles = getSortedOracles(oracles
    .filter(o => {
      const matchesSearch = (
        (o.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.specialty || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.categories || []).some((c: string) => c.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.topics || []).some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase()))
      )

      let matchesStatus = true
      if (filter === 'online') {
        matchesStatus = isOnline(o)
      }

      let matchesSpecialty = true
      if (specialtyFilter !== 'all') {
        matchesSpecialty = (
          (o.categories || []).includes(specialtyFilter) ||
          (o.topics || []).includes(specialtyFilter) ||
          o.specialty === specialtyFilter
        )
      }

      return matchesSearch && matchesStatus && matchesSpecialty
    }))

  const openAuth = (role: 'client' | 'oracle' = 'client', register: boolean = false) => {
    setRegistrationRole(role)
    setAuthMode(register ? 'register' : 'login')
    setShowAuthModal(true)
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
            {!isAuthenticated && (
              // Trabalhe Conosco removed as requested
              <div />
            )}
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
            <button onClick={() => openAuth('client', false)} className="text-neon-purple p-2">
              <User size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <main className="max-w-7xl mx-auto px-6 pt-8 pb-16 relative z-10">
        <header className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neon-gold text-[9px] uppercase font-bold tracking-[0.2em] mb-4"
          >
            <Sparkles size={10} />
            <span>Bem-vindo ao Novo Amanhecer</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold font-raleway text-white mb-4 leading-[1.2] tracking-tight"
          >
            A orientação cósmica que <br />
            <span className="neon-text-purple text-3xl md:text-5xl">você busca está aqui.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-base md:text-lg max-w-xl mx-auto mb-8"
          >
            Conecte-se com os melhores oraculistas em consultas em tempo real ou mensagens exclusivas.
          </motion.p>
        </header>

        {/* Marketplace Filter */}
        <section className="space-y-8">

          <OracleFilters
            filter={filter}
            setFilter={setFilter}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            specialtyFilter={specialtyFilter}
            setSpecialtyFilter={setSpecialtyFilter}
            specialties={specialties}
          />

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

        {/* CTA Banner Section - Coupon Style */}
        {!isAuthenticated && (
          <section className="mt-24 relative rounded-[40px] overflow-hidden p-8 md:p-12 text-center md:text-left">
            {/* Background with Coupon Border Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1e1e3f] to-[#0a0a1a] z-0" />
            <div className="absolute inset-2 border-2 border-dashed border-neon-gold/30 rounded-[32px] pointer-events-none" />

            {/* Coupon Cutouts */}
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-deep-space rounded-full z-10 hidden md:block" />
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-deep-space rounded-full z-10 hidden md:block" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="max-w-xl space-y-4">
                <div className="inline-flex items-center space-x-2 text-neon-gold bg-neon-gold/10 px-3 py-1 rounded-full border border-neon-gold/20">
                  <Sparkles size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Oferta de Boas-vindas</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                  Sua primeira consulta <br />
                  <span className="neon-text-gold">sai por nossa conta.</span>
                </h2>
                <p className="text-slate-400 text-lg">
                  Cadastre-se hoje e ganhe <span className="text-white font-bold">{settings.signupBonus} créditos</span> de bônus imediato para sua primeira orientação.
                </p>
              </div>
              <div className="shrink-0">
                <NeonButton variant="gold" size="lg" className="px-12 py-6 text-lg shadow-[0_0_30px_rgba(234,179,8,0.2)]" onClick={() => openAuth('client', true)}>
                  Resgatar Meus {settings.signupBonus} Créditos
                </NeonButton>
              </div>
            </div>
          </section>
        )}

        {/* Oracle Registration Section */}
        {(!isAuthenticated || (profile?.role !== 'oracle' && profile?.role !== 'owner')) && (
          <section className="mt-20 pb-10">
            <GlassCard className="p-8 md:p-10 border-white/5 relative overflow-hidden max-w-5xl mx-auto" hover={false}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/10 blur-[100px] -z-10" />
              <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1 space-y-5">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-neon-cyan/5 border border-neon-cyan/10 text-neon-cyan text-[9px] font-bold uppercase tracking-widest">
                    <Sparkles size={10} />
                    <span>Seletiva de Oraculistas</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                    Compartilhe seu Dom <br />
                    no <span className="neon-text-purple">StarTarot</span>
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
                    Buscamos os melhores guias para manter a excelência do nosso templo. Sua candidatura passará por uma avaliação criteriosa e, se aprovado, você entrará em nossa lista de espera exclusiva.
                  </p>

                  <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="flex items-start space-x-2">
                      <div className="mt-1 w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center text-green-400">
                        <Check size={10} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Transparência</p>
                        <p className="text-[10px] text-slate-500">Você recebe {settings.commission}% do valor</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="mt-1 w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center text-green-400">
                        <Check size={10} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Fila de Espera</p>
                        <p className="text-[10px] text-slate-500">Curadoria para todos ganharem bem</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <NeonButton variant="purple" size="md" onClick={() => openAuth('oracle', true)} className="px-6 h-11 text-xs">
                      Enviar Candidatura
                    </NeonButton>
                    <button
                      onClick={() => setShowGanhosModal(true)}
                      className="text-[11px] font-bold text-slate-400 hover:text-white transition-all px-5 py-2.5 border border-white/10 rounded-xl hover:bg-white/5 h-11"
                    >
                      Ver Simulador de Ganhos
                    </button>
                  </div>
                </div>
                <div className="flex-shrink-0 w-full md:w-[280px] h-[280px] relative group hidden md:block">
                  <div className="absolute inset-0 bg-neon-purple/10 blur-2xl rounded-full group-hover:bg-neon-purple/20 transition-all" />
                  <img
                    src="https://images.unsplash.com/photo-1635817215354-93e114002e26?auto=format&fit=crop&q=80&w=600"
                    alt="Tarot Oracle"
                    className="w-full h-full object-cover rounded-[30px] relative z-10 border border-white/10 shadow-xl opacity-80"
                  />
                  <div className="absolute -bottom-4 -right-4 glass p-4 rounded-2xl z-20 border border-white/10 shadow-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-neon-gold/10 flex items-center justify-center text-neon-gold">
                        <Star size={16} className="fill-neon-gold" />
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-tighter text-slate-500 leading-none mb-1">Potencial Médio</p>
                        <p className="text-sm font-bold text-white leading-none">R$ 3.500+</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </section>
        )}

        {/* Como Funciona Section */}
        <section className="mt-20 py-10">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Como o <span className="neon-text-purple">StarTarot</span> Funciona</h2>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto">Tudo o que você precisa para sua jornada espiritual em um só lugar.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass p-8 rounded-[30px] border-white/5 space-y-4 text-center group hover:bg-white/[0.07] transition-all">
              <div className="w-14 h-14 bg-neon-purple/10 rounded-2xl flex items-center justify-center text-neon-purple mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Search size={24} />
              </div>
              <h3 className="font-bold text-white">1. Escolha seu Guia</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Navegue pelos perfis, veja especialidades e avaliações reais de outros consulentes.</p>
            </div>

            <div className="glass p-8 rounded-[30px] border-white/5 space-y-4 text-center group hover:bg-white/[0.07] transition-all">
              <div className="w-14 h-14 bg-neon-cyan/10 rounded-2xl flex items-center justify-center text-neon-cyan mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Sparkles size={24} />
              </div>
              <h3 className="font-bold text-white">2. Carregue Créditos</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Adicione créditos de forma segura via PIX ou Cartão para usar no seu próprio ritmo.</p>
            </div>

            <div className="glass p-8 rounded-[30px] border-white/5 space-y-4 text-center group hover:bg-white/[0.07] transition-all">
              <div className="w-14 h-14 bg-neon-gold/10 rounded-2xl flex items-center justify-center text-neon-gold mx-auto mb-4 group-hover:scale-110 transition-transform">
                <MessageSquare size={24} />
              </div>
              <h3 className="font-bold text-white">3. Inicie a Consulta</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Escolha entre Chat por Mensagem ou Chamada de Vídeo Privada com total sigilo.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Ganhos Modal */}
      <AnimatePresence>
        {showGanhosModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGanhosModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0a0a1a] border border-white/10 rounded-[40px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 md:p-12 space-y-8 max-h-[90vh] overflow-y-auto">
                <button
                  onClick={() => setShowGanhosModal(false)}
                  className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>

                <header>
                  <div className="inline-flex items-center space-x-2 text-neon-purple mb-2">
                    <Sparkles size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">Simulador de Prosperidade</span>
                  </div>
                  <h3 className="text-3xl font-bold text-white">Sua carreira como <span className="neon-text-purple">Oraculista</span></h3>
                  <p className="text-slate-400 mt-2 italic">Trabalhe de onde quiser, com a liberdade que você merece.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass p-6 rounded-3xl border-white/5 space-y-4">
                    <div className="flex items-center gap-3 text-neon-cyan">
                      <Smartphone size={20} />
                      <h4 className="font-bold text-white">Mobilidade Total</h4>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">Não precisa estar no computador. Responda mensagens e atenda vídeos direto pelo seu celular.</p>
                  </div>

                  <div className="glass p-6 rounded-3xl border-white/5 space-y-4">
                    <div className="flex items-center gap-3 text-neon-gold">
                      <Star size={20} />
                      <h4 className="font-bold text-white">{settings.commission}% de Repasse</h4>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">Sua comissão é automática. Tudo o que você atende entra na hora para sua carteira virtual.</p>
                  </div>
                </div>

                <div className="bg-neon-purple/5 border border-neon-purple/20 p-6 rounded-3xl">
                  <h4 className="font-bold text-white mb-6 flex items-center gap-2">
                    <Clock size={18} className="text-neon-gold" />
                    Exemplo de Ganhos Possíveis
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Vídeo (Avg: R$ 3,00/min - 2h/dia x 20 dias)</span>
                      <span className="text-white font-mono text-right">R$ 7.200,00*</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Mensagens (Avg: R$ 15,00/msg - 10/dia x 20 dias)</span>
                      <span className="text-white font-mono text-right">R$ 3.000,00*</span>
                    </div>
                    <div className="h-px bg-white/10 my-4" />
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-neon-gold font-black uppercase tracking-widest">Seu Ganho Líquido ({settings.commission}%)</p>
                        <p className="text-2xl font-black text-white leading-none mt-1">R$ {(10200 * (settings.commission / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Por apenas</p>
                        <p className="text-sm font-bold text-slate-300">40h/mês dedicadas</p>
                      </div>
                    </div>
                    <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                      <p className="text-xs font-bold text-neon-cyan flex items-center gap-2">
                        <ShieldCheck size={14} /> Curadoria StarTarot
                      </p>
                      <p className="text-[10px] text-slate-500 leading-relaxed italic">
                        Não somos um marketplace aberto e ilimitado. Cada oraculista é avaliado individualmente e entra em filla de espera. Fazemos isso para garantir que todos os guias ativos tenham movimento real e possam prestar um atendimento de excelência.
                      </p>
                    </div>
                    <p className="text-[9px] text-slate-600 mt-4 italic leading-relaxed">
                      * Estimativas baseadas em tarifas médias sugeridas. Como oraculista, você é livre para definir seus próprios preços.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <NeonButton variant="purple" fullWidth size="lg" onClick={() => { setShowGanhosModal(false); openAuth('oracle', true); }}>
                    Candidate-se Agora
                  </NeonButton>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Minimalist */}
      <footer className="py-12 px-6 border-t border-white/5 mt-24 text-center space-y-6">
        <p className="text-slate-500 text-xs uppercase tracking-[0.2em] font-bold">
          © 2026 StarTarot Portal - Todos os direitos reservados
        </p>
      </footer>

      <AuthModal />
    </div >
  )
}

