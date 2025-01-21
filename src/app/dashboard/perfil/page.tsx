'use client'

import { useAuthStore } from '@/stores/authStore'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ProfileService } from '@/modules/profile/services/profileService'
import { ProfileData } from '@/modules/profile/types/profile'
import { getZodiacSign } from '@/modules/profile/utils/zodiac'
import { PencilIcon, CameraIcon } from '@heroicons/react/24/outline'
import { PhotoUpload } from '@/modules/profile/components/PhotoUpload'

export default function PerfilPage() {
  const { user } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [profile, setProfile] = useState<ProfileData>({
    primeiroNome: '',
    sobrenome: '',
    email: user?.email || '',
    dataCadastro: new Date().toISOString(),
    creditos: 0,
    consultasRealizadas: 0,
    ultimaConsulta: null,
    telefone: {
      codigoPais: '+55',
      ddd: '',
      numero: ''
    },
    dataNascimento: '',
    foto: null
  })

  const [editForm, setEditForm] = useState({
    primeiroNome: '',
    sobrenome: '',
    telefone: {
      ddd: '',
      numero: ''
    },
    dataNascimento: ''
  })

  const formatarData = (data: Date | string) => {
    const date = data instanceof Date ? data : new Date(data)
    return format(date, "dd 'de' MMMM 'de' yyyy", {
      locale: ptBR
    })
  }

  const formatarTelefone = (tel: { ddd: string, numero: string }) => {
    return `(${tel.ddd}) ${tel.numero.replace(/(\d{5})(\d{4})/, '$1-$2')}`
  }

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        const profileService = new ProfileService()
        const data = await profileService.getProfile(user.id)
        if (data) {
          setProfile(data)
          setEditForm({
            primeiroNome: data.primeiroNome,
            sobrenome: data.sobrenome,
            telefone: {
              ddd: data.telefone.ddd,
              numero: data.telefone.numero
            },
            dataNascimento: data.dataNascimento
          })
        }
      }
    }
    loadProfile()
  }, [user])

  const handleSave = async () => {
    if (user) {
      const profileService = new ProfileService()
      const success = await profileService.updateProfile(user.id, {
        primeiroNome: editForm.primeiroNome,
        sobrenome: editForm.sobrenome,
        telefone: {
          codigoPais: '+55',
          ...editForm.telefone
        },
        dataNascimento: editForm.dataNascimento
      })

      if (success) {
        // Buscar os dados atualizados do perfil
        const updatedProfile = await profileService.getProfile(user.id)
        if (updatedProfile) {
          setProfile(updatedProfile)
          setEditForm({
            primeiroNome: updatedProfile.primeiroNome,
            sobrenome: updatedProfile.sobrenome,
            telefone: {
              ddd: updatedProfile.telefone.ddd,
              numero: updatedProfile.telefone.numero
            },
            dataNascimento: updatedProfile.dataNascimento
          })
        }
        setIsEditing(false)
      }
    }
  }

  const handlePhotoSave = async (photoData: string) => {
    if (user) {
      const profileService = new ProfileService()
      const newPhotoUrl = await profileService.uploadPhoto(user.id, photoData)
      if (newPhotoUrl) {
        setProfile(prev => ({ ...prev, foto: newPhotoUrl }))
      }
      setIsUploadingPhoto(false)
    }
  }

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
                    alt={`${profile.primeiroNome} ${profile.sobrenome}`}
                    width={96}
                    height={96}
                    className="object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl text-primary">
                      {profile.primeiroNome.charAt(0).toUpperCase()}
                      {profile.sobrenome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsUploadingPhoto(true)}
                className="absolute bottom-0 right-0 bg-primary/20 hover:bg-primary/30 text-primary p-2 rounded-full transition-colors"
              >
                <CameraIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Informações básicas */}
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-semibold text-primary mb-2">
                    {profile.primeiroNome} {profile.sobrenome}
                  </h1>
                  <p className="text-gray-300">{profile.email}</p>
                  <p className="text-gray-300 mt-1">
                    {profile.telefone.ddd && profile.telefone.numero 
                      ? formatarTelefone(profile.telefone)
                      : 'Telefone não cadastrado'}
                  </p>
                  <p className="text-gray-300 mt-1">
                    {profile.dataNascimento 
                      ? `${formatarData(profile.dataNascimento)} - ${getZodiacSign(profile.dataNascimento)}`
                      : 'Data de nascimento não cadastrada'}
                  </p>
                </div>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="bg-primary/20 hover:bg-primary/30 text-primary p-2 rounded-lg transition-colors"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Formulário de edição */}
          {isEditing && (
            <div className="mt-6 border-t border-primary/20 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-2">Nome</label>
                  <input
                    type="text"
                    value={editForm.primeiroNome}
                    onChange={e => setEditForm(prev => ({
                      ...prev,
                      primeiroNome: e.target.value
                    }))}
                    placeholder="Nome"
                    className="bg-black/40 border border-primary/20 rounded px-3 py-2 text-white w-full"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Sobrenome</label>
                  <input
                    type="text"
                    value={editForm.sobrenome}
                    onChange={e => setEditForm(prev => ({
                      ...prev,
                      sobrenome: e.target.value
                    }))}
                    placeholder="Sobrenome"
                    className="bg-black/40 border border-primary/20 rounded px-3 py-2 text-white w-full"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Telefone</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value="+55"
                      className="bg-black/40 border border-primary/20 rounded px-3 py-2 text-white w-16"
                      disabled
                    />
                    <input
                      type="text"
                      value={editForm.telefone.ddd}
                      onChange={e => setEditForm(prev => ({
                        ...prev,
                        telefone: { ...prev.telefone, ddd: e.target.value }
                      }))}
                      placeholder="DDD"
                      maxLength={2}
                      className="bg-black/40 border border-primary/20 rounded px-3 py-2 text-white w-20"
                    />
                    <input
                      type="text"
                      value={editForm.telefone.numero}
                      onChange={e => setEditForm(prev => ({
                        ...prev,
                        telefone: { ...prev.telefone, numero: e.target.value }
                      }))}
                      placeholder="Número"
                      maxLength={9}
                      className="bg-black/40 border border-primary/20 rounded px-3 py-2 text-white flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Data de Nascimento</label>
                  <input
                    type="date"
                    value={editForm.dataNascimento}
                    onChange={e => setEditForm(prev => ({
                      ...prev,
                      dataNascimento: e.target.value
                    }))}
                    className="bg-black/40 border border-primary/20 rounded px-3 py-2 text-white w-full"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSave}
                  className="bg-primary hover:bg-primary/90 text-black font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          )}
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

        {/* Modal de upload de foto */}
        {isUploadingPhoto && (
          <PhotoUpload
            onSave={handlePhotoSave}
            onCancel={() => setIsUploadingPhoto(false)}
          />
        )}
      </div>
    </div>
  )
}
