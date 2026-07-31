---
id: SPEC-20260731-003
title: "Redirecionamento Global para /login em 401 de Chamadas Client-Side (Sessão Inválida)"
status: approved
date: 2026-07-31
author: Douglas Lopes (lps.doug@protonmail.com)
rules: []
security: [S1]
camadas: [frontend]
---

## Contexto

Bug reportado por Douglas em 2026-07-31: ao navegar pelas rotas protegidas do menu lateral com
sessão inválida, as páginas carregam normalmente (sem redirect para `/login`) e cada seção exibe
apenas `<Alert variant="error" description="Não foi possível carregar...">` — um erro genérico de
carregamento, quando o comportamento esperado (S1) é o usuário ser levado ao login.

### Causa raiz

`apps/web/middleware.ts` protege corretamente a **navegação de página** (document request) — isso
já é coberto por `middleware.spec.ts`. Mas o `matcher` do middleware **exclui explicitamente**
`api/backend` (linha do `config.matcher`), porque esse prefixo é reescrito para a API NestJS via
`next.config.ts` e precisa passar cookies httpOnly de mesma origem.

Toda a busca de dados das páginas do grupo `(app)` é client-side, via `apiClient` (chamado por
`useQuery` do TanStack Query) batendo em `/api/backend/*` — ou seja, **nunca passa pelo
middleware**. Quando a sessão se torna inválida depois que a página já foi servida (token expira
em navegação já carregada/cacheada pelo Router Cache do Next, cookie limpo, logout em outra aba),
a API responde `401` diretamente, sem qualquer redirecionamento.

`apiClient` (`apps/web/src/lib/http/api-client.ts`) já trata dois casos de erro de forma
centralizada — 404 (`handleNotFound`, limpa contexto de veículo) e 403 `ACCOUNT_PENDING_DELETION`
(`redirectToRestoreAccount`, SPEC-20260719-001 RF-13) — mas não tinha nenhum tratamento para 401.
O erro caía no `throw new ApiError(...)` genérico, e cada página apenas verifica `isError` do
`useQuery` para renderizar o `Alert` de erro genérico — daí o sintoma relatado.

## Requisitos

### RF-01 — Interceptação global de 401
Qualquer resposta `401` de `/api/backend/*` (não só de uma página específica) dispara redirect
global para `/login?redirect=<pathname atual>` — mesmo contrato de query param já usado pelo
middleware SSR (`apps/web/middleware.ts:58-60`), permitindo que a página de login devolva o
usuário à rota original após reautenticar (`apps/web/src/app/(auth)/login/page.tsx:56-57` já lê
esse parâmetro).

### RF-02 — Exclusão dos endpoints de `/auth/*`
Endpoints sob `/auth/` (`login`, `register`, `recover-password`, `reset-password`, `refresh`,
`logout`) **não** disparam o redirect global em 401. `POST /auth/login` retorna 401 como fluxo
normal de credenciais inválidas (STORY-02, já coberto em `api-client.spec.ts`) — se o redirect
global disparasse aqui, o usuário seria empurrado de volta para `/login` antes de ver a mensagem
"E-mail ou senha inválidos.", quebrando o formulário.

### RF-03 — Sem loop de redirect
Se o usuário já está em `/login` (ex.: um 401 de uma chamada em segundo plano nessa página),
não repetir o redirect — mesmo padrão de guarda já usado em `getRestoreAccountRedirectUrl`.

### RF-04 — Erro ainda propaga
Assim como o padrão de RF-13 da SPEC-20260719-001 (403 `ACCOUNT_PENDING_DELETION`), o redirect é
um efeito colateral — a função ainda lança `ApiError` normalmente. Isso evita necessidade de
tratamento especial em cada `useQuery`; a navegação ocorre antes de qualquer novo render relevante
da página de origem.

## Critérios de Aceite

- [x] 401 em qualquer chamada `apiClient` fora de `/auth/*` chama `window.location.assign("/login?redirect=<pathname>")`
- [x] 401 em `/auth/login` (e demais `/auth/*`) não dispara o redirect
- [x] Chamada 401 enquanto já em `/login` não redireciona novamente
- [x] `ApiError` continua sendo lançado em todos os casos (comportamento existente preservado)

## Notas Técnicas

Não resolve o caso do Router Cache servir um shell de página protegida pré-buscado antes da
expiração — o middleware SSR continua sendo a primeira linha de defesa para navegação nova; esta
spec cobre o gap client-side quando a sessão expira **depois** da navegação já ter ocorrido. Os
dois mecanismos são complementares, não substitutos um do outro.

## Changelog

- 2026-07-31: Criação e implementação imediata (achado reportado por Douglas durante revisão de S1).
