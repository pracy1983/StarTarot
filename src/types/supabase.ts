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
      users: {
        Row: {
          id: string
          name: string
          email: string
          phone_country_code: string
          phone_area_code: string
          phone_number: string
          birth_date: string
          coupon_code?: string
          is_admin: boolean
          admin_role?: string
          is_online: boolean
          last_online: string
          credits: number
          last_consultation?: string
          email_verified: boolean
          verification_code?: string
          verification_code_expires_at?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone_country_code: string
          phone_area_code: string
          phone_number: string
          birth_date: string
          coupon_code?: string
          is_admin?: boolean
          admin_role?: string
          is_online?: boolean
          last_online?: string
          credits?: number
          last_consultation?: string
          email_verified?: boolean
          verification_code?: string
          verification_code_expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone_country_code?: string
          phone_area_code?: string
          phone_number?: string
          birth_date?: string
          coupon_code?: string
          is_admin?: boolean
          admin_role?: string
          is_online?: boolean
          last_online?: string
          credits?: number
          last_consultation?: string
          email_verified?: boolean
          verification_code?: string
          verification_code_expires_at?: string
          updated_at?: string
        }
      }
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
