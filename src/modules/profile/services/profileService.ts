import { supabase } from '@/lib/supabase'
import { ProfileData } from '../types/profile'

export class ProfileService {
  async getProfile(userId: string): Promise<ProfileData | null> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          first_name,
          last_name,
          email,
          created_at,
          credits,
          phone_country_code,
          phone_area_code,
          phone_number,
          birth_date,
          avatar_url
        `)
        .eq('id', userId)
        .single()

      if (error) throw error

      // Buscar o número de consultas realizadas
      const { count: consultasRealizadas } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      return {
        primeiroNome: profile.first_name || '',
        sobrenome: profile.last_name || '',
        email: profile.email || '',
        dataCadastro: profile.created_at,
        creditos: profile.credits || 0,
        consultasRealizadas: consultasRealizadas || 0,
        telefone: {
          codigoPais: profile.phone_country_code || '+55',
          ddd: profile.phone_area_code || '',
          numero: profile.phone_number || ''
        },
        dataNascimento: profile.birth_date || '',
        foto: profile.avatar_url
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
      return null
    }
  }

  async updateProfile(userId: string, data: Partial<ProfileData>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.primeiroNome,
          last_name: data.sobrenome,
          phone_country_code: data.telefone?.codigoPais,
          phone_area_code: data.telefone?.ddd,
          phone_number: data.telefone?.numero,
          birth_date: data.dataNascimento
        })
        .eq('id', userId)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      return false
    }
  }

  async uploadPhoto(userId: string, photoData: string): Promise<string | null> {
    try {
      // Converter base64 para blob
      const base64Data = photoData.split(',')[1]
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'image/jpeg' })

      // Upload da foto
      const filename = `${userId}/${Date.now()}.jpg`
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filename)

      // Atualizar URL no perfil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (updateError) throw updateError

      return publicUrl
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error)
      return null
    }
  }
}
