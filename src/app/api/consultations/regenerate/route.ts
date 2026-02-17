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
            .select('*, oracle:profiles!consultations_oracle_id_fkey(*), client:profiles!consultations_client_id_fkey(*)')
            .eq('id', consultationId)
            .single()

        if (consultationError || !consultation) {
            return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
        }

        const oracle = consultation.oracle
        const client = consultation.client

        // 3. Buscar Master Prompt e Configurações Globais
        const { data: globalSettings } = await supabaseAdmin
            .from('global_settings')
            .select('value')
            .eq('key', 'master_ai_prompt')
            .maybeSingle()

        const masterPrompt = globalSettings?.value || ''

        // 4. Resetar status
        await supabaseAdmin
            .from('consultations')
            .update({ status: 'processing' })
            .eq('id', consultationId)

        const { data: questions } = await supabaseAdmin
            .from('consultation_questions')
            .select('*')
            .eq('consultation_id', consultationId)
            .order('question_order', { ascending: true })

        if (!questions || questions.length === 0) throw new Error('Nenhuma pergunta encontrada')

        // 5. Lógica de IA (DeepSeek)
        const apiKey = process.env.DEEPSEEK_API_KEY || process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY
        if (!apiKey) throw new Error('DEEPSEEK_API_KEY não configurada')

        const subjectContext = consultation.subject_name
            ? `\n\nSOBRE O TEMA DA CONSULTA (OUTRA PESSOA):\nNome: ${consultation.subject_name}${consultation.subject_birthdate ? `\nData de Nascimento: ${new Date(consultation.subject_birthdate).toLocaleDateString('pt-BR')}` : ''}.`
            : ''

        const clientBirthInfo = `
DADOS DO CONSULENTE (VOCÊ):
Nome Completo: ${client.full_name}
Data de Nascimento: ${client.birth_date ? new Date(client.birth_date).toLocaleDateString('pt-BR') : 'Não informado'}
Hora de Nascimento: ${client.birth_time || 'Não informado'}
Local de Nascimento: ${client.birth_place || 'Não informado'}
${subjectContext}
`.trim()

        const systemMessage = `
${masterPrompt}

DADOS PARA A LEITURA:
${clientBirthInfo}

---
PERSONA DO ORACULISTA:
Você é ${oracle.full_name}, um(a) especialista em ${oracle.specialty}.

SOBRE VOCÊ:
${oracle.bio || 'Um guia espiritual experiente.'}

SUA PERSONALIDADE E ESTILO:
${oracle.personality || 'Acolhedor, místico e direto.'}

REGRAS CRÍTICAS DE PERSONA (O QUE VOCÊ É E NÃO É):
1. VOCÊ NÃO É UMA IA: Jamais, em hipótese alguma, diga que é uma Inteligência Artificial, um modelo de linguagem ou um assistente virtual. Fale como um ser humano.
2. SE PERGUNTAREM SE É ROBÔ: Leve na brincadeira, tire um sarro leve.
3. FALA DIRETA: Fale sempre diretamente para o consulente.

REGRAS CRÍTICAS DE FORMATO (OBRIGATÓRIO):
1. SEM DESCRIÇÕES DE CENA: NUNCA descreva cenas, ações ou gestos (ex: NÃO use "*embaralha as cartas*").
2. APENAS A RESPOSTA: Dê apenas a interpretação mística e o conselho. Sem "Aqui está sua leitura".
3. SEM EMOJIS EM EXCESSO: Respeite o Master Prompt sobre formatação e ícones.

INSTRUÇÕES DO SEU MÉTODO DE LEITURA (PROMPT ESPECÍFICO):
${oracle.system_prompt || 'Responda como um oráculo tradicional.'}
`.trim()

        const conversationHistory: any[] = []

        // Processamento sequencial para manter o histórico entre as perguntas da mesma consulta
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
                            ...conversationHistory,
                            { role: 'user', content: q.question_text }
                        ],
                        temperature: 0.7,
                        max_tokens: 1000
                    })
                })

                if (response.ok) {
                    const data = await response.json()
                    const answer = data.choices[0].message.content

                    if (!answer) throw new Error('AI retornou resposta vazia')

                    // Alimentar o histórico
                    conversationHistory.push({ role: 'user', content: q.question_text })
                    conversationHistory.push({ role: 'assistant', content: answer })

                    await supabaseAdmin
                        .from('consultation_questions')
                        .update({ answer_text: answer })
                        .eq('id', q.id)
                } else {
                    const errorMsg = await response.text()
                    throw new Error(`DeepSeek Error: ${response.status} - ${errorMsg}`)
                }
            } catch (e: any) {
                console.error(`Erro ao regenerar pergunta ${q.id}:`, e.message)
                await supabaseAdmin
                    .from('consultation_questions')
                    .update({ answer_text: 'Erro ao regenerar resposta.' })
                    .eq('id', q.id)
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
