'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthService } from '@/modules/auth/services/authService'

export default function VerificarEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') || ''

  useEffect(() => {
    if (token) {
      const verifyEmail = async () => {
        try {
          const authService = new AuthService()
          const success = await authService.verifyEmail(token)

          if (success) {
            setStatus('success')
            setTimeout(() => {
              router.push('/login')
            }, 3000)
          } else {
            setStatus('error')
          }
        } catch (error) {
          console.error('Erro ao verificar email:', error)
          setStatus('error')
        }
      }

      verifyEmail()
    } else {
      setStatus('error')
    }
  }, [token, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-primary mb-6">
            Verificação de Email
          </h1>

          {status === 'loading' && (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
              <p className="text-gray-400 mt-4">
                Verificando seu email...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div>
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <svg
                  className="w-6 h-6 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-green-500 mt-4">
                Email verificado com sucesso!
              </p>
              <p className="text-gray-400 mt-2">
                Redirecionando para a página de login...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                <svg
                  className="w-6 h-6 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <p className="text-red-500 mt-4">
                Erro ao verificar email
              </p>
              <p className="text-gray-400 mt-2">
                O link pode ter expirado ou ser inválido
              </p>
              <button
                onClick={() => router.push('/login')}
                className="mt-4 bg-primary/20 hover:bg-primary/30 text-primary py-2 px-4 rounded-lg transition-colors duration-300"
              >
                Voltar para o login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
