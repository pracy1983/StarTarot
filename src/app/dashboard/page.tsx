'use client'

import { useAuthStore } from '@/stores/authStore'
import { ChatBubbleLeftRightIcon, CreditCardIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function DashboardPage() {
  const user = useAuthStore(state => state.user)

  return (
    <div className="space-y-8">
      {/* Boas-vindas */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-raleway font-bold text-primary">
          Bem-vindo, {user?.name}
        </h1>
        <p className="text-xl text-gray-300">
          O que você gostaria de fazer hoje?
        </p>
      </div>

      {/* Cards de Ações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Iniciar Consulta */}
        <Link 
          href="/dashboard/consulta"
          className="group bg-black/40 backdrop-blur-md border border-primary/20 rounded-2xl p-6
                   hover:border-primary transition-all duration-200 ease-in-out"
        >
          <div className="space-y-4">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold text-primary">Nova Consulta</h2>
            <p className="text-gray-300">
              Inicie uma nova consulta com nossos oraculistas especializados
            </p>
          </div>
        </Link>

        {/* Adicionar Créditos */}
        <Link 
          href="/dashboard/creditos"
          className="group bg-black/40 backdrop-blur-md border border-primary/20 rounded-2xl p-6
                   hover:border-primary transition-all duration-200 ease-in-out"
        >
          <div className="space-y-4">
            <CreditCardIcon className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold text-primary">Adicionar Créditos</h2>
            <p className="text-gray-300">
              Recarregue seus créditos para realizar consultas
            </p>
          </div>
        </Link>

        {/* Ver Oraculistas */}
        <Link 
          href="/dashboard/oraculistas"
          className="group bg-black/40 backdrop-blur-md border border-primary/20 rounded-2xl p-6
                   hover:border-primary transition-all duration-200 ease-in-out"
        >
          <div className="space-y-4">
            <UserGroupIcon className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold text-primary">Oraculistas</h2>
            <p className="text-gray-300">
              Conheça nossos oraculistas e suas especialidades
            </p>
          </div>
        </Link>
      </div>

      {/* Últimas Consultas */}
      <div className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-2xl p-6">
        <h2 className="text-2xl font-semibold text-primary mb-4">Últimas Consultas</h2>
        <div className="space-y-4">
          <p className="text-gray-300 text-center py-8">
            Você ainda não realizou nenhuma consulta.
            <br />
            <Link href="/dashboard/consulta" className="text-primary hover:text-primary-light">
              Clique aqui para iniciar sua primeira consulta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
