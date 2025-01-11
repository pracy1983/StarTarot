'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface Oraculista {
  id: string
  nome: string
  foto: string
  especialidades: string[]
  descricao: string
  preco: number
}

const oraculistas: Oraculista[] = [
  {
    id: '1',
    nome: 'MAGO NEGRO',
    foto: '/oraculistas/mago-negro.jpg',
    especialidades: [
      'Trabalha com tarot dos daemons',
      'Especialista em amor e finanças',
      'Foco em questões mundanas e carnais',
      'Abordagem direta e prática'
    ],
    descricao: 'Especialista em questões mundanas e carnais, com abordagem direta e prática.',
    preco: 20
  },
  {
    id: '2',
    nome: 'VÓ CLEUSA',
    foto: '/oraculistas/vo-cleusa.jpg',
    especialidades: [
      'Trabalha com tarot dos anjos',
      'Especialista em destino e missão de vida',
      'Foco em caminhos a seguir e saúde',
      'Abordagem espiritual e orientadora'
    ],
    descricao: 'Especialista em destino e missão de vida, com abordagem espiritual.',
    preco: 20
  },
  {
    id: '3',
    nome: 'CIGANA FLORA',
    foto: '/oraculistas/cigana-flora.jpg',
    especialidades: [
      'Trabalha com baralho cigano e baralho das fadas',
      'Especialista em amor, saúde e dinheiro',
      'Abordagem mística'
    ],
    descricao: 'Especialista em amor, saúde e dinheiro, com abordagem mística.',
    preco: 15
  }
]

export default function OraculistasPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen p-4">
      {/* Cabeçalho da página */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-raleway font-bold text-primary mb-2">
          Nossos Oraculistas
        </h1>
        <p className="text-gray-300">
          Escolha o oraculista que mais combina com sua necessidade
        </p>
      </div>

      {/* Grid de oraculistas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {oraculistas.map((oraculista) => (
          <div
            key={oraculista.id}
            className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg overflow-hidden hover:border-primary/40 transition-all duration-300"
          >
            <div className="flex p-4 gap-4">
              {/* Foto do oraculista */}
              <div className="relative w-24 h-24 flex-shrink-0">
                <div className="absolute inset-0 rounded-lg shadow-[0_0_15px_rgba(255,184,0,0.3)] overflow-hidden">
                  <Image
                    src={oraculista.foto}
                    alt={oraculista.nome}
                    width={96}
                    height={96}
                    className="object-cover rounded-lg"
                  />
                </div>
              </div>

              {/* Informações do oraculista */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-primary mb-1">
                  {oraculista.nome}
                </h3>
                <ul className="space-y-1">
                  {oraculista.especialidades.map((esp, index) => (
                    <li key={index} className="text-sm text-gray-300">
                      • {esp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Preço e botão */}
            <div className="border-t border-primary/20 p-4 flex items-center justify-between">
              <span className="text-primary font-semibold">
                R$ {oraculista.preco} por pergunta
              </span>
              <button
                onClick={() => router.push(`/dashboard/pergunta?oraculista=${oraculista.id}`)}
                className="bg-primary/20 hover:bg-primary/30 text-primary px-4 py-2 rounded-lg transition-colors duration-300"
              >
                Enviar pergunta
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
