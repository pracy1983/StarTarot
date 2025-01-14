export interface Transaction {
  id: string
  userId: string
  amount: number
  credits: number
  status: TransactionStatus
  paymentId?: string
  paymentUrl?: string
  createdAt: Date
  updatedAt: Date
}

export type TransactionStatus = 
  | 'PENDING'    // Aguardando pagamento
  | 'CONFIRMED'  // Pagamento confirmado
  | 'RECEIVED'   // Pagamento recebido
  | 'OVERDUE'    // Pagamento vencido
  | 'REFUNDED'   // Pagamento estornado
  | 'FAILED'     // Falha no pagamento

export interface CreatePaymentDTO {
  userId: string
  amount: number
  credits: number
  customerName: string
  customerEmail: string
}

export interface PaymentResponse {
  success: boolean
  error?: string
  transaction?: Transaction
  checkoutUrl?: string
}
