import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getResolvedPrompt } from '@/config/prompts/chatAgentPrompt'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'UserId é obrigatório' }, { status: 400 })
  }

  try {
    const result = await pool.query(
      'SELECT * FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao recuperar histórico do chat:', error)
    return NextResponse.json(
      { error: 'Erro ao recuperar histórico' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { content, userId } = await request.json()

    if (!content || !userId) {
      return NextResponse.json(
        { error: 'Content e userId são obrigatórios' },
        { status: 400 }
      )
    }

    // Salvar mensagem do usuário
    const userMessageResult = await pool.query(
      'INSERT INTO chat_messages (content, role, user_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [content, 'user', userId]
    )

    // Preparar mensagens para a API
    const systemPrompt = await getResolvedPrompt()
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content }
    ]

    // Fazer requisição para a API
    const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY não está configurada')
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        messages: apiMessages,
        model: 'deepseek-chat',
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      throw new Error('Erro na resposta da API')
    }

    const data = await response.json()
    const assistantResponse = data.choices[0].message.content

    // Salvar resposta do assistente
    const assistantMessageResult = await pool.query(
      'INSERT INTO chat_messages (content, role, user_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [assistantResponse, 'assistant', userId]
    )

    return NextResponse.json(assistantMessageResult.rows[0])
  } catch (error) {
    console.error('Erro ao processar mensagem:', error)
    return NextResponse.json(
      { error: 'Erro ao processar mensagem' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'UserId é obrigatório' }, { status: 400 })
  }

  try {
    await pool.query(
      'DELETE FROM chat_messages WHERE user_id = $1',
      [userId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao limpar histórico:', error)
    return NextResponse.json(
      { error: 'Erro ao limpar histórico' },
      { status: 500 }
    )
  }
}
