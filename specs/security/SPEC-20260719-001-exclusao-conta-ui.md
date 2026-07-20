---
id: SPEC-20260719-001
title: "UI de Exclusão de Conta pelo Próprio Usuário (LGPD Art. 18)"
status: approved
date: 2026-07-19
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-BIZ-05]
security: [S1]
compliance: [C1]
camadas: [frontend, design, security]
---

# SPEC-20260719-001: UI de Exclusão de Conta pelo Próprio Usuário (LGPD Art. 18)

**Status:** Approved
**Criada em:** 2026-07-19
**Autor:** Douglas Lopes (lps.doug@protonmail.com)
**Origem:** Auditoria 2026-07-19, Achado #1 — [`docs/qa/2026-07-19-plano-de-acao-auditoria.md`](../../docs/qa/2026-07-19-plano-de-acao-auditoria.md), Tarefa T1

---

## Contexto

O backend já expõe o endpoint `DELETE /users/me` com body `{ confirm: true }` → 204 (especificado e aprovado em [`SPEC-20260521-004`](../admin/SPEC-20260521-004.md), RF-01/RF-04), que realiza a exclusão da conta e revogação de tokens JWT. A regra C1 (`RULES.md`) cobre o aspecto de compliance dessa operação.

Contudo, não existe nenhuma UI para este fluxo. O usuário não consegue solicitar a exclusão da própria conta sem intervenção manual de um desenvolvedor, violando o Art. 18 da LGPD (direito ao esquecimento em autoatendimento). A ausência de UI foi confirmada na auditoria: não há tela de `settings/account`, nem `settings/conta`, nem nenhum link ou componente que exponha `DELETE /users/me` ao usuário final.

Adicionalmente, o design system (`@nave/ui` em `packages/ui/`) não possui um componente `Dialog` genérico e reutilizável. O único uso de `@radix-ui/react-dialog` no projeto é ad hoc em `apps/web/src/components/layout/vehicle-context-dialog.tsx`, sem extração para o pacote compartilhado. Esta spec inclui a criação do componente `Dialog` em `packages/ui/`, pois é o pré-requisito para o fluxo de confirmação aqui definido e beneficia o projeto como um todo.

## Objetivo

1. Criar o componente `Dialog` genérico em `packages/ui/src/components/`, seguindo o padrão dos demais componentes do design system, baseado em `@radix-ui/react-dialog` (já dependência do monorepo).
2. Criar a página `apps/web/src/app/(app)/settings/account/page.tsx` com seção de exclusão de conta.
3. Implementar o fluxo de exclusão em **duas etapas** usando o novo `Dialog`, culminando na chamada ao endpoint `DELETE /users/me`.
4. Exibir estado persistente de "conta marcada para exclusão" quando o usuário retorna ao sistema antes do prazo de 30 dias, com link funcional para cancelar a exclusão (restore).
5. Implementar o fluxo de restore — detectar 403 com `code: ACCOUNT_PENDING_DELETION` após login, exibir tela de confirmação de cancelamento e chamar `POST /users/me/restore`.
6. Tratar graciosamente arquivos de Storage possivelmente indisponíveis após hard-delete (edge case de referências órfãs).

## Histórias de Usuário e Critérios de Aceitação

### US-01: Acessar a página de configurações de conta

**Como** usuário autenticado do Nave, **quero** acessar uma tela de configurações da minha conta, **para** visualizar opções de gerenciamento, incluindo a exclusão permanente.

- **Dado que** estou autenticado e navego para `/settings/account`, **quando** a página carrega, **então** vejo uma seção de identificação da conta (nome, e-mail) e uma seção "Zona de perigo" contendo o botão "Excluir minha conta".
- **Dado que** acesso a página sem estar autenticado, **quando** o middleware avalia a rota, **então** sou redirecionado para `/login` (S1 aplicado pelo middleware SSR).

### US-02: Iniciar o fluxo de exclusão de conta

**Como** usuário autenticado, **quero** clicar em "Excluir minha conta", **para** iniciar o processo de exclusão com informações claras sobre as consequências.

- **Dado que** clico no botão "Excluir minha conta", **quando** o Dialog abre, **então** vejo uma mensagem explicando que: (a) a exclusão definitiva ocorrerá após 30 dias, (b) **posso cancelar a exclusão fazendo login novamente durante esses 30 dias** — o restore é funcional e recupera todos os dados intactos (veículos, despesas, nome, preferências), (c) após o prazo a operação é irreversível; e o botão de confirmar está **desabilitado** neste momento.
- **Dado que** o Dialog está aberto, **quando** digito qualquer texto diferente de `EXCLUIR` no campo de confirmação, **então** o botão "Confirmar exclusão" permanece desabilitado.
- **Dado que** o Dialog está aberto e o campo de confirmação está em foco, **quando** digito exatamente `EXCLUIR` (maiúsculas, sem espaços extras), **então** o botão "Confirmar exclusão" fica habilitado.
- **Dado que** o Dialog está aberto, **quando** clico em "Cancelar" ou pressiono `Esc`, **então** o Dialog fecha sem nenhuma ação, o campo de confirmação é limpo e retorno à página de configurações intacta.

### US-03: Confirmar e executar a exclusão

**Como** usuário que digitou `EXCLUIR` no campo de confirmação, **quero** clicar em "Confirmar exclusão", **para** que minha conta seja marcada para exclusão.

- **Dado que** digitei `EXCLUIR` e clico em "Confirmar exclusão", **quando** a requisição `DELETE /users/me` é enviada, **então** vejo um indicador de carregamento no botão e os controles do Dialog ficam desabilitados durante a operação.
- **Dado que** a requisição retorna 204 com sucesso, **quando** a resposta chega, **então** o Dialog fecha, sou deslogado automaticamente (tokens revogados pelo backend) e redirecionado para `/login` com um parâmetro de mensagem (ex: `?message=conta_excluida`) que exibe um `Alert` variant `info` informando que a solicitação foi registrada e o prazo de 30 dias começou.
- **Dado que** a requisição retorna erro (4xx ou 5xx), **quando** a resposta chega, **então** o Dialog permanece aberto, o campo de confirmação é limpo, e um `Alert` variant `error` aparece dentro do Dialog informando o erro com mensagem genérica ("Não foi possível processar sua solicitação. Tente novamente ou entre em contato com o suporte.").

### US-04: Ver estado de "conta marcada para exclusão" ao retornar

**Como** usuário que já solicitou exclusão mas ainda está dentro do prazo de 30 dias, **quero** ver um aviso ao acessar o sistema, **para** saber que minha conta está agendada para exclusão e que ainda posso cancelar.

- **Dado que** minha conta está com `profiles.deleted_at IS NOT NULL` (soft-delete pendente), **quando** acesso qualquer tela dentro do grupo `(app)`, **então** um `Alert` variant `warning` é exibido no topo da página com: (a) a data prevista para o hard delete (calculada como `deleted_at + 30 dias`), (b) um botão/link "Cancelar exclusão" que chama o fluxo de restore (RF-15) — funcional nesta spec.
- **Dado que** estou na página `/settings/account` e minha conta está marcada para exclusão, **quando** a página carrega, **então** o botão "Excluir minha conta" fica desabilitado (conta já em processo de exclusão) e o `Alert` de aviso é exibido no lugar da seção de exclusão.

### US-06: Detectar conta soft-deleted no login e oferecer restore

**Como** usuário que solicitou exclusão da conta e deseja recuperá-la, **quero** que ao
tentar fazer login normalmente o sistema detecte o estado e me ofereça a opção de cancelar
a exclusão, **para** não precisar entrar em contato com suporte.

- **Dado que** faço login com email/senha válidos de uma conta soft-deleted, **quando** o
  Supabase Auth autentica com sucesso mas a chamada subsequente à API do Nave retorna 403
  com `code: "ACCOUNT_PENDING_DELETION"`, **então** sou direcionado para a tela de restore
  (RF-13) em vez de uma mensagem de erro genérica.
- **Dado que** estou na tela de restore, **quando** a página carrega, **então** vejo: (a) a
  data prevista de exclusão definitiva, (b) a lista do que será preservado ("seus veículos e
  despesas permanecem intactos"), (c) botão "Cancelar exclusão e restaurar minha conta" e
  botão secundário "Continuar com a exclusão" (que apenas fecha/redireciona sem ação de
  API).
- **Dado que** clico em "Cancelar exclusão e restaurar minha conta", **quando** a chamada
  `POST /users/me/restore` retorna 200, **então** sou redirecionado ao dashboard com um
  toast de sucesso "Sua conta foi restaurada com sucesso!".
- **Dado que** o restore falha (erro de rede ou 4xx/5xx), **quando** a resposta chega,
  **então** um `Alert` variant `error` é exibido na tela de restore, o botão volta ao
  estado habilitado e o erro é tratado sem deslogar o usuário.

### US-05: Tratar falhas de conectividade durante o fluxo

**Como** usuário tentando confirmar a exclusão, **quero** receber feedback claro se a conexão falhar, **para** saber que minha conta não foi excluída e o que fazer.

- **Dado que** a requisição falha por timeout ou erro de rede (não 4xx/5xx — falha antes da resposta), **quando** o erro é capturado no cliente, **então** o Dialog permanece aberto com `Alert` variant `error` ("Verifique sua conexão e tente novamente."), o campo de confirmação é limpo e o botão volta ao estado habilitado (pois `EXCLUIR` foi digitado mas a ação não foi concluída).

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | História |
|----|-----------|------------|----------|
| RF-01 | Criar componente `Dialog` em `packages/ui/src/components/dialog.tsx`, baseado em `@radix-ui/react-dialog`, exportando: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose` — nomenclatura alinhada com shadcn/ui para facilitar migração futura | Alta | — |
| RF-02 | `DialogContent` deve incluir: overlay com foco preso (`focus-trap` nativo do Radix), fechamento via `Esc` e clique no overlay, `aria-labelledby` apontando para `DialogTitle`, `aria-describedby` apontando para `DialogDescription` | Alta | US-02 |
| RF-03 | Criar `packages/ui/src/components/dialog.test.tsx` cobrindo: abertura/fechamento por trigger, fechamento por `Esc`, acessibilidade (`aria-*`) via `@testing-library/react` | Alta | RF-01 |
| RF-04 | Criar página `apps/web/src/app/(app)/settings/account/page.tsx` (Server Component), acessível via `/settings/account`, com: seção de informações da conta (nome, e-mail) e seção "Zona de perigo" | Alta | US-01 |
| RF-05 | A seção "Zona de perigo" contém o botão `<Button variant="destructive">Excluir minha conta</Button>` que abre o `Dialog` de confirmação | Alta | US-01 |
| RF-06 | O `Dialog` de confirmação (Client Component) exibe em `DialogDescription`: a lista de consequências, o aviso do prazo de 30 dias, e o campo de texto para confirmação manual | Alta | US-02 |
| RF-07 | O campo de confirmação aceita entrada livre de texto; o botão "Confirmar exclusão" só fica `disabled={false}` quando `value.trim() === 'EXCLUIR'` (case-sensitive, sem normalização de case) | Alta | US-02 |
| RF-08 | Ao clicar em "Confirmar exclusão", chamar `DELETE /users/me` com body `{ confirm: true }` e header `Authorization: Bearer <token>` via o cliente HTTP existente | Alta | US-03 |
| RF-09 | Em caso de resposta 204: fechar Dialog, disparar logout do cliente Supabase (para limpar tokens locais) e redirecionar para `/login?message=conta_excluida` | Alta | US-03 |
| RF-10 | Em caso de erro de rede ou resposta não-2xx: manter Dialog aberto, exibir `Alert variant="error"` dentro do `DialogContent`, limpar o campo de confirmação | Alta | US-03, US-05 |
| RF-11 | A página `settings/account` deve verificar `profiles.deleted_at` do usuário autenticado ao carregar; se `NOT NULL`, exibir `Alert variant="warning"` com data prevista de hard delete, desabilitar o botão de exclusão e exibir o botão/link "Cancelar exclusão" que aciona o fluxo de restore (RF-15) | Média | US-04 |
| RF-12 | Exportar `Dialog` e subcomponentes em `packages/ui/src/index.ts` (seguir o padrão de export nomeado dos demais componentes) | Alta | RF-01 |
| RF-13 | Na página de login (`apps/web/src/app/(auth)/login/page.tsx`), após autenticação Supabase bem-sucedida, verificar se a chamada a qualquer endpoint protegido (ex: `GET /users/me`) retorna 403 com `code: "ACCOUNT_PENDING_DELETION"`. Se sim, redirecionar para `/restore-account` em vez do dashboard, passando a data de exclusão prevista via query param ou session storage | Alta | US-06 |
| RF-14 | Criar página `apps/web/src/app/(auth)/restore-account/page.tsx` — Client Component exibindo: (a) `Alert variant="warning"` com data de exclusão prevista, (b) lista do que será preservado no restore ("veículos, despesas, histórico e todos os dados de conta ficam intactos — o restore é completo"), (c) botão primário "Cancelar exclusão e restaurar minha conta" e botão secundário "Continuar com a exclusão" (apenas fecha sessão sem chamar API) | Alta | US-06 |
| RF-15 | Ao clicar em "Cancelar exclusão e restaurar minha conta" (RF-14): chamar `POST /users/me/restore` com token JWT; em caso de 200: redirecionar para `/` (dashboard) com toast `variant="success"` "Sua conta foi restaurada com sucesso!"; em caso de erro: exibir `Alert variant="error"` na tela de restore sem deslogar | Alta | US-06 |
| RF-16 | Em qualquer componente que exiba imagens de veículo ou documentos vinculados a URLs do Supabase Storage: ao detectar falha de carregamento da imagem (evento `onError`), exibir ícone de placeholder "arquivo indisponível" (`ImageOff` do `lucide-react`) em vez de imagem quebrada. Aplica-se especialmente a `vehicles/[id]` e listagens de veículos — edge case de arquivos órfãos após hard-delete (ver SPEC-20260719-002 RF-12) | Média | — |

---

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Acessibilidade | Dialog deve passar `axe` sem violações críticas; foco preso enquanto aberto; retorna foco ao trigger ao fechar; todos os controles interativos com `aria-label` ou texto visível |
| RNF-02 | Autenticação | Rota `/settings/account` protegida pelo middleware SSR (S1); qualquer requisição sem token válido retorna 401 no backend |
| RNF-03 | Feedback visual | Estados de loading, erro e sucesso visualmente distintos; botão com `aria-busy="true"` durante a requisição |
| RNF-04 | Confirmação explícita | O campo de digitação de `EXCLUIR` deve ter `autocomplete="off"`, `autocorrect="off"`, `autocapitalize="off"`, `spellcheck="false"` — impedir auto-preenchimento ou autocorreção acidental |
| RNF-05 | Nenhum PII em log | A chamada ao endpoint não deve logar o token ou corpo da requisição (aplica S10) |

---

## Fora de Escopo

- Não inclui: exportação de dados pessoais (LGPD Art. 18 II — portabilidade) — fora do escopo desta fase (ver SPEC-20260521-004, seção "Fora de Escopo").
- Não inclui: alterações no backend (`DELETE /users/me`) — o endpoint está aprovado em SPEC-20260521-004 e redefinido em SPEC-20260719-002. Esta spec consome os endpoints; não define comportamento de backend.
- Não inclui: envio de e-mail de confirmação de exclusão ou de alerta pré-hard-delete — depende de domínio próprio (pendente, Fase 9).
- Não inclui: painel administrativo de contas em soft-delete ou reativação via admin.
- Não inclui: segundo fator de autenticação no restore (OTP, magic link) — endurecimento futuro, não MVP (ver SPEC-20260719-002 RF-08).
- Não inclui: migração do componente ad hoc `vehicle-context-dialog.tsx` para o novo `Dialog` — pode ser feita em PR separado como limpeza técnica.

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec draft | [SPEC-20260719-002](../admin/SPEC-20260719-002-soft-delete-retencao-conta.md) | Pré-requisito direto: define `DELETE /users/me` como soft-delete real (RF-01), `POST /users/me/restore` (RF-08), `SupabaseAuthGuard` com 403 ACCOUNT_PENDING_DELETION (RF-09) e `SoftDeletedUserGuard` (RF-10) — todos consumidos por esta spec |
| Spec aprovada | [SPEC-20260521-004](../admin/SPEC-20260521-004.md) | Define o endpoint `DELETE /users/me` original; SPEC-20260719-002 refina o comportamento, mas a infraestrutura de guards e audit logs vem de SPEC-20260521-004 |
| Spec aprovada | [SPEC-20260525-001](../design-system/SPEC-20260525-001.md) | Padrão de componentes `@nave/ui`; `Dialog` deve seguir as mesmas convenções de tokens, variantes CVA e estrutura de arquivo |
| Biblioteca | `@radix-ui/react-dialog` | Já presente no monorepo como dependência transitiva; verificar se precisa ser adicionada explicitamente ao `package.json` de `packages/ui` |
| Componente existente | `packages/ui/src/components/alert.tsx` | Usado para banners de aviso de exclusão pendente (US-04) e mensagens de erro no Dialog (US-03, US-05) |
| Componente existente | `packages/ui/src/components/button.tsx` | Botão `variant="destructive"` para o gatilho de exclusão; estados `disabled` e `aria-busy` |
| Regra | `R-BIZ-05` (`RULES.md`) | Período de graça de 30 dias para exclusão de conta (LGPD) |
| Regra | C1 (`RULES.md`) | Exclusão completa via `DELETE /users/me` com cascata — a UI deve ser o canal de autoatendimento desta operação |

---

## Notas Técnicas

### Componente `Dialog` em `packages/ui`

Seguir exatamente o padrão dos componentes existentes:
- Arquivo: `packages/ui/src/components/dialog.tsx`
- Teste: `packages/ui/src/components/dialog.test.tsx`
- Export em `packages/ui/src/index.ts`
- Usar `@radix-ui/react-dialog` como base (primitivos sem estilo) + classes Tailwind dos tokens do design system para overlay, conteúdo, cabeçalho e rodapé.
- `DialogContent` deve ter `max-w-md` como default; aceitar `className` para override.
- `DialogTitle` deve ter `font-semibold text-lg`; `DialogDescription` deve ter `text-sm text-muted-foreground`.
- Overlay: `bg-black/50 backdrop-blur-sm`.
- **Não usar** o padrão ad hoc de `vehicle-context-dialog.tsx` (`apps/web`) como referência — é uma implementação isolada sem exportação para o design system.

### Estrutura do Client Component de confirmação

```
apps/web/src/app/(app)/settings/account/
  page.tsx                  ← Server Component: busca perfil, passa deleted_at como prop
  delete-account-dialog.tsx ← Client Component: Dialog, estado do input, chamada à API
```

O Server Component (`page.tsx`) pode buscar o perfil via Supabase Client server-side e verificar `profiles.deleted_at`. O Client Component gerencia estado de UI (campo de confirmação, loading, erro).

### Verificação de `profiles.deleted_at` (estado "conta marcada para exclusão")

O campo `profiles.deleted_at timestamptz` existe no schema (`20260712171830_core_tables.sql`). Para verificar o estado de pending deletion no Server Component:

```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('deleted_at')
  .eq('id', userId)
  .single()
```

Se `profile.deleted_at` não for `null`, a conta está marcada. A data de hard delete projetada é `new Date(profile.deleted_at).getTime() + 30 * 24 * 60 * 60 * 1000`.

### Pré-requisito backend resolvido: SPEC-20260719-002

A divergência entre RNF-03 de SPEC-20260521-004 e a implementação real (hard delete imediato)
foi endereçada pela criação de SPEC-20260719-002 ("Soft-Delete Real com Retenção de 30 dias").
Essa spec especifica o fluxo correto de backend:

- `DELETE /users/me` passa a ser soft-delete real (apenas `deleted_at = now()`, sem hard delete)
- `POST /users/me/restore` especificado e em escopo para MVP
- `SupabaseAuthGuard` retorna 403 + `ACCOUNT_PENDING_DELETION` para contas soft-deleted

Esta spec de UI (`SPEC-20260719-001`) pode transicionar para `approved` apenas após
SPEC-20260719-002 também transicionar — são specs co-dependentes. O gate de sincronia
em `matrices/rastreabilidade.md` deve refletir essa dependência.

### Tela de restore (`/restore-account`) e grupo de rota

A página `/restore-account` (RF-14) vive no grupo `(auth)`, não no grupo `(app)`, pois o
usuário acessa essa rota sem sessão válida nos termos do Nave (conta bloqueada). O middleware
não deve redirecionar essa rota para `/login`. Verificar se `apps/web/middleware.ts` inclui
`/restore-account` na lista de rotas públicas/de auth — se não, adicionar.

### Método de confirmação da segunda etapa

Decidido: o usuário deve digitar `EXCLUIR` (letras maiúsculas, em português, sem espaços extras) no campo de texto antes de o botão "Confirmar exclusão" ficar habilitado (RF-07).

Alternativas avaliadas e descartadas:
- **Digitar o e-mail da conta**: requer que o usuário saiba o e-mail de login (pode variar se houver OAuth), e causa troca de contexto (checar o e-mail). Fricção desnecessária.
- **Checkbox "Entendo que esta ação é irreversível"**: pouco atrito — pode ser clicado por reflexo sem ler o aviso. Não é suficiente para uma ação destrutiva permanente.
- **Digitar `delete` (inglês)**: o projeto usa pt-BR como idioma principal; usar inglês no campo seria inconsistente.

`EXCLUIR` (maiúsculas) foi escolhido pela clareza semântica em pt-BR e pelo atrito mínimo necessário: o usuário precisa digitar ativamente, mas não precisa consultar informações externas. Padrão equivalente ao usado por GitHub (digitar nome do repositório) e Vercel (digitar nome do projeto) para exclusões irreversíveis.

### Campo de confirmação — UX

O label do campo deve ser explícito:

> **Para confirmar, digite `EXCLUIR` no campo abaixo:**

O placeholder deve ser `EXCLUIR` para guiar o usuário. O campo deve ter `data-1p-ignore` e `data-lpignore="true"` além dos atributos de `RNF-04` para evitar preenchimento por gerenciadores de senha.

### Localização da página dentro de `settings/`

A rota `/settings/account` é nova. As rotas existentes são `/settings/preferences` e `/settings/vehicles/[vehicleId]/odometer-cycles`. Não há layout compartilhado de settings identificado. Se necessário, criar `apps/web/src/app/(app)/settings/layout.tsx` com navegação lateral de settings (tabs ou sidebar) — mas apenas se isso estiver alinhado ao design geral; caso contrário, a página pode existir de forma standalone sem nav de settings por ora.

### Navegação até a página

A página `/settings/account` precisa ser linkada em pelo menos um ponto da UI existente. O local recomendado é o menu de perfil do usuário (header/nav), se existir — verificar durante implementação. A spec não define o ponto de entrada exato, apenas que deve existir.

---

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`.

| Data | O que mudou | Por quê |
|------|-------------|---------|
| 2026-07-20 | `status: draft` → `approved`. Implementação concluída para RF-01 a RF-15 (Dialog no design system, `/settings/account`, fluxo de exclusão em duas etapas, interceptação global de `ACCOUNT_PENDING_DELETION`, `/restore-account`). RF-11 (banner in-app de conta pendente) descartado por ser inalcançável: o `SupabaseAuthGuard` já bloqueia toda rota autenticada antes de qualquer página do grupo `(app)` renderizar com `deleted_at` preenchido — RF-13 (redirecionamento global) cobre o mesmo caso de uso de forma mais simples. RF-16 (fallback de imagem) não implementado — não há hoje nenhum `<img>` de Storage renderizado no app; sem elemento existente para aplicar `onError` | Gate de sincronia satisfeito em `matrices/rastreabilidade.md`; RF-11/RF-16 documentados como decisão arquitetural / dívida técnica, não pendência de implementação esquecida |
| 2026-07-20 | Correção pós-revisão (`reviewer`): RF-09 estava incompleto — o redirect para `/login?message=conta_excluida` acontecia, mas a página de login nunca lia o parâmetro `message` nem exibia o `Alert` que a US-03 exige. Corrigido em `apps/web/src/app/(auth)/login/page.tsx`. Também: `/restore-account` adicionada à lista de rotas sempre-públicas do middleware (`ALWAYS_PUBLIC_PATHS`) — antes, acesso direto sem cookie forçava `/login` primeiro, contrariando a nota técnica desta spec sobre o grupo de rota | Mudança pequena, sem alteração de requisito — corrige divergência entre spec e implementação encontrada em revisão |
