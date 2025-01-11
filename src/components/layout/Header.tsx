'use client'

import Link from 'next/link'
import { BellIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/stores/authStore'
import { useState, useEffect, useRef } from 'react'

export function Header() {
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Previne scroll quando menu está aberto
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMenuOpen])

  return (
    <header className="bg-black/40 backdrop-blur-md border-b border-primary/20 relative z-50">
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

          {/* Menu Principal - Desktop */}
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

          {/* Menu Direito - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
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

          {/* Botão Menu Mobile */}
          <div className="flex md:hidden">
            <button
              ref={buttonRef}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-primary transition-colors duration-200 z-50"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out md:hidden ${
          isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Menu Mobile */}
      <div
        ref={menuRef}
        className={`absolute right-0 top-0 h-auto w-64 bg-black/95 backdrop-blur-md transform transition-all duration-300 ease-in-out md:hidden ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="px-2 pt-20 pb-3 space-y-1">
          <Link 
            href="/dashboard/creditos" 
            className="block px-4 py-3 text-gray-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-200"
          >
            Saldo: R$ 0,00
          </Link>
          <Link 
            href="/dashboard/mensagens" 
            className="block px-4 py-3 text-gray-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-200"
          >
            Caixa de Mensagens
          </Link>
          <Link 
            href="/dashboard/oraculistas" 
            className="block px-4 py-3 text-gray-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-200"
          >
            Oraculistas
          </Link>
          <Link 
            href="/dashboard/perfil" 
            className="block px-4 py-3 text-gray-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-200"
          >
            Meu Perfil
          </Link>
          <div className="flex items-center justify-between px-4 py-3">
            <button className="text-gray-300 hover:text-primary transition-colors duration-200">
              <BellIcon className="h-6 w-6" />
            </button>
            <button 
              onClick={() => {
                setIsMenuOpen(false)
                logout()
              }}
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
