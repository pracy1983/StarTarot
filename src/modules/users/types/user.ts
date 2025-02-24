export interface User {
  id: string
  email: string
  name?: string
  is_admin: boolean
  admin_role?: string
  is_online?: boolean
  last_online?: Date
  credits?: number
  last_consultation?: Date
  created_at?: Date
  updated_at?: Date
}

export interface UserFilters {
  status?: 'online' | 'offline'
  creditsComparison?: 'equal' | 'above' | 'below'
  creditsValue?: number
  currentPage: number
  perPage: 10 | 30 | 50
}

export interface CreateUserInput {
  email: string
  password: string
  name?: string
  is_admin?: boolean
  admin_role?: string
}

export interface UpdateUserInput {
  email?: string
  name?: string
  is_admin?: boolean
  admin_role?: string
  is_online?: boolean
  last_online?: Date
  credits?: number
  last_consultation?: Date
}
