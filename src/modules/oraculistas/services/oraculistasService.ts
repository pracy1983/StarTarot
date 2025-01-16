import { supabase } from '@/lib/supabase'
import { OraculistaFormData } from '../types/oraculista'

export async function atualizarOraculista(id: string, data: Partial<OraculistaFormData>) {
  try {
    const { error } = await supabase
      .from('oraculistas')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    const err = error as Error
    return { success: false, error: err.message }
  }
} 