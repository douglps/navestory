# Backlog — Autenticação e Cadastro

> **AVISO DE CORRECAO — 2026-07-12**
> Este arquivo foi corrigido em 2026-07-12 para refletir o estado real do projeto.
> Versoes anteriores marcavam itens como `✅` "entregue" com caminhos de arquivo específicos
> (ex: `apps/web/components/forms/register-form.tsx`), contagens de teste
> (ex: "31 testes unitários (Vitest) + 18 testes e2e (Playwright)") e datas de entrega
> (ex: "Entregue 2026-05-25") que não correspondiam ao filesystem real do repositório.
> O repositório Nave é **greenfield**: não existe nenhum código-fonte implementado.
>
> **O que foi preservado:** a descrição funcional de todas as stories, critérios de aceite,
> dependências entre itens, pontuação e prioridades — tudo genuíno e mantido integralmente.
> **O que foi corrigido:** itens marcados ✅ foram revertidos para ⏳ pendente. Caminhos de
> arquivo fictícios foram anotados como destino esperado (não como código existente). Seção
> "Entregue — SPEC-20260524-002" foi reconvertida em backlog pendente. Contagens de teste
> e datas de entrega foram removidas.
>
> Referencia: `matrices/rastreabilidade.md` (rev. 41, 2026-07-12) contém o historico completo
> da correcao e o criterio de "pronto" para preencher o status real quando a implementacao iniciar.

**Specs de referência:** `specs/auth/SPEC-20260524-001.md` · `specs/auth/SPEC-20260524-002.md`
**Última atualização:** 2026-07-12
**Total pendente:** 48 pts (14 itens) · **Entregue:** 0 pts

---

## Legenda

| Símbolo | Significado                                          |
| ------- | ---------------------------------------------------- |
| ⚠️      | Pré-requisito ou decisão aberta que bloqueia o item  |
| 🔗      | Depende de outro item deste backlog                  |
| 🔶      | Parcialmente implementado — apenas o delta está aqui |

---

## P0 — Comportamento central alterado (ADR-003 supersedido)

> Estes itens implementam a mudança de sessão definida em SPEC-20260524-001 §2.
> Devem ser entregues juntos — um sem o outro cria inconsistência de UX.

---

### BL-AUTH-01 · STORY-01 — Dois modos de persistência de sessão

**Como** qualquer usuário,
**quero** que ao marcar "lembrar de mim" minha sessão persista no browser,
**e** que sem a opção a sessão viva apenas em memória.

**O que implementar:**

- Passar `options: { persistSession: false }` quando "lembrar de mim" não está marcado
- Adicionar checkbox "Lembrar de mim" no formulário de login
- Middleware Next.js: usuário autenticado em `/login` → redirect `/dashboard`
- Redirect pós-login para rota original (preservar URL tentada antes da autenticação)

**Pts:** 3 | **Dependências:** nenhuma
**Critérios:** CA-04, CA-05 em SPEC-20260524-001

---

### BL-AUTH-02 · STORY-06 — Sessão de 7 dias com "lembrar de mim"

**Como** usuário recorrente,
**quero** permanecer autenticado por 7 dias ao marcar "lembrar de mim",
**para** não fazer login a cada acesso semanal.

**O que implementar:**

- Checkbox "Lembrar de mim" no formulário de login
- Preferência salva em `sessionStorage` sob `nave_session_remember`
- Quando `true`: `useActivityTracker` não inicia idle timer → sessão dura 7 dias (604 800 s, TTL atual do Supabase Dashboard — **não alterar**)
- Banner na tela de login para `?session=expired`

**~~⚠️ D-01~~** — **cancelado.** O TTL de 604 800 s (7 dias) já está configurado no Supabase e é o valor aceito. Zero mudança de infra.

**Pts:** 5 | **Dependências:** BL-AUTH-01

---

### BL-AUTH-03 · STORY-07a — Hook `useActivityTracker` (idle timer de 30 min)

**Como** usuário sem "lembrar de mim" ativo,
**quero** que minha sessão se renove enquanto estou usando o app,
**e** que expire após 30 min de inatividade com aviso claro.

**O que implementar:**

- Criar `apps/web/hooks/use-activity-tracker.ts`
  - Eventos monitorados: `click`, `keypress`, `scroll`, `touchstart`, `wheel`
  - Mudança de rota: `router.events.on('routeChangeComplete', resetTimer)`
  - Ao expirar: `supabase.auth.signOut()` → redirect `/login?session=expired`
  - Toast: "Sua sessão expirou por inatividade. Faça login novamente."
- Montar no layout raiz (`apps/web/app/layout.tsx`) — apenas quando `persistSession: false`
- Renovação silenciosa: quando o access token está a < 5 min de expirar E há atividade, chamar `supabase.auth.refreshSession()`
- Coexistência com `useAuthWatcher` (não substituir — complementar)

**Pts:** 8 | **Dependências:** BL-AUTH-01, BL-AUTH-02
**Critérios:** CA-12, CA-13, CA-14 em SPEC-20260524-001

---

## P0 — Cadastro de Conta (SPEC-20260524-002)

> Estes itens implementam o fluxo de cadastro descrito em SPEC-20260524-002.

---

### BL-AUTH-11 · STORY-01 — Cadastro com dados válidos

**Como** motorista autônomo,
**quero** preencher nome, email e senha e criar minha conta,
**para** ter acesso ao Nave.

**O que implementar:**

- Formulário em `apps/web/components/forms/register-form.tsx` com os 3 campos
- Email normalizado para lowercase via `.transform()` no schema Zod (CA-06)
- Botão exibe "Criando Conta..." + `disabled` durante `useTransition` (CA-06)
- Redirect para `/dashboard` após signup bem-sucedido

**Pts:** 3 | **Dependências:** BL-AUTH-12

---

### BL-AUTH-12 · STORY-02 — Validação de senha com nova regra

**Como** motorista,
**quero** receber mensagens inline ao digitar senha que não atende os requisitos,
**para** saber exatamente o que corrigir.

**O que implementar:**

- Regra atualizada: mín. 6 chars, 1 letra (qualquer case), 1 número, 1 caractere especial
- Substitui regra anterior (8 chars + maiúscula) em `SPEC-20260524-001 §4.1`
- `registerInputSchema` e `resetPasswordInputSchema` em `packages/validators/src/auth.schema.ts`
- Mensagens: "Mínimo 6 caracteres" / "Precisa de 1 letra" / "Precisa de 1 número" / "Precisa de 1 caractere especial"
- Placeholders de `/register` e `/reset-password` atualizados

**Pts:** 2 | **Dependências:** nenhuma

---

### BL-AUTH-13 · STORY-03 — Email já cadastrado

**Como** motorista,
**quero** ser informado quando meu email já tem conta,
**para** ir direto ao login ou recuperar minha senha.

**O que implementar:**

- Bloco de aviso amarelo (`bg-warning-pastel`) exibido ao detectar status 409 ou msg "already registered"
- Exibe o email digitado + botão "Entrar com este email" (→ `/login`) + botão "Recuperar senha" (→ `/recover-password?email={encoded}`)
- Botão "Cadastrar" retorna ao estado normal após o aviso

**Pts:** 3 | **Dependências:** BL-AUTH-11
**Nota:** supercede BL-AUTH-10

---

### BL-AUTH-14 · STORY-04 — Erros de sistema no cadastro

**Como** motorista,
**quero** ver mensagem clara quando o servidor falha durante o cadastro,
**para** saber que o problema não é meu e poder retentar.

**O que implementar:**

- Bloco vermelho (`bg-destructive-pastel`) exibido para erros não-409
- Mensagem: valor de `error.message` retornado pelo Supabase (ou fallback "Falha ao criar conta. Tente novamente.")
- Dados do formulário preservados após erro (sem `reset()`) (CA-09)
- Bloco vermelho descartado (`setServerError(null)`) ao iniciar nova tentativa (CA-10)

**Pts:** 2 | **Dependências:** BL-AUTH-11

---

## P1 — Segurança e resiliência

---

### BL-AUTH-04 · STORY-03 — Bloqueio por 5 tentativas inválidas

**Como** sistema de segurança,
**quero** bloquear temporariamente um e-mail após 5 tentativas inválidas,
**para** mitigar ataques de bruta force por credencial.

**O que implementar:**

- Backend: contador de tentativas por e-mail em cache (Redis ou tabela Supabase `login_attempts`)
  - Incrementar em cada `INVALID_CREDENTIALS`
  - Zerar em login bem-sucedido ou após 15 min
  - Retornar `HTTP 429` com `Retry-After` ao atingir 5
- Frontend: ao receber o 429 específico de bloqueio, exibir countdown regressivo e desabilitar botão
- Diferenciar do rate limit por IP (STORY-03 é por e-mail, RF-SEC-004 é por IP — ambos coexistem)

**Pts:** 5 | **Dependências:** nenhuma (independente de BL-AUTH-01)
**Critérios:** CA-07 em SPEC-20260524-001

---

### BL-AUTH-05 · STORY-08 — Resiliência a falhas do Supabase Auth

**Como** usuário que acessa o app durante instabilidade,
**quero** receber uma mensagem clara sobre o problema,
**para** entender que não é um erro meu.

**O que implementar:**

- Frontend: timeout de 10 s nas requisições de auth; ao atingir, cancelar e exibir mensagem
- Frontend: verificar `navigator.onLine` antes de disparar login — exibir "Sem conexão" sem requisição
- Verificar que `HttpExceptionFilter` (a ser criado conforme SPEC-001) retorna mensagem genérica ao cliente para 5xx

**Pts:** 5 | **Dependências:** nenhuma
**Critérios:** CA-17, CA-18 em SPEC-20260524-001

---

### BL-AUTH-06 · STORY-04 (delta) — Reenvio de e-mail de recuperação com cooldown

**Como** usuário que não recebeu o e-mail de redefinição,
**quero** poder reenviar com um cooldown visual,
**para** tentar novamente sem abusar do serviço.

**O que implementar:**

- Botão "Reenviar e-mail" em `/recover-password` com countdown de 60 s
- Botão fica desabilitado durante o countdown e re-habilitado ao terminar
- Rate limit de 3 req/15min a ser implementado no backend (SPEC-001) — UX e backend caminham juntos

**Pts:** 2 | **Dependências:** nenhuma
**Critérios:** STORY-04 Cenário 4 em SPEC-20260524-001

---

### BL-AUTH-07 · STORY-05 (delta) — UX de link expirado e link já utilizado

**Como** usuário que acessa um link de redefinição inválido,
**quero** ver uma mensagem clara com ação de recuperação,
**para** não ficar preso em uma página de erro sem saída.

**O que implementar:**

- Página `/reset-password`: tratar os erros retornados pelo Supabase no callback
  - Token expirado → "Link expirado. [Solicitar novo link →]"
  - Token já utilizado → "Este link já foi utilizado e não é mais válido."
- Botão de novo link aponta diretamente para `/recover-password`

**Pts:** 2 | **Dependências:** nenhuma
**Critérios:** STORY-05 Cenários 2 e 3 em SPEC-20260524-001

---

## P2 — Qualidade e UX

---

### BL-AUTH-08 · STORY-07b — `<FormDraftGuard>` (preservação de formulário)

**Como** usuário preenchendo um formulário longo,
**quero** que os dados não se percam se minha sessão expirar por inatividade,
**para** não precisar preencher tudo de novo após o re-login.

**O que implementar:**

- Criar `apps/web/components/form-draft-guard.tsx`
  - Ao detectar iminência de logout (evento do `useActivityTracker`): salvar estado em `sessionStorage` com chave `nave_form_draft_[route_path]`
  - Ao montar o formulário após redirect de re-login: restaurar estado se chave existir
  - Banner discreto: "Seus dados foram restaurados do rascunho anterior"
  - Limpar `sessionStorage` após submit bem-sucedido
- Aplicar em: `/expenses/new`, `/maintenance/new`, `/vehicles/new`

**Pts:** 5 | **🔗 Dependências:** BL-AUTH-03
**Critérios:** CA-15, CA-16 em SPEC-20260524-001

---

### BL-AUTH-09 · STORY-REG-02 — Toggle show/hide de senha (acessibilidade)

**Como** usuário cadastrando ou fazendo login,
**quero** alternar a visibilidade do campo de senha,
**para** verificar o que digitei sem erros.

**O que implementar:**

- Ícone de olho nos campos de senha em `/register` e `/login`
- `aria-label` alternando entre "Mostrar senha" e "Ocultar senha"
- Aplicar também em `/reset-password` (campo nova senha e confirmação)

**Pts:** 2 | **Dependências:** nenhuma
**Critérios:** CA-03, STORY-REG-02 Cenário 2 em SPEC-20260524-001

---

### BL-AUTH-10 · STORY-REG-01 (delta) — Tratamento de 409 no frontend

**Como** usuário que tenta se registrar com e-mail já cadastrado,
**quero** ver uma mensagem que me direcione para login ou recuperação de senha,
**para** não ficar confuso com um erro genérico.

> **Nota:** supercedido por BL-AUTH-13, que implementa a mesma funcionalidade com experiência aprimorada (bloco de aviso com botões direcionados). Ao implementar BL-AUTH-13, este item pode ser fechado.

**Pts:** 1 | **Dependências:** nenhuma
**Critérios:** CA-02, STORY-REG-01 Cenário 2 em SPEC-20260524-001

---

## Resumo para planejamento

| ID         | Story                                    | Pts        | Prioridade | Depende de        | Status |
| ---------- | ---------------------------------------- | ---------- | ---------- | ----------------- | ------ |
| BL-AUTH-01 | Dois modos de persistência de sessão     | 3          | P0         | —                 | ⏳     |
| BL-AUTH-02 | Sessão de 7 dias com "lembrar de mim"    | 5          | P0         | BL-AUTH-01        | ⏳     |
| BL-AUTH-03 | Hook `useActivityTracker` (idle 30 min)  | 8          | P0         | BL-AUTH-01, 02    | ⏳     |
| BL-AUTH-11 | Cadastro com dados válidos               | 3          | P0         | BL-AUTH-12        | ⏳     |
| BL-AUTH-12 | Validação de senha — nova regra          | 2          | P0         | —                 | ⏳     |
| BL-AUTH-04 | Bloqueio por 5 tentativas inválidas      | 5          | P1         | —                 | ⏳     |
| BL-AUTH-05 | Resiliência a falhas do Supabase Auth    | 5          | P1         | —                 | ⏳     |
| BL-AUTH-06 | Reenvio de e-mail com cooldown (delta)   | 2          | P1         | —                 | ⏳     |
| BL-AUTH-07 | UX de link expirado/utilizado (delta)    | 2          | P1         | —                 | ⏳     |
| BL-AUTH-13 | Email já cadastrado — bloco de aviso     | 3          | P1         | BL-AUTH-11        | ⏳     |
| BL-AUTH-14 | Erros de sistema no cadastro             | 2          | P1         | BL-AUTH-11        | ⏳     |
| BL-AUTH-08 | `<FormDraftGuard>`                       | 5          | P2         | BL-AUTH-03        | ⏳     |
| BL-AUTH-09 | Toggle show/hide de senha                | 2          | P2         | —                 | ⏳     |
| BL-AUTH-10 | Tratamento de 409 no frontend (delta)    | 1          | P2         | —                 | ⏳ (supercedido por BL-AUTH-13) |
| **Total**  |                                          | **48 pts** |            |                   |        |

---

## Configuração de infra

> **Supabase Dashboard — nenhuma alteração necessária.**
> O access token está configurado para **604 800 s (7 dias)**, que é o TTL aceito para o modo "lembrar de mim".
> O D-01 foi cancelado após confirmação via screenshot do painel.

---

## Fora deste backlog

| Item                              | Motivo                          |
| --------------------------------- | ------------------------------- |
| Exclusão de conta / LGPD          | Gerenciado em SPEC-20260521-004 |
| Confirmação de e-mail no registro | Decisão aberta D-02 — adiada    |
| MFA / 2FA                         | Fase 2                          |
| Login social (Google, Apple)      | Fase 2                          |
| Invalidação multi-device          | Fase 2                          |
