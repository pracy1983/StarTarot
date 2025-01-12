'use client'

import { useAuthStore } from '@/stores/authStore'

interface PacoteCredito {
  id: string
  quantidade: number
  preco: number
  bonus?: number
}

const pacotesCreditos: PacoteCredito[] = [
  {
    id: 'basico',
    quantidade: 10,
    preco: 50.00
  },
  {
    id: 'plus',
    quantidade: 25,
    preco: 100.00,
    bonus: 5
  },
  {
    id: 'premium',
    quantidade: 50,
    preco: 180.00,
    bonus: 15
  }
]

export default function CreditosPage() {
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-raleway font-bold text-primary mb-2">
            Adicionar Créditos
          </h1>
          <p className="text-gray-300">
            Escolha o pacote que melhor atende suas necessidades
          </p>
        </div>

        {/* Saldo atual */}
        <div className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-primary">Seu Saldo</h2>
              <p className="text-gray-300 mt-1">
                Você possui atualmente:
              </p>
            </div>
            <div className="text-3xl font-bold text-primary">
              0 créditos
            </div>
          </div>
        </div>

        {/* Grid de pacotes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pacotesCreditos.map(pacote => (
            <div
              key={pacote.id}
              className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-6 hover:border-primary/40 transition-all duration-300"
            >
              <div className="text-center mb-4">
                <h3 className="text-xl font-semibold text-primary mb-2">
                  {pacote.quantidade} Créditos
                </h3>
                {pacote.bonus && (
                  <span className="text-green-500 text-sm">
                    +{pacote.bonus} bônus
                  </span>
                )}
              </div>

              <div className="text-center mb-6">
                <span className="text-3xl font-bold text-white">
                  R$ {pacote.preco.toFixed(2)}
                </span>
              </div>

              <button
                onClick={() => {
                  // Aqui virá a integração com o gateway de pagamento
                  alert('Em breve: integração com gateway de pagamento')
                }}
                className="w-full bg-primary/20 hover:bg-primary/30 text-primary py-2 rounded-lg transition-colors duration-300"
              >
                Comprar Agora
              </button>
            </div>
          ))}
        </div>

        {/* Informações adicionais */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>Os créditos são adicionados instantaneamente após a confirmação do pagamento.</p>
          <p className="mt-2">Precisa de ajuda? Entre em contato com nosso suporte.</p>
        </div>
      </div>
    </div>
  )
}
