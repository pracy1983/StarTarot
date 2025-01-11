import { prompt as magoNegroPrompt } from './mago-negro'
import { prompt as voClausaPrompt } from './vo-cleusa'
import { prompt as ciganaFloraPrompt } from './cigana-flora'

export const oraculistaPrompts = {
  'mago-negro': magoNegroPrompt,
  'vo-cleusa': voClausaPrompt,
  'cigana-flora': ciganaFloraPrompt
}

export function getPromptByOraculista(oraculistaNome: string): string | undefined {
  const normalizedName = oraculistaNome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '-')
  
  return oraculistaPrompts[normalizedName]
}

export function savePromptForOraculista(oraculistaNome: string, promptContent: string): void {
  // Esta função será implementada quando tivermos o backend
  // Por enquanto, apenas simula o salvamento
  console.log(`Salvando prompt para ${oraculistaNome}:`, promptContent)
}
