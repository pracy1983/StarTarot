'use client'

import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Header } from '@/components/layout/Header'

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
      
      {/* Conteúdo */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
