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
                Enviamos um email de confirmação
                <br />para seu endereço de email.
              </p>
              <p className="mt-4 text-lg text-gray-400">
                Clique no link enviado para
                <br />confirmar seu cadastro.
              </p>
            </div>
          </div>

          {/* Botão para voltar */}
          <div className="text-center">
            <button
              onClick={() => router.push('/')}
              className="text-primary hover:text-primary-light underline transition-colors"
            >
              Voltar para o início
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
