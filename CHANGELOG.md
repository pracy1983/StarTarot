# Changelog e Progresso do Desenvolvimento

## Área Administrativa

### Dashboard Principal
- [x] Criação do layout base da área administrativa
- [x] Implementação da navegação entre seções
- [x] Sistema de autenticação para admin
- [x] Remoção do chat da área administrativa

### Gestão de Usuários e Administradores
- [x] Interface de listagem de usuários
  - [x] Tabela com informações principais
  - [x] Status online/offline
  - [x] Última vez online
  - [x] Última consulta
  - [x] Saldo de créditos
  - [x] Ações (editar)

- [x] Interface de listagem de administradores
  - [x] Tabela com informações principais
  - [x] Função/Role do admin
  - [x] Status online/offline
  - [x] Última vez online
  - [x] Ações (editar)

- [x] Modal de adição de administradores
  - [x] Design moderno com blur effect
  - [x] Sistema de roles com descrições
  - [x] Campos para informações básicas
  - [x] Validações de formulário

- [x] Sistema de filtros
  - [x] Filtro por status
  - [x] Filtro por créditos
  - [x] Sistema de paginação
  - [x] Itens por página

### Gestão de Oraculistas
- [x] Criação da interface de listagem de oraculistas
  - [x] Tabela com informações principais
  - [x] Foto do oraculista
  - [x] Nome
  - [x] Especialidades (tags)
  - [x] Status (disponível/indisponível)
  - [x] Preço
  - [x] Ações (editar/desativar)
  - [x] Status de promoção

- [x] Sistema de Prompts
  - [x] Estrutura de arquivos dedicada em `/src/config/prompts/oraculistas`
  - [x] Prompts individuais para cada oraculista
  - [x] Sistema de normalização de nomes
  - [x] Funções utilitárias para gerenciamento
  - [x] Integração com o store de oraculistas

- [x] Store de Oraculistas
  - [x] Implementação com Zustand
  - [x] CRUD completo de oraculistas
  - [x] Gestão de estados (loading, error)
  - [x] Integração com sistema de prompts

### Sistema de Autenticação
- [x] Implementação do Supabase Auth
  - [x] Configuração do cliente Supabase
  - [x] Integração com Zustand para estado
  - [x] Sistema de roles (admin/user)
  - [x] Script de configuração de admin
  - [x] Documentação do processo

### Próximos Passos
- [ ] Interface de edição de prompts
- [ ] Sistema de upload de fotos
- [ ] Integração com backend
- [ ] Sistema de backup de prompts
- [ ] Validações de formulários
- [ ] Confirmações para ações destrutivas
- [ ] Logs de alterações
- [ ] Implementar sistema de notificações
- [ ] Configurar webhooks do Supabase
- [ ] Implementar sistema de cache

## [Não lançado]
### Adicionado
- Sistema de prompts dinâmicos para oraculistas e atendente
- Coluna `prompt_formatado` na tabela `oraculistas`
- Hook `usePrompt` para gerenciar prompts dinâmicos
- Função `resolvePromptVariables` para substituir variáveis em prompts
- Novas diretrizes no prompt da Priscila sobre promoções e valores
- Botões de consulta dinâmicos no chat
- Script SQL para adicionar oraculistas iniciais (Mago Negro e Vó Cleusa)
- Links diretos para consulta com oraculistas
- Nova página `/consulta/[nome]` para iniciar consultas diretas
- Redirecionamento automático por comando no chat (ex: "me apssa pra cigana flora")
- Nova diretriz para verificação de nomes de oraculistas por proximidade

### Modificado
- Atualizado o sistema de chat para usar prompts dinâmicos
- Refatorado o serviço de chat para manter histórico internamente
- Melhorado o tratamento de erros no chat
- Atualizado o prompt da Priscila com novas diretrizes sobre promoções e valores
- Melhorado o estilo dos botões de consulta com animações e sombras
- Simplificado o prompt da Priscila removendo diretrizes redundantes
- Modificado o formato de exibição dos oraculistas para incluir links diretos
- Adicionada lógica de redirecionamento no ChatWindow

### Corrigido
- Erro ao tentar salvar oraculista com prompt personalizado
- Problema de compatibilidade no ChatWindow com o novo sistema de prompts
- Formatação dos nomes dos oraculistas nos botões de consulta
- Remoção de colchetes extras no texto do chat

## Tecnologias e Padrões Utilizados
- Next.js para estrutura do projeto
- Zustand para gerenciamento de estado
- Tailwind CSS para estilização
- Headless UI para componentes de interface
- Heroicons para ícones
- TypeScript para tipagem estática

## Estrutura de Arquivos
```
src/
├── app/
│   └── admin/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── users/
│       │   ├── page.tsx
│       │   └── components/
│       │       └── AddAdminModal.tsx
│       └── oraculists/
│           └── page.tsx
├── modules/
│   ├── users/
│   │   ├── components/
│   │   └── store/
│   │       └── usersStore.ts
│   └── oraculistas/
│       ├── components/
│       │   └── OraculistaModal.tsx
│       ├── store/
│       │   └── oraculistasStore.ts
│       └── types/
│           └── oraculista.ts
└── config/
    └── prompts/
        └── oraculistas/
            ├── index.ts
            ├── mago-negro.ts
            ├── vo-cleusa.ts
            └── cigana-flora.ts
```

## Convenções
- Commits seguindo padrão Conventional Commits
- Código em TypeScript com tipagem estrita
- Componentes React usando padrão funcional
- Estilização usando Tailwind CSS
- Nomes de arquivos e funções em português
- Documentação em português-brasileiro

## Branches
- `master`: Código em produção
- `feat/admin-dashboard`: Desenvolvimento da área administrativa
- `feat/admin-oraculistas`: Gestão de oraculistas
- `feat/admin-users`: Gestão de usuários e administradores
- `feat/admin-13-1-5`: Implementação do Supabase Auth (merged)

## Observações Importantes
- Sistema preparado para internacionalização futura
- Interface responsiva para todos os tamanhos de tela
- Seguindo princípios de Clean Architecture
- Implementando padrões SOLID
- Foco em manutenibilidade e escalabilidade
