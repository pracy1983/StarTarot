# Documentação StarTarot

## Funcionalidades Implementadas

### 1. Sistema de Autenticação
- [x] Login de usuários
- [x] Registro de novos usuários
- [x] Persistência do estado de autenticação (Zustand)
- [x] Proteção de rotas privadas

### 2. Dashboard
- [x] Layout responsivo
- [x] Cards informativos
- [x] Menu de navegação
- [x] Integração com sistema de autenticação
- [x] Exibição de informações do usuário

### 3. Sistema de Chat com IA
- [x] Interface do chat
  - [x] Design responsivo
  - [x] Botão de minimizar/maximizar
  - [x] Indicador de digitação
  - [x] Estilização personalizada das mensagens
  - [x] Scroll automático para novas mensagens
- [x] Integração com DeepSeek API
  - [x] Envio e recebimento de mensagens
  - [x] Tratamento de erros
  - [x] Prompt personalizado para o agente
- [x] Persistência
  - [x] Estado do chat (minimizado/maximizado)
  - [x] Histórico de mensagens
  - [x] Integração com Zustand
- [x] Arquitetura
  - [x] Módulo isolado (/modules/chat)
  - [x] Separação de responsabilidades (componentes, serviços, store)
  - [x] Clean Architecture
  - [x] Princípios SOLID

### 4. Sistema de Créditos
- [x] Tela de créditos
- [x] Exibição do saldo atual
- [x] Opções de compra
- [x] Informações sobre preços variáveis

### 5. Página de Oraculistas
- [x] Layout responsivo com 3 cards por linha
- [x] Foto e informações de cada oraculista
- [x] Status de disponibilidade (online/offline)
- [x] Botão de enviar pergunta
- [x] Integração com sistema de créditos
- [x] Design consistente com a identidade visual

### 6. Gestão de Oraculistas
- [x] Interface de listagem de oraculistas
  - [x] Cards com informações detalhadas
  - [x] Sistema de avaliação com estrelas (0-5)
  - [x] Status de disponibilidade com toggle
  - [x] Contador de consultas
  - [x] Data de adição do oraculista
  - [x] Sistema de preços com suporte a promoções
  - [x] Botão de edição rápida

- [x] Modal de adição/edição de oraculista
  - [x] Upload e preview de foto
  - [x] Sistema de tags para especialidades
  - [x] Campos para informações básicas (nome, descrição)
  - [x] Campo de prompt personalizado para IA
  - [x] Agrupamento visual de campos públicos
  - [x] Sistema de preços e status

### 7. Arquitetura e Tecnologias
- [x] Next.js 13+ (App Router)
- [x] TypeScript
- [x] Tailwind CSS
- [x] Zustand para gerenciamento de estado
- [x] Clean Architecture
- [x] Princípios SOLID

## Funcionalidades Pendentes

### 1. Sistema de Pagamentos
- [ ] Integração com gateway de pagamento
- [ ] Processamento de compras de créditos
- [ ] Histórico de transações
- [ ] Comprovantes/recibos

### 2. Área do Oraculista
- [ ] Dashboard específico
- [ ] Gestão de disponibilidade
- [ ] Histórico de consultas
- [ ] Perfil público

### 3. Sistema de Consultas
- [ ] Agendamento
- [ ] Videochamada
- [ ] Chat em tempo real
- [ ] Avaliações e feedback

### 4. Melhorias Gerais
- [ ] Testes automatizados
- [ ] Documentação de API
- [ ] Sistema de notificações
- [ ] Área administrativa

### 5. Implementar sistema de avaliação nas consultas
- [ ] Integração com sistema de email
- [ ] Cálculo automático da média de avaliações
- [ ] Implementar sistema de edição de oraculistas
  - [ ] Reutilizar modal de adição
  - [ ] Carregar dados existentes
  - [ ] Validação de campos
- [ ] Persistência de dados
  - [ ] Integração com banco de dados
  - [ ] Sistema de backup
- [ ] Sistema de agendamento
  - [ ] Calendário de disponibilidade
  - [ ] Bloqueio de horários
  - [ ] Notificações

## Estrutura do Projeto

```bash
src/
├── app/                    # Rotas e layouts (Next.js App Router)
├── components/            # Componentes compartilhados
├── modules/              # Módulos da aplicação
│   └── chat/            # Módulo de chat
│       ├── components/  # Componentes do chat
│       ├── services/    # Serviços (ex: API DeepSeek)
│       └── store/       # Gerenciamento de estado
├── config/              # Configurações (ex: prompts)
└── stores/             # Stores globais (ex: auth)
```

## Convenções e Boas Práticas

1. **Código**
   - TypeScript para type safety
   - ESLint para padronização
   - Prettier para formatação

2. **Commits**
   - Commits semânticos (feat, fix, docs, etc)
   - Mensagens descritivas em português
   - Branches por feature

3. **Arquitetura**
   - Clean Architecture
   - SOLID principles
   - Módulos independentes
   - Separação clara de responsabilidades

4. **Estilização**
   - Tailwind CSS
   - Design system consistente
   - Responsividade mobile-first

5. **Performance**
   - Lazy loading
   - Otimização de imagens
   - Minimização de bundle

## Variáveis de Ambiente Necessárias

```env
NEXT_PUBLIC_DEEPSEEK_API_KEY=  # Chave da API DeepSeek
```

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Testes
npm run test

# Lint
npm run lint
```

## Links Úteis

- [Repositório do Projeto](https://github.com/seu-usuario/appTarot)
- [Documentação do Next.js](https://nextjs.org/docs)
- [Documentação do Tailwind CSS](https://tailwindcss.com/docs)
- [API DeepSeek](https://deepseek.com/docs)