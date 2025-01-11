'use client'

import { useAuthStore } from '@/stores/authStore'
import { ChatModule } from '@/modules/chat'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  return (
    <>
      {children}
      {isAuthenticated && <ChatModule />}
    </>
  )
}
