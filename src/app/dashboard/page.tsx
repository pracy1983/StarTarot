import { redirect } from 'next/navigation'

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-raleway font-bold text-primary mb-4">
        Dashboard StarTarot
      </h1>
      <p className="text-xl text-gray-300">
        Bem-vindo ao seu portal místico.
      </p>
    </main>
  )
}
