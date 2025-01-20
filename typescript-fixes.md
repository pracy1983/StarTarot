# Plano de Correção de Erros TypeScript

## 1. Erros Confirmados

### 1.1 Store de Mensagens
- **Erro**: `Property 'getMensagensFiltradas' does not exist on type 'MensagensState'`
- **Localização**: `src/modules/mensagens/store/mensagensStore.ts`
- **Impacto**: Funcionalidade de filtragem de mensagens
- **Status**: ✅ Corrigido - Adicionado método getMensagensFiltradas

### 1.2 Erro de Tipo Date/String
- **Erro**: `Type 'Date' is not assignable to type 'string'`
- **Localização**: `src/components/chat/ChatWindow.tsx`
- **Impacto**: Formatação e manipulação de datas
- **Status**: ✅ Corrigido - Atualizado mapeamento de histórico para usar Date
- **Detalhes**:
  - Removida conversão desnecessária para string
  - Mantida consistência com interface ChatMessage
  - Garantido uso correto de Date em todo o fluxo

### 1.3 Página de Oraculistas
- **Erro**: `Property 'descontoTemp' does not exist on type 'Oraculista'`
- **Localização**: `src/app/admin/oraculists/page.tsx`
- **Impacto**: Funcionalidade de desconto dos oraculistas
- **Status**: ✅ Corrigido - Adicionado campo na interface

### 1.4 Página de Consultas
- **Erro**: `Property 'de' does not exist on type 'Mensagem'`
- **Localização**: `src/app/admin/consultas/page.tsx`
- **Impacto**: Exibição do remetente da mensagem
- **Status**: ✅ Corrigido - Propriedade adicionada na interface Mensagem

## 2. Correções Recentes

### 2.1 Tratamento de Datas no Chat
- **Arquivos**: 
  - `src/modules/chat/types/message.ts`
  - `src/components/chat/ChatWindow.tsx`
  - `src/services/deepseek/chatService.ts`
- **Mudanças**:
  - Adicionado tipo ApiMessage com timestamp opcional
  - Atualizado ChatService para aceitar ambos os tipos
  - Adicionada conversão de tipos no mapeamento de mensagens
- **Status**: ✅ Corrigido

## 3. Próximos Passos

### 3.1 Correções Pendentes
1. Finalizar correção de tipos Date/string no ChatWindow
2. Verificar consistência de tipos em todas as stores
3. Testar build completo após correções
4. Documentar todas as alterações realizadas

### 3.2 Estratégia de Testes
- Testar build local antes de deploy no Firebase
- Verificar console por erros de runtime
- Testar todas as funcionalidades afetadas
- Garantir compatibilidade com dados existentes

## 4. Cuidados Necessários

### 4.1 Preservação da Lógica
- Manter comportamento existente
- Garantir compatibilidade com Supabase
- Preservar fluxos de dados

### 4.2 Preservação do Layout
- Não alterar estrutura de componentes
- Manter estilos e classes existentes
- Preservar funcionalidades visuais

### 4.3 Dados Existentes
- Manter compatibilidade com dados do Supabase
- Preservar campos importantes
- Considerar necessidade de migrations

## 5. Checklist de Correção

### 5.1 Interfaces Base
- [x] Verificar interface `Mensagem`
- [x] Verificar interface `Oraculista`
- [x] Verificar interface `Message`
- [x] Verificar outras interfaces relacionadas

### 5.2 Stores
- [x] Corrigir `mensagensStore`
- [x] Corrigir `oraculistasStore`
- [x] Verificar tipos de retorno
- [x] Testar estados

### 5.3 Componentes
- [x] Corrigir página de oraculistas
- [x] Corrigir página de consultas
- [x] Verificar outros componentes afetados
- [ ] Testar funcionalidades

## 6. Notas Importantes
- Sempre testar build após cada correção
- Documentar todas as alterações realizadas
- Manter consistência nos tipos em toda a aplicação
- Verificar compatibilidade com dados existentes
