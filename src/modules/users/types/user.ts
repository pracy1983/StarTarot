export type UserRole = 'admin' | 'user'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export interface UserFormData extends Omit<User, 'id' | 'createdAt' | 'updatedAt'> {
  password?: string
}
