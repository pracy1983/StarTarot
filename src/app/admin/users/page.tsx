'use client'

import { useUsersStore } from '@/modules/users/store/usersStore'
import AddAdminModal from './components/AddAdminModal'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { User } from '@/modules/users/types/user'
import { PlusIcon, UserCircleIcon } from '@heroicons/react/24/outline'

interface Filters {
  status?: 'online' | 'offline'
  creditsValue?: number
  creditsComparison?: 'equal' | 'above' | 'below'
  currentPage: number
  perPage: number
}

export default function UsersPage() {
  const users = useUsersStore((state) => state.users)
  const loading = useUsersStore((state) => state.loading)
  const fetchUsers = useUsersStore((state) => state.fetchUsers)
  const setIsModalOpen = useUsersStore((state) => state.setIsModalOpen)

  const [filters, setFilters] = useState<Filters>({
    currentPage: 1,
    perPage: 10
  })

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const admins = users.filter((user) => user.isAdmin)
  const regularUsers = users.filter((user) => !user.isAdmin)

  const formatarData = (data: Date | string) => {
    const date = data instanceof Date ? data : new Date(data)
    return format(date, "dd 'de' MMMM 'de' yyyy", {
      locale: ptBR
    })
  }

  const filteredUsers = regularUsers.filter((user) => {
    // Filtro por status
    if (filters.status) {
      const isOnline = filters.status === 'online'
      if (user.isOnline !== isOnline) {
        return false
      }
    }

    // Filtro por créditos
    if (typeof filters.creditsValue === 'number' && filters.creditsComparison) {
      const userCredits = user.credits || 0
      
      switch (filters.creditsComparison) {
        case 'equal':
          if (userCredits !== filters.creditsValue) {
            return false
          }
          break
        case 'above':
          if (userCredits <= filters.creditsValue) {
            return false
          }
          break
        case 'below':
          if (userCredits >= filters.creditsValue) {
            return false
          }
          break
      }
    }

    return true
  })

  const paginatedUsers = filteredUsers.slice(
    (filters.currentPage - 1) * filters.perPage,
    filters.currentPage * filters.perPage
  )

  const totalPages = Math.ceil(filteredUsers.length / filters.perPage)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-400 mt-4">Carregando usuários...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Seção de Administradores */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-primary">
              Administradores
            </h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 text-black font-medium bg-gradient-to-r from-primary to-primary/80 rounded-lg
                hover:from-primary/90 hover:to-primary/70 transition-all whitespace-nowrap"
            >
              <PlusIcon className="w-5 h-5 inline-block mr-2" />
              Novo Administrador
            </button>
          </div>

          <div className="grid gap-6">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-6
                  hover:border-primary/40 transition-all duration-300"
              >
                <div className="flex items-start gap-6">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-black/40">
                    {admin.name ? (
                      <div className="w-full h-full flex items-center justify-center text-primary text-2xl font-bold">
                        {admin.name[0].toUpperCase()}
                      </div>
                    ) : (
                      <UserCircleIcon className="w-full h-full text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-primary mb-1">
                          {admin.name || 'Sem nome'}
                        </h3>
                        <p className="text-gray-400">{admin.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-4">
                      <div>
                        <div className="text-sm text-gray-400">Função</div>
                        <div className="text-lg font-semibold text-primary">
                          {admin.adminRole === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-400">Status</div>
                        <div className="text-lg font-semibold">
                          <span className={`${admin.isOnline ? 'text-green-500' : 'text-red-500'}`}>
                            {admin.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-400">Último Acesso</div>
                        <div className="text-lg font-semibold text-primary">
                          {admin.lastOnline ? formatarData(admin.lastOnline) : 'Nunca'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Seção de Usuários */}
        <div>
          <h2 className="text-2xl font-bold text-primary mb-6">
            Usuários
          </h2>

          <div className="grid gap-6">
            {paginatedUsers.map((user) => (
              <div
                key={user.id}
                className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-6
                  hover:border-primary/40 transition-all duration-300"
              >
                <div className="flex items-start gap-6">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-black/40">
                    {user.name ? (
                      <div className="w-full h-full flex items-center justify-center text-primary text-2xl font-bold">
                        {user.name[0].toUpperCase()}
                      </div>
                    ) : (
                      <UserCircleIcon className="w-full h-full text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-primary mb-1">
                          {user.name || 'Sem nome'}
                        </h3>
                        <p className="text-gray-400">{user.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
                      <div>
                        <div className="text-sm text-gray-400">Status</div>
                        <div className="text-lg font-semibold">
                          <span className={`${user.isOnline ? 'text-green-500' : 'text-red-500'}`}>
                            {user.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-400">Créditos</div>
                        <div className="text-lg font-semibold text-primary">
                          {user.credits || 0}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-400">Última Consulta</div>
                        <div className="text-lg font-semibold text-primary">
                          {user.lastConsultation ? formatarData(user.lastConsultation) : 'Nunca'}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-400">Último Acesso</div>
                        <div className="text-lg font-semibold text-primary">
                          {user.lastOnline ? formatarData(user.lastOnline) : 'Nunca'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8 gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setFilters({ ...filters, currentPage: page })}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filters.currentPage === page
                      ? 'bg-primary text-black'
                      : 'bg-black/40 text-primary hover:bg-primary/20'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddAdminModal />
    </div>
  )
}
