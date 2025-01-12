import { create } from 'zustand'

interface User {
  id: string
  name: string
  email: string
  isAdmin: boolean
  isOnline: boolean
  credits: number
  createdAt: Date
}

interface UsersStore {
  users: User[]
  isModalOpen: boolean
  selectedUserId?: string
  setIsModalOpen: (isOpen: boolean) => void
  setSelectedUserId: (id?: string) => void
}

export const useUsersStore = create<UsersStore>((set) => ({
  users: [
    {
      id: '1',
      name: 'Admin Principal',
      email: 'admin@startarot.com',
      isAdmin: true,
      isOnline: true,
      credits: 0,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: '2',
      name: 'João Silva',
      email: 'joao@email.com',
      isAdmin: false,
      isOnline: true,
      credits: 50,
      createdAt: new Date('2024-01-05'),
    },
    {
      id: '3',
      name: 'Maria Santos',
      email: 'maria@email.com',
      isAdmin: false,
      isOnline: false,
      credits: 10,
      createdAt: new Date('2024-01-10'),
    },
  ],
  isModalOpen: false,
  selectedUserId: undefined,
  setIsModalOpen: (isOpen) => set({ isModalOpen: isOpen }),
  setSelectedUserId: (id) => set({ selectedUserId: id }),
}))
