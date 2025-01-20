'use client'

import { useAuthStore } from '@/stores/authStore'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface UserProfile {
  nome: string
  email: string
  dataCadastro: string
  creditos: number
  consultasRealizadas: number
  ultimaConsulta: string | null
  foto: string | null
}

export default function PerfilPage() {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<UserProfile>({
    nome: user?.name || 'Usuário',
    email: user?.email || '',
    dataCadastro: '2024-01-01', // Será dinâmico
    creditos: 0, // Será dinâmico
    consultasRealizadas: 0, // Será dinâmico
    ultimaConsulta: null, // Será dinâmico
    foto: null // Será dinâmico
  })

  const formatarData = (data: Date | string) => {
    const date = data instanceof Date ? data : new Date(data)
    return format(date, "dd 'de' MMMM 'de' yyyy", {
      locale: ptBR
    })
  }

  useEffect(() => {
    // Aqui virá a chamada para API que buscará os dados do perfil
    // Por enquanto, usando dados mockados
  }, [])

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho do perfil */}
        <div className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-6">
            {/* Foto do perfil */}
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full shadow-[0_0_15px_rgba(255,184,0,0.3)] overflow-hidden">
                {profile.foto ? (
                  <Image
                    src={profile.foto}
                    alt={profile.nome}
                    width={96}
                    height={96}
                    className="object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl text-primary">
                      {profile.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Informações básicas */}
            <div>
              <h1 className="text-2xl font-semibold text-primary mb-2">
                {profile.nome}
              </h1>
              <p className="text-gray-300">{profile.email}</p>
              <p className="text-sm text-gray-400 mt-1">
                Membro desde {formatarData(profile.dataCadastro)}
              </p>
            </div>
          </div>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Créditos */}
          <div className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-4">
            <h3 className="text-primary font-medium mb-2">Créditos</h3>
            <p className="text-2xl font-semibold text-white">
              {profile.creditos}
            </p>
          </div>

          {/* Consultas realizadas */}
          <div className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-4">
            <h3 className="text-primary font-medium mb-2">Consultas realizadas</h3>
            <p className="text-2xl font-semibold text-white">
              {profile.consultasRealizadas}
            </p>
          </div>

          {/* Última consulta */}
          <div className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-4">
            <h3 className="text-primary font-medium mb-2">Última consulta</h3>
            <p className="text-2xl font-semibold text-white">
              {profile.ultimaConsulta
                ? formatarData(profile.ultimaConsulta)
                : 'Nenhuma consulta'}
            </p>
          </div>
        </div>

        {/* Seção de configurações - será implementada posteriormente */}
        <div className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-primary mb-4">
            Configurações
          </h2>
          <p className="text-gray-300">
            Em breve você poderá personalizar suas preferências aqui.
          </p>
        </div>
      </div>
    </div>
  )
}
