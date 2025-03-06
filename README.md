# StarTarot

Aplicação de consultas de tarot online desenvolvida com Next.js.

## Tecnologias Utilizadas

- Next.js 14.2.23
- React 18
- TypeScript
- Tailwind CSS
- PostgreSQL
- Zustand (gerenciamento de estado)

## Estrutura do Projeto

O projeto segue uma arquitetura modular, organizada por funcionalidades:

- `/src/app` - Rotas e páginas da aplicação
- `/src/modules` - Módulos da aplicação (oraculistas, usuários, auth, etc.)
- `/src/components` - Componentes compartilhados
- `/src/config` - Configurações globais

## Correções Implementadas

### Versão v1.0.0-build-funcionando

Nesta versão, foram corrigidos vários erros que impediam o build da aplicação:

1. **Correção no script de migração (src/app/api/migrate/route.ts)**:
   - Alterado o nome da coluna de `valor_consulta` para `preco` para corresponder ao que é usado no resto do código
   - Adicionada a coluna `especialidades` que estava faltando na tabela de oraculistas
   - Modificada a lógica de inserção do oraculista inicial para usar uma abordagem mais segura com `DO $$ BEGIN ... END $$`

2. **Adição de Suspense nas páginas de cliente (nova-senha e verificar-email)**:
   - Envolvido o conteúdo das páginas em componentes Suspense para resolver o erro "should be wrapped in a suspense boundary"
   - Refatorado o código para separar a lógica em componentes menores

3. **Correções nos stores e componentes**:
   - Corrigida a implementação dos stores Zustand (oraculistasStore e usersStore)
   - Ajustado o componente OraculistaModal para não tentar acessar propriedades em um retorno void
   - Adicionada verificação de null no método deleteUser

## Desenvolvimento

Para iniciar o ambiente de desenvolvimento:

```bash
npm run dev
```

Para fazer o build da aplicação:

```bash
npm run build
```

## Deploy

A aplicação está configurada para deploy automático no Netlify quando há um push para o repositório GitHub.
