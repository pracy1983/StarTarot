'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const creditOptions = [
  { value: 15, label: 'R$ 15' },
  { value: 30, label: 'R$ 30' },
  { value: 60, label: 'R$ 60' },
  { value: 120, label: 'R$ 120' },
  { value: 250, label: 'R$ 250' }
]

export default function Credits() {
  const router = useRouter()
  const [selectedValue, setSelectedValue] = useState<number | null>(null)
  const currentBalance = 0 // TODO: Integrar com o backend

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-primary mb-8">Créditos</h1>
        
        {/* Saldo Atual */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-2">Seu Saldo</h2>
          <p className="text-3xl font-bold text-primary">
            R$ {currentBalance.toFixed(2)}
          </p>
        </div>

        {/* Texto Informativo */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 mb-8">
          <p className="text-gray-300">
            Os valores das consultas variam de acordo com cada oraculista.
            Recomendamos verificar o valor específico antes de iniciar sua consulta.
          </p>
        </div>

        {/* Opções de Valores */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {creditOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedValue(option.value)}
              className={`
                p-4 rounded-lg text-lg font-semibold transition-all duration-300
                ${selectedValue === option.value
                  ? 'bg-primary text-black'
                  : 'bg-gray-900/50 hover:bg-gray-800/50 text-white'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Botão de Compra */}
        <button
          onClick={() => {
            if (selectedValue) {
              // TODO: Integrar com gateway de pagamento
              console.log(`Comprar ${selectedValue} créditos`)
            }
          }}
          disabled={!selectedValue}
          className={`
            w-full py-4 rounded-lg text-xl font-bold transition-all duration-300
            ${selectedValue
              ? 'bg-primary text-black hover:bg-primary/90'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {selectedValue
            ? `Comprar R$ ${selectedValue} em créditos`
            : 'Selecione um valor'}
        </button>
      </div>
    </div>
  )
}
