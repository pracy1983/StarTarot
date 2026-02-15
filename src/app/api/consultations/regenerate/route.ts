import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({ cookies })

    try {
        const { consultationId } = await req.json()

        // 1. Verificar se quem chama é ADMIN
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

        if (profile?.role !== 'owner') {
            return NextResponse.json({ error: 'Apenas administradores podem regenerar respostas' }, { status: 403 })
        }

        // 2. Buscar consulta
        const { data: consultation, error: consultationError } = await supabaseAdmin
            .from('consultations')
            .select('*, oracle:profiles!consultations_oracle_id_fkey(*)')
            .eq('id', consultationId)
            .single()

        if (consultationError || !consultation) {
            return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
        }

        const oracle = consultation.oracle

        // 3. Resetar status e perguntas (limpar respostas de erro)
        await supabaseAdmin
            .from('consultations')
            .update({ status: 'processing' })
            .eq('id', consultationId)

        const { data: questions } = await supabaseAdmin
            .from('consultation_questions')
            .select('*')
            .eq('consultation_id', consultationId)
            .order('question_order', { ascending: true })

        if (!questions) throw new Error('Nenhuma pergunta encontrada')

        // 4. Lógica de IA (DeepSeek)
        const apiKey = process.env.DEEPSEEK_API_KEY || process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY

        const subjectContext = consultation.subject_name
            ? `\n\nEsta consulta é sobre: ${consultation.subject_name}${consultation.subject_birthdate ? `, nascido(a) em ${new Date(consultation.subject_birthdate).toLocaleDateString('pt-BR')}` : ''}.`
            : ''

        const systemMessage = `
Você é ${oracle.full_name}, um(a) especialista em ${oracle.specialty}.
SOBRE VOCÊ: ${oracle.bio || 'Místico experiente.'}
ESTILO: ${oracle.personality || 'Direto e acolhedor.'}
INSTRUÇÕES: Respondas as perguntas do consulente de forma mística, profunda e direta.${subjectContext}
        `.trim()

        for (const q of questions) {
            try {
                const response = await fetch('https://api.deepseek.com/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            { role: 'system', content: systemMessage },
                            { role: 'user', content: q.question_text }
                        ],
                        temperature: 0.7
                    })
                })

                if (response.ok) {
                    const data = await response.json()
                    await supabaseAdmin
                        .from('consultation_questions')
                        .update({ answer_text: data.choices[0].message.content })
                        .eq('id', q.id)
                }
            } catch (e) {
                console.error('Erro ao regenerar pergunta:', q.id, e)
            }
        }

        // 5. Finalizar
        await supabaseAdmin
            .from('consultations')
            .update({ status: 'answered', answered_at: new Date().toISOString() })
            .eq('id', consultationId)

        return NextResponse.json({ success: true })

    } catch (err: any) {
        console.error('Regenerate error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
