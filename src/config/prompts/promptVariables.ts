import { supabase } from '@/lib/supabase'

export type PromptVariable = {
  key: string
  getValue: () => Promise<string>
}

export const promptVariables: PromptVariable[] = [
  {
    key: '[oraculistas disponiveis, status, valores]',
    getValue: async () => {
      try {
        const { data: oraculistas, error } = await supabase
          .from('oraculistas')
          .select('*')
          .eq('disponivel', true)
          .order('nome')

        if (error) throw error

        if (!oraculistas?.length) {
          return 'Desculpe, não temos oraculistas disponíveis no momento.'
        }

        const oraculistasDisponiveis = oraculistas.map(o => {
          let descricao = `
${o.nome}
${o.descricao}
${o.especialidades ? o.especialidades.map((esp: string) => `- ${esp}`).join('\n') : ''}`

          if (o.preco) {
            descricao += `\nPreço: R$ ${o.preco}`
            if (o.precoPromocional) {
              descricao += ` (Promoção: R$ ${o.precoPromocional})`
            }
          }

          return descricao
        }).join('\n\n')

        return oraculistasDisponiveis

      } catch (error) {
        console.error('Erro ao carregar oraculistas:', error)
        return 'Desculpe, houve um erro ao carregar os oraculistas.'
      }
    }
  }
]

export async function resolvePromptVariables(prompt: string): Promise<string> {
  let resolvedPrompt = prompt

  for (const variable of promptVariables) {
    const value = await variable.getValue()
    resolvedPrompt = resolvedPrompt.replace(variable.key, value)
  }

  return resolvedPrompt
}
