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
  - API Routes para endpoints principais
  - Edge Functions para operações em tempo real

- **Banco de Dados**:
  - Supabase
    - Autenticação
    - Armazenamento
    - Realtime subscriptions

- **Integrações**:
  - DeepSeek API para IA
  - Asaas para pagamentos
  - SendGrid para emails

## Integrações

### DeepSeek API
- **Configuração**:
  - Modelo: deepseek-chat
  - Temperatura: 0.7
  - Max Tokens: 2048
  - Top P: 0.95
  - Frequency Penalty: 0.0
  - Presence Penalty: 0.0
  - Stop Sequences: Personalizadas por oraculista

- **Rate Limiting**:
  - Requests por minuto: 60
  - Tokens por minuto: 90000
  - Retry após: 60s

- **Prompts**:
  - Sistema base + Personalização por oraculista
  - Validação de conteúdo sensível
  - Formatação específica para respostas
  - Sistema de fallback

### Sistema de Cache

- **Camadas**:
  - Browser (localStorage)
  - Memory Cache (Redis)
  - CDN (Vercel Edge)

- **Estratégias**:
  - Stale-While-Revalidate
  - Cache-Control Headers
  - ETags

- **Invalidação**:
  - Por usuário
  - Por rota
  - Por recurso
  - Purge automático

- **Monitoramento**:
  - Hit ratio
  - Cache size
  - Invalidation events
  - Performance metrics

## Estrutura de Diretórios

```
src/
├── app/                    # Rotas e páginas
├── components/             # Componentes React
│   ├── ui/                # Componentes base
│   ├── features/          # Componentes específicos
│   └── layouts/           # Layouts reutilizáveis
├── lib/                   # Utilitários e configurações
├── hooks/                 # Hooks customizados
├── services/              # Serviços externos
├── stores/                # Estados globais
└── types/                 # Definições de tipos
```

## Padrões de Código

### Clean Architecture
- **Entities**: Modelos de domínio
- **Use Cases**: Lógica de negócio
- **Controllers**: Manipulação de requisições
- **Gateways**: Integrações externas

### SOLID
- Single Responsibility
- Open/Closed
- Liskov Substitution
- Interface Segregation
- Dependency Inversion

## Segurança

- **Autenticação**:
  - JWT com refresh tokens
  - OAuth 2.0 para redes sociais
  - Proteção contra CSRF

- **Dados**:
  - Criptografia em trânsito (HTTPS)
  - Criptografia em repouso
  - Sanitização de inputs

## Performance

- **Otimizações**:
  - Server-side rendering
  - Imagens otimizadas com next/image
  - Code splitting automático
  - Cache em múltiplas camadas

## Monitoramento

- **Métricas**:
  - Vercel Analytics
  - Sentry para erros
  - Logs estruturados

## CI/CD

- **Pipeline**:
  - GitHub Actions
  - Testes automatizados
  - Deploy automático na Vercel

## Requisitos de Sistema

- Node.js 18+
- npm ou pnpm
- Git

## Dependências Principais

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwindcss": "^3.3.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0",
    "framer-motion": "^10.16.0",
    "@supabase/supabase-js": "^2.38.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",
    "react-hook-form": "^7.47.0",
    "@shadcn/ui": "^0.0.1"
  }
}
