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
  const { login, signUp, isAuthenticated, isLoading, checkAuth, profile, logout, showAuthModal, setShowAuthModal } = useAuthStore()

  // UI States
  // Placeholder isRegistering/registrationRole for openAuth compatibility if needed
  // but we can just use setShowAuthModal(true)
  const isRegistering = false
  const setIsRegistering = (v: boolean) => { }
  const registrationRole = 'client'
  const setRegistrationRole = (v: any) => { }
  const showOtpScreen = false
  const setShowOtpScreen = (v: boolean) => { }

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

  // Removed unused handlers (handled by AuthModal)

  const filteredOracles = oracles.filter(o => {
    const matchesSearch = (o.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.specialty?.toLowerCase().includes(searchTerm.toLowerCase()))

    if (filter === 'all') return matchesSearch
    if (filter === 'online') return matchesSearch && o.is_online
    if (filter === 'tarot') return matchesSearch && o.specialty === 'Tarot'
    return matchesSearch
  })

  const openAuth = (role: 'client' | 'oracle' = 'client', register: boolean = false) => {
    // Note: The new AuthModal handles its own internal state for now. 
    // We could pass these as props if we want to pre-select.
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

      <AuthModal />
    </div>
  )
}
