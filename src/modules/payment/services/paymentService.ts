import { User } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

export class PaymentService {
  private static instance: PaymentService
  private readonly apiUrl: string

  private constructor() {
    this.apiUrl = '/api/asaas'
  }

  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService()
    }
    return PaymentService.instance
  }

  async createPayment(user: User, amount: number): Promise<any> {
    if (!user?.email) {
      throw new Error('Email do usuário é obrigatório')
    }

    if (!amount || amount <= 0) {
      throw new Error('Valor do pagamento é obrigatório e deve ser maior que zero')
    }

    try {
      const reference = uuidv4()
      const name = user.email.split('@')[0] || user.email // Usa o email como nome se não tiver nome
      
      console.log('Iniciando criação de pagamento:', {
        user: user.id,
        email: user.email,
        amount,
        reference
      })

      const payment = await this.createAsaasPayment({
        name,
        email: user.email,
        amount,
        reference
      })

      return {
        ...payment,
        reference
      }
    } catch (error: any) {
      console.error('Error creating payment:', error)
      throw error
    }
  }

  private async createAsaasPayment({
    name,
    email,
    amount,
    reference
  }: {
    name: string
    email: string
    amount: number
    reference: string
  }): Promise<any> {
    if (!name || !email || !amount || !reference) {
      throw new Error('Dados inválidos para criação do pagamento')
    }

    try {
      console.log('Criando pagamento no Asaas:', {
        name,
        email,
        amount,
        reference
      })

      const customer = await this.getOrCreateCustomer({ name, email })
      if (!customer?.id) {
        throw new Error('Erro ao criar/buscar cliente no Asaas')
      }

      const payment = {
        customer: customer.id,
        billingType: 'PIX',
        value: amount,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: 'Compra de créditos StarTarot',
        externalReference: reference
      }

      console.log('Enviando requisição de pagamento:', {
        ...payment,
        customerEmail: email
      })

      const response = await fetch(`${this.apiUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payment)
      })

      if (!response.ok) {
        const data = await response.json()
        console.error('Erro na resposta do Asaas:', {
          status: response.status,
          data
        })
        throw new Error(data.error || 'Erro ao criar pagamento no Asaas')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Erro ao criar pagamento:', error)
      throw error
    }
  }

  private async getOrCreateCustomer({
    name,
    email
  }: {
    name: string
    email: string
  }): Promise<any> {
    if (!email) {
      throw new Error('Email é obrigatório')
    }

    try {
      // 1. Tenta buscar cliente existente
      console.log('Buscando cliente por email:', email)
      
      const searchResponse = await fetch(
        `${this.apiUrl}/customers?email=${encodeURIComponent(email)}`
      )

      if (!searchResponse.ok) {
        const error = await searchResponse.json()
        console.error('Erro ao buscar cliente:', error)
        throw new Error(error.error || 'Erro ao buscar cliente')
      }

      const searchData = await searchResponse.json()
      
      // Se encontrou cliente, retorna
      if (searchData.data?.[0]) {
        console.log('Cliente encontrado:', searchData.data[0])
        return searchData.data[0]
      }

      // 2. Se não encontrar, cria um novo cliente
      console.log('Cliente não encontrado, criando novo:', { name, email })
      
      const createResponse = await fetch(`${this.apiUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email })
      })

      if (!createResponse.ok) {
        const error = await createResponse.json()
        console.error('Erro ao criar cliente:', error)
        throw new Error(error.error || 'Erro ao criar cliente')
      }

      const createData = await createResponse.json()
      console.log('Novo cliente criado:', createData)
      return createData
    } catch (error) {
      console.error('Erro ao buscar/criar cliente:', error)
      throw error
    }
  }
}
