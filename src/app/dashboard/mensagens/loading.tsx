'use client'

export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-primary">Caixa de Mensagens</h1>
        <p className="text-gray-400">Suas consultas e respostas dos oraculistas</p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lista de Mensagens - Skeleton */}
        <div className="h-[600px] bg-black/40 backdrop-blur-md border border-primary/20 rounded-2xl p-4">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-primary/10 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Thread da Mensagem - Skeleton */}
        <div className="h-[600px] bg-black/40 backdrop-blur-md border border-primary/20 rounded-2xl">
          <div className="h-full flex items-center justify-center text-gray-500">
            Carregando mensagens...
          </div>
        </div>
      </div>
    </div>
  )
}
