export const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) return '-'
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('pt-BR')
  } catch {
    return '-'
  }
}

export const formatDateTime = (date: string | Date | undefined | null): string => {
  if (!date) return '-'
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleString('pt-BR')
  } catch {
    return '-'
  }
} 