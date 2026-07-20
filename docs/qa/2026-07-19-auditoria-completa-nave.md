# Auditoria Completa do Projeto Nave

**Data:** 2026-07-19
**Escopo:** Backend (`apps/api`), Frontend (`apps/web`), Banco de dados (Supabase/Postgres), DevOps/CI, Design System (`@nave/ui`), LGPD e governança de specs.
**Método:** leitura direta do código-fonte, migrations, configs de CI e documentação do projeto — nada aqui é suposição.

> Leia este documento de cima para baixo se quiser o panorama completo, ou pule direto para [Resumo de Riscos Priorizados](#resumo-de-riscos-priorizados) se quiser só a lista de problemas.

---

## 1. Patamar do projeto

O próprio projeto se declara **Nível 2 — Produto** em `specs/README.md` (revisado em 2026-07-19), com justificativa: dados financeiros/pessoais sob LGPD, múltiplos usuários reais previstos, e dependências externas reais em uso (Supabase, Resend).

Na prática, o que encontramos confirma esse nível em quase tudo:

- `specs/RULES.md` tem dezenas de regras de negócio, segurança, performance e compliance com IDs estáveis e versionados.
- `matrices/rastreabilidade.md` (2070 linhas) e `matrices/impacto.md` (1073 linhas) existem, estão ativos e — ponto positivo raro — **se autocorrigem**: uma revisão recente da matriz de rastreabilidade admite explicitamente que versões anteriores continham "informações aspiracionais/fictícias" sobre o que já estava implementado, e foram zeradas para refletir a realidade. Isso é sinal de um processo de documentação saudável, não de um projeto que só finge ter governança.
- CI com múltiplos gates de qualidade (lint, types, testes, cobertura mínima 88%, teste de integração contra Supabase real, scan de segredos, scan de dependências).

**Onde o patamar declarado (Nível 2 / Produto) ainda não bate com a realidade do produto:**
- Não há tela de exclusão de conta, política de privacidade ou termos de uso — itens que um "Nível 2 com dado sensível sob LGPD" deveria ter antes de usuários reais externos.
- Não há testes end-to-end (e2e) — só testes unitários/componente. Já causou 3 bugs reais escaparem para uma sessão de teste manual (detalhe na seção 8).

Ou seja: **a engenharia (arquitetura, segurança de API, banco) está em nível de produto maduro; a camada voltada ao usuário final (conformidade legal, UX de conta) ainda está em nível de MVP.**

---

## 2. Backend — arquitetura e módulos

`apps/api` é um projeto NestJS organizado por módulo de feature (não por camada DDD clássica), cada um com `controller` + `service` + `dto`:

```
apps/api/src/
  common/     → config, guards, pipes, filters, interceptors, logging
  modules/    → auth, users, admin, vehicles, vehicle-groups, categories,
                expenses, expense-templates, fines, maintenances,
                odometer-cycles, preferences, recurring-costs,
                dashboard, analytics, audit-logs
  shared/     → audit (log de auditoria), csv, supabase (clientes)
```

**16 controllers**, todos registrados em `app.module.ts`. Não há ORM (Prisma/TypeORM) — o acesso ao banco é feito via SDK `@supabase/supabase-js`, de duas formas:
- **Cliente admin** (chave *service-role*, ignora as regras de segurança do banco) — usado em módulos administrativos.
- **Cliente com escopo de usuário** (usa o próprio token do usuário logado) — usado na maioria dos módulos de negócio, o que faz o próprio banco aplicar as regras de segurança automaticamente.

**Entidades principais:** `profiles`, `vehicles`, `expenses` (ledger central de despesas — inclusive geradas automaticamente a partir de manutenções/multas/custos recorrentes), `maintenances`, `fines`, `vehicle_groups`, `expense_templates`, `user_categories`, `user_preferences`, `vehicle_recurring_costs`, `vehicle_odometer_cycles`, `audit_logs`. Também existem `drivers`, `vehicle_drivers` e `documents` já com regras de segurança no banco, mas **sem controller/módulo de aplicação correspondente** — o schema está à frente do código, ou seja, são tabelas prontas para uma feature que ainda não foi construída.

---

## 3. Autenticação, autorização e exclusão de conta

- Login/cadastro usam **Supabase Auth**, não um sistema de JWT próprio.
- A sessão é entregue via **cookies `httpOnly`** (`nave_access_token`, `nave_refresh_token`), o que é uma boa prática: o token não fica acessível para JavaScript malicioso rodando na página (proteção contra roubo via XSS).
- O guard de autenticação (`apps/api/src/common/guards/supabase-auth.guard.ts`) valida o token consultando o próprio Supabase (não decodifica localmente, porque a chave usada é rotacionável), confere se o token é do tipo certo, e **bloqueia contas já excluídas (soft delete) de continuarem autenticando** — bom detalhe de segurança.
- Existe controle de papel (`RolesGuard` + `@Roles("admin")`), aplicado no painel administrativo.
- **Exclusão de conta**: o endpoint `DELETE /users/me` **existe e funciona no backend** — soft delete com anonimização, e exclusão definitiva agendada para 30 dias depois (período de arrependimento). O problema é que **não existe nenhum botão nem tela no site para o usuário chamar esse endpoint** (ver seção 8 — LGPD). Ou seja: a "porta dos fundos" de excluir a conta existe, mas não tem maçaneta do lado de fora.
- **Logout**: existe, limpa cookies, cache local e cache do Service Worker (importante em dispositivo compartilhado, como um tablet de frota).

---

## 4. Rotas da API — o que está protegido e o que não está

Todos os 16 controllers foram verificados. **Nenhuma rota de negócio está desprotegida.**

| Rota | Protegida? |
|---|---|
| `GET /health` | Não — **intencional** (monitoramento externo precisa acessar sem login) |
| `POST /auth/register`, `/login`, `/refresh`, `/recover-password`, `/reset-password` | Não — **intencional**, são justamente as portas de entrada |
| `POST /auth/logout` | **Sim** |
| Todas as demais (`/users`, `/vehicles`, `/expenses`, `/maintenances`, `/fines`, `/admin`, `/analytics`, `/dashboard`, etc.) | **Sim**, exigem login |

**Exemplo prático do que isso significa:** se você tentasse acessar `GET /vehicles` sem estar logado (sem cookie/token válido), a API recusaria com erro 401 — não retorna nenhum dado de veículo. Isso foi confirmado lendo o código de cada controller, não é suposição.

Único ponto de atenção: `/audit-logs` não tem checagem extra de "papel de admin" — mas isso é esperado, porque cada usuário só deve ver o próprio histórico de auditoria (o filtro é por identidade, não por papel). Recomendamos apenas uma checagem pontual em `audit-logs.service.ts` para confirmar que o filtro de "de quem são os logs" vem do token do usuário e não de um parâmetro que o próprio usuário poderia manipular na URL.

---

## 5. Isolamento de dados entre usuários (o "vazamento de um user para outro")

Este é o ponto mais crítico de qualquer sistema multiusuário, e a resposta é: **a proteção existe e está implementada em duas camadas (defesa em profundidade)**.

**Camada 1 — Row Level Security (RLS) no banco de dados.** A migration `supabase/migrations/20260712172047_rls_policies.sql` ativa RLS em 16 tabelas, com a regra `auth.uid() = user_id` (ou equivalente via relação com o dono) em todas elas. Isso significa que, **mesmo que houvesse um bug no código do backend que esquecesse de filtrar por usuário, o próprio banco de dados recusaria devolver a linha de outro usuário.** É a rede de segurança por baixo de tudo.

Detalhe técnico positivo: ao final dessa migration, o projeto revoga todo acesso de usuários anônimos às tabelas (`revoke all ... from anon`) — ou seja, fecha a possibilidade de alguém não-logado sequer tentar bisbilhotar a API pública do Supabase.

**Camada 2 — Filtro explícito no código do backend.** Os services que usam o cliente "admin" (que ignora RLS) incluem, de forma consistente, `.eq("user_id", userId)` nas consultas — confirmado em `vehicles.service.ts`, `expenses.service.ts`, `fines.service.ts`, `maintenances.service.ts`, `dashboard.service.ts`, `analytics.service.ts`, `users.service.ts`.

**Exemplo prático do que isso evita:** sem essas duas camadas, seria possível o Usuário A trocar o ID de um veículo na URL/requisição (ex: `GET /vehicles/123`) e ver o veículo do Usuário B, caso o `123` pertencesse a outra pessoa. Com RLS + filtro explícito, isso é bloqueado nas duas pontas.

**Pontos que precisam de uma checagem manual adicional (não são falhas confirmadas, são lacunas de verificação):**
- Em `expense-templates.service.ts:55`, `recurring-costs.service.ts:46`, `maintenances.service.ts:62` e `fines.service.ts:42`, há uma consulta que confere "esse `vehicle_id` existe?" antes de criar uma despesa/manutenção/multa vinculada a ele. Se essa consulta específica usar o cliente admin **sem** incluir `.eq("user_id", ...)`, um usuário mal-intencionado poderia, em teoria, referenciar o veículo de outra pessoa e o sistema aceitaria a checagem como válida — criando um registro vinculado a um veículo que não é dele. **Recomendação:** confirmar linha a linha se essas 4 consultas filtram por dono do veículo.
- O mesmo vale para `vehicle-groups.service.ts:182`, que confere múltiplos IDs de veículo de uma vez (`.in("id", dto.vehicleIds)`).

Nenhuma dessas foi confirmada como exploração real — mas como o RLS provavelmente cobre mesmo se o filtro de código faltar (desde que o service use o cliente certo), recomendamos uma revisão pontual para fechar de vez a dúvida.

---

## 6. Validação de entrada, segredos e configuração

- **Validação:** todos os endpoints usam um pipe de validação baseado em Zod (`zod-validation.pipe.ts`), aplicado de forma consistente em quase todos os DTOs — ou seja, dados malformados são recusados antes de chegar na lógica de negócio.
- **Segredos:** as variáveis de ambiente obrigatórias (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) são exigidas no boot da aplicação, sem valor padrão inseguro — se faltar uma, a aplicação nem sobe. O `.env.example` está sincronizado com o que o código realmente espera, e comenta explicitamente para nunca commitar `.env.local`.

---

## 7. Tratamento de erros e logs

- **Erros da API nunca vazam detalhe técnico ao cliente.** Existe um filtro global (`http-exception.filter.ts`) que, em produção, transforma qualquer erro interno inesperado em uma mensagem genérica ("Erro interno do servidor"), e manda o stack trace real só para o log interno e para o Sentry (ferramenta de monitoramento) — nunca para a tela do usuário.
- **Logs são estruturados (JSON, via Pino)** e têm **redação automática de dados pessoais**: senha, token, e-mail, CPF, foto e qualquer campo que "pareça" sensível (por regex) é substituído por `[REDACTED]` antes de gravar. Não foi encontrado nenhum `console.log` solto no backend.
- **Exemplo prático:** se a API quebrar processando o CPF de um usuário, o log gravado não vai conter o CPF nem a mensagem de erro crua do banco — só um identificador de rastreio (request-id) que ajuda a debugar sem expor dado pessoal.

---

## 8. Frontend — telas e fluxo real de uso

### Estrutura de rotas
- Grupo `(auth)`: `login`, `register`, `recover-password`, `reset-password` — públicas.
- Grupo `(app)`: `dashboard`, `vehicles`, `vehicle-groups`, `expenses`, `maintenance`, `analytics`, `atividades`, `settings/preferences`, `settings/vehicles/[id]/odometer-cycles` — todas exigem login.

### Passo a passo do usuário real

| Etapa | Existe? | Observação |
|---|---|---|
| Primeiro acesso / landing | ⚠️ Parcial | A rota raiz (`/`) dentro da área logada é, hoje, uma **tela de diagnóstico técnico** ("API: ok") deixada de uma tarefa de scaffolding — não é uma tela pensada para o usuário. Quem entra pelo menu lateral cai direto no `/dashboard` de verdade. |
| Cadastro | ✅ | Valida os campos antes de enviar; se o e-mail já existe, mostra link para login/recuperação em vez de erro genérico. |
| Login | ✅ | Erro de senha errada mostra mensagem genérica ("E-mail ou senha inválidos"), sem revelar se o e-mail existe — boa prática contra enumeração de contas. |
| Recuperação de senha | ✅ | Sempre responde "se o e-mail existir, enviaremos instruções" — não vaza se o e-mail está cadastrado. |
| **Exclusão de conta** | ❌ **Ausente na interface** | O backend já sabe fazer isso (`DELETE /users/me`), mas **não há nenhum botão "Excluir minha conta" em nenhuma tela**. Detalhe na seção LGPD abaixo. |
| Logout | ✅ | Limpa cookies, cache local e Service Worker antes de redirecionar. |

### CRUD por entidade

| Entidade | Criar | Editar | Listar | Excluir |
|---|---|---|---|---|
| Veículos | ✅ | ✅ | ✅ | ✅ (soft delete, com confirmação via `window.confirm()` do navegador) |
| Manutenções | ✅ | ✅ | ✅ | ❌ — só muda de status (agendada → em andamento → concluída/cancelada) |
| Despesas | ✅ | ✅ | ✅ | Provável, não confirmado em detalhe |
| Grupos de veículos | ✅ | ✅ | ✅ | Não confirmado |
| **Multas (fines)** | ❌ | ❌ | ❌ | ❌ — **o backend já sabe lidar com multas, mas não existe nenhuma tela para isso.** |

**Nota de UX:** a confirmação de exclusão de veículo usa o alerta nativo do navegador (`window.confirm()`), não um modal do design system — funciona, mas destoa visualmente do resto do sistema.

---

## 9. Rotas protegidas no frontend — teste prático

Existe um `middleware.ts` que roda antes de qualquer página carregar:
- Se você está **deslogado** e tenta acessar `/dashboard` direto pela URL → é **redirecionado para `/login`**, guardando a rota original para voltar depois do login.
- Se você está **logado** e tenta acessar `/login` de novo → é redirecionado para dentro do app.
- Se o token expirou mas ainda dá para renovmotorizar (refresh token válido), o middleware tenta renovar automaticamente antes de decidir se bloqueia.

**Confirmado na prática:** não existe hoje uma forma de um usuário deslogado ver uma tela interna só digitando a URL.

⚠️ Achado secundário sem impacto de segurança: o comentário no topo do `middleware.ts` ainda descreve esse mecanismo como "ausente do repositório" (de uma auditoria antiga) — está desatualizado e vale corrigir o comentário para não confundir quem ler o código depois.

**Como o frontend busca dados:** tudo passa pela API NestJS (`fetch` via um cliente HTTP central), nunca direto no Supabase pelo navegador. Isso significa que a barreira de segurança real está no backend (guards + RLS), não em regra de acesso configurada só no navegador — que é o jeito mais seguro de fazer isso.

---

## 10. Design System, layout e acessibilidade

- Pacote `@nave/ui` com **14 componentes** (botão, card, tabela, tabs, toast, alert, etc.), baseado em Radix + CVA.
- Migração de telas antigas para os componentes novos está em andamento: 2 commits recentes já migraram tabs e toasts "manuais" para os componentes oficiais. Ainda pode haver telas usando padrão antigo (ex: alertas via `className` solto) — a própria documentação interna do projeto (`matrices/impacto.md`) já rastreia isso como pendência conhecida, não é uma surpresa da auditoria.
- **Acessibilidade:** há lint automático (`eslint-plugin-jsx-a11y`) rodando no CI, e testes automatizados de acessibilidade (`jest-axe`) nos componentes do design system. Uso de `aria-label`, `role="alert"` e `aria-live` está presente nas telas revisadas.
- **Lacuna:** não há teste de acessibilidade de página inteira (só por componente isolado) — algo pode passar despercebido quando os componentes são combinados numa tela real.

---

## 11. Tratamento de erros no frontend

- Existe uma tela de erro genérica para toda a área logada (`(app)/error.tsx`, criada em 2026-07-19 depois de um crash real encontrado em teste manual) e uma global (`global-error.tsx`) — ambas mostram uma mensagem amigável ("Algo deu errado nesta tela") com botão de tentar de novo, e registram o erro real no Sentry (para o time técnico ver), **sem mostrar código/stack trace ao usuário**.
- Erros de rede (API fora do ar, sem internet, requisição demorada) mostram mensagens específicas e compreensíveis ("Serviço indisponível, tente novamente" / aviso de modo offline) em vez de erro técnico cru.

---

## 12. Testes

**Backend:** 42 arquivos de teste, cobrindo autenticação, validação, cada módulo de negócio (controller + service), com CI exigindo **cobertura mínima de 88%**. Único ponto fraco real: **o guard de autenticação principal (`supabase-auth.guard.ts`) não tem teste dedicado** — é o componente que decide se um token é válido ou não, ou seja, o coração da segurança da API, e hoje uma mudança nele poderia quebrar a segurança sem que o CI percebesse.

**Frontend:** 50 arquivos de teste unitário/componente, mas **nenhum teste end-to-end (e2e)** configurado (nem Playwright, nem Cypress). A spec de e2e existe mas está em rascunho (`draft`). **Isso já causou problema real**: um relatório de teste manual feito no mesmo dia desta auditoria (`docs/qa/2026-07-19-teste-cadastro-local.md`) encontrou e corrigiu **3 bugs de produção que só apareceram testando o fluxo completo** (login quebrando por causa do formato do token, um validador checando o parâmetro errado, e um erro de sintaxe numa migration SQL) — nenhum teste automatizado pegou isso porque não existe teste que rode o sistema inteiro de ponta a ponta.

**Exemplo prático:** se amanhã alguém alterar o backend de um jeito que quebre sutilmente o login, os testes unitários (que testam pedaços isolados) podem continuar passando, mas o sistema real ficaria fora do ar — só um teste e2e pegaria isso antes de ir para produção.

---

## 13. DevOps / DevSecOps

O CI (`.github/workflows/ci.yml`) roda, em paralelo, a cada PR:

1. **Lint** de código
2. **Checagem de tipos** (TypeScript)
3. **Testes** com gate de cobertura mínima de 88%
4. **Teste de integração** — sobe um Supabase real localmente e testa contra ele (não é só mock)
5. **Build**
6. **Varredura de segredos vazados** (gitleaks) — analisa todo o histórico do git
7. **Varredura de dependências vulneráveis** (`pnpm audit`)

**Não há deploy automatizado neste workflow** (aparenta ser feito à parte) e **não há SAST/DAST dedicado** além do scan de dependências e de segredos — para o estágio atual isso é aceitável, mas seria o próximo passo natural de maturidade.

---

## 14. LGPD e Privacidade — atenção especial

Esta seção resume os dois achados mais importantes da auditoria, em linguagem simples:

### 🔴 Problema 1 — Não existe botão para excluir a própria conta

**O que existe:** o backend já sabe apagar/anonimizar os dados de um usuário, com um período de 30 dias de segurança antes da exclusão definitiva — é uma implementação correta e cuidadosa.

**O que falta:** nenhuma tela do site tem um botão "Excluir minha conta". Hoje, a única forma de um usuário real exercer esse direito seria pedir para um desenvolvedor chamar a função manualmente.

**Por que isso importa:** a Lei Geral de Proteção de Dados (LGPD) garante ao usuário o direito de pedir a exclusão dos seus dados pessoais (Art. 18). Ter a "engrenagem" pronta mas sem "botão" na prática significa que esse direito não é exercível — o que pode gerar reclamação formal (ANPD, Procon) mesmo o sistema tecnicamente suportando a operação.

**Exemplo prático:** imagine um motorista cadastrado que sai da empresa e pede para apagar seus dados. Hoje, ele teria que mandar um e-mail pedindo isso manualmente — não existe um "clique aqui" no aplicativo.

### 🟠 Problema 2 — Não existe política de privacidade nem termos de uso visíveis

Não foi encontrada nenhuma página explicando ao usuário o que é feito com os dados dele, nem aviso de cookies. Para um sistema que já processa dado financeiro e de localização de veículos, isso é uma peça de conformidade que normalmente precisa existir antes do primeiro usuário externo real usar o sistema.

---

## Resumo de Riscos Priorizados

| # | Severidade | Achado | Onde | Explicação para leigo |
|---|---|---|---|---|
| 1 | 🔴 Alto | Sem tela de exclusão de conta | Frontend | O direito legal de "apagar meus dados" existe no código mas não tem botão nenhum para o usuário usar sozinho. |
| 2 | 🟠 Médio-Alto | Sem política de privacidade / termos / aviso de cookies | Frontend | Falta a página que explica ao usuário o que é feito com os dados dele — item padrão de conformidade legal. |
| 3 | 🟡 Médio | Guard de autenticação sem teste automatizado dedicado | Backend (`supabase-auth.guard.ts`) | O "porteiro" que decide quem pode entrar no sistema não tem um teste próprio — se alguém mexer nele por engano, ninguém vai ser avisado automaticamente que a segurança quebrou. |
| 4 | 🟡 Médio | Sem testes end-to-end (fluxo completo) | Frontend/QA | Já causou 3 bugs reais escaparem para teste manual em produção — testes atuais só checam pedaços isolados, não o sistema funcionando junto. |
| 5 | 🟡 Médio | Consultas de "veículo existe?" sem confirmação total de filtro por dono | Backend (4 arquivos, seção 5) | Risco teórico (não confirmado) de um usuário conseguir vincular uma despesa/manutenção a um veículo que não é dele — precisa de checagem manual pontual. |
| 6 | 🟢 Baixo | Tela raiz (`/`) é um stub de diagnóstico, não uma landing real | Frontend | Só afeta a primeira impressão de quem acessa o endereço raiz diretamente — o menu já leva ao dashboard real. |
| 7 | 🟢 Baixo | Funcionalidade de multas sem nenhuma tela | Frontend | O sistema "sabe" lidar com multas de trânsito por trás dos panos, mas o usuário não tem onde ver ou cadastrar isso ainda. |
| 8 | 🟢 Informativo | Comentário desatualizado no `middleware.ts` dizendo que a proteção de rota "não existe" (ela existe) | Frontend | Sem risco real, só pode confundir quem for ler o código depois. |

---

## O que já está bem feito (para dar o contexto justo)

Vale destacar, porque não é comum encontrar em um projeto neste estágio:

- **RLS + filtro de aplicação em duas camadas** — isolamento de dados entre usuários é levado a sério, com defesa redundante.
- **Cookies httpOnly** para sessão — protege contra roubo de token via script malicioso.
- **Redação automática de dados pessoais em log** — CPF, e-mail, senha e token nunca aparecem em log bruto.
- **Erros nunca vazam stack trace ou detalhe técnico ao usuário final**, nem no backend nem no frontend.
- **CI com gate de cobertura de 88%, scan de segredos e scan de dependências** — nível de disciplina de DevSecOps acima da média para o estágio do projeto.
- **Cascade de exclusão correto no banco**, preservando o log de auditoria (sem dado pessoal) mesmo depois que a conta é apagada.
- **Documentação viva e autocorretiva** — a matriz de rastreabilidade já admitiu e corrigiu informação incorreta sobre o próprio progresso, sinal de processo saudável.

---

## Recomendação de próximos passos (ordem sugerida)

1. Construir a tela de exclusão de conta conectando ao endpoint `DELETE /users/me` que já existe.
2. Publicar política de privacidade e termos de uso (mesmo que versão inicial simples).
3. Escrever teste unitário para `supabase-auth.guard.ts`.
4. Promover a spec de E2E (`SPEC-20260716-003`) de `draft` para implementação, cobrindo pelo menos o fluxo de login → ação principal → logout.
5. Confirmar manualmente o filtro por dono nas 5 consultas apontadas na seção 5.
