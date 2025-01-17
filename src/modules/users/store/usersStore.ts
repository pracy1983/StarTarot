import { create } from 'zustand'

interface User {
  id: string
  name: string
  email: string
  isAdmin: boolean
  isOnline: boolean
  credits: number
  createdAt: Date
  lastOnline: Date
  lastConsultation?: Date
  adminRole?: string
}

interface UsersFilters {
  status?: 'online' | 'offline'
  creditsComparison?: 'equal' | 'above' | 'below'
  creditsValue?: number
  perPage: 10 | 30 | 50
  currentPage: number
}

interface UsersStore {
  users: User[]
  filters: UsersFilters
  isModalOpen: boolean
  selectedUserId?: string
  setIsModalOpen: (isOpen: boolean) => void
  setSelectedUserId: (id?: string) => void
  setFilters: (filters: Partial<UsersFilters>) => void
  getTotalPages: () => number
}

export const useUsersStore = create<UsersStore>((set, get) => ({
  users: [
    {
      id: '1',
      name: 'Admin Principal',
      email: 'admin@startarot.com',
      isAdmin: true,
      isOnline: true,
      credits: 0,
      createdAt: new Date('2024-01-01'),
      lastOnline: new Date('2025-01-12T01:20:00'),
      adminRole: 'Administrador Principal',
    },
    {
      id: '2',
      name: 'João Silva',
      email: 'joao@email.com',
      isAdmin: false,
      isOnline: true,
      credits: 50,
      createdAt: new Date('2024-01-05'),
      lastOnline: new Date('2025-01-12T01:15:00'),
      lastConsultation: new Date('2025-01-11T14:30:00'),
    },
    {
      id: '3',
      name: 'Maria Santos',
      email: 'maria@email.com',
      isAdmin: false,
      isOnline: false,
      credits: 10,
      createdAt: new Date('2024-01-10'),
      lastOnline: new Date('2025-01-11T23:45:00'),
      lastConsultation: new Date('2025-01-11T22:15:00'),
    },
  ],
  filters: {
    perPage: 10,
    currentPage: 1,
  },
  isModalOpen: false,
  selectedUserId: undefined,
  setIsModalOpen: (isOpen) => set({ isModalOpen: isOpen }),
  setSelectedUserId: (id) => set({ selectedUserId: id }),
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  getTotalPages: () => {
    const state = get()
    const filteredUsers = state.users.filter((user) => !user.isAdmin)
    return Math.ceil(filteredUsers.length / state.filters.perPage)
  },
}))
