import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { astrologyService } from '@/services/astrologyService'

// Helper para gravar log no banco e no console
async function log(consultationId: string, event: string, details?: string) {
    const ts = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const msg = `[Regenerate] [${ts}] [${event}]${details ? ' ' + details : ''}`
    console.log(msg)

    await supabaseAdmin.from('consultation_logs').insert({
        consultation_id: consultationId,
        event: `regenerate_${event}`,
        details: details || null
    }).then(({ error }) => {
        if (error) console.error('[Regenerate] Failed to write log:', error.message)
    })
}

export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({ cookies })

    try {
        const { consultationId } = await req.json()

        // 1. Verificar ADMIN
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
        if (profile?.role !== 'owner') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

        await log(consultationId, 'started', `Regeneração pelo owner`)

        // 2. Buscar dados completos
        const { data: consultation, error: consultationError } = await supabaseAdmin
            .from('consultations')
            .select('*, oracle:profiles!consultations_oracle_id_fkey(*), client:profiles!consultations_client_id_fkey(*)')
            .eq('id', consultationId)
            .single()

        if (consultationError || !consultation) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })

        const oracle = consultation.oracle
        const client = consultation.client

        await supabaseAdmin.from('consultations').update({ status: 'processing' }).eq('id', consultationId)

        const { data: globalSettings } = await supabaseAdmin.from('global_settings').select('value').eq('key', 'master_ai_prompt').maybeSingle()
        const masterPrompt = globalSettings?.value || ''

        const apiKey = process.env.DEEPSEEK_API_KEY || process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY
        if (!apiKey) throw new Error('DEEPSEEK_API_KEY N/D')

        // 3. Mapas Astrológicos
        let astrologyContext = ''
        if (client.birth_date && client.birth_time) {
            try {
                const birthChart = await astrologyService.calculateBirthChart(client.birth_date, client.birth_time, -23.55, -46.63, -3, client.birth_place || undefined)
                if (birthChart) astrologyContext = '\n\n' + astrologyService.formatForAI(birthChart)
                await log(consultationId, 'astrology_ok', 'Mapa cliente OK')
            } catch (e: any) { await log(consultationId, 'astrology_error', e.message) }
        }

        const metadata = consultation.metadata || {}
        const subjectData = metadata.subject || {}
        let subjectAstrologyContext = ''
        if (consultation.subject_birthdate && subjectData.birth_time) {
            try {
                const subChart = await astrologyService.calculateBirthChart(consultation.subject_birthdate, subjectData.birth_time, -23.55, -46.63, -3, subjectData.birth_place || undefined)
                if (subChart) {
                    subjectAstrologyContext = '\n\n' + astrologyService.formatForAI(subChart).replace('[MAPA NATAL COMPLETO - DADOS REAIS DA API]', `[MAPA NATAL DE ${consultation.subject_name.toUpperCase()} - DADOS REAIS]`)
                }
                await log(consultationId, 'subject_astrology_ok', 'Mapa tema OK')
            } catch (e: any) { await log(consultationId, 'subject_astrology_error', e.message) }
        }

        const subjectContext = consultation.subject_name
            ? `\n\nSOBRE O TEMA DA CONSULTA (OUTRA PESSOA):\nNome: ${consultation.subject_name}${consultation.subject_birthdate ? `\nData de Nascimento: ${new Date(consultation.subject_birthdate + 'T12:00:00Z').toLocaleDateString('pt-BR')}` : ''}${subjectData.birth_time ? `\nHora de Nascimento: ${subjectData.birth_time}` : ''}${subjectData.birth_place ? `\nLocal de Nascimento: ${subjectData.birth_place}` : ''}${subjectAstrologyContext}.`
            : ''

        const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Sao_Paulo' })
        const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

        const systemMessage = `
DATA E HORA ATUAL: ${dateStr}, ${timeStr}
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
REGRAS: 1. Não é IA. 2. Sem asteriscos. 3. Sem Markdown. 4. Fala direta. 
${oracle.system_prompt}
`.trim()

        const { data: questions } = await supabaseAdmin.from('consultation_questions').select('*').eq('consultation_id', consultationId).order('question_order', { ascending: true })
        if (!questions) throw new Error('Sem perguntas')

        const conversationHistory: any[] = []
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i]
            await log(consultationId, `gen_${i + 1}`, `Gerando ${i + 1}/${questions.length}`)
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

            if (!res.ok) throw new Error(`API Error ${res.status}`)
            const data = await res.json()
            let answer = data.choices[0].message.content || ''
            answer = answer.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s/gm, '').replace(/^---$/gm, '')

            conversationHistory.push({ role: 'user', content: question.question_text }, { role: 'assistant', content: answer })
            await supabaseAdmin.from('consultation_questions').update({ answer_text: answer }).eq('id', question.id)
            await log(consultationId, `ok_${i + 1}`, `OK`)
        }

        await supabaseAdmin.from('consultations').update({ status: 'answered', answered_at: new Date().toISOString() }).eq('id', consultationId)
        await log(consultationId, 'completed', `✅ OK`)

        return NextResponse.json({ success: true })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
