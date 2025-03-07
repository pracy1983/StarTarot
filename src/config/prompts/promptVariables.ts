export type PromptVariable = {
  key: string
  getValue: () => Promise<string>
}

export interface Oraculista {
  id: string
  nome: string
  descricao: string
  disponivel: boolean
  preco: number
}

export async function getOraculistasDisponiveis(): Promise<Oraculista[]> {
  try {
    // Corrigindo a URL para usar URL absoluta com base na origem
    let baseUrl;
    if (typeof window !== 'undefined') {
      baseUrl = window.location.origin;
    } else {
      // Em ambiente de servidor, verificar se estamos em desenvolvimento
      const isDev = process.env.NODE_ENV === 'development';
      baseUrl = process.env.NEXT_PUBLIC_APP_URL || (isDev ? 'http://localhost:3001' : 'http://localhost:3000');
    }
    
    const response = await fetch(`${baseUrl}/api/prompts/variables`)
    if (!response.ok) {
      throw new Error('Erro ao buscar oraculistas')
    }
    return await response.json()
  } catch (error) {
    console.error('Erro ao buscar oraculistas:', error)
    return []
  }
}

export const promptVariables: PromptVariable[] = [
  {
    key: '[oraculistas disponiveis, status, valores]',
    getValue: async () => {
      try {
        const oraculistas = await getOraculistasDisponiveis()

        if (!oraculistas.length) {
          return 'Não há oraculistas disponíveis no momento.'
        }

        const oraculistasInfo = oraculistas.map(oraculista => {
          const status = oraculista.disponivel ? 'disponível' : 'indisponível'
          return `${oraculista.nome} (${status}) - R$ ${oraculista.preco}`
        })

        return oraculistasInfo.join('\n')
      } catch (error) {
        console.error('Erro ao buscar oraculistas:', error)
        return 'Erro ao buscar informações dos oraculistas.'
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
