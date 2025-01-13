'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '../stores/authStore'

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore(state => state.login)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const isLoading = useAuthStore(state => state.isLoading)
  const checkAuth = useAuthStore(state => state.checkAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFormLoading(true)

    try {
      const result = await login(email, password)
      if (result.success) {
        router.push('/dashboard')
      } else {
        setError(result.error || 'Erro ao fazer login')
      }
    } catch (err) {
      setError('Erro ao fazer login')
    } finally {
      setFormLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background com overlay */}
      <div 
        className="fixed inset-0 w-screen h-screen bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/background.jpg)' }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-10 bg-black/40 p-8 rounded-2xl backdrop-blur-md border border-primary/20">
          {/* Logo e Título */}
          <div className="text-center space-y-6">
            <div className="w-44 h-44 mx-auto">
              <img 
                src="/logo.png" 
                alt="StarTarot Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-4xl font-bold text-primary">StarTarot</h1>
            <p className="text-gray-400">O direcionamento que você precisa,<br/>na energia que você quer.</p>
            <p className="text-primary/80 text-sm">Daemons/Baralho cigano/Oráculo dos Anjos</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-primary/20 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-primary/20 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={formLoading}
              className={`w-full py-3 rounded-lg bg-primary text-white font-semibold transition-all ${
                formLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/80'
              }`}
            >
              {formLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Links */}
          <div className="flex justify-between text-sm">
            <Link href="/criar-conta" className="text-primary hover:text-primary/80">
              Criar conta
            </Link>
            <Link href="/esqueceu-senha" className="text-primary hover:text-primary/80">
              Esqueceu a senha?
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
