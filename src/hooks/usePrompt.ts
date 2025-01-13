import { useState, useEffect } from 'react'
import { resolvePromptVariables } from '@/config/prompts/promptVariables'

export function usePrompt(basePrompt: string) {
  const [resolvedPrompt, setResolvedPrompt] = useState(basePrompt)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const resolvePrompt = async () => {
      try {
        setLoading(true)
        const resolved = await resolvePromptVariables(basePrompt)
        setResolvedPrompt(resolved)
        setError(null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    resolvePrompt()
  }, [basePrompt])

  return { prompt: resolvedPrompt, loading, error }
}
