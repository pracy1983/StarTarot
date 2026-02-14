'use client'

import { Toaster } from 'react-hot-toast'

export function RootLayoutClient({
  children,
  className,
}: {
  children: React.ReactNode
  className: string
}) {
  console.log('RootLayoutClient montado!')
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
