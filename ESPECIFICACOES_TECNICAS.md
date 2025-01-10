# Especificações Técnicas - StarTarot

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
```
