'use client'

import { useCouponsStore } from '@/modules/coupons/store/couponsStore'
import { AddCouponModal } from './components/AddCouponModal'

export default function CouponsPage() {
  const { coupons, isModalOpen, setIsModalOpen } = useCouponsStore()

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
                    <div className="text-lg font-semibold text-primary">
                      {coupon.isActive ? 'Ativo' : 'Inativo'}
                    </div>
                  </div>
                  {coupon.expiresAt && (
                    <div>
                      <div className="text-sm text-gray-400">Expira em</div>
                      <div className="text-lg font-semibold text-primary">
                        {coupon.expiresAt.toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AddCouponModal />
    </div>
  )
}
