# Especificações Técnicas - StarTarot

## Design System

### Cores
- **Primárias**:
  - Primary: #FFB800 (Dourado)
  - Primary Light: #FFD700
  - Background: Preto com overlay dourado

### Tipografia
- **Fontes**:
  - Títulos: Raleway (font-raleway)
  - Corpo: Montserrat (font-montserrat)
- **Tamanhos**:
  - Título Principal: text-5xl (3rem)
  - Subtítulos: text-xl
  - Texto Base: text-base

### Layout
- **Container**:
  - Max Width: max-w-md
  - Padding: p-8
  - Border Radius: rounded-2xl
  - Background: bg-black/40 com backdrop-blur-md

### Componentes

#### Botões
```css
/* Botão Primário */
.btn-primary {
  @apply w-full px-4 py-3 bg-primary 
         hover:bg-primary-light text-black font-semibold
         rounded-lg transition-all duration-200 
         ease-in-out transform hover:scale-[1.02];
}
```

#### Inputs
```css
/* Input Padrão */
.input-primary {
  @apply w-full px-4 py-3 bg-black/40 
         border border-primary/20 rounded-lg
         focus:outline-none focus:border-primary 
         focus:ring-1 focus:ring-primary
         text-white placeholder-gray-400 
         transition-all duration-200;
}
```

#### Links
```css
/* Link Padrão */
.link-primary {
  @apply text-primary hover:text-primary-light 
         transition-colors duration-200;
}
```

### Efeitos
- **Transições**:
  - Duração: duration-200
  - Timing: ease-in-out
- **Hover**:
  - Escala: hover:scale-[1.02]
  - Cor: hover:bg-primary-light
- **Focus**:
  - Ring: focus:ring-1
  - Border: focus:border-primary

### Responsividade
- **Breakpoints**:
  - Mobile: < 768px (padrão)
  - Tablet: >= 768px
  - Desktop: >= 1200px
- **Imagens**:
  - Background: object-cover w-full h-full
  - Logo: object-contain w-44 h-44

## Arquitetura do Sistema

### Frontend
- **Framework Principal**: Next.js 14
  - Server Components para melhor SEO
  - App Router para roteamento moderno
  - Server Actions para operações seguras

- **Estilização**:
  - Tailwind CSS
  - Shadcn/ui para componentes base
  - Framer Motion para animações

- **Estado e Cache**:
  - React Query para cache e estado servidor
  - Zustand para estado global
  - React Hook Form para formulários

### Backend
- **API**: Next.js API Routes
- **Banco de Dados**: Supabase
- **Autenticação**: Supabase Auth
- **Storage**: Supabase Storage
- **Pagamentos**: Asaas API
- **IA**: DeepSeek API

### Segurança
- **Autenticação**:
  - JWT Tokens
  - Refresh Tokens
  - Proteção de rotas
- **Dados**:
  - Criptografia em trânsito (HTTPS)
  - Sanitização de inputs
  - Validação de dados

### Performance
- **Otimizações**:
  - Lazy Loading de componentes
  - Imagens otimizadas (next/image)
  - Cache de consultas
  - Code Splitting automático

### Monitoramento
- **Logs**:
  - Erros de aplicação
  - Acessos e autenticação
  - Transações financeiras
  - Chamadas à API

### Integração Contínua
- **Deploy**:
  - VPS (Ubuntu/Docker) para frontend e servidor
  - Supabase para banco de dados e auth
  - Ambiente de staging
  - Testes automatizados

### Estrutura de Diretórios
```
src/
├── app/                 # App Router pages
├── components/          # Componentes reutilizáveis
├── config/             # Configurações
├── hooks/              # Custom hooks
├── lib/                # Bibliotecas e utilitários
├── modules/            # Módulos do sistema
│   ├── auth/          # Autenticação
│   ├── chat/          # Chat com IA
│   ├── oraculistas/   # Gestão de oraculistas
│   └── usuarios/      # Gestão de usuários
├── services/          # Serviços externos
├── stores/            # Estados globais
├── styles/            # Estilos globais
└── types/             # Tipos TypeScript
```
