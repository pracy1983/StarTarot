import { Oraculista } from './page'

export async function generateStaticParams() {
  const oraculistas = (await import('../../../../public/oraculistas/oraculistas.json')).default
  
  return oraculistas.map((o: Oraculista) => ({
    nome: o.nome
  }))
}
