import { supabase } from '@/lib/supabase'
import { Oraculista } from '@/modules/oraculistas/types/oraculista'

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
  
  // Salva o prompt formatado no Supabase
  const { error } = await supabase
    .from('oraculistas')
    .update({ 
      prompt_formatado: promptFormatado,
      updated_at: new Date().toISOString()
    })
    .eq('id', oraculista.id)

  if (error) {
    console.error('Erro ao atualizar prompt do oraculista:', error)
    throw error
  }

  return promptFormatado
}
