'use client'

import { useAuthStore } from '@/stores/authStore'
import { ChatModule } from '@/modules/chat'
import { usePathname } from 'next/navigation'

export function RootLayoutClient({
  children,
  className,
}: {
  children: React.ReactNode
  className: string
}) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const pathname = usePathname()
  const isAdminPage = pathname?.startsWith('/admin')

  return (
    <body className={className}>
      {children}
      {isAuthenticated && !isAdminPage && <ChatModule />}
    </body>
  )
}
