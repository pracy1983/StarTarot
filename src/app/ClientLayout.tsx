'use client'

import { useAuthStore } from '@/stores/authStore'
import { ChatModule } from '@/modules/chat'
import { usePathname } from 'next/navigation'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const pathname = usePathname()
  const isAdminPage = pathname?.startsWith('/admin')

  return (
    <>
      {children}
      {isAuthenticated && !isAdminPage && <ChatModule />}
    </>
  )
}
