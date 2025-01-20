import { ChatWindow } from '@/components/chat/ChatWindow'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { generateStaticParams } from './generateStaticParams'

export const dynamicParams = false // Ensure only statically generated params are used

export interface Oraculista {
  nome: string
}

export default async function ChatPage({
  params,
}: {
  params: { nome: string }
}) {
  // Verify if the param is valid
  const staticParams = await generateStaticParams()
  const isValidParam = staticParams.some(p => 
    p.nome === encodeURIComponent(params.nome)
  )

  if (!isValidParam) {
    redirect('/')
  }

  const nome = decodeURIComponent(params.nome)
  
  const { data: oraculistas } = await supabase
    .from('oraculistas')
    .select('nome')

  const oraculista = oraculistas?.find(o => 
    o.nome.toLowerCase() === nome.toLowerCase()
  )

  if (!oraculista) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <ChatWindow oraculista={nome} />
      </div>
    </div>
  )
}
