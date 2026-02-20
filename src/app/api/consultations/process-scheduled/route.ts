import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { whatsappService } from '@/lib/whatsapp'
import { astrologyService } from '@/services/astrologyService'

const MAX_RETRIES = 3

// Helper para gravar log no banco e no console
async function log(consultationId: string, event: string, details?: string) {
    const ts = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const msg = `[${ts}] [${event}]${details ? ' ' + details : ''}`
    console.log(`[AI Processor] ${msg}`)

    await supabaseAdmin.from('consultation_logs').insert({
        consultation_id: consultationId,
        event,
        details: details || null
    }).then(({ error }) => {
        if (error) console.error('[AI Processor] Failed to write log:', error.message)
    })
}

export async function POST(req: Request) {
    try {
        // Optional: protect with a secret key for cron jobs
        const { secret } = await req.json().catch(() => ({ secret: null }))
        const expectedSecret = process.env.CRON_SECRET
        if (expectedSecret && secret !== expectedSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const now = new Date().toISOString()

        // 1. Find all pending AI consultations where scheduled_process_at <= now
        const { data: dueConsultations, error: fetchError } = await supabaseAdmin
            .from('consultations')
            .select('*, oracle:profiles!consultations_oracle_id_fkey(*), client:profiles!consultations_client_id_fkey(*)')
            .eq('status', 'pending')
            .not('metadata->is_ai_scheduled', 'is', null)
            .lte('metadata->>scheduled_process_at', now)

        if (fetchError) {
            console.error('Error fetching due consultations:', fetchError)
            return NextResponse.json({ error: 'Fetch error' }, { status: 500 })
        }

        if (!dueConsultations || dueConsultations.length === 0) {
            return NextResponse.json({ success: true, processed: 0 })
        }

        let processedCount = 0
        let errorCount = 0

        for (const consultation of dueConsultations) {
            try {
                await processAIConsultation(consultation)
                processedCount++
            } catch (err: any) {
                console.error(`[AI Processor] Error processing ${consultation.id}:`, err)
                await log(consultation.id, 'error', `Falha geral: ${err.message}`)

                // Retry logic
                const retryCount = (consultation.metadata?.retry_count || 0) + 1

                if (retryCount < MAX_RETRIES) {
                    // Schedule retry in 5 minutes
                    const retryAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
                    await supabaseAdmin
                        .from('consultations')
                        .update({
                            metadata: {
                                ...consultation.metadata,
                                retry_count: retryCount,
                                scheduled_process_at: retryAt,
                                last_error: err.message
                            }
                        })
                        .eq('id', consultation.id)

                    await log(consultation.id, 'retry_scheduled', `Tentativa ${retryCount}/${MAX_RETRIES} agendada para ${new Date(retryAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`)
                } else {
                    // Max retries reached — log error for owner
                    await supabaseAdmin.from('inbox_messages').insert({
                        recipient_id: consultation.oracle_id,
                        sender_id: consultation.client_id,
                        title: '⚠️ Erro: Consulta IA não processada',
                        content: `A consulta de ${consultation.client?.full_name} falhou após ${MAX_RETRIES} tentativas. Erro: ${err.message}. ID: ${consultation.id}`,
                        metadata: { consultation_id: consultation.id, type: 'ai_processing_error', error: err.message }
                    })

                    await supabaseAdmin
                        .from('consultations')
                        .update({
                            metadata: {
                                ...consultation.metadata,
                                retry_count: retryCount,
                                processing_failed: true,
                                last_error: err.message
                            }
                        })
                        .eq('id', consultation.id)

                    await log(consultation.id, 'max_retries_reached', `Falhou após ${MAX_RETRIES} tentativas. Último erro: ${err.message}`)
                }
                errorCount++
            }
        }

        return NextResponse.json({ success: true, processed: processedCount, errors: errorCount })
    } catch (error: any) {
        console.error('Scheduled AI processor error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

async function processAIConsultation(consultation: any) {
    const oracle = consultation.oracle
    const client = consultation.client
    const consultationId = consultation.id

    await log(consultationId, 'started', `Iniciando processamento para cliente "${client.full_name}" com oraculista IA "${oracle.full_name}"`)

    // Atualiza status para 'processing' imediatamente
    await supabaseAdmin.from('consultations').update({ status: 'processing' }).eq('id', consultationId)

    // 1. Buscar perguntas
    const { data: questions } = await supabaseAdmin
        .from('consultation_questions')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('question_order', { ascending: true })

    if (!questions || questions.length === 0) {
        throw new Error('Nenhuma pergunta encontrada')
    }

    await log(consultationId, 'questions_loaded', `${questions.length} pergunta(s) carregada(s)`)

    // 2. Buscar Master Prompt
    const { data: globalSettings } = await supabaseAdmin
        .from('global_settings')
        .select('value')
        .eq('key', 'master_ai_prompt')
        .maybeSingle()

    const masterPrompt = globalSettings?.value || ''

    // 3. API Key
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY
    if (!apiKey) {
        throw new Error('DEEPSEEK_API_KEY não configurada')
    }

    // 4. Buscar histórico de conversas anteriores
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
        .neq('consultations.id', consultationId)
        .order('created_at', { ascending: false })
        .limit(10)

    let memoryHistory = ''
    if (pastQuestions && pastQuestions.length > 0) {
        const historyText = pastQuestions
            .reverse()
            .map((q: any) => `P: ${q.question_text}\nR: ${q.answer_text}`)
            .join('\n\n')

        memoryHistory = `\n\nHISTÓRICO DE ATENDIMENTOS ANTERIORES COM ESTE CLIENTE (MEMÓRIA):\n${historyText}\n\n---`
        await log(consultationId, 'memory_loaded', `${pastQuestions.length} consulta(s) anteriores carregadas para contexto`)
    }

    // 5. Dados astrológicos reais via API (se tiver data/hora de nascimento)
    let astrologyContext = ''
    if (client.birth_date && client.birth_time) {
        await log(consultationId, 'astrology_starting', `Consultando API de Astrologia para ${client.full_name} (${client.birth_date} ${client.birth_time}, local: ${client.birth_place || 'São Paulo'})`)
        try {
            // Usa lat/lng padrão de SP para clientes sem local de nascimento definido
            const lat = -23.5505
            const lng = -46.6333
            const timezone = -3

            const birthChart = await astrologyService.calculateBirthChart(
                client.birth_date,
                client.birth_time,
                lat,
                lng,
                timezone,
                client.birth_place || undefined
            )

            if (birthChart && birthChart.planets && birthChart.planets.length > 0) {
                astrologyContext = '\n\n' + astrologyService.formatForAI(birthChart)
                await log(consultationId, 'astrology_ok', `Mapa natal obtido com ${birthChart.planets.length} posições planetárias`)
            } else {
                await log(consultationId, 'astrology_empty', 'API retornou resposta vazia ou sem planetas — continuando sem dados astrológicos')
            }
        } catch (astroErr: any) {
            await log(consultationId, 'astrology_error', `Erro na API de Astrologia: ${astroErr.message} — continuando sem dados astrológicos`)
        }
    } else {
        await log(consultationId, 'astrology_skipped', `Cliente sem data/hora de nascimento completa — pulando dados astrológicos`)
    }

    // 6. Subject data
    const metadata = consultation.metadata || {}
    const subjectData = metadata.subject || {}

    const subjectContext = consultation.subject_name
        ? `\n\nSOBRE O TEMA DA CONSULTA (OUTRA PESSOA):\nNome: ${consultation.subject_name}${consultation.subject_birthdate ? `\nData de Nascimento: ${new Date(consultation.subject_birthdate + 'T12:00:00Z').toLocaleDateString('pt-BR')}` : ''}${subjectData.birth_time ? `\nHora de Nascimento: ${subjectData.birth_time}` : ''}${subjectData.birth_place ? `\nLocal de Nascimento: ${subjectData.birth_place}` : ''}.`
        : ''

    // 7. Data atual para o prompt
    const now = new Date()
    const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Sao_Paulo' })
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

    const clientBirthInfo = `
DADOS DO CONSULENTE (VOCÊ):
Nome Completo: ${client.full_name}
Data de Nascimento: ${client.birth_date ? new Date(client.birth_date + 'T12:00:00Z').toLocaleDateString('pt-BR') : 'Não informado'}
Hora de Nascimento: ${client.birth_time || 'Não informado'}
Local de Nascimento: ${client.birth_place || 'Não informado'}
${subjectContext}
${astrologyContext}
`.trim()

    const systemMessage = `
DATA E HORA ATUAL: ${dateStr}, ${timeStr} (Horário de Brasília)

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
3. SEM FORMATAÇÃO: NUNCA use negrito, itálico, asteriscos, hashtags ou qualquer tipo de formatação Markdown. Escreva APENAS texto puro sem nenhum caractere especial de formatação. Proibido: **, *, #, ##, ###, ---, _. Use apenas letras, números e pontuação normal.
4. FALA DIRETA: Fale sempre diretamente para o consulente.

INSTRUÇÕES DO SEU MÉTODO DE LEITURA (PROMPT ESPECÍFICO):
${oracle.system_prompt || 'Responda como um oráculo tradicional, usando sua intuição e conhecimento.'}

Importante: Garanta uma resposta valiosa, profunda e completa, focada estritamente no que foi perguntado. NUNCA use asteriscos ou formatação.
    `.trim()

    // 8. Processar cada pergunta
    const conversationHistory: any[] = []

    for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        await log(consultationId, `generating_answer_${i + 1}`, `Gerando resposta para pergunta ${i + 1}/${questions.length}: "${question.question_text.substring(0, 80)}..."`)

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
                    ...conversationHistory,
                    { role: 'user', content: question.question_text }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        })

        if (!deepseekResponse.ok) {
            const errorText = await deepseekResponse.text()
            await log(consultationId, `answer_${i + 1}_error`, `DeepSeek API retornou ${deepseekResponse.status}: ${errorText.substring(0, 200)}`)
            throw new Error('DeepSeek API falhou: ' + errorText)
        }

        const aiData = await deepseekResponse.json()
        let answer = aiData.choices[0].message.content

        if (!answer) throw new Error('AI retornou resposta vazia')

        // Remove markdown formatting
        answer = answer.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s/gm, '').replace(/^---$/gm, '')

        conversationHistory.push({ role: 'user', content: question.question_text })
        conversationHistory.push({ role: 'assistant', content: answer })

        await supabaseAdmin
            .from('consultation_questions')
            .update({ answer_text: answer })
            .eq('id', question.id)

        await log(consultationId, `answer_${i + 1}_ok`, `Resposta ${i + 1}/${questions.length} gerada com sucesso (${answer.length} chars)`)
    }

    // 9. Atualizar status para answered
    await supabaseAdmin
        .from('consultations')
        .update({
            status: 'answered',
            answered_at: new Date().toISOString()
        })
        .eq('id', consultationId)

    // 10. Notificação inbox
    await supabaseAdmin.from('inbox_messages').insert({
        recipient_id: consultation.client_id,
        sender_id: oracle.id,
        title: `✨ Sua consulta com ${oracle.full_name} foi respondida!`,
        content: `O oraculista respondeu todas as suas ${questions.length} pergunta(s). Clique para ver as respostas.`,
        metadata: { consultation_id: consultationId, type: 'consultation_answered' }
    })

    await log(consultationId, 'sent_to_client', `Notificação enviada ao cliente "${client.full_name}"`)

    // 11. Notificar WhatsApp
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
            await log(consultationId, 'whatsapp_sent', `WhatsApp enviado para "${clientData.full_name}"`)
        }
    } catch (whatsappError: any) {
        await log(consultationId, 'whatsapp_error', `Erro ao enviar WhatsApp: ${whatsappError.message}`)
    }

    await log(consultationId, 'completed', `✅ Consulta finalizada com sucesso — ${questions.length} pergunta(s) respondida(s)`)
}
