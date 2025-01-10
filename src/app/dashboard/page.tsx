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
          className="group relative overflow-hidden rounded-2xl"
        >
          {/* Background do card */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10 group-hover:opacity-15 transition-opacity duration-200"
            style={{ backgroundImage: 'url(/background.jpg)' }}
          />
          
          {/* Conteúdo do card */}
          <div className="relative z-10 p-6 bg-black/40 backdrop-blur-md border border-primary/20 rounded-2xl
                        group-hover:border-primary transition-all duration-200 ease-in-out">
            <div className="space-y-4">
              <ChatBubbleLeftRightIcon className="h-8 w-8 text-primary" />
              <h2 className="text-xl font-semibold text-primary">Nova Consulta</h2>
              <p className="text-gray-300">
                Inicie uma nova consulta com nossos oraculistas especializados
              </p>
            </div>
          </div>
        </Link>

        {/* Adicionar Créditos */}
        <Link 
          href="/dashboard/creditos"
          className="group relative overflow-hidden rounded-2xl"
        >
          {/* Background do card */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10 group-hover:opacity-15 transition-opacity duration-200"
            style={{ backgroundImage: 'url(/background.jpg)' }}
          />
          
          {/* Conteúdo do card */}
          <div className="relative z-10 p-6 bg-black/40 backdrop-blur-md border border-primary/20 rounded-2xl
                        group-hover:border-primary transition-all duration-200 ease-in-out">
            <div className="space-y-4">
              <CreditCardIcon className="h-8 w-8 text-primary" />
              <h2 className="text-xl font-semibold text-primary">Adicionar Créditos</h2>
              <p className="text-gray-300">
                Recarregue seus créditos para realizar consultas
              </p>
            </div>
          </div>
        </Link>

        {/* Ver Oraculistas */}
        <Link 
          href="/dashboard/oraculistas"
          className="group relative overflow-hidden rounded-2xl"
        >
          {/* Background do card */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10 group-hover:opacity-15 transition-opacity duration-200"
            style={{ backgroundImage: 'url(/background.jpg)' }}
          />
          
          {/* Conteúdo do card */}
          <div className="relative z-10 p-6 bg-black/40 backdrop-blur-md border border-primary/20 rounded-2xl
                        group-hover:border-primary transition-all duration-200 ease-in-out">
            <div className="space-y-4">
              <UserGroupIcon className="h-8 w-8 text-primary" />
              <h2 className="text-xl font-semibold text-primary">Oraculistas</h2>
              <p className="text-gray-300">
                Conheça nossos oraculistas e suas especialidades
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Últimas Consultas */}
      <div className="relative overflow-hidden rounded-2xl">
        {/* Background da seção */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
          style={{ backgroundImage: 'url(/background.jpg)' }}
        />
        
        {/* Conteúdo da seção */}
        <div className="relative z-10 p-6 bg-black/40 backdrop-blur-md border border-primary/20 rounded-2xl">
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
    </div>
  )
}
