import { supabase } from '@/lib/supabase'
import { useOraculistasStore } from '@/modules/oraculistas/store/oraculistasStore'

export type PromptVariable = {
  key: string
  getValue: () => Promise<string>
}

function gerarLinkOraculista(nome: string): string {
  return `me apssa pra ${nome.toLowerCase()}`
}

export const promptVariables: PromptVariable[] = [
  {
    key: '[oraculistas disponiveis, status, valores]',
    getValue: async () => {
      const { oraculistas } = useOraculistasStore.getState()
      
      if (!oraculistas?.length) {
        return 'Desculpe, não temos oraculistas disponíveis no momento.'
      }

      const oraculistasDisponiveis = oraculistas
        .filter(o => o.disponivel)
        .map(o => {
          let descricao = `
${o.nome}
${o.descricao}
${o.especialidades.map(esp => `- ${esp}`).join('\n')}`

          // Adiciona informação de preço e promoção
          if (o.emPromocao && o.precoPromocional) {
            descricao += `\nPREÇO NORMAL: R$ ${o.preco}`
            descricao += `\nPREÇO PROMOCIONAL: R$ ${o.precoPromocional} (APROVEITE!)`
          } else {
            descricao += `\nPREÇO: R$ ${o.preco}`
          }

          return descricao
        })
        .join('\n\n')

      return oraculistasDisponiveis
    }
  }
  // Adicione outras variáveis dinâmicas aqui
]

export async function resolvePromptVariables(prompt: string): Promise<string> {
  let resolvedPrompt = prompt

  for (const variable of promptVariables) {
    if (prompt.includes(variable.key)) {
      const value = await variable.getValue()
      resolvedPrompt = resolvedPrompt.replace(variable.key, value)
    }
  }

  return resolvedPrompt
}
