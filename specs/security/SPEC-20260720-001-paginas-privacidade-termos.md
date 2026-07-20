---
id: SPEC-20260720-001
title: "Páginas Públicas de Política de Privacidade e Termos de Uso"
status: approved
date: 2026-07-20
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-BIZ-05]
security: [S1]
compliance: [C1]
camadas: [frontend, security]
---

# SPEC-20260720-001: Páginas Públicas de Política de Privacidade e Termos de Uso

**Status:** Approved
**Criada em:** 2026-07-20
**Autor:** Douglas Lopes (lps.doug@protonmail.com)
**Origem:** Auditoria 2026-07-19, Achado #2 — [`docs/qa/2026-07-19-plano-de-acao-auditoria.md`](../../docs/qa/2026-07-19-plano-de-acao-auditoria.md), Tarefa T2

---

## Contexto

O conteúdo jurídico já existe e foi redigido em `docs/legal/privacy-policy.md` e
`docs/legal/terms-of-service.md` (citado por `important/PENDENCIAS-E-PROCESSOS.md` §3 como
pendente de revisão jurídica humana antes de uso com usuários pagantes reais — essa spec não
substitui aquela revisão). O que falta é puramente de distribuição: não existe nenhuma rota
pública que exiba esse conteúdo, nem link a partir do cadastro. `docs/legal/` é o local
canônico do conteúdo (regra anti-duplicação do `~/.claude/CLAUDE.md`) — as páginas aqui
especificadas **leem** esses arquivos em build/request time, não copiam o texto.

## Objetivo

1. Criar as rotas públicas `/privacidade` e `/termos`, renderizando o Markdown de
   `docs/legal/privacy-policy.md` e `docs/legal/terms-of-service.md` respectivamente.
2. Adicionar um rodapé mínimo com esses links, visível a partir da landing (`/`) e das
   páginas de autenticação (`/login`, `/register`).
3. Adicionar um checkbox de aceite explícito no cadastro (`/register`), obrigatório para
   submeter o formulário, com link para as duas páginas.
4. Documentar a decisão sobre banner de cookies.

## Histórias de Usuário e Critérios de Aceitação

### US-01: Ler a política de privacidade e os termos de uso sem estar logado

**Como** visitante do site (autenticado ou não), **quero** acessar `/privacidade` e `/termos`,
**para** entender como meus dados são tratados antes de criar uma conta.

- **Dado que** acesso `/privacidade` ou `/termos` sem sessão, **quando** a página carrega,
  **então** vejo o conteúdo completo do respectivo documento de `docs/legal/`, sem exigência
  de login (o middleware SSR não deve redirecionar essas rotas para `/login`).
- **Dado que** estou autenticado, **quando** acesso `/privacidade` ou `/termos`, **então**
  também vejo o conteúdo normalmente (rotas não exclusivas de visitante).

### US-02: Encontrar os links a partir de qualquer ponto de entrada público

**Como** visitante na landing, no login ou no cadastro, **quero** ver um link para
"Política de Privacidade" e "Termos de Uso", **para** acessá-los sem precisar digitar a URL.

- **Dado que** estou em `/`, `/login` ou `/register`, **quando** a página carrega, **então**
  vejo um rodapé com links para `/privacidade` e `/termos`.

### US-03: Aceitar explicitamente os termos ao criar conta

**Como** usuário preenchendo o formulário de cadastro, **quero** confirmar que li e concordo
com os Termos de Uso e a Política de Privacidade, **para** que meu consentimento seja
registrado de forma explícita (LGPD art. 8º).

- **Dado que** estou em `/register` com o checkbox de aceite desmarcado, **quando** tento
  submeter o formulário, **então** o botão "Criar conta" permanece desabilitado.
- **Dado que** marco o checkbox, **quando** os demais campos são válidos, **então** o botão
  "Criar conta" fica habilitado.
- **Dado que** o checkbox está visível, **quando** leio seu texto, **então** ele contém links
  clicáveis para `/termos` e `/privacidade`, abrindo em nova aba (não perco o formulário
  preenchido).

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | História |
|----|-----------|------------|----------|
| RF-01 | Criar `apps/web/src/app/privacidade/page.tsx` (Server Component, fora dos grupos `(auth)`/`(app)`) que lê `docs/legal/privacy-policy.md` via `fs.readFileSync` e renderiza como Markdown | Alta | US-01 |
| RF-02 | Criar `apps/web/src/app/termos/page.tsx` análogo, lendo `docs/legal/terms-of-service.md` | Alta | US-01 |
| RF-03 | Adicionar `react-markdown` + `remark-gfm` (suporte a tabelas, usadas extensivamente nos dois documentos) como dependência de `apps/web` | Alta | RF-01, RF-02 |
| RF-04 | `apps/web/middleware.ts`: adicionar `/privacidade` e `/termos` a uma lista de rotas totalmente públicas (sem redirect em nenhum sentido — diferente de `PUBLIC_PATHS`, que redireciona usuário já logado para `/dashboard`) | Alta | US-01 |
| RF-05 | Criar `apps/web/src/components/legal-footer.tsx` — rodapé simples com links para `/privacidade` e `/termos` — e incluí-lo em `/` (landing), `/login` e `/register` | Média | US-02 |
| RF-06 | `/register`: adicionar checkbox obrigatório "Li e concordo com os [Termos de Uso](/termos) e a [Política de Privacidade](/privacidade)"; botão "Criar conta" desabilitado enquanto não marcado | Alta | US-03 |

---

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Sem autenticação | `/privacidade` e `/termos` acessíveis com 200 sem cookie de sessão |
| RNF-02 | Fonte única de verdade | Nenhuma cópia do texto jurídico em `apps/web` — as páginas leem `docs/legal/*.md` em tempo de build/request |

---

## Fora de Escopo

- **Banner de cookies**: não implementado. O único armazenamento client-side hoje é o cookie
  httpOnly de sessão (estritamente necessário para o funcionamento do serviço) e o cache do
  Service Worker (também funcional, não publicitário/analítico). Sob a LGPD e as práticas
  usuais de consentimento de cookies, armazenamento estritamente necessário não exige banner
  de consentimento. Revisitar se o projeto adicionar analytics ou cookies não essenciais no
  futuro.
- **Revisão jurídica do conteúdo**: já pendente em `important/PENDENCIAS-E-PROCESSOS.md` §3,
  antes de uso com usuários pagantes reais — esta spec só resolve a distribuição do conteúdo
  já redigido, não sua validação legal.
- **Registro de consentimento em banco de dados** (ex: tabela `user_consents` com timestamp/
  versão do documento aceito): o checkbox de RF-06 é um requisito de UX/fricção mínima, não
  persiste evidência de aceite além do cadastro em si. Auditoria formal de consentimento fica
  para spec futura, se necessário.

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Conteúdo | `docs/legal/privacy-policy.md`, `docs/legal/terms-of-service.md` | Fonte canônica do texto jurídico — já redigido, pendente apenas de revisão por advogado (`important/PENDENCIAS-E-PROCESSOS.md` §3) |
| Regra | `C1` (`RULES.md`) | Base legal do tratamento de dados, referenciada pela política de privacidade |
| Regra | `R-BIZ-05` (`RULES.md`) | Período de graça de 30 dias, mencionado na política (§6) |

---

## Changelog (pós-aprovação)

| Data | O que mudou | Por quê |
|------|-------------|---------|
| | | |
