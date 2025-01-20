export interface User {
  id: string
  nome: string
  email: string
  foto: string
  tipo: 'cliente' | 'admin'
  status: 'ativo' | 'inativo'
  telefone: string
  dataCadastro: string
  ultimoAcesso: string
  ultimaConsulta?: string
}

export interface UserFormData extends Omit<User, 'id' | 'dataCadastro' | 'ultimoAcesso' | 'ultimaConsulta'> {
  senha: string
  confirmarSenha: string
}
