'use client'

import { useUsersStore } from '@/modules/users/store/usersStore'

export default function UsersPage() {
  const { users, filters, setFilters, setIsModalOpen, setSelectedUserId } = useUsersStore()
  const admins = users.filter((user) => user.isAdmin)
  const regularUsers = users.filter((user) => !user.isAdmin)

  const filteredUsers = regularUsers.filter((user) => {
    if (filters.status && user.isOnline !== (filters.status === 'online')) return false
    if (filters.creditsValue !== undefined && filters.creditsComparison) {
      if (filters.creditsComparison === 'equal' && user.credits !== filters.creditsValue) return false
      if (filters.creditsComparison === 'above' && user.credits <= filters.creditsValue) return false
      if (filters.creditsComparison === 'below' && user.credits >= filters.creditsValue) return false
    }
    return true
  })

  const paginatedUsers = filteredUsers.slice(
    (filters.currentPage - 1) * filters.perPage,
    filters.currentPage * filters.perPage
  )

  const totalPages = Math.ceil(filteredUsers.length / filters.perPage)

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Admins Section */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-primary">
            Administradores
          </h2>
          <button
            onClick={() => {
              setSelectedUserId(undefined)
              setIsModalOpen(true)
            }}
            className="px-4 py-2 text-black font-medium bg-gradient-to-r from-primary to-primary/80 rounded-lg
              hover:from-primary/90 hover:to-primary/70 transition-all whitespace-nowrap"
          >
            + Novo Admin
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-primary/20">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Nome</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Email</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Função</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Última vez online</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} className="border-b border-primary/10 hover:bg-black/40">
                  <td className="py-3 px-4 text-primary">{admin.name}</td>
                  <td className="py-3 px-4 text-primary">{admin.email}</td>
                  <td className="py-3 px-4 text-primary">{admin.adminRole}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${admin.isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {admin.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-primary">
                    {admin.lastOnline.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => {
                        setSelectedUserId(admin.id)
                        setIsModalOpen(true)
                      }}
                      className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-primary">
            Usuários
          </h2>
          <button
            onClick={() => {
              setSelectedUserId(undefined)
              setIsModalOpen(true)
            }}
            className="px-4 py-2 text-black font-medium bg-gradient-to-r from-primary to-primary/80 rounded-lg
              hover:from-primary/90 hover:to-primary/70 transition-all whitespace-nowrap"
          >
            + Novo Usuário
          </button>
        </div>

        {/* Filters */}
        <div className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ status: e.target.value as 'online' | 'offline' | undefined })}
                className="rounded-md border border-primary/20 bg-[#1a1a2e] text-primary p-2
                  focus:border-primary focus:ring-primary [&>option]:bg-[#1a1a2e] [&>option]:text-primary"
              >
                <option value="">Todos</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Créditos
              </label>
              <div className="flex gap-2">
                <select
                  value={filters.creditsComparison || ''}
                  onChange={(e) => setFilters({ creditsComparison: e.target.value as 'equal' | 'above' | 'below' | undefined })}
                  className="rounded-md border border-primary/20 bg-[#1a1a2e] text-primary p-2
                    focus:border-primary focus:ring-primary [&>option]:bg-[#1a1a2e] [&>option]:text-primary"
                >
                  <option value="">Todos</option>
                  <option value="equal">Igual a</option>
                  <option value="above">Acima de</option>
                  <option value="below">Abaixo de</option>
                </select>
                <input
                  type="number"
                  value={filters.creditsValue || ''}
                  onChange={(e) => setFilters({ creditsValue: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="Valor"
                  className="w-24 rounded-md border border-primary/20 bg-[#1a1a2e] text-primary p-2
                    focus:border-primary focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Mostrar
              </label>
              <select
                value={filters.perPage}
                onChange={(e) => setFilters({ perPage: Number(e.target.value) as 10 | 30 | 50 })}
                className="rounded-md border border-primary/20 bg-[#1a1a2e] text-primary p-2
                  focus:border-primary focus:ring-primary [&>option]:bg-[#1a1a2e] [&>option]:text-primary"
              >
                <option value={10}>10</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-primary/20">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Nome</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Email</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Créditos</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Última vez online</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Última consulta</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="border-b border-primary/10 hover:bg-black/40">
                  <td className="py-3 px-4 text-primary">{user.name}</td>
                  <td className="py-3 px-4 text-primary">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${user.isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-primary">{user.credits}</td>
                  <td className="py-3 px-4 text-primary">
                    {user.lastOnline.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 text-primary">
                    {user.lastConsultation?.toLocaleString('pt-BR') || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => {
                        setSelectedUserId(user.id)
                        setIsModalOpen(true)
                      }}
                      className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              onClick={() => setFilters({ currentPage: filters.currentPage - 1 })}
              disabled={filters.currentPage === 1}
              className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-primary">
              Página {filters.currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setFilters({ currentPage: filters.currentPage + 1 })}
              disabled={filters.currentPage === totalPages}
              className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
