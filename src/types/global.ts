// Adicionar tipagem mais estrita para status e respostas
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
}

export type Status = 'online' | 'offline' | 'ocupado';

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  created_at?: string;
  updated_at?: string;
}

// Definir tipos reutilizáveis para valores numéricos opcionais
export type OptionalNumber = number | undefined;

export interface NumericInputProps {
  value: OptionalNumber;
  onChange: (value: OptionalNumber) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

// Usar em vez de number | null | undefined 