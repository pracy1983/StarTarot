import { NextResponse } from 'next/server'

const ASAAS_BASE_URL = 'https://api.asaas.com/v3'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  console.log('GET /api/asaas/customers - Parâmetros:', { email })

  if (!email) {
    console.error('Email não fornecido na requisição')
    return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
  }

  try {
    const apiKey = process.env.ASAAS_API_KEY
    if (!apiKey) {
      console.error('ASAAS_API_KEY não configurada')
      throw new Error('API Key do Asaas não configurada')
    }

    const url = `${ASAAS_BASE_URL}/customers?email=${encodeURIComponent(email)}`
    console.log('Buscando cliente no Asaas:', { url })

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'access-token': apiKey
      }
    })

    const data = await response.json()
    console.log('Resposta do Asaas:', {
      status: response.status,
      success: response.ok,
      data: data.data || data
    })

    if (!response.ok) {
      throw new Error(data.errors?.[0]?.description || data.message || 'Erro ao buscar cliente')
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Erro ao buscar cliente:', {
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar cliente' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ASAAS_API_KEY
    if (!apiKey) {
      console.error('ASAAS_API_KEY não configurada')
      throw new Error('API Key do Asaas não configurada')
    }

    const body = await request.json()
    const { name, email } = body

    console.log('POST /api/asaas/customers - Body:', { name, email })

    if (!name || !email) {
      console.error('Dados obrigatórios não fornecidos:', { name, email })
      return NextResponse.json(
        { error: 'Nome e email são obrigatórios' },
        { status: 400 }
      )
    }

    const url = `${ASAAS_BASE_URL}/customers`
    console.log('Criando cliente no Asaas:', { url, name, email })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access-token': apiKey
      },
      body: JSON.stringify({ name, email })
    })

    const data = await response.json()
    console.log('Resposta do Asaas:', {
      status: response.status,
      success: response.ok,
      data
    })

    if (!response.ok) {
      throw new Error(data.errors?.[0]?.description || data.message || 'Erro ao criar cliente')
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Erro ao criar cliente:', {
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json(
      { error: error.message || 'Erro ao criar cliente' },
      { status: 500 }
    )
  }
}
