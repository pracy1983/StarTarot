'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthService } from '@/modules/auth/services/authService'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

function NovaSenhaForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') || ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      alert('As senhas não coincidem')
      return
    }

    if (!token) {
      alert('Token inválido')
      return
    }

    try {
      const authService = new AuthService()
      const success = await authService.resetPassword(token, password)

      if (success) {
        alert('Senha alterada com sucesso')
        router.push('/login')
      } else {
        alert('Erro ao alterar senha')
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error)
      alert('Erro ao alterar senha')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-primary mb-6">Nova Senha</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo de senha */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Nova Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/20 border border-primary/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/40"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Campo de confirmação de senha */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-black/20 border border-primary/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/40"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary/20 hover:bg-primary/30 text-primary py-2 px-4 rounded-lg transition-colors duration-300"
            >
              Alterar Senha
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function NovaSenhaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-4">Carregando...</div>}>
      <NovaSenhaForm />
    </Suspense>
  )
}
