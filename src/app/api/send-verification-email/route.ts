import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

export async function POST(request: Request) {
  try {
    const { email, name, code } = await request.json()

    // Aqui você implementaria a lógica de envio de email
    // Por enquanto, vamos apenas simular o envio
    console.log('Email enviado para:', email, 'com código:', code)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao enviar email:', error)
    return NextResponse.json(
      { error: 'Erro ao enviar email de verificação' },
      { status: 500 }
    )
  }
}
