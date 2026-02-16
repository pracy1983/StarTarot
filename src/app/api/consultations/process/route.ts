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

            // Registrar transações (Cliente confirmada, Oráculo pendente)
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
                    amount: consultation.total_credits,
                    status: 'pending',
                    description: `Pendente: Consulta de ${client.full_name}`,
                    metadata: { consultation_id: consultationId, client_id: consultation.client_id }
                }
            ])

            return NextResponse.json({ success: true, message: 'Consulta humana encaminhada' })
        }

        // 7. Processar cada pergunta com DeepSeek (Apenas para IA)
        const apiKey = process.env.DEEPSEEK_API_KEY || process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY
        if (!apiKey) {
            throw new Error('DEEPSEEK_API_KEY não configurada')
        }

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
2. SE PERGUNTAREM SE É ROBÔ: Leve na brincadeira, tire um sarro leve (ex: "Minha conexão é com o divino, não com o wi-fi", "Sou feito de carne, osso e poeira estelar"). 
3. FALA DIRETA: Fale sempre diretamente para o consulente.

REGRAS CRÍTICAS DE FORMATO (OBRIGATÓRIO):
1. SEM DESCRIÇÕES DE CENA: NUNCA descreva cenas, ações, gestos ou o ambiente (ex: NÃO use "*embaralha as cartas*", "*fecha os olhos*"). 
2. APENAS A RESPOSTA: Dê apenas a interpretação mística e o conselho. Sem "Aqui está sua leitura".
3. SEM NOTAS: Não inclua notas de rodapé ou avisos médicos.

INSTRUÇÕES DO SEU MÉTODO DE LEITURA (PROMPT ESPECÍFICO):
${oracle.system_prompt || 'Responda como um oráculo tradicional, usando sua intuição e conhecimento.'}

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

        // 11. Registrar transações (Confirmadas - IA)
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
                amount: consultation.total_credits,
                status: 'confirmed',
                description: `Ganhos: Consulta de ${client.full_name}`,
                metadata: { consultation_id: consultationId, client_id: consultation.client_id }
            }
        ])

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Consultation processing error:', error)
        return NextResponse.json({ error: error.message || 'Erro ao processar consulta' }, { status: 500 })
    }
}
