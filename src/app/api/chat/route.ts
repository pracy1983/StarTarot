import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { chatId, message, oracleId } = await req.json()

        // Mock de delay de pensamento (Thinking Delay)
        // Em produção aqui chamaríamos a API da DeepSeek
        const delay = Math.floor(Math.random() * (30000 - 10000 + 1) + 10000)

        // Simulando o delay antes de responder
        // Nota: Em uma Edge Function real usaríamos streams, mas aqui faremos o básico

        // Para efeito de demonstração imediata, vamos apenas simular que a IA recebeu
        // Em um sistema real, a IA responderia via Supabase (insert message) 
        // após o delay para que o cliente veja a animação de "Thinking".

        return NextResponse.json({ success: true, message: 'Oráculo processando...' })
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao processar consulta' }, { status: 500 })
    }
}
