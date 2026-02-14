'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuthStore } from '@/stores/authStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { GlowInput } from '@/components/ui/GlowInput'
import { motion } from 'framer-motion'
import { Mail, Lock, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading, checkAuth, profile } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    // DESATIVADO TEMPORARIAMENTE PARA EVITAR O LOOP DE PISCADA
    /*
    if (!isLoading && isAuthenticated && profile) {
      console.log('Usuário autenticado detectado. Role:', profile.role)
      const targetPath = profile.role === 'owner' ? '/admin' : (profile.role === 'oracle' ? '/oracle' : '/app')
      if (window.location.pathname === targetPath) return
      router.push(targetPath)
    }
    */
  }, [isAuthenticated, isLoading, profile, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Botão de entrar clicado. Iniciando handleSubmit...')
    setError('')
    setFormLoading(true)

    try {
      console.log('Chamando função login do authStore...', { email })
      const result = await login(email, password)
      console.log('Resultado do login:', result)

      if (!result.success) {
        console.warn('Login falhou:', result.error)
        setError(result.error || 'Erro ao fazer login')
      } else {
        console.log('Login com sucesso! Forçando redirecionamento...')
        // Força redirecionamento manual caso o useEffect falhe
        // Pequeno delay para garantir que o estado atualizou, mas vamos confiar no router direto aqui também se possível
        // Mas como role vem do profile que é async, talvez não tenhamos o profile atualizado AQUI Imediatamente.
        // Vamos tentar ler do store direto ou apenas confiar no reload.

        // Melhor estratégia: recarregar a página ou forçar checkAuth se necessário.
        // Mas vamos deixar o useEffect fazer o trabalho, se ele não rodar, algo está bloqueando a renderização.

        // Vamos tentar um push direto para /app como fallback se não for owner, mas é arriscado sem saber a role.
        // Vamos esperar o useEffect.
        if (profile) {
          console.log('Login realizado com sucesso no banco. Perfil:', profile.role)
          const targetPath = profile.role === 'owner' ? '/admin' : (profile.role === 'oracle' ? '/oracle' : '/app')
          router.push(targetPath)
        } else {
          // Fallback if profile is not immediately available after successful login
          // This might happen if the profile fetch is still in progress.
          // In this case, we can push to a default path and let useEffect handle the final redirect.
          router.push('/app')
        }
      }
    } catch (err) {
      console.error('Erro não tratado no handleSubmit:', err)
      setError('Ocorreu um erro inesperado')
    } finally {
      console.log('Finalizando handleSubmit (setFormLoading false)')
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
            className="w-32 h-32 mx-auto mb-6 relative"
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
          <p className="text-slate-400 font-medium">O universo tem algo a lhe dizer.</p>
        </div>

        <GlassCard glowColor="purple">
          <form onSubmit={handleSubmit} className="space-y-6">
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
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20"
              >
                {error}
              </motion.div>
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
          </form>

          <div className="mt-8 flex flex-col space-y-4 text-center">
            <button className="text-sm text-slate-400 hover:text-neon-cyan transition-colors">
              Esqueceu sua chave de acesso?
            </button>
            <div className="h-px bg-white/10 w-full" />
            <p className="text-sm text-slate-500">
              Novo no templo? <button className="text-neon-gold hover:underline">Iniciar jornada</button>
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </main>
  )
}
