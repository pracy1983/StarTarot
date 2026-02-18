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

## 🛠️ Próximas Implementações (Bugfixes & UX)
- [ ] **Verificação de Hardware Pré-Consulta (Oráculo):**
    - Implementar check de câmera/microfone antes de aceitar chamada.
    - Exibir estados de "Processando" e "Erro de Hardware" (ex: Câmera em uso).
    - Botão de "Tentar Novamente" no Modal de Chamada e na Sala de Atendimento.
- [ ] **Otimização de UI de Aceite:**
    - Feedback visual de processamento ao clicar em aceitar.
    - Fechamento imediato do modal e transição fluida para a sala.
