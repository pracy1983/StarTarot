# 🔮 Star Tarot - Lista de Tarefas (TASKS)

## ⏳ Em Progresso
- [x] **Setup do Ambiente (Windows PowerShell)**
- [x] **UI/UX: Unificação de Filtros e Melhoria de Cards**
    - [x] Componente `OracleFilters` unificado (Dashboard + Landing)
    - [x] Botão Favorito/Avisar com estilo Neon Purple e expand-on-hover
    - [x] Middleware: Proteção de rotas internas + Acesso público a perfil de oráculo
- [ ] **Bugfix/UX: Melhoria no Fluxo de Atendimento do Oráculo**
    - [ ] Hardware check (câmera/mic) antes de aceitar consulta
    - [ ] UI de "Processando" ao aceitar consulta
    - [ ] Tratamento de erro "NotReadableError" com botão de retry

## 📋 Backlog de Tarefas

### Phase 1: Foundation
- [x] Criar INDEX.md, PLAN.md, TASKS.md, GLOBAL_RULES.md, WORKFLOW.md
- [x] Criar `.env.local`
- [x] Limpar repo (deletar modules antigos, firebase, dashboard antiga)
- [x] Configurar Design System em `tailwind.config.js` e `globals.css`
- [x] Criar componentes UI base: `GlassCard`, `NeonButton`, `GlowInput`

### Phase 2: Database Schema
- [x] Criar SQL Migration inicial
- [x] Configurar RLS e Triggers
- [ ] Rodar SQL no dashboard do Supabase (Ação manual do usuário)

### Phase 3: Auth & RBAC
- [x] Refatorar AuthStore para novo schema (profiles/roles)
- [x] Redesign da página de Login (Ethereal Neon)
- [x] Criar Middleware de proteção de rotas

### Phase 4: Owner Panel (Prioridade Máxima)
- [x] Dashboard do Owner (Overview com métricas)
- [x] Cadastro de Oraculistas (Switch Humano/IA + Formulário)
- [x] Grade de Horários (ScheduleGrid funcional)
- [x] Layout do Painel Admin (Sidebar glassmorphism)

### Phase 5: Client Marketplace
- [x] Layout do App Cliente (Sidebar + Glass design)
- [x] OracleCards (Diferenciação sutil IA/Humano)
- [x] Marketplace com grid e filtros dinâmicos
- [x] Página de Carteira (Saldos + Pacotes de Crédito)
- [ ] Integração real Asaas Sandbox (Edge Functions)

### Phase 6: Chat & AI
- [ ] Sala de Chat Realtime
- [ ] Thinking Delay para IA (DeepSeek)
