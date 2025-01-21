export interface Telefone {
  codigoPais: string
  ddd: string
  numero: string
}

export interface ProfileData {
  primeiroNome: string
  sobrenome: string
  email: string
  dataCadastro: string
  creditos: number
  consultasRealizadas: number
  ultimaConsulta: string | null
  telefone: Telefone
  dataNascimento: string
  foto: string | null
}
