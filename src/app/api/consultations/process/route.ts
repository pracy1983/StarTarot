import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { whatsappService } from '@/lib/whatsapp'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({ cookies })

    try {
        const { consultationId } = await req.json()

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // 1. Buscar consultation
        const { data: consultation, error: consultationError } = await supabaseAdmin
            .from('consultations')
            .select('*, profiles!consultations_oracle_id_fkey(*)')
            .eq('id', consultationId)
            .single()

        if (consultationError || !consultation) {
            return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
        }

        const oracle = consultation.profiles

        // 2. Verificar créditos
        const { data: wallet } = await supabaseAdmin
            .from('wallets')
            .select('balance')
            .eq('user_id', consultation.client_id)
            .maybeSingle()

        if (!wallet || (wallet.balance < consultation.total_credits)) {
            return NextResponse.json({ error: 'Créditos insuficientes' }, { status: 402 })
        }

        // 3. Deduzir créditos do cliente
        const { error: deductError } = await supabaseAdmin
            .from('wallets')
            .update({
                balance: wallet.balance - consultation.total_credits,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', consultation.client_id)

        if (deductError) {
            console.error('Error deducting credits:', deductError)
            throw new Error('Erro ao processar pagamento de créditos')
        }

        // 4. Adicionar créditos ao oraculista
        const { data: oracleWallet } = await supabaseAdmin
            .from('wallets')
            .select('balance')
            .eq('user_id', oracle.id)
            .maybeSingle()

        if (oracleWallet) {
            await supabaseAdmin
                .from('wallets')
                .update({
                    balance: (oracleWallet.balance || 0) + consultation.total_credits,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', oracle.id)
        }

        // 5. Buscar perguntas
        const { data: questions } = await supabaseAdmin
            .from('consultation_questions')
            .select('*')
            .eq('consultation_id', consultationId)
            .order('question_order', { ascending: true })

        if (!questions || questions.length === 0) {
            throw new Error('Nenhuma pergunta encontrada')
        }

        // 6. Atualizar status para processing
        await supabaseAdmin
            .from('consultations')
            .update({ status: 'processing' })
            .eq('id', consultationId)

        // 7. Processar cada pergunta com DeepSeek
        const apiKey = process.env.DEEPSEEK_API_KEY || process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY
        if (!apiKey) {
            throw new Error('DEEPSEEK_API_KEY não configurada')
        }

        const subjectContext = consultation.subject_name
            ? `\n\nEsta consulta é sobre: ${consultation.subject_name}${consultation.subject_birthdate ? `, nascido(a) em ${new Date(consultation.subject_birthdate).toLocaleDateString('pt-BR')}` : ''}.`
            : ''

        const systemMessage = `
Você é ${oracle.full_name}, um(a) especialista em ${oracle.specialty}.

SOBRE VOCÊ:
${oracle.bio || 'Um guia espiritual experiente.'}

SUA PERSONALIDADE E ESTILO:
${oracle.personality || 'Acolhedor, místico e direto.'}

REGRAS CRÍTICAS DE FORMATO (OBRIGATÓRIO):
1. FALA DIRETA: Fale sempre diretamente para a pessoa (ex: "Você verá...", "Suas energias indicam...").
2. SEM DESCRIÇÕES: NUNCA descreva cenas, ações, gestos ou o ambiente (ex: NÃO use "*embaralha as cartas*", "*olha para o céu*").
3. APENAS TEXTO CORRIDO: Dê apenas a resposta mística e direta. Sem comentários fora de contexto ou introduções desnecessárias.
4. SEM NOTAS: Não inclua notas de rodapé ou explicações sobre a consulta.

INSTRUÇÕES DE RESPOSTA:
${oracle.system_prompt || 'Responda como um oráculo tradicional.'}
${subjectContext}

Importante: Garanta uma resposta valiosa, profunda e completa, focada estritamente no que foi perguntado.
        `.trim()

        let hasError = false

        for (const question of questions) {
            try {
                const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            { role: 'system', content: systemMessage },
                            { role: 'user', content: question.question_text }
                        ],
                        temperature: 0.7,
                        max_tokens: 1000
                    })
                })

                if (!deepseekResponse.ok) {
                    const errorText = await deepseekResponse.text()
                    console.error('DeepSeek API Error:', errorText)
                    throw new Error('Falha na comunicação com o oráculo: ' + errorText)
                }

                const aiData = await deepseekResponse.json()
                const answer = aiData.choices[0].message.content

                if (!answer) throw new Error('AI retornou resposta vazia')

                // Salvar resposta usando Admin
                const { error: updateError } = await supabaseAdmin
                    .from('consultation_questions')
                    .update({ answer_text: answer })
                    .eq('id', question.id)

                if (updateError) throw updateError

            } catch (err: any) {
                console.error(`Error processing question ${question.id}:`, err)
                hasError = true
                await supabaseAdmin
                    .from('consultation_questions')
                    .update({ answer_text: 'Erro ao gerar resposta automática. O suporte foi notificado.' })
                    .eq('id', question.id)
            }
        }

        // 8. Atualizar status para answered
        await supabaseAdmin
            .from('consultations')
            .update({
                status: 'answered',
                answered_at: new Date().toISOString()
            })
            .eq('id', consultationId)

        // 9. Criar notificação na inbox
        await supabaseAdmin.from('inbox_messages').insert({
            recipient_id: consultation.client_id,
            sender_id: oracle.id,
            title: `✨ Sua consulta com ${oracle.full_name} foi respondida!`,
            content: `O oraculista respondeu todas as suas ${questions.length} pergunta(s). Clique para ver as respostas.`,
            metadata: { consultation_id: consultationId, type: 'consultation_answered' }
        })

        // 10. Enviar notificação WhatsApp
        try {
            const { data: clientData } = await supabaseAdmin
                .from('profiles')
                .select('full_name, phone')
                .eq('id', consultation.client_id)
                .single()

            if (clientData?.phone) {
                await whatsappService.sendConsultationAnsweredNotification(
                    clientData.phone,
                    clientData.full_name || 'Cliente',
                    oracle.full_name
                )
            }
        } catch (whatsappError) {
            console.error('WhatsApp notification error:', whatsappError)
        }

        // 11. Registrar transações
        await supabaseAdmin.from('transactions').insert([
            {
                user_id: consultation.client_id,
                type: 'consultation_charge',
                amount: consultation.total_credits,
                status: 'confirmed',
                metadata: { consultation_id: consultationId, oracle_id: oracle.id }
            },
            {
                user_id: oracle.id,
                type: 'earnings', // Usar o novo tipo corrigido na migração 016
                amount: consultation.total_credits,
                status: 'confirmed',
                metadata: { consultation_id: consultationId, client_id: consultation.client_id }
            }
        ])

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Consultation processing error:', error)
        return NextResponse.json({ error: error.message || 'Erro ao processar consulta' }, { status: 500 })
    }
}
