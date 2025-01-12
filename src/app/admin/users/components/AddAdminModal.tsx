'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useUsersStore } from '@/modules/users/store/usersStore'

export default function AddAdminModal() {
  const { isModalOpen, setIsModalOpen } = useUsersStore()

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
          <div className="fixed inset-0 bg-black/70" />
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl
                bg-[#1a1a2e] p-6 shadow-xl transition-all border border-primary/20"
              >
                <Dialog.Title
                  as="h3"
                  className="text-2xl font-semibold leading-6 text-primary mb-6"
                >
                  Adicionar Administrador
                </Dialog.Title>

                <div className="mt-4 space-y-6">
                  {/* Campos básicos */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Nome
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-md border border-primary/20 bg-black/40 text-primary p-2
                          focus:border-primary focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        className="w-full rounded-md border border-primary/20 bg-black/40 text-primary p-2
                          focus:border-primary focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Funções */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-3">
                      Funções
                    </label>
                    <div className="space-y-3 bg-black/40 rounded-lg p-4 border border-primary/20">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-primary/20 text-primary focus:ring-primary"
                        />
                        <label className="ml-2 text-primary">
                          Owner
                          <p className="text-sm text-gray-400">
                            Acesso total ao sistema
                          </p>
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-primary/20 text-primary focus:ring-primary"
                        />
                        <label className="ml-2 text-primary">
                          Administrador Geral
                          <p className="text-sm text-gray-400">
                            Pode adicionar admins, administrar usuários e cupons
                          </p>
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-primary/20 text-primary focus:ring-primary"
                        />
                        <label className="ml-2 text-primary">
                          Gerenciador de Conteúdo
                          <p className="text-sm text-gray-400">
                            Pode gerenciar anúncios e mensagens do sistema
                          </p>
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-primary/20 text-primary focus:ring-primary"
                        />
                        <label className="ml-2 text-primary">
                          Suporte
                          <p className="text-sm text-gray-400">
                            Pode acessar tickets de suporte
                          </p>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg
                      hover:bg-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-black bg-gradient-to-r from-primary to-primary/80
                      rounded-lg hover:from-primary/90 hover:to-primary/70 focus:outline-none
                      focus-visible:ring-2 focus-visible:ring-primary/50"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Adicionar
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
