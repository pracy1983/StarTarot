import { supabase } from '@/lib/supabase'
import { OraculistaFormData } from '../types/oraculista'

export class OraculistasService {
  static async carregarOraculistas() {
    const { data, error } = await supabase
      .from('oraculistas')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Formatar datas
    return data?.map(oraculista => ({
      ...oraculista,
      createdAt: new Date(oraculista.created_at),
      updatedAt: new Date(oraculista.updated_at)
    })) || []
  }

  static async atualizarOraculista(id: string, data: Partial<OraculistaFormData>) {
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
} 