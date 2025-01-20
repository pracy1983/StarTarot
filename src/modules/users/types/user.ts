export interface User {
  id: string
  name: string
  email: string
  isAdmin: boolean
  adminRole?: string
  isOnline: boolean
  lastOnline: Date
  credits: number
  lastConsultation?: Date
}

export interface UserFilters {
  status?: 'online' | 'offline'
  creditsComparison?: 'equal' | 'above' | 'below'
  creditsValue?: number
  currentPage: number
  perPage: 10 | 30 | 50
}
