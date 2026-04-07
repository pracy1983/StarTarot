# Antigravity Kit (AI-as-Code)

Este repositório contém o cérebro da sua configuração de IA para desenvolvimento de software. Ele inclui agentes especialistas, habilidades (skills) e fluxos de trabalho (workflows) otimizados.

## 🚀 Como usar em um novo projeto

Para instalar este kit em qualquer nova pasta de projeto, você pode usar um destes métodos:

### Opção 1: Clonar via Git (Recomendado)

Abra o terminal na pasta do seu novo projeto e execute:

```powershell
git clone --depth 1 https://github.com/pracy1983/antigravity-kit.git temp-kit
Move-Item -Path temp-kit/.agent -Destination ./.agent -Force
Move-Item -Path temp-kit/GEMINI.md -Destination ./GEMINI.md -Force
Remove-Item -Path temp-kit -Recurse -Force
```

### Opção 2: Download Direto (ZIP)
Se preferir não usar Git, basta baixar o ZIP do repositório e extrair o conteúdo (`.agent` e `GEMINI.md`) na raiz do seu projeto.

---

## 🛠️ O que está incluído?

- **20 Agentes Especialistas:** Backend, Frontend, Security, DevOps, etc.
- **36 Skills:** React, Python, Database Design, Clean Code, etc.
- **11 Workflows:** `/plan`, `/debug`, `/enhance`, `/create`, etc.
- **GEMINI.md:** Regras globais de comportamento e qualidade.

---

## 🔄 Mantendo o Kit Atualizado
Sempre que você fizer uma melhoria no kit (novas skills ou regras), faça o commit para este repositório. Assim, todos os seus projetos futuros se beneficiarão da evolução da sua IA.
