import Image from 'next/image'
import { Oraculista } from '../types/oraculista'

interface OraculistaCardProps {
  oraculista: Oraculista
  onClick: () => void
}

export function OraculistaCard({ oraculista, onClick }: OraculistaCardProps) {
  return (
    <div className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg overflow-hidden hover:border-primary/40 transition-all duration-300 flex flex-col">
      <div className="p-4">
        <div className="flex gap-4">
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

        {/* Status de disponibilidade */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            oraculista.disponivel 
              ? 'bg-green-500 animate-[pulse_1s_ease-in-out_infinite]' 
              : 'bg-red-500'
          }`} />
          <span className={`text-sm ${
            oraculista.disponivel 
              ? 'text-green-500' 
              : 'text-red-500'
          }`}>
            {oraculista.disponivel ? 'Disponível' : 'Indisponível'}
          </span>
        </div>
      </div>

      {/* Preço e botão */}
      <div className="mt-auto border-t border-primary/20 p-4 flex items-center justify-between h-[72px]">
        <span className="text-primary font-semibold">
          R$ {oraculista.preco} por pergunta
        </span>
        <button
          onClick={onClick}
          className={`px-4 py-2 rounded-lg transition-colors duration-300 ${
            oraculista.disponivel
              ? 'bg-primary/20 hover:bg-primary/30 text-primary cursor-pointer'
              : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
          }`}
          disabled={!oraculista.disponivel}
        >
          Consultar
        </button>
      </div>
    </div>
  )
}
