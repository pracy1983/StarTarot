import { formatDateTime } from '@/utils/date'
import { formatCurrency } from '@/utils/format'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { useConsultasStore } from '@/modules/consultas/store/consultasStore'
import { Consulta } from '@/modules/consultas/types/consulta'

export default function ConsultasPage() {
  const { consultas, loading, error } = useConsultasStore()

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  return (
    <div>
      {consultas.map((consulta: Consulta) => (
        <div key={consulta.id}>
          <div>Data: {formatDateTime(consulta.dataHora)}</div>
          <div>Valor: {formatCurrency(consulta.valor)}</div>
        </div>
      ))}
    </div>
  )
} 