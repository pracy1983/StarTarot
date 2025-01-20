'use client'

import { useCouponsStore } from '@/modules/coupons/store/couponsStore'
import { AddCouponModal } from './components/AddCouponModal'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function CouponsPage() {
  const { coupons, isModalOpen, setIsModalOpen, toggleCouponStatus } = useCouponsStore()

  const formatarData = (data: Date) => {
    return format(data, "dd 'de' MMMM 'de' yyyy", {
      locale: ptBR
    })
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary">Cupons e Descontos</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-black font-medium bg-gradient-to-r from-primary to-primary/80 rounded-lg
            hover:from-primary/90 hover:to-primary/70 transition-all whitespace-nowrap"
        >
          + Novo Cupom
        </button>
      </div>

      <div className="grid gap-6">
        {coupons.map((coupon) => (
          <div
            key={coupon.id}
            className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-6
              hover:border-primary/40 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-semibold text-primary mb-2">
                  {coupon.code}
                </div>
                <div className="flex gap-6">
                  <div>
                    <div className="text-sm text-gray-400">Tipo</div>
                    <div className="text-lg font-semibold text-primary">
                      {coupon.type === 'PERCENTAGE' && 'Desconto %'}
                      {coupon.type === 'FIXED' && 'Desconto Fixo'}
                      {coupon.type === 'DOUBLE_CREDITS' && 'Crédito em Dobro'}
                      {coupon.type === 'FREE_FIRST' && '1ª Pergunta Grátis'}
                    </div>
                  </div>
                  {['PERCENTAGE', 'FIXED'].includes(coupon.type) && (
                    <div>
                      <div className="text-sm text-gray-400">Desconto</div>
                      <div className="text-lg font-semibold text-primary">
                        {coupon.type === 'PERCENTAGE' ? `${coupon.discount}%` : `R$ ${coupon.discount}`}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-gray-400">Usos</div>
                    <div className="text-lg font-semibold text-primary">
                      {coupon.usageCount}{coupon.maxUses ? `/${coupon.maxUses}` : ''}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Status</div>
                    <button
                      onClick={() => toggleCouponStatus(coupon.id)}
                      className={`text-lg font-semibold px-3 py-1 rounded-lg transition-colors ${
                        coupon.isActive
                          ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                          : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                      }`}
                    >
                      {coupon.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                  {coupon.expiresAt && (
                    <div>
                      <div className="text-sm text-gray-400">Expira em</div>
                      <div className="text-lg font-semibold text-primary">
                        {formatarData(coupon.expiresAt)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // TODO: Implementar edição
                    setIsModalOpen(true)
                  }}
                  className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AddCouponModal />
    </div>
  )
}
