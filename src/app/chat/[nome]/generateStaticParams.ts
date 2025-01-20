
import { Oraculista } from './types'
import oraculistas from '../../../../public/oraculistas/oraculistas.json'

export async function generateStaticParams() {
  return oraculistas.map((o: Oraculista) => ({
    nome: o.nome
  }))
}
