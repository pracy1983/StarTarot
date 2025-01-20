import { MessageRole } from '@/modules/chat/types/message'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      messages: {
        Row: {
          id: string
          user_id: string
          content: string
          role: MessageRole
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          role: MessageRole
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          role?: MessageRole
          created_at?: string
        }
      }
      oraculistas: {
        Row: {
          id: string
          nome: string
          descricao: string
          especialidades: string[]
          disponivel: boolean
          preco: number
          precoPromocional?: number
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          descricao: string
          especialidades: string[]
          disponivel?: boolean
          preco: number
          precoPromocional?: number
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string
          especialidades?: string[]
          disponivel?: boolean
          preco?: number
          precoPromocional?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
