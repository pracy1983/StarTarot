'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'
import { useCouponsStore, CouponType } from '@/modules/coupons/store/couponsStore'

export function AddCouponModal() {
  const isModalOpen = useCouponsStore((state) => state.isModalOpen)
  const setIsModalOpen = useCouponsStore((state) => state.setIsModalOpen)
  const addCoupon = useCouponsStore((state) => state.addCoupon)
  
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
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-black/40 backdrop-blur-md border border-primary/20 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-primary"
                >
                  Novo Cupom
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="code" className="block text-sm font-medium text-gray-300">
                      Código
                    </label>
                    <input
                      type="text"
                      id="code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-600 bg-black/40 text-gray-100 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-300">
                      Tipo
                    </label>
                    <select
                      id="type"
                      value={type}
                      onChange={(e) => setType(e.target.value as CouponType)}
                      className="mt-1 block w-full rounded-md border border-gray-600 bg-black/40 text-gray-100 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                    >
                      <option value="PERCENTAGE">Desconto %</option>
                      <option value="FIXED">Desconto Fixo</option>
                      <option value="DOUBLE_CREDITS">Crédito em Dobro</option>
                      <option value="FREE_FIRST">1ª Pergunta Grátis</option>
                    </select>
                  </div>

                  {['PERCENTAGE', 'FIXED'].includes(type) && (
                    <div>
                      <label htmlFor="discount" className="block text-sm font-medium text-gray-300">
                        {type === 'PERCENTAGE' ? 'Desconto (%)' : 'Desconto (R$)'}
                      </label>
                      <input
                        type="number"
                        id="discount"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-600 bg-black/40 text-gray-100 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="maxUses" className="block text-sm font-medium text-gray-300">
                      Limite de Usos
                    </label>
                    <input
                      type="number"
                      id="maxUses"
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-600 bg-black/40 text-gray-100 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                    />
                  </div>

                  <div>
                    <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-300">
                      Data de Expiração
                    </label>
                    <input
                      type="date"
                      id="expiresAt"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-600 bg-black/40 text-gray-100 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-300">
                      Cupom Ativo
                    </label>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-black hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      Criar Cupom
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
