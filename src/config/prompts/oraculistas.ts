import { Oraculista } from '@/modules/oraculistas/types/oraculista'

export function getPromptByOraculista(oraculista: Oraculista): string {
  return oraculista.prompt_formatado || oraculista.prompt || '';
}

export function atualizarPromptOraculista(oraculista: Oraculista): string {
  return oraculista.prompt || '';
}

export function formatarPrompt(oraculista: Oraculista): string {
  return oraculista.prompt || '';
} 