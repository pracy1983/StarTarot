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

        // 1. Buscar consultation com dados do Oracle E do Cliente
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

        // 4. Se for IA, Adicionar créditos ao oraculista imediatamente. Se for Humano, NÃO ADICIONAR AINDA.
        if (oracle.is_ai) {
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
        }

        // 5.5. Buscar Comissão
        const { data: commissionSetting } = await supabaseAdmin
            .from('global_settings')
            .select('value')
            .eq('key', 'oracle_commission_pc')
            .maybeSingle()

        const commissionPc = parseInt(commissionSetting?.value || '70')
        const oracleEarnings = Math.floor(consultation.total_credits * (commissionPc / 100))

        // 5. Buscar perguntas (Se não for vídeo)
        let questions: any[] = []
        if (consultation.type !== 'video') {
            const { data: qData } = await supabaseAdmin
                .from('consultation_questions')
                .select('*')
                .eq('consultation_id', consultationId)
                .order('question_order', { ascending: true })

            questions = qData || []

            if (questions.length === 0) {
                throw new Error('Nenhuma pergunta encontrada')
            }
        }

        // 6.5. Buscar Master Prompt
        const { data: globalSettings } = await supabaseAdmin
            .from('global_settings')
            .select('value')
            .eq('key', 'master_ai_prompt')
            .maybeSingle()

        const masterPrompt = globalSettings?.value || ''

        // 6. Se for Humano, apenas mudar status para 'pending' (que já deve estar) 
        // ou 'waiting_answer' e notificar o oráculo.
        if (!oracle.is_ai) {
            await supabaseAdmin
                .from('consultations')
                .update({ status: 'pending' })
                .eq('id', consultationId)

            // Criar notificação para o Oraculista
            await supabaseAdmin.from('inbox_messages').insert({
                recipient_id: oracle.id,
                sender_id: consultation.client_id,
                title: '📧 Nova Consulta Pendente',
                content: `Você recebeu uma nova consulta de ${client.full_name}. Responda para receber seus créditos.`,
                metadata: { consultation_id: consultationId, type: 'new_pending_consultation' }
            })

            // Registrar transações (Cliente confirmada, Oráculo pendente com comissão aplicada)
            await supabaseAdmin.from('transactions').insert([
                {
                    user_id: consultation.client_id,
                    type: 'consultation_charge',
                    amount: consultation.total_credits,
                    status: 'confirmed',
                    description: `Consulta com ${oracle.full_name}`,
                    metadata: { consultation_id: consultationId, oracle_id: oracle.id }
                },
                {
                    user_id: oracle.id,
                    type: 'earnings',
                    amount: oracleEarnings,
                    status: 'pending',
                    description: `Pendente: Consulta de ${client.full_name}`,
                    metadata: { consultation_id: consultationId, client_id: consultation.client_id, commission_pc: commissionPc }
                }
            ])

            // Notificar WhatsApp se habilitado
            if (oracle.whatsapp_notification_enabled && oracle.phone) {
                try {
                    await whatsappService.sendNewConsultationNotificationToOracle(oracle.phone)
                } catch (waErr) {
                    console.error('Error sending WA to oracle:', waErr)
                }
            }

            return NextResponse.json({ success: true, message: 'Consulta humana encaminhada' })
        }

        // 7. Processar cada pergunta com DeepSeek (Apenas para IA)
        const apiKey = process.env.DEEPSEEK_API_KEY || process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY
        if (!apiKey) {
            throw new Error('DEEPSEEK_API_KEY não configurada')
        }

        // 6.7. Buscar histórico de conversas anteriores para memória/coerência
        const { data: pastQuestions } = await supabaseAdmin
            .from('consultation_questions')
            .select(`
                question_text, 
                answer_text, 
                created_at,
                consultations!inner(client_id, oracle_id)
            `)
            .not('answer_text', 'is', null)
            .eq('consultations.client_id', consultation.client_id)
            .eq('consultations.oracle_id', consultation.oracle_id)
            .neq('consultations.id', consultationId) // Excluir a atual
            .order('created_at', { ascending: false })
            .limit(10)

        // Formatar o histórico como um contexto de memória
        let memoryHistory = ''
        if (pastQuestions && pastQuestions.length > 0) {
            const historyText = pastQuestions
                .reverse()
                .map((q: any) => `P: ${q.question_text}\nR: ${q.answer_text}`)
                .join('\n\n')

            memoryHistory = `\n\nHISTÓRICO DE ATENDIMENTOS ANTERIORES COM ESTE CLIENTE (MEMÓRIA):\n${historyText}\n\n---`
        }

        const metadata = consultation.metadata || {}
        const subjectData = metadata.subject || {}

        const subjectContext = consultation.subject_name
            ? `\n\nSOBRE O TEMA DA CONSULTA (OUTRA PESSOA):\nNome: ${consultation.subject_name}${consultation.subject_birthdate ? `\nData de Nascimento: ${new Date(consultation.subject_birthdate + 'T12:00:00Z').toLocaleDateString('pt-BR')}` : ''}${subjectData.birth_time ? `\nHora de Nascimento: ${subjectData.birth_time}` : ''}${subjectData.birth_place ? `\nLocal de Nascimento: ${subjectData.birth_place}` : ''}.`
            : ''

        const clientBirthInfo = `
DADOS DO CONSULENTE (VOCÊ):
Nome Completo: ${client.full_name}
Data de Nascimento: ${client.birth_date ? new Date(client.birth_date + 'T12:00:00Z').toLocaleDateString('pt-BR') : 'Não informado'}
Hora de Nascimento: ${client.birth_time || 'Não informado'}
Local de Nascimento: ${client.birth_place || 'Não informado'}
${subjectContext}
`.trim()

        const systemMessage = `
${masterPrompt}

${memoryHistory}

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
1. VOCÊ NÃO É UMA IA: Jamais diga que é uma Inteligência Artificial ou modelo de linguagem. Fale como um ser humano.
2. SEM DESCRIÇÕES DE CENA: Jamais descreva ações ou ambiente (NÃO use asteriscos, ex: NÃO use *olha as cartas*).
3. SEM FORMATAÇÃO: NUNCA use negrito, itálico, asteriscos, hashtags ou qualquer tipo de formatação Markdown. Use apenas texto puro.
4. FALA DIRETA: Fale sempre diretamente para o consulente.

INSTRUÇÕES DO SEU MÉTODO DE LEITURA (PROMPT ESPECÍFICO):
${oracle.system_prompt || 'Responda como um oráculo tradicional, usando sua intuição e conhecimento.'}

Importante: Garanta uma resposta valiosa, profunda e completa, focada estritamente no que foi perguntado. NUNCA use asteriscos ou formatação.
        `.trim()

        let hasError = false
        const conversationHistory: any[] = []

        for (const question of questions) {
            try {
                const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey} `
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            { role: 'system', content: systemMessage },
                            ...conversationHistory,
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

                // Alimentar o histórico para a próxima pergunta da mesma consulta
                conversationHistory.push({ role: 'user', content: question.question_text })
                conversationHistory.push({ role: 'assistant', content: answer })

                // Salvar resposta usando Admin
                const { error: updateError } = await supabaseAdmin
                    .from('consultation_questions')
                    .update({ answer_text: answer })
                    .eq('id', question.id)

                if (updateError) throw updateError

            } catch (err: any) {
                console.error(`Error processing question ${question.id}: `, err)
                hasError = true
                await supabaseAdmin
                    .from('consultation_questions')
                    .update({ answer_text: 'Erro ao gerar resposta automática. O suporte foi notificado.' })
                    .eq('id', question.id)
            }
        }

        // 8. Atualizar status para answered (IA)
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
            content: `O oraculista respondeu todas as suas ${questions.length} pergunta(s).Clique para ver as respostas.`,
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

        // 11. Registrar transações (Confirmadas - IA)
        await supabaseAdmin.from('transactions').insert([
            {
                user_id: consultation.client_id,
                type: 'consultation_charge',
                amount: consultation.total_credits,
                status: 'confirmed',
                description: `Consulta com ${oracle.full_name} `,
                metadata: { consultation_id: consultationId, oracle_id: oracle.id }
            },
            {
                user_id: oracle.id,
                type: 'earnings',
                amount: oracleEarnings,
                status: 'confirmed',
                description: `Ganhos: Consulta de ${client.full_name} `,
                metadata: { consultation_id: consultationId, client_id: consultation.client_id, commission_pc: commissionPc }
            }
        ])

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Consultation processing error:', error)
        return NextResponse.json({ error: error.message || 'Erro ao processar consulta' }, { status: 500 })
    }
}
