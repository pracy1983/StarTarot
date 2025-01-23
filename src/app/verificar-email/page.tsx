'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { verifyEmail } from '@/services/auth'

export default function VerificarEmailPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams?.get('email') || ''

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
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold text-white">Verifique seu Email</h1>
              <p className="text-gray-300">
                Enviamos um email de confirmação para:
                <br />
                <span className="font-semibold text-primary">{email}</span>
                <br />
                Por favor, verifique sua caixa de entrada e clique no link de confirmação para continuar.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg">
              <p className="text-red-500 text-center">{error}</p>
            </div>
          )}

          <div className="text-center text-sm text-gray-400">
            <p>Não recebeu o email? Verifique sua caixa de spam ou tente novamente.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
