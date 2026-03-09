# 🔮 Star Tarot - Planejamento (MVP)

## 🎯 Objetivo
Construir um marketplace místico místico de luxo ("Ethereal Neon") conectando clientes a oraculistas reais e digitais de forma indistinguível para o cliente.

## 🏗️ Arquitetura
- **Frontend:** Next.js 14, React, Tailwind CSS, Framer Motion.
- **Backend:** Supabase (Auth, DB, Realtime, Edge Functions).
- **IA:** DeepSeek API.
- **Pagamentos:** Asaas Sandbox.

## 🎨 Design System: Ethereal Neon
- **Fundo:** Deep Space (`#0a0a1a`).
- **Acentos:** Neon Purple, Neon Cyan, Neon Gold.
- **Material:** Glassmorphism (vidro fosco).

## 🔐 Níveis de Acesso (RBAC)
1. **Owner:** Gestão total de oraculistas.
2. **Oraculista:** Atendimento humano.
3. **Cliente:** Consumidor final (créditos por minuto).
- **Consultas com IA:** 1-5 perguntas ou vídeo.
- **Consultas Humans:** Vídeo (tempo real) ou Inbox (texto).

## ✅ Implementações Recentes
- **Correção de Registro de Oraculista** (RPC `update_oracle_application`).
- **Sistema de Status Online** (Correção de `last_heartbeat_at`).
- **Fluxo de Consulta Melhorado:**
    - Uso de Nome Completo do Perfil.
    - Status "Aguardando Resposta" claro.
    - **Cancelamento e Reembolso Automático:**
        - Cliente pode cancelar consultas pendentes.
        - Créditos estornados automaticamente.
        - Oraculista vê "Mensagem Perdida".
        - Botões de "Reenviar" ou "Buscar Outro".
    - **Timeout de 24h** (Job `check_consultation_timeouts`).
- **UI/UX Refinada:**
    - Filtros de especialidade unificados (Dropdown/Search).
    - Botões de favoritos com interação `hover-expand` e cores temáticas.
    - Middleware atualizado para proteção de rotas e acesso público a perfis.

## 🛠️ Próximas Implementações (Bugfixes & UX)
- [ ] **Verificação de Hardware Pré-Consulta (Oráculo):**
    - Implementar check de câmera/microfone antes de aceitar chamada.
    - Exibir estados de "Processando" e "Erro de Hardware" (ex: Câmera em uso).
    - Botão de "Tentar Novamente" no Modal de Chamada e na Sala de Atendimento.
- [ ] **Otimização de UI de Aceite:**
    - Feedback visual de processamento ao clicar em aceitar.
    - Fechamento imediato do modal e transição fluida para a sala.

## 🖥️ Setup do Ambiente de Desenvolvimento
Para manter a paridade com outros ambientes (Mac/Linux), utilizamos aliases no PowerShell do Windows (`$PROFILE`):
- `ia-portal`: Abre o OmniRoute em `http://localhost:20128`.
- `ia-celular`: Inicia o remote chat para celular.
- `ia-iniciar`: Inicia o Antigravity com porta de depuração remota ativada.
