import { ChatWindow } from '@/components/chat/ChatWindow'
import { redirect } from 'next/navigation'
import { generateStaticParams } from './generateStaticParams'
import { Oraculista } from './types'

export const dynamicParams = false // Ensure only statically generated params are used

export default async function ChatPage({
  params,
}: {
  params: { nome: string }
}) {
  // Verify if the param is valid
  const staticParams = await generateStaticParams()
  const isValidParam = staticParams.some((p: { nome: string }) =>
    p.nome === encodeURIComponent(params.nome)
  )

  if (!isValidParam) {
    redirect('/')
  }

  const nome = decodeURIComponent(params.nome)

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <ChatWindow oraculista={nome} />
      </div>
    </div>
  )
}
