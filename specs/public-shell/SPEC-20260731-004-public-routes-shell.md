---
id: SPEC-20260731-004
title: "Shell de Rotas Públicas: PublicHeader, Footer Consistente e navegação de Retorno"
status: approved
date: 2026-07-31
author: Douglas Lopes (lps.doug@protonmail.com)
rules: []
security: []
camadas: [frontend]
---

## Contexto

Todas as rotas acessíveis sem autenticação no navestory carecem de um shell visual coerente. Os três problemas identificados são:

1. **Ausência de header**: nenhuma rota pública tem um cabeçalho próprio. O único `header.tsx` do projeto (`apps/web/src/components/layout/header.tsx`) está acoplado ao app-shell autenticado (sidebar, contexto de veículo, command palette) e não é reutilizável nessas rotas. Consequência: o visitante não tem âncora visual de marca nem orientação de navegação primária.

2. **Footer inconsistente**: `LegalFooter` (`apps/web/src/components/legal-footer.tsx`) aparece em `/`, `/login` e `/register`, mas está ausente em `/recover-password`, `/reset-password`, `/restore-account`, `/termos`, `/privacidade` e `/offline`. O componente atual expõe apenas dois links legais, sem copyright ou contato.

3. **Sem navegação de retorno**: os fluxos de recuperação de senha (`/recover-password`, `/reset-password`) e a página de restauração de conta (`/restore-account`) não oferecem nenhum caminho de volta ao login além do botão "voltar" do navegador. As páginas de documentos legais (`/termos`, `/privacidade`) igualmente não têm saída para o contexto de origem.

Rotas públicas afetadas (escopo desta spec):

| Rota                | Grupo    | Header atual | Footer atual  | Voltar      |
| ------------------- | -------- | ------------ | ------------- | ----------- |
| `/` (landing)       | raiz     | —            | `LegalFooter` | N/A         |
| `/login`            | `(auth)` | —            | `LegalFooter` | N/A         |
| `/register`         | `(auth)` | —            | `LegalFooter` | N/A         |
| `/recover-password` | `(auth)` | —            | **ausente**   | **ausente** |
| `/reset-password`   | `(auth)` | —            | **ausente**   | **ausente** |
| `/restore-account`  | `(auth)` | —            | **ausente**   | **ausente** |
| `/termos`           | raiz     | —            | **ausente**   | **ausente** |
| `/privacidade`      | raiz     | —            | **ausente**   | **ausente** |
| `/offline`          | raiz     | —            | **ausente**   | N/A         |

## Objetivo

Criar um `PublicHeader` reutilizável com logotipo e, quando aplicável, um link de navegação contextual; garantir que `LegalFooter` apareça consistentemente em todas as rotas públicas listadas; e adicionar navegação de retorno nas rotas onde o usuário pode ficar preso (fluxos de auth de recuperação e documentos legais).

## Histórias de Usuário e Critérios de Aceitação

### US-01: Identificação de marca em todas as páginas públicas

**Como** visitante não autenticado, **quero** ver o nome/logotipo do navestory em todas as páginas públicas, **para** saber em qual sistema estou e ter um ponto de orientação visual consistente.

- **Dado que** estou em `/` (landing), **quando** acesso a página, **então** vejo o `PublicHeader` exibindo o nome "navestory" como marca; os CTAs "Entrar" e "Criar conta" continuam no corpo da página e o header não duplica esses links.
- **Dado que** estou em `/login`, **quando** acesso a página, **então** vejo o `PublicHeader` com o nome "navestory" e um link secundário "Criar conta" apontando para `/register`.
- **Dado que** estou em `/register`, **quando** acesso a página, **então** vejo o `PublicHeader` com o nome "navestory" e um link secundário "Entrar" apontando para `/login`.
- **Dado que** estou em `/recover-password`, `/reset-password`, `/restore-account`, `/termos`, `/privacidade` ou `/offline`, **quando** acesso a página, **então** vejo o `PublicHeader` com o nome "navestory" e sem links de navegação secundária (a navegação de retorno, quando pertinente, aparece no corpo da página).

### US-02: Acesso consistente aos documentos legais

**Como** visitante em qualquer rota pública, **quero** ver links para os Termos de Uso e a Política de Privacidade em rodapé, **para** poder consultá-los a qualquer momento sem saber as URLs de cor.

- **Dado que** estou em qualquer rota pública (todas as listadas na tabela do Contexto), **quando** a página carrega, **então** vejo o `LegalFooter` com os links "Termos de Uso" (→ `/termos`) e "Política de Privacidade" (→ `/privacidade`).
- **Dado que** estou em `/termos` ou `/privacidade`, **quando** vejo o footer, **então** os links ainda estão presentes, permitindo navegar entre os dois documentos.

### US-03: Retorno ao login nos fluxos de recuperação de senha

**Como** usuário que iniciou um fluxo de recuperação de senha, **quero** poder retornar à tela de login com um clique, **para** não depender do botão "voltar" do navegador em passos intermediários.

- **Dado que** estou em `/recover-password`, **quando** olho para a página, **então** vejo um link "Voltar para o login" que aponta para `/login`, posicionado abaixo do formulário.
- **Dado que** estou em `/reset-password`, **quando** olho para a página, **então** vejo um link "Voltar para o login" que aponta para `/login`, posicionado abaixo do formulário.

### US-04: Retorno ao login na página de restauração de conta

**Como** usuário redirecionado para `/restore-account` após login com conta em soft-delete, **quero** um caminho de saída sem executar a restauração nem confirmar a exclusão, **para** poder cancelar a operação e voltar ao login.

- **Dado que** estou em `/restore-account`, **quando** olho para a página, **então** vejo um link "Voltar para o login" posicionado abaixo dos dois botões de CTA existentes, visivelmente menos proeminente que "Cancelar exclusão e restaurar minha conta".

### US-05: Retorno à origem nos documentos legais

**Como** visitante que navegou para `/termos` ou `/privacidade` a partir de outra página, **quero** retornar à origem com um clique, **para** ter uma experiência de navegação fluida sem recorrer ao browser.

- **Dado que** estou em `/termos` ou `/privacidade` e há histórico de navegação, **quando** aciono o link/botão "Voltar", **então** sou levado de volta à página anterior.
- **Dado que** estou em `/termos` ou `/privacidade` e não há histórico de navegação (acesso direto via URL), **quando** aciono o link/botão "Voltar", **então** sou levado para `/`.

### US-06: Alternar tema manualmente em rotas públicas

**Como** visitante não autenticado, **quero** poder alternar entre modo claro e escuro no header público, **para** ter controle sobre a aparência independente do tema do meu sistema operacional/navegador.

- **Dado que** estou em qualquer rota pública, **quando** olho para o `PublicHeader`, **então** vejo um `ThemeToggle` alinhado à direita.
- **Dado que** clico no `ThemeToggle`, **quando** o tema alterna, **então** a preferência é persistida da mesma forma que no app autenticado (via `next-themes`), permanecendo após navegação entre rotas públicas.

## Requisitos Funcionais

| ID    | Requisito                                                                                                                                                                                                                                                                             | Prioridade | História relacionada |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------- |
| RF-01 | Criar componente `PublicHeader` em `apps/web/src/components/public-header.tsx`, exibindo o nome/logotipo textual "navestory" como marca.                                                                                                                                              | Alta       | US-01                |
| RF-02 | O `PublicHeader` aceita uma prop opcional `navLink?: { label: string; href: string }`. Quando fornecida, renderiza o link ao lado do logotipo (lado direito ou segundo elemento). Quando omitida, exibe apenas o logotipo.                                                            | Alta       | US-01                |
| RF-03 | Adicionar `PublicHeader` em todas as rotas públicas: `/`, `/login`, `/register`, `/recover-password`, `/reset-password`, `/restore-account`, `/termos`, `/privacidade`, `/offline`.                                                                                                   | Alta       | US-01                |
| RF-04 | Em `/login`, o `PublicHeader` recebe `navLink={{ label: "Criar conta", href: "/register" }}`.                                                                                                                                                                                         | Alta       | US-01                |
| RF-05 | Em `/register`, o `PublicHeader` recebe `navLink={{ label: "Entrar", href: "/login" }}`.                                                                                                                                                                                              | Alta       | US-01                |
| RF-06 | Em `/`, `/recover-password`, `/reset-password`, `/restore-account`, `/termos`, `/privacidade` e `/offline`, o `PublicHeader` é usado sem `navLink`.                                                                                                                                   | Média      | US-01                |
| RF-07 | Garantir que `LegalFooter` apareça em todas as rotas públicas. As rotas atualmente sem footer são: `/recover-password`, `/reset-password`, `/restore-account`, `/termos`, `/privacidade`, `/offline`.                                                                                 | Alta       | US-02                |
| RF-08 | Adicionar link/botão "Voltar para o login" (→ `/login`) em `/recover-password`, posicionado abaixo do botão de submissão do formulário.                                                                                                                                               | Alta       | US-03                |
| RF-09 | Adicionar link/botão "Voltar para o login" (→ `/login`) em `/reset-password`, posicionado abaixo do botão de submissão do formulário.                                                                                                                                                 | Alta       | US-03                |
| RF-10 | Adicionar link/botão "Voltar para o login" (→ `/login`) em `/restore-account`, posicionado abaixo dos dois botões de CTA existentes ("Cancelar exclusão" e "Continuar com a exclusão"). O elemento deve ser visualmente mais discreto (link simples, não botão primário nem outline). | Alta       | US-04                |
| RF-11 | Criar componente `BackLink` (ou equivalente) em `apps/web/src/components/back-link.tsx`, que executa `router.back()` com fallback para um `href` fornecido via prop quando `window.history.length <= 1`.                                                                              | Alta       | US-05                |
| RF-12 | Adicionar `BackLink` com `fallback="/"` e rótulo "Voltar" em `/termos` e `/privacidade`, posicionado acima do conteúdo do documento (antes de `<LegalDocument />`).                                                                                                                   | Alta       | US-05                |
| RF-13 | `PublicHeader` inclui `ThemeToggle` (`@navestory/ui`) alinhado à direita, replicando o padrão `useTheme`/`resolvedTheme` do header autenticado (`apps/web/src/components/layout/header.tsx`), para alternar `light`/`dark` manualmente em todas as rotas públicas.                    | Média      | US-06                |

## Requisitos Não-Funcionais

| ID     | Requisito                                                                                                                                                                                                                                                                                                          | Métrica de Aceite                                                                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Sem cores hardcoded — todos os tokens dos novos componentes devem usar a paleta Azul-Índigo (`text-foreground`, `bg-background`, `border-border`, `text-muted-foreground` etc.) conforme SPEC-20260731-001.                                                                                                        | Nenhum hex literal, `oklch()` avulso ou classe `bg-white`/`text-black` fora de tokens — verificável via `pnpm check:hardcoded-colors`.                               |
| RNF-02 | `PublicHeader` é Client Component (`"use client"`) por conter o `ThemeToggle` (RF-13), que depende de `useTheme`/`resolvedTheme` do `next-themes`, resolvidos apenas no cliente. `BackLink` é Client Component por usar `router.back()`. Demais componentes novos sem interatividade permanecem Server Components. | `public-header.tsx` guarda o mount com `useState`/`useEffect` antes de renderizar o `ThemeToggle`, mesmo padrão de `layout/header.tsx`, evitando hydration mismatch. |
| RNF-03 | `<header>` semântico com `role="banner"` implícito; links de navegação com texto acessível e descritivo.                                                                                                                                                                                                      | Sem violações de `jest-axe` ao adicionar os novos componentes nos testes existentes das páginas afetadas.                                                            |
| RNF-04 | Nenhuma regressão nas suítes existentes (`packages/ui` e `apps/web`).                                                                                                                                                                                                                                              | `pnpm test` verde após a implementação.                                                                                                                              |

## Fora de Escopo

- O header autenticado (`apps/web/src/components/layout/header.tsx`) — não será alterado nem referenciado pelos novos componentes.
- Alterações no conteúdo ou estilo do `LegalFooter` (copyright, e-mail de contato, links extras) — esta spec apenas garante a presença consistente do componente já existente.
- Logotipo SVG ou imagético — o logotipo textual "navestory" já usado em `apps/web/src/app/page.tsx` é suficiente por ora.
- Mega-menu, dropdown de idioma, navegação multi-nível ou qualquer funcionalidade além de logotipo + link contextual + toggle de tema.
- Testes unitários novos para os componentes introduzidos — decisão de cobertura registrada em `specs/TEST_DECISIONS.md`.

## Dependências

| Tipo       | Referência                              | Descrição                                                                                                                           |
| ---------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Spec       | SPEC-20260731-001                       | Paleta Azul-Índigo — tokens de cor que `PublicHeader` e `BackLink` devem respeitar                                                  |
| Spec       | SPEC-20260720-001                       | `LegalFooter` e páginas de documentos legais — garantir RF-07 e RF-12 sem duplicar lógica                                           |
| Componente | `@navestory/ui` — `Button`, `Container` | Disponíveis; usar `Button variant="ghost"` ou link simples para o `BackLink`                                                        |
| Biblioteca | `next/link`                             | `Link` do Next.js para todos os links estáticos (RF-04, RF-05, RF-08, RF-09, RF-10)                                                 |
| Biblioteca | `next/navigation` — `useRouter`         | Para `router.back()` no `BackLink` (RF-11); requer `"use client"`                                                                   |
| Componente | `@navestory/ui` — `ThemeToggle`         | Puramente apresentacional (RF-13); `PublicHeader` fornece `theme`/`onToggle` via `next-themes`, mesmo padrão de `layout/header.tsx` |
| Biblioteca | `next-themes` — `useTheme`              | Resolve `resolvedTheme` e persiste a escolha entre navegações (RF-13); requer `"use client"`                                   |

## Notas Técnicas

**Estratégia de layout para o grupo `(auth)`:** a forma mais limpa de garantir `PublicHeader` e `LegalFooter` para todas as rotas do grupo é via `apps/web/src/app/(auth)/layout.tsx`. Isso evita repetição em cada `page.tsx` do grupo. Para `/`, `/termos`, `/privacidade` e `/offline` (fora do grupo), os componentes devem ser adicionados individualmente.

**Alternativa com grupo `(public)`:** criar um grupo de rota `(public)` englobando landing, legais e offline, com layout compartilhado. Implicaria mover arquivos de rota existentes. Decisão fica para o implementador — a spec é agnóstica quanto à estratégia de agrupamento.

**`BackLink` e histórico vazio:** `window.history.length <= 1` não é 100% confiável em todos os browsers (Firefox pode contar abas). Uma abordagem segura: renderizar o elemento como `<a href={fallback}>` e sobrescrever o comportamento com `router.back()` via `onClick` em JS. Sem JS, o link estático funciona como fallback acessível.

**Discrição do "Voltar para o login" em `/restore-account`:** esta rota já tem dois botões de CTA de alto peso (restaurar conta vs. confirmar exclusão). O link de retorno deve ser um `<Link>` simples (texto sublinhado, `text-sm text-muted-foreground`), não um `Button`, para não acrescentar uma terceira ação de mesmo peso visual.

**`/offline` e footer:** a página de fallback PWA é exibida sem conexão; os links do `LegalFooter` funcionarão apenas se `/termos` e `/privacidade` tiverem sido pré-cacheados pelo Service Worker. A presença do footer é estruturalmente correta e consistente — o comportamento degradado sem cache já é esperado e documentado em SPEC-20260712-001.

## Changelog (pós-aprovação)

| Data       | O que mudou                                                                                                                                                              | Por quê                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-07-31 | Adicionado RF-13/US-06 (`ThemeToggle` no `PublicHeader`); removida a exclusão de tema switcher do escopo; `PublicHeader` passa a ser Client Component (RNF-02 revisado). | Usuário pediu explicitamente após a implementação inicial: visitante não autenticado ficava sem controle manual de tema, diferente do app autenticado. |
