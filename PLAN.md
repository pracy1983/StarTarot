# 🔮 Star Tarot - Planejamento (MVP)

## 🎯 Objetivo
Construir um marketplace místico de luxo ("Ethereal Neon") conectando clientes a oraculistas reais e digitais de forma indistinguível para o cliente. Migração em curso de Netlify para VPS (Easypanel).

## 🏗️ Arquitetura
- **Frontend:** Next.js 14, React, Tailwind CSS, Framer Motion.
- **Backend:** PostgreSQL (Interno VPS), Supabase (Auth/Realtime - Migrando para Interno).
- **IA:** DeepSeek API.
- **Pagamentos:** Asaas Sandbox.
- **Infraestrutura:** VPS com Easypanel (Banco de dados interno).

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

## 🚀 Plano de Migração VPS
1. **Ambiente:** Configurar variáveis extraídas do Netlify no Easypanel.
2. **Build:** Ajustar comandos para Nixpacks (`npm install && npm run build`).
3. **Domínio:** Apontar DNS e configurar SSL no Easypanel.
4. **Limpeza:** Remover dependências do Netlify do projeto. (Concluído)

## ✅ Implementações Recentes
- **Clonagem do Repositório** para o workspace local.
- **Extração de Variáveis** do Netlify (Supabase, Evolution, Asaas, Agora, DeepSeek).
- **Mapeamento de chaves ausentes** (Firebase, OpenAI, Pinecone).
- **Limpeza de dependências** (Removido Netlify e Firebase).

## 🛠️ Próximas Implementações (Bugfixes & UX)
- [x] **Migração Final VPS:** (Concluído)
    - [x] Configurar chaves no Easypanel.
    - [x] Validar primeiro deploy.
- [x] **Migração Banco de Dados Interno:**
    - [x] Criar serviço PostgreSQL no Easypanel. (Concluído)
    - [x] Criar SQL Migration inicial. (Concluído)
    - [x] Configurar RLS e Triggers. (Concluído)
    - [x] Migrar Schema para o banco interno. (Concluído - Unified SQL rodado no container DB)
    - [x] Atualizar conexão no App. (Concluído - Variáveis de ambiente configuradas no startarot-web)
- [ ] **Verificação de Hardware Pré-Consulta (Oráculo):**
    - Implementar check de câmera/microfone antes de aceitar chamada.
    - Exibir estados de "Processando" e "Erro de Hardware" (ex: Câmera em uso).
    - Botão de "Tentar Novamente" no Modal de Chamada e na Sala de Atendimento.
- [ ] **Otimização de UI de Aceite:**
    - Feedback visual de processamento ao clicar em aceitar.
    - Fechamento imediato do modal e transição fluida para a sala.

## 🔐 Correções de Autenticação / Configuração (Recente)
- [x] **Correção de Autenticação (Chaves Truncadas):**
    - Detectado que as chaves `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` estavam truncadas no serviço `startarot-web` do Easypanel.
    - Criado arquivo `.env.local` na raiz com as chaves corretas e completas retiradas do container do Supabase.
    - Orientado o ajuste das mesmas variáveis no painel administrativo do Easypanel.


