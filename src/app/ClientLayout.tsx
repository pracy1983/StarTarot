'use client'

import { useAuthStore } from '@/stores/authStore'
import { ChatModule } from '@/modules/chat'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const checkAuth = useAuthStore(state => state.checkAuth)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const pathname = usePathname()
  const isAdminPage = pathname?.startsWith('/admin')

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <>
      {children}
      {isAuthenticated && !isAdminPage && <ChatModule />}
    </>
  )
}
