'use client'

import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'

export function RootLayoutClient({
  children,
  className,
}: {
  children: React.ReactNode
  className: string
}) {
  const { checkAuth } = useAuthStore()

  useEffect(() => {
    console.log('RootLayoutClient: Verificando sessão...')
    checkAuth()
  }, [checkAuth])

  return (
    <body className={className}>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#12122a',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
          },
        }}
      />
    </body>
  )
}
