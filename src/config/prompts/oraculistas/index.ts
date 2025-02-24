import pool from '@/lib/db'
import { Oraculista } from '@/modules/oraculistas/types/oraculista'
import { resolvePromptVariables } from '../promptVariables'

export function formatarPromptOraculista(oraculista: Oraculista): string {
  return `Você é ${oraculista.nome}
${oraculista.descricao}
Suas Especialidades:
${oraculista.especialidades.map(esp => `- ${esp}`).join('\n')}
Instruções:
${oraculista.prompt}`
}

export async function atualizarPromptOraculista(oraculista: Oraculista) {
  const promptFormatado = formatarPromptOraculista(oraculista)
  
  try {
    // Salva o prompt formatado no banco
    await pool.query(
      'UPDATE oraculistas SET prompt_formatado = $1, updated_at = $2 WHERE id = $3',
      [promptFormatado, new Date().toISOString(), oraculista.id]
    )

    return promptFormatado
  } catch (error) {
    console.error('Erro ao atualizar prompt do oraculista:', error)
    throw error
  }
}
