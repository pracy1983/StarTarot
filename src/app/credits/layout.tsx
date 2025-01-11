import { Header } from '@/components/layout/Header'

export default function CreditsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[url('/background.jpg')] bg-cover bg-center bg-no-repeat">
      <Header />
      <main>
        {children}
      </main>
    </div>
  )
}
