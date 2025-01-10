'use client'

import { Header } from '@/components/layout/Header'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background principal */}
      <div 
        className="fixed inset-0 w-screen h-screen bg-cover bg-center bg-no-repeat opacity-30"
        style={{ backgroundImage: 'url(/background.jpg)' }}
      />

      {/* Conteúdo */}
      <div className="relative z-10">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
