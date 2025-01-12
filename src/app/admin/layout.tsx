'use client'

import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { UsersIcon } from '@/components/icons/UsersIcon'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const user = useAuthStore(state => state.user)
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      router.push('/')
    }
  }, [isAuthenticated, user, router])

  if (!isAuthenticated || !user?.isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background principal */}
      <div 
        className="fixed inset-0 w-screen h-screen bg-cover bg-center bg-no-repeat opacity-30"
        style={{ backgroundImage: 'url(/background.jpg)' }}
      />
      
      {/* Header */}
      <Header />
      
      {/* Menu lateral */}
      <aside className="fixed top-0 left-0 w-64 h-screen bg-white p-4">
        <nav>
          <ul>
            <Link
              href="/admin/oraculists"
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                pathname === '/admin/oraculists'
                  ? 'bg-primary text-black'
                  : 'hover:bg-primary/10'
              )}
            >
              <UsersIcon className="h-5 w-5" />
              Oraculistas
            </Link>

            <Link
              href="/admin/coupons"
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                pathname === '/admin/coupons'
                  ? 'bg-primary text-black'
                  : 'hover:bg-primary/10'
              )}
            >
              <svg 
                className="h-5 w-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Cupons e Descontos
            </Link>
          </ul>
        </nav>
      </aside>
      
      {/* Conteúdo */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
