import { NextResponse } from 'next/server'

const ASAAS_BASE_URL = 'https://api.asaas.com/v3'

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ASAAS_API_KEY
    if (!apiKey) {
      throw new Error('API Key do Asaas não configurada')
    }

    const body = await request.json()

    // Validação dos campos obrigatórios
    const requiredFields = ['customer', 'billingType', 'value', 'dueDate']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Campos obrigatórios: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    const url = `${ASAAS_BASE_URL}/payments`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access-token': apiKey
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.errors?.[0]?.description || data.message || 'Erro ao criar pagamento')
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Erro ao criar pagamento:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar pagamento' },
      { status: 500 }
    )
  }
}
