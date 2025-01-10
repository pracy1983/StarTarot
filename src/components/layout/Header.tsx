'use client'

import Link from 'next/link'
import { BellIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/stores/authStore'

export function Header() {
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)

  return (
    <header className="bg-black/40 backdrop-blur-md border-b border-primary/20 relative">
      {/* Sombra sutil */}
      <div className="absolute -bottom-4 left-0 right-0 h-4 bg-gradient-to-b from-primary/10 to-transparent blur-xl"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8">
              <img
                src="/logo.png"
                alt="StarTarot Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <Link href="/dashboard" className="text-primary font-raleway text-xl font-bold">
              StarTarot
            </Link>
          </div>

          {/* Menu Principal */}
          <nav className="hidden md:flex space-x-8">
            <Link 
              href="/dashboard/creditos" 
              className="text-gray-300 hover:text-primary transition-colors duration-200"
            >
              Saldo: R$ 0,00
            </Link>
            <Link 
              href="/dashboard/mensagens" 
              className="text-gray-300 hover:text-primary transition-colors duration-200"
            >
              Caixa de Mensagens
            </Link>
            <Link 
              href="/dashboard/oraculistas" 
              className="text-gray-300 hover:text-primary transition-colors duration-200"
            >
              Oraculistas
            </Link>
            <Link 
              href="/dashboard/perfil" 
              className="text-gray-300 hover:text-primary transition-colors duration-200"
            >
              Meu Perfil
            </Link>
          </nav>

          {/* Menu Direito */}
          <div className="flex items-center space-x-4">
            <button className="text-gray-300 hover:text-primary transition-colors duration-200">
              <BellIcon className="h-6 w-6" />
            </button>
            <button 
              onClick={() => logout()}
              className="text-gray-300 hover:text-primary transition-colors duration-200"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
