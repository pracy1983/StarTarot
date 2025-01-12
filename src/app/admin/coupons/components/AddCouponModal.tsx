'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'
import { useCouponsStore, CouponType } from '@/modules/coupons/store/couponsStore'

export function AddCouponModal() {
  const { isModalOpen, setIsModalOpen, addCoupon } = useCouponsStore()
  const [code, setCode] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [expiresAt, setExpiresAt] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [type, setType] = useState<CouponType>('PERCENTAGE')
  const [discount, setDiscount] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addCoupon({
      code,
      isActive,
      type,
      discount: ['PERCENTAGE', 'FIXED'].includes(type) ? Number(discount) : undefined,
      maxUses: maxUses ? Number(maxUses) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    })
    setIsModalOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setCode('')
    setIsActive(true)
    setExpiresAt('')
    setMaxUses('')
    setType('PERCENTAGE')
    setDiscount('')
  }

  return (
    <Transition appear show={isModalOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={() => setIsModalOpen(false)}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-black/40 backdrop-blur-md border border-primary/20 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-2xl font-bold text-primary">
                  Adicionar Cupom
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400">
                      Código do Cupom
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-md border border-primary/20 bg-black/40 text-primary p-2.5
                        focus:border-primary focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400">
                      Status
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded border-primary/20 bg-black/40 text-primary
                          focus:ring-primary"
                      />
                      <span className="text-primary">Ativo</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400">
                      Data de Expiração
                    </label>
                    <input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-primary/20 bg-black/40 text-primary p-2.5
                        focus:border-primary focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400">
                      Total de Cupons (em branco para ilimitado)
                    </label>
                    <input
                      type="number"
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                      min="1"
                      className="mt-1 block w-full rounded-md border border-primary/20 bg-black/40 text-primary p-2.5
                        focus:border-primary focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400">
                      Tipo de Desconto
                    </label>
                    <select
                      value={type}
                      onChange={(e) => {
                        setType(e.target.value as CouponType)
                        setDiscount('')
                      }}
                      className="mt-1 block w-full rounded-md border border-primary/20 bg-[#1a1a2e] text-primary p-2.5
                        focus:border-primary focus:ring-primary [&>option]:bg-[#1a1a2e] [&>option]:text-primary
                        [&>option:checked]:bg-primary/40 [&>option:checked]:text-black"
                    >
                      <option value="PERCENTAGE">Desconto em Porcentagem</option>
                      <option value="FIXED">Desconto Fixo</option>
                      <option value="DOUBLE_CREDITS">Crédito em Dobro</option>
                      <option value="FREE_FIRST">Primeira Pergunta Grátis</option>
                    </select>
                  </div>

                  {['PERCENTAGE', 'FIXED'].includes(type) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400">
                        {type === 'PERCENTAGE' ? 'Porcentagem de Desconto' : 'Valor do Desconto (R$)'}
                      </label>
                      <input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        required
                        min="0"
                        step={type === 'PERCENTAGE' ? '1' : '0.01'}
                        className="mt-1 block w-full rounded-md border border-primary/20 bg-black/40 text-primary p-2.5
                          focus:border-primary focus:ring-primary"
                      />
                    </div>
                  )}

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-black font-medium bg-gradient-to-r from-primary to-primary/80 rounded-lg
                        hover:from-primary/90 hover:to-primary/70 transition-all"
                    >
                      Adicionar
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
