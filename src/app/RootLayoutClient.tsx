'use client'

import { useAuthStore } from '@/stores/authStore'
import { ChatModule } from '@/modules/chat'

export function RootLayoutClient({
  children,
  className,
}: {
  children: React.ReactNode
  className: string
}) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  return (
    <body className={className}>
      {children}
      {isAuthenticated && <ChatModule />}
    </body>
  )
}
