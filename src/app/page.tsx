'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '../stores/authStore'

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore(state => state.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

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
      setIsLoading(false)
    }
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
            <div>
              <h1 className="font-raleway text-5xl font-bold text-primary mb-4">StarTarot</h1>
              <p className="text-xl text-gray-300 font-light leading-relaxed">
                O direcionamento que você precisa,
                <br />na energia que você quer.
              </p>
              <p className="text-primary-light mt-6 text-base">
                Daemons/Baralho cigano/Oráculo dos Anjos
              </p>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg text-sm text-center">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-primary/20 rounded-lg
                           focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
                           text-white placeholder-gray-400 transition-all duration-200"
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-primary/20 rounded-lg
                           focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
                           text-white placeholder-gray-400 transition-all duration-200"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link 
                href="/cadastro" 
                className="text-primary hover:text-primary-light transition-colors duration-200"
              >
                Criar conta
              </Link>
              <Link 
                href="/esqueci-senha" 
                className="text-primary hover:text-primary-light transition-colors duration-200"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-primary hover:bg-primary-light text-black font-semibold
                       rounded-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02]
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
