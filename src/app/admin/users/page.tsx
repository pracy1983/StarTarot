'use client'

import { useUsersStore } from '@/modules/users/store/usersStore'

export default function UsersPage() {
  const { users, setIsModalOpen, setSelectedUserId } = useUsersStore()
  const admins = users.filter((user) => user.isAdmin)
  const regularUsers = users.filter((user) => !user.isAdmin)

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-primary mb-8">Usuários</h1>

      {/* Admins */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold text-primary mb-4">
          Administradores
        </h2>
        <div className="grid gap-4">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-6
                hover:border-primary/40 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex gap-6">
                  <div>
                    <div className="text-sm text-gray-400">Nome</div>
                    <div className="text-lg font-semibold text-primary">
                      {admin.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Email</div>
                    <div className="text-lg font-semibold text-primary">
                      {admin.email}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedUserId(admin.id)
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
          ))}
        </div>
      </div>

      {/* Regular Users */}
      <div>
        <h2 className="text-2xl font-semibold text-primary mb-4">
          Usuários
        </h2>
        <div className="grid gap-4">
          {regularUsers.map((user) => (
            <div
              key={user.id}
              className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-6
                hover:border-primary/40 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex gap-6">
                  <div>
                    <div className="text-sm text-gray-400">Nome</div>
                    <div className="text-lg font-semibold text-primary">
                      {user.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Email</div>
                    <div className="text-lg font-semibold text-primary">
                      {user.email}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Status</div>
                    <div className={`text-lg font-semibold ${user.isOnline ? 'text-green-500' : 'text-red-500'}`}>
                      {user.isOnline ? 'Online' : 'Offline'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Créditos</div>
                    <div className="text-lg font-semibold text-primary">
                      {user.credits}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedUserId(user.id)
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
          ))}
        </div>
      </div>
    </div>
  )
}
