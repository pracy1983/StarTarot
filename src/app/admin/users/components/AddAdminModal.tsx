'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useUsersStore } from '@/modules/users/store/usersStore'
import { XMarkIcon } from '@heroicons/react/24/outline'

export default function AddAdminModal() {
  const isModalOpen = useUsersStore((state) => state.isModalOpen)
  const setIsModalOpen = useUsersStore((state) => state.setIsModalOpen)
  const createUser = useUsersStore((state) => state.createUser)
  const loading = useUsersStore((state) => state.loading)

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [adminRole, setAdminRole] = useState('admin')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await createUser({
      email,
      name,
      isAdmin: true,
      adminRole,
    })

    setEmail('')
    setName('')
    setAdminRole('admin')
    setIsModalOpen(false)
  }

  return (
    <Transition appear show={isModalOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
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
                  className="text-lg font-medium leading-6 text-primary flex justify-between items-center"
                >
                  <span>Adicionar Administrador</span>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-400">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-md bg-black/40 border border-primary/20 
                        focus:border-primary focus:ring focus:ring-primary/20 text-white px-3 py-2"
                    />
                  </div>

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-400">
                      Nome
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-md bg-black/40 border border-primary/20 
                        focus:border-primary focus:ring focus:ring-primary/20 text-white px-3 py-2"
                    />
                  </div>

                  <div>
                    <label htmlFor="adminRole" className="block text-sm font-medium text-gray-400">
                      Função
                    </label>
                    <select
                      id="adminRole"
                      value={adminRole}
                      onChange={(e) => setAdminRole(e.target.value)}
                      className="mt-1 block w-full rounded-md bg-black/40 border border-primary/20 
                        focus:border-primary focus:ring focus:ring-primary/20 text-white px-3 py-2"
                    >
                      <option value="admin">Administrador</option>
                      <option value="super_admin">Super Administrador</option>
                    </select>
                  </div>

                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full px-4 py-2 text-black font-medium bg-gradient-to-r from-primary to-primary/80 
                        rounded-lg hover:from-primary/90 hover:to-primary/70 transition-all disabled:opacity-50 
                        disabled:cursor-not-allowed"
                    >
                      {loading ? 'Adicionando...' : 'Adicionar Administrador'}
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
