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

  useEffect(() => {
    checkAuth()
    fetchOracles()
    fetchSpecialties()
    if (isAuthenticated) fetchFavorites()
  }, [checkAuth, isAuthenticated])

  const fetchSpecialties = async () => {
    const { data } = await supabase
      .from('specialties')
      .select('name')
      .eq('active', true)
      .order('name', { ascending: true })
    if (data) setSpecialties(data.map(s => s.name))
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
      const matchesSearch = (o.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.specialty?.toLowerCase().includes(searchTerm.toLowerCase()))

      let matchesStatus = true
      if (filter === 'online') {
        matchesStatus = isOnline(o)
      }

      let matchesSpecialty = true
      if (specialtyFilter !== 'all') {
        if (specialtyFilter === 'OUTROS') {
          matchesSpecialty = !specialties.some(s => s.toLowerCase() === o.specialty?.toLowerCase())
        } else {
          matchesSpecialty = o.specialty?.toLowerCase() === specialtyFilter.toLowerCase()
        }
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

          {/* Iniciar Minha Jornada button removed as requested */}
        </header>

        {/* Marketplace Filter */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Sun className="mr-3 text-neon-gold" /> Oraculistas Online
            </h2>

            {/* Status & Search */}
            <div className="flex flex-col md:flex-row items-center gap-4">
              {/* Status Tabs */}
              <div className="flex items-center space-x-1 md:space-x-2 bg-white/5 p-1 rounded-full border border-white/5 w-fit overflow-x-auto no-scrollbar max-w-full">
                {[
                  { id: 'all', label: 'Todos', icon: <Sun className="w-3 h-3 md:w-4 md:h-4" /> },
                  { id: 'online', label: 'Online', icon: <Moon className="w-3 h-3 md:w-4 md:h-4" /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFilter(item.id)}
                    className={`flex items-center space-x-1.5 md:space-x-2 px-3 md:px-4 py-1.5 rounded-full transition-all whitespace-nowrap text-[12px] md:text-sm font-medium ${filter === item.id
                      ? 'bg-neon-purple text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-64 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-neon-cyan transition-colors w-4 h-4 md:w-[16px] md:h-[18px]" />
                <input
                  type="text"
                  placeholder="Buscar oráculo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-[12px] md:text-sm text-white focus:border-neon-cyan/50 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Specialty Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar max-w-full py-1 bg-white/5 p-4 rounded-2xl border border-white/5">
            <button
              onClick={() => { setSpecialtyFilter('all') }}
              className={`px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${specialtyFilter === 'all'
                ? 'bg-neon-gold border-neon-gold text-deep-space'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
            >
              Todas Especialidades
            </button>
            {specialties.map(s => (
              <button
                key={s}
                onClick={() => { setSpecialtyFilter(s) }}
                className={`px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${specialtyFilter === s
                  ? 'bg-neon-purple border-neon-purple text-white'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
              >
                {s}
              </button>
            ))}
            <button
              onClick={() => { setSpecialtyFilter('OUTROS') }}
              className={`px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${specialtyFilter === 'OUTROS'
                ? 'bg-slate-500 border-slate-500 text-white'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
            >
              Outros
            </button>
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
                Resgatar Bônus Agora
              </NeonButton>
            </div>
          </section>
        )}

        {/* Oracle Registration Section */}
        {(!isAuthenticated || (profile?.role !== 'oracle' && profile?.role !== 'owner')) && (
          <section className="mt-32 pb-20">
            <GlassCard className="p-12 border-white/5 relative overflow-hidden" hover={false}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/10 blur-[100px] -z-10" />
              <div className="flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1 space-y-6">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan text-[10px] font-bold uppercase tracking-widest">
                    <Sparkles size={12} />
                    <span>Oportunidade</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                    Seja um Oraculista no <br />
                    <span className="neon-text-cyan">StarTarot</span>
                  </h2>
                  <p className="text-slate-400 text-lg leading-relaxed">
                    Transforme seu dom em uma fonte de renda. Atenda clientes de todo o país através de chat e vídeo com total segurança e suporte.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <NeonButton variant="cyan" size="lg" onClick={() => openAuth('oracle', true)}>
                      Cadastrar como Oraculista
                    </NeonButton>
                    <button className="text-sm font-bold text-slate-400 hover:text-white transition-colors px-6">
                      Saiba mais sobre ganhos
                    </button>
                  </div>
                </div>
                <div className="flex-shrink-0 w-full md:w-80 h-80 relative group">
                  <div className="absolute inset-0 bg-neon-cyan/20 blur-3xl rounded-full group-hover:bg-neon-cyan/30 transition-all" />
                  <img
                    src="https://images.unsplash.com/photo-1515940175183-6798529cb860?auto=format&fit=crop&q=80&w=800"
                    alt="Oracle"
                    className="w-full h-full object-cover rounded-3xl relative z-10 border border-white/10"
                  />
                </div>
              </div>
            </GlassCard>
          </section>
        )}
      </main>

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
