'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { verifyEmail } from '@/services/auth'

export default function VerificarEmailPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await verifyEmail(code)
      if (result.success) {
        router.push('/dashboard')
      } else {
        setError(result.error || 'Código inválido')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar email')
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
              <h1 className="font-raleway text-4xl font-bold text-primary mb-4">Verificar Email</h1>
              <p className="text-xl text-gray-300 font-light leading-relaxed">
                Digite o código de verificação
                <br />enviado para seu email
              </p>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Digite o código"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-black/40 border border-primary/20 rounded-lg
                           focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
                           text-white placeholder-gray-400 transition-all duration-200
                           text-center text-2xl tracking-wider"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full px-4 py-3 bg-primary hover:bg-primary-light text-black font-semibold
                       rounded-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02]
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? 'Verificando...' : 'Verificar'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
