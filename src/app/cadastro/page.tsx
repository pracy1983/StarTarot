'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Listbox } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/24/outline'
import { countries } from './countries'
import { useRouter } from 'next/navigation'
import { signUp } from '@/services/auth'

export default function CadastroPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneCountry: countries.find(c => c.code === '55') || countries[0],
    phoneArea: '',
    phoneNumber: '',
    birthDate: '',
    coupon: ''
  })

  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    if (name === 'birthDate') {
      // Remove tudo que não for número
      const numbers = value.replace(/\D/g, '')
      
      // Formata a data automaticamente
      let formattedDate = ''
      if (numbers.length <= 2) {
        formattedDate = numbers
      } else if (numbers.length <= 4) {
        formattedDate = `${numbers.slice(0, 2)}/${numbers.slice(2)}`
      } else {
        formattedDate = `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`
      }
      
      setFormData(prev => ({ ...prev, birthDate: formattedDate }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Validações
      if (formData.password !== formData.confirmPassword) {
        throw new Error('As senhas não conferem')
      }

      if (formData.phoneArea.length !== 2) {
        throw new Error('DDD inválido')
      }

      if (formData.phoneNumber.length < 8) {
        throw new Error('Número de telefone inválido')
      }

      // Formatar data para ISO string (YYYY-MM-DD)
      const [day, month, year] = formData.birthDate.split('/').map(Number)
      const birthDate = new Date(year, month - 1, day)
      if (isNaN(birthDate.getTime())) {
        throw new Error('Data de nascimento inválida')
      }
      const formattedBirthDate = birthDate.toISOString().split('T')[0]

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phoneCountryCode: formData.phoneCountry.code,
          phoneAreaCode: formData.phoneArea,
          phoneNumber: formData.phoneNumber,
          birthDate: formattedBirthDate,
          coupon: formData.coupon || undefined
        }),
      })

      console.log('Status da resposta:', response.status)
      const result = await response.json()
      console.log('Resposta do servidor:', result)

      if (!result.success) {
        let errorMessage = result.error || 'Erro ao realizar cadastro'
        
        // Adicionar detalhes do erro se existirem
        if (result.details) {
          console.error('Detalhes do erro:', result.details)
          errorMessage += `\n\nDetalhes: ${result.details.message}`
          if (result.details.code) {
            errorMessage += `\nCódigo: ${result.details.code}`
          }
        }
        
        setError(errorMessage)
        setIsLoading(false)
        return
      }

      // Cadastro realizado com sucesso
      console.log('Cadastro realizado com sucesso, redirecionando...')
      router.push('/verificar-email')
    } catch (err: any) {
      console.error('Erro completo:', err)
      setError(err.message || 'Erro ao realizar cadastro')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background com overlay */}
      <div 
        className="fixed inset-0 w-screen h-screen bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/background.jpg)' }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-10 bg-black/40 p-8 rounded-2xl backdrop-blur-md border border-primary/20">
          {/* Logo e Título */}
          <div className="text-center space-y-6">
            <div className="w-44 h-44 mx-auto">
              <img
                src="/logo.png"
                alt="StarTarot Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-raleway text-5xl font-bold text-primary mb-4">Criar Conta</h1>
              <p className="text-xl text-gray-300 font-light leading-relaxed">
                Comece sua jornada espiritual
                <br />e descubra seu caminho.
              </p>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {/* Nome Completo */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                  Nome completo
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-black/20 border border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-400"
                  placeholder="Digite seu nome completo"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-black/20 border border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-400"
                  placeholder="Digite seu email"
                />
              </div>

              {/* Telefone */}
              <div className="grid grid-cols-12 gap-2">
                {/* DDI */}
                <div className="col-span-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    DDI
                  </label>
                  <Listbox
                    value={formData.phoneCountry}
                    onChange={(country) => setFormData(prev => ({ ...prev, phoneCountry: country }))}
                  >
                    <div className="relative">
                      <Listbox.Button className="w-full px-4 py-2 bg-black/20 border border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white flex items-center justify-between">
                        <span>+{formData.phoneCountry.code}</span>
                        <ChevronUpDownIcon className="h-5 w-5" />
                      </Listbox.Button>
                      <Listbox.Options className="absolute z-10 mt-1 w-full bg-black/90 border border-primary/20 rounded-lg py-1 text-base shadow-lg focus:outline-none sm:text-sm max-h-60 overflow-auto">
                        {countries.map((country) => (
                          <Listbox.Option
                            key={country.code}
                            value={country}
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-4 ${
                                active ? 'bg-primary/20 text-white' : 'text-gray-300'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <span className={selected ? 'font-medium' : 'font-normal'}>
                                +{country.code} ({country.name})
                              </span>
                            )}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </div>
                  </Listbox>
                </div>

                {/* DDD */}
                <div className="col-span-3">
                  <label htmlFor="phoneArea" className="block text-sm font-medium text-gray-300 mb-1">
                    DDD
                  </label>
                  <input
                    type="text"
                    id="phoneArea"
                    name="phoneArea"
                    required
                    maxLength={2}
                    value={formData.phoneArea}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-black/20 border border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-400"
                    placeholder="00"
                  />
                </div>

                {/* Número */}
                <div className="col-span-5">
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-300 mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    id="phoneNumber"
                    name="phoneNumber"
                    required
                    maxLength={9}
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-black/20 border border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-400"
                    placeholder="000000000"
                  />
                </div>
              </div>

              {/* Data de Nascimento */}
              <div>
                <label htmlFor="birthDate" className="block text-sm font-medium text-gray-300 mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="text"
                  id="birthDate"
                  name="birthDate"
                  required
                  value={formData.birthDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-black/20 border border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-400"
                  placeholder="DD/MM/AAAA"
                />
              </div>

              {/* Cupom */}
              <div>
                <label htmlFor="coupon" className="block text-sm font-medium text-gray-300 mb-1">
                  Cupom (opcional)
                </label>
                <input
                  type="text"
                  id="coupon"
                  name="coupon"
                  value={formData.coupon}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-black/20 border border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-400"
                  placeholder="Digite seu cupom"
                />
              </div>

              {/* Senha */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-black/20 border border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-400"
                  placeholder="Digite sua senha"
                />
              </div>

              {/* Confirmar Senha */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-black/20 border border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-400"
                  placeholder="Confirme sua senha"
                />
              </div>
            </div>

            <div className="flex items-center justify-center text-sm">
              <Link 
                href="/" 
                className="text-primary hover:text-primary-light transition-colors duration-200"
              >
                Já tem uma conta? Faça login
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-primary hover:bg-primary-light text-black font-semibold
                       rounded-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02]
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? 'Criando conta...' : 'Criar Conta'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
