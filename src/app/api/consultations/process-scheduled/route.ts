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
        const { secret } = await req.json().catch(() => ({ secret: null }))
        const expectedSecret = process.env.CRON_SECRET
        if (expectedSecret && secret !== expectedSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const now = new Date().toISOString()

        const { data: dueConsultations, error: fetchError } = await supabaseAdmin
            .from('consultations')
            .select('*, oracle:profiles!consultations_oracle_id_fkey(*), client:profiles!consultations_client_id_fkey(*)')
            .eq('status', 'pending')
            .not('metadata->is_ai_scheduled', 'is', null)
            .lte('metadata->>scheduled_process_at', now)

        if (fetchError) throw fetchError

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
                await log(consultation.id, 'error', `Falha: ${err.message}`)

                const retryCount = (consultation.metadata?.retry_count || 0) + 1
                if (retryCount < MAX_RETRIES) {
                    const retryAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
                    await supabaseAdmin.from('consultations').update({
                        metadata: { ...consultation.metadata, retry_count: retryCount, scheduled_process_at: retryAt, last_error: err.message }
                    }).eq('id', consultation.id)
                } else {
                    await supabaseAdmin.from('inbox_messages').insert({
                        recipient_id: consultation.oracle_id,
                        sender_id: consultation.client_id,
                        title: '⚠️ Erro: Consulta IA não processada',
                        content: `Falha após ${MAX_RETRIES} tentativas. Erro: ${err.message}`,
                        metadata: { consultation_id: consultation.id, type: 'ai_processing_error' }
                    })
                    await supabaseAdmin.from('consultations').update({
                        metadata: { ...consultation.metadata, retry_count: retryCount, processing_failed: true, last_error: err.message }
                    }).eq('id', consultation.id)
                }
                errorCount++
            }
        }

        return NextResponse.json({ success: true, processed: processedCount, errors: errorCount })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

async function processAIConsultation(consultation: any) {
    const oracle = consultation.oracle
    const client = consultation.client
    const consultationId = consultation.id

    await log(consultationId, 'started', `Iniciando processamento para "${client.full_name}"`)
    await supabaseAdmin.from('consultations').update({ status: 'processing' }).eq('id', consultationId)

    const { data: questions } = await supabaseAdmin.from('consultation_questions').select('*').eq('consultation_id', consultationId).order('question_order', { ascending: true })
    if (!questions || questions.length === 0) throw new Error('Nenhuma pergunta encontrada')

    const { data: globalSettings } = await supabaseAdmin.from('global_settings').select('value').eq('key', 'master_ai_prompt').maybeSingle()
    const masterPrompt = globalSettings?.value || ''

    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY não configurada')

    // 1. Mapa do Cliente
    let astrologyContext = ''
    if (client.birth_date && client.birth_time) {
        await log(consultationId, 'astrology_starting', `Consultando mapa de ${client.full_name}`)
        try {
            const birthChart = await astrologyService.calculateBirthChart(client.birth_date, client.birth_time, -23.55, -46.63, -3, client.birth_place || undefined)
            if (birthChart) astrologyContext = '\n\n' + astrologyService.formatForAI(birthChart)
            await log(consultationId, 'astrology_ok', 'Mapa do cliente obtido')
        } catch (e: any) { await log(consultationId, 'astrology_error', e.message) }
    }

    // 2. Mapa do Tema (Outra Pessoa)
    const metadata = consultation.metadata || {}
    const subjectData = metadata.subject || {}
    let subjectAstrologyContext = ''
    if (consultation.subject_birthdate && subjectData.birth_time) {
        await log(consultationId, 'subject_astrology_starting', `Consultando mapa de ${consultation.subject_name}`)
        try {
            const subChart = await astrologyService.calculateBirthChart(consultation.subject_birthdate, subjectData.birth_time, -23.55, -46.63, -3, subjectData.birth_place || undefined)
            if (subChart) {
                subjectAstrologyContext = '\n\n' + astrologyService.formatForAI(subChart).replace('[MAPA NATAL COMPLETO - DADOS REAIS DA API]', `[MAPA NATAL DE ${consultation.subject_name.toUpperCase()} - DADOS REAIS]`)
            }
            await log(consultationId, 'subject_astrology_ok', 'Mapa do tema obtido')
        } catch (e: any) { await log(consultationId, 'subject_astrology_error', e.message) }
    }

    const subjectContext = consultation.subject_name
        ? `\n\nSOBRE O TEMA DA CONSULTA (OUTRA PESSOA):\nNome: ${consultation.subject_name}${consultation.subject_birthdate ? `\nData de Nascimento: ${new Date(consultation.subject_birthdate + 'T12:00:00Z').toLocaleDateString('pt-BR')}` : ''}${subjectData.birth_time ? `\nHora de Nascimento: ${subjectData.birth_time}` : ''}${subjectData.birth_place ? `\nLocal de Nascimento: ${subjectData.birth_place}` : ''}${subjectAstrologyContext}.`
        : ''

    const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Sao_Paulo' })
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

    const systemMessage = `
DATA E HORA ATUAL: ${dateStr}, ${timeStr} (Horário de Brasília)
${masterPrompt}

DADOS PARA A LEITURA:
DADOS DO CONSULENTE (VOCÊ):
Nome: ${client.full_name}
Nascimento: ${client.birth_date ? new Date(client.birth_date + 'T12:00:00Z').toLocaleDateString('pt-BR') : 'N/D'}
Hora/Local: ${client.birth_time || 'N/D'} / ${client.birth_place || 'N/D'}
${astrologyContext}
${subjectContext}

---
PERSONA: Você é ${oracle.full_name}, especialista em ${oracle.specialty}. ${oracle.bio} Estilo: ${oracle.personality}.
REGRAS: 1. Não é IA. 2. Sem asteriscos/cenas. 3. Sem formatação Markdown. 4. Fala direta. 
${oracle.system_prompt}
`.trim()

    const conversationHistory: any[] = []
    for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        await log(consultationId, `generating_answer_${i + 1}`, `Gerando resposta ${i + 1}/${questions.length}`)
        const historyWindow = conversationHistory.slice(-4)

        const res = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'system', content: systemMessage }, ...historyWindow, { role: 'user', content: question.question_text }],
                temperature: 0.7, max_tokens: 2000
            })
        })

        if (!res.ok) throw new Error(`DeepSeek API ${res.status}`)
        const data = await res.json()
        let answer = data.choices[0].message.content || ''
        answer = answer.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s/gm, '').replace(/^---$/gm, '')

        conversationHistory.push({ role: 'user', content: question.question_text }, { role: 'assistant', content: answer })
        await supabaseAdmin.from('consultation_questions').update({ answer_text: answer }).eq('id', question.id)
        await log(consultationId, `answer_${i + 1}_ok`, `OK (${answer.length} chars)`)
    }

    await supabaseAdmin.from('consultations').update({ status: 'answered', answered_at: new Date().toISOString() }).eq('id', consultationId)
    await log(consultationId, 'completed', `✅ Finalizada`)
}
