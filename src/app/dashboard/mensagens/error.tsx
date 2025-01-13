'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col h-full">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-primary">Caixa de Mensagens</h1>
        <p className="text-gray-400">Suas consultas e respostas dos oraculistas</p>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-500 mb-4">
            Algo deu errado!
          </h2>
          <p className="text-gray-400 mb-4">
            Não foi possível carregar suas mensagens.
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  )
}
