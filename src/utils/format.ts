export const formatCurrency = (value: number | undefined | null): string => {
  if (value == null) return 'R$ -'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}
