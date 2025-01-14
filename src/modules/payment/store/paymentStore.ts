import { create } from 'zustand'
import { PaymentService } from '../services/paymentService'
import { CreatePaymentDTO, Transaction } from '../types'

interface PaymentStore {
  isLoading: boolean
  error: string | null
  currentTransaction: Transaction | null
  createPayment: (data: CreatePaymentDTO) => Promise<string | null> // Retorna URL do checkout ou null se erro
  clearError: () => void
}

export const usePaymentStore = create<PaymentStore>((set) => ({
  isLoading: false,
  error: null,
  currentTransaction: null,

  createPayment: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const paymentService = PaymentService.getInstance()
      const response = await paymentService.createPayment(data)

      if (!response.success || !response.checkoutUrl) {
        set({ error: response.error || 'Erro ao criar pagamento' })
        return null
      }

      set({ currentTransaction: response.transaction || null })
      return response.checkoutUrl
    } catch (error: any) {
      set({ error: error.message })
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  clearError: () => set({ error: null })
}))
