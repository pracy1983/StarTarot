import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({ cookies })

    try {
        const { chatId, message, oracleId } = await req.json()

        // 1. Buscar dados do Oraculista
        const { data: oracle, error: oracleError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', oracleId)
            .single()

        if (oracleError || !oracle) {
            return NextResponse.json({ error: 'Oráculo não encontrado' }, { status: 404 })
        }

        // Verificar se é IA
        if (!oracle.is_ai && oracle.oracle_type !== 'ai') {
            return NextResponse.json({ error: 'Este oráculo não é IA' }, { status: 400 })
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // 2. Verificar Créditos
        const price = oracle.price_per_message || 10
        const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', session.user.id)
            .single()

        if (!wallet || wallet.balance < price) {
            return NextResponse.json({ error: 'Créditos insuficientes para esta consulta' }, { status: 402 })
        }

        // 3. Deduzir Créditos do cliente
        const newBalance = wallet.balance - price
        const { error: walletError } = await supabase
            .from('wallets')
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq('user_id', session.user.id)

        if (walletError) throw walletError

        // 4. Adicionar créditos ao oraculista (wallet do oracle)
        const { data: oracleWallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', oracleId)
            .single()

        if (oracleWallet) {
            await supabase
                .from('wallets')
                .update({ balance: oracleWallet.balance + price, updated_at: new Date().toISOString() })
                .eq('user_id', oracleId)
        }

        // 5. Buscar histórico de mensagens para contexto (últimas 20)
        const { data: historyMessages } = await supabase
            .from('messages')
            .select('sender_id, content')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true })
            .limit(20)

        // Montar histórico para a IA
        const conversationHistory = (historyMessages || []).map(msg => ({
            role: msg.sender_id === oracleId ? 'assistant' : 'user',
            content: msg.content
        }))

        // 6. Preparar Prompt para DeepSeek
        const systemMessage = `
            Você é ${oracle.full_name}, um(a) especialista em ${oracle.specialty}.
            
            SOBRE VOCÊ:
            ${oracle.bio || 'Um guia espiritual experiente.'}
            
            SUA PERSONALIDADE E ESTILO:
            ${oracle.personality || 'Acolhedor, místico e direto.'}
            
            INSTRUÇÕES DE RESPOSTA:
            ${oracle.system_prompt || 'Responda como um oráculo tradicional.'}
            
            Importante: Responda de forma mística, profunda, mas clara. O usuário pagou créditos por esta mensagem, então garanta uma resposta valiosa e completa. Mantenha coerência com o histórico da conversa.
            
            REGRA ABSOLUTA DE FORMATAÇÃO: NUNCA use negrito (**texto**), itálico (*texto*) ou emojis. Responda APENAS com texto simples.
        `.trim()

        // 7. Chamada para DeepSeek API
        const apiKey = process.env.DEEPSEEK_API_KEY
        if (!apiKey) {
            console.error('DEEPSEEK_API_KEY não configurada')
            return NextResponse.json({ error: 'Configuração de IA pendente' }, { status: 500 })
        }

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
                    { role: 'user', content: message }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        })

        if (!deepseekResponse.ok) {
            const errData = await deepseekResponse.text()
            console.error('DeepSeek API Error:', errData)
            throw new Error('Falha na comunicação com o oráculo')
        }

        const aiData = await deepseekResponse.json()
        const aiContent = aiData.choices[0].message.content

        // 8. Salvar Mensagem da IA no Banco
        const { error: msgError } = await supabase.from('messages').insert({
            chat_id: chatId,
            sender_id: oracleId,
            content: aiContent
        })

        if (msgError) throw msgError

        // 9. Registrar transações
        // Consumo do cliente
        await supabase.from('transactions').insert({
            user_id: session.user.id,
            type: 'consultation_charge',
            amount: price,
            metadata: { oracle_id: oracleId, chat_id: chatId, type: 'per_message_ai' },
            status: 'confirmed'
        })

        // Ganho do oraculista
        await supabase.from('transactions').insert({
            user_id: oracleId,
            type: 'credit_purchase',
            amount: price,
            metadata: { client_id: session.user.id, chat_id: chatId, type: 'oracle_earning' },
            status: 'confirmed'
        })

        return NextResponse.json({ success: true, newBalance })
    } catch (error: any) {
        console.error('Chat API Error:', error)
        return NextResponse.json({ error: error.message || 'Erro ao processar consulta' }, { status: 500 })
    }
}
