# Instruções Detalhadas do Projeto StarTarot

## Descrição Geral
O StarTarot é um portal de consulta de tarot assistido por IA, com interações simples e intuitivas. O sistema possui um chat inicial com uma assistente IA que direciona usuários para outros assistentes especializados baseado em suas necessidades. As respostas são entregues em formato de "email" na caixa de entrada do usuário.

## Fluxo e Telas do Sistema

### 1. Tela Inicial "StarTarot"
- **Textos Principais**:
  - "O direcionamento que você precisa, na energia que você quer"
  - "Daemons/Baralho cigano/Oráculo dos Anjos"

- **Autenticação**:
  - Login e senha
  - Opção de cadastro
  - Recuperação de senha
  - Usuário admin padrão: paularacy@gmail.com (senha: adm@123)

### 2. Tela Principal (Pós-login)
#### Menu Superior
- **Lado Esquerdo**:
  - Saldo de Crédito
  - Caixa de mensagens
  - Oraculistas
  - Meu perfil
  - Sair

- **Lado Direito**:
  - Sininho de notificações (ativo quando receber mensagens)

#### Chat Principal
- Auto scroll
- Integração com API DeepSeek
- Visual estilo WhatsApp
- Indicador "está escrevendo"
- Balões diferenciados (usuário/agente)

### 3. Tela de Chat com IA
- **Mensagem Inicial**: "Oie! Como posso te ajudar hoje? Seja direto no tipo de questão que você precisa de ajuda, pra eu poder te ajudar da melhor forma possível te indicando a energia certa pro seu caso"
- Sistema de tags dinâmico para oraculistas
- Botões de confirmação após sugestão

### 4. Tela de Créditos
- **Opções de Valores**: R$15, 30, 60, 120, 240
- Integração com API Asaas
- Exibição de saldo atual
- Texto informativo sobre valores variáveis

### 5. Tela de Formulário
- **Campos**:
  - Descrição da Situação
  - Pergunta Objetiva
- Limite de 1 pergunta por mensagem
- Tempo de resposta: 20 minutos

### 6. Tela de Espera
- Animação de baralho
- Opções de navegação durante espera

### 7. Caixa de Entrada
- Lista de mensagens (estilo email)
- Destaque para não lidas
- Visualização thread pergunta/resposta

### 8. Tela de Perfil
- Dados pessoais
- Histórico de transações
- Gestão de créditos

## Área Administrativa

### 1. Dashboard
- Estatísticas gerais
- Gráficos de desempenho
- Métricas de usuários

### 2. Gestão de Usuários
- CRUD completo
- Gestão de créditos
- Histórico de atividades

### 3. Gestão de Créditos
- Histórico de transações
- Sistema de reembolso
- Ajustes manuais

### 4. Gestão de Oraculistas
- Cadastro e edição
- Configuração de tags
- Gestão de prompts
- Definição de valores

### 5. Gestão de Consultas
- Monitoramento em tempo real
- Reatribuição de consultas
- Cancelamentos

### 6. Configurações
- APIs (DeepSeek, Asaas, Supabase)
- Textos do sistema
- Valores e descontos
- Gestão de administradores

### 7. Relatórios
- Exportação em CSV/PDF
- Métricas detalhadas
- Análise de desempenho

### 8. Suporte
- Gestão de tickets
- Comunicação com usuários
- Histórico de atendimentos

### 9. Logs
- Registro de atividades
- Auditoria de ações
- Histórico de modificações

## Observações Importantes
- Sistema totalmente responsivo
- Preparado para versão mobile futura
- Interface intuitiva e moderna
- Segurança em todas as operações
- Sistema de cache eficiente
- Backup automático de dados
