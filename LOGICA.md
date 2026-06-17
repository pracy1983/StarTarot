# 🔮 Star Tarot - Documentação de Lógica e Resolução de Bugs

Este documento registra a lógica de alterações, estrutura de chaves e resolução de bugs do projeto **Star Tarot**.

---

## 🔐 1. Resolução do Bug de Login ("Invalid authentication credentials")

### Sintoma
Os usuários tentavam fazer login (inclusive o e-mail administrador `paularacy@gmail.com` com a senha padrão `adm@123`) e recebiam a mensagem de erro do Supabase:
`AuthApiError: Invalid authentication credentials` (Retorno HTTP 401).

### Análise de Causa Raiz (RCA - 5 Porquês)
1. **Por que o login falhou?** O Supabase Auth rejeitou as requisições de autenticação com erro 401 (Credenciais Inválidas).
2. **Por que rejeitou as credenciais válidas?** Porque a chave anônima (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) enviada pelo frontend Next.js era incorreta/inválida.
3. **Por que a chave era inválida?** A chave estava incompleta, terminando abruptamente em `...dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU`, quando o valor correto deveria terminar com `2BBNWN8Bu4GE`.
4. **Por que a chave estava cortada?** Ao migrar as variáveis de ambiente do Netlify para o serviço `startarot-web` no Easypanel (VPS), as chaves `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` foram coladas de forma truncada (cortando os últimos caracteres devido a erro de cópia manual).
5. **Onde estavam os valores corretos?** No serviço interno `startarot-supabase` (dentro da mesma stack no Easypanel), onde as variáveis `ANON_KEY` e `SERVICE_ROLE_KEY` foram geradas e salvas com seus valores inteiros originais.

---

## 🛠️ 2. Ações de Correção Realizadas

### A. Criação do arquivo local `.env.local`
Criamos o arquivo `.env.local` na raiz do projeto com as chaves corretas e não-truncadas extraídas diretamente do contêiner do Supabase do Easypanel:

* **NEXT_PUBLIC_SUPABASE_ANON_KEY (Completa):**
  `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE`

* **SUPABASE_SERVICE_ROLE_KEY (Completa):**
  `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q`

### B. Mapeamento de Configurações do Projeto
As variáveis configuradas no `.env.local` cobrem os seguintes serviços integrados:
1. **Supabase**: URL local/VPS interna do Supabase e as duas chaves corretas (Anon e Service Role).
2. **Asaas**: URL e credenciais para o ambiente de Sandbox de pagamentos.
3. **Agora**: Credenciais e chaves do SDK de chamada de vídeo.
4. **Evolution API**: URL, instância e Token para notificações via WhatsApp.
5. **DeepSeek**: Chave da API para a inteligência artificial do oráculo.
6. **Free Astro API**: Chave para cálculo de dados de nascimento/astrologia.

---

## 🚀 3. Como Corrigir no Servidor (Easypanel)

Para corrigir a aplicação em produção, o usuário deve:
1. Acessar o console do **Easypanel** em `vrdrcy.easypanel.host`.
2. Fazer login com o e-mail `paularacy@gmail.com` e a senha `Af23123011!,` (com a vírgula final).
3. Selecionar o projeto **`startarot`**.
4. Clicar no serviço **`startarot-web`**.
5. Ir para a aba **"Environment"** (Variáveis de Ambiente).
6. Substituir as duas chaves truncadas pelos valores completos listados acima:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
7. Clicar em **Save** (Salvar) e depois realizar o **Deploy** do serviço para aplicar as novas variáveis.
