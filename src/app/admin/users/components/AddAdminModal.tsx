'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
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
          <div className="fixed inset-0 bg-black/20" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-3xl w-full bg-black/20 backdrop-blur-md border border-primary/20 rounded-xl shadow-xl">
              <div className="flex justify-between items-center p-6 border-b border-primary/20">
                <Dialog.Title className="text-xl font-bold text-primary">
                  Novo Administrador
                </Dialog.Title>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form className="p-6 space-y-6">
                {/* Dados Básicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      className="w-full bg-black border border-primary/20 rounded-lg px-4 py-2 text-gray-300
                        focus:border-primary focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full bg-black border border-primary/20 rounded-lg px-4 py-2 text-gray-300
                        focus:border-primary focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                </div>

                {/* Funções */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Funções
                  </label>
                  <div className="space-y-4 bg-black border border-primary/20 rounded-lg p-6">
                    <div className="relative flex items-start">
                      <div className="flex h-6 items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-primary/20 bg-black text-primary focus:ring-primary focus:ring-offset-0"
                        />
                      </div>
                      <div className="ml-3">
                        <label className="text-sm font-medium text-primary">
                          Owner
                        </label>
                        <p className="text-sm text-gray-400">
                          Acesso total ao sistema
                        </p>
                      </div>
                    </div>

                    <div className="relative flex items-start">
                      <div className="flex h-6 items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-primary/20 bg-black text-primary focus:ring-primary focus:ring-offset-0"
                        />
                      </div>
                      <div className="ml-3">
                        <label className="text-sm font-medium text-primary">
                          Administrador Geral
                        </label>
                        <p className="text-sm text-gray-400">
                          Pode adicionar admins, administrar usuários e cupons
                        </p>
                      </div>
                    </div>

                    <div className="relative flex items-start">
                      <div className="flex h-6 items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-primary/20 bg-black text-primary focus:ring-primary focus:ring-offset-0"
                        />
                      </div>
                      <div className="ml-3">
                        <label className="text-sm font-medium text-primary">
                          Gerenciador de Conteúdo
                        </label>
                        <p className="text-sm text-gray-400">
                          Pode gerenciar anúncios e mensagens do sistema
                        </p>
                      </div>
                    </div>

                    <div className="relative flex items-start">
                      <div className="flex h-6 items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-primary/20 bg-black text-primary focus:ring-primary focus:ring-offset-0"
                        />
                      </div>
                      <div className="ml-3">
                        <label className="text-sm font-medium text-primary">
                          Suporte
                        </label>
                        <p className="text-sm text-gray-400">
                          Pode acessar tickets de suporte
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botões */}
                <div className="flex justify-end gap-3 pt-4 border-t border-primary/20">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg
                      hover:bg-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                      border border-transparent"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-black bg-primary rounded-lg
                      hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                      border border-transparent"
                  >
                    Adicionar
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
