import { formatDate, formatDateTime } from '@/utils/date'
import { formatCurrency } from '@/utils/format'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'

export default function PagamentosPage() {
  const { pagamentos, loading, error } = usePagamentosStore()

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  return (
    <div>
      {pagamentos.map(pagamento => (
        <div key={pagamento.id}>
          <div>Data: {formatDateTime(pagamento.data)}</div>
          <div>Valor: {formatCurrency(pagamento.valor)}</div>
          {/* ... resto do código ... */}
        </div>
      ))}
    </div>
  )
} 