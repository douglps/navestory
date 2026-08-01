# Teste de Cadastro — Ambiente Local (2026-07-19)

> Registro do cadastro de teste feito diretamente contra a API (`localhost:3001`), cobrindo
> cada feature implementada até a Fase 8 do roadmap. Objetivo: validar que o sistema está
> funcional de ponta a ponta contra o Supabase local, e documentar o que foi criado para
> conferência manual (Studio, Mailpit, telas do app).

## Ambiente

| Item                       | Valor                                            |
| -------------------------- | ------------------------------------------------ |
| Supabase local             | `http://127.0.0.1:54321` (via `supabase start`)  |
| Studio (ver/editar dados)  | http://127.0.0.1:54323                           |
| Mailpit (e-mails de teste) | http://127.0.0.1:54324                           |
| API                        | `http://localhost:3001` (Swagger em `/api/docs`) |
| Web                        | `http://localhost:3000`                          |
| Subido via                 | `npm run lab` (`scripts/lab.mjs`)                |

## ⚠️ Bugs encontrados e corrigidos durante o teste

O ambiente **não estava funcional** antes deste teste — dois bugs bloqueavam qualquer feature
autenticada. Ambos foram corrigidos, com type-check + lint + os 334 testes de `apps/api`
verdes depois da correção (nenhum teste precisou ser alterado).

### 1. Toda rota autenticada retornava 401, mesmo com token válido

**Causa:** o Supabase CLI local atual emite JWTs assinados com chave assimétrica (`ES256`,
feature "JWT Signing Keys" do GoTrue), mas `apps/api/src/modules/auth/jwt.strategy.ts`
validava a assinatura contra o segredo estático legado `SUPABASE_JWT_SECRET` (`HS256`). Os dois
mecanismos são incompatíveis — a verificação de assinatura falhava sempre.

**Correção:** `apps/api/src/common/guards/supabase-auth.guard.ts` passou a validar o token
chamando `auth.getUser()` no próprio Supabase (robusto a qualquer algoritmo/rotação de chave),
em vez de verificar a assinatura localmente. De quebra, o guard passou a aceitar o token tanto
via cookie httpOnly (`navestory_access_token`, como o frontend real usa) quanto via header
`Authorization` — antes só aceitava header, o que também quebraria a sessão do navegador.
`apps/api/src/modules/auth/jwt.strategy.ts` ficou só com o tipo `JwtPayload` (a estratégia
passport-jwt foi removida).

### 2. Toda mutação (POST/PATCH) retornava 400 "Expected object, received string"

**Causa:** `ZodValidationPipe` era aplicado a nível de método (`@UsePipes(new
ZodValidationPipe(schema))`), o que faz o NestJS chamar `transform()` para **todos** os
parâmetros decorados do handler — não só o `@Body()`. Isso incluía `@UserId()` (decorator
customizado) e `@Param("id")`, validando uma `string` contra o schema do corpo (objeto) e
derrubando a requisição antes mesmo de chegar no `dto`. Só não foi pego pelos 334 testes
unitários porque eles chamam o controller diretamente, sem passar pelo pipeline de pipes do
Nest — só apareceu ao testar via requisição HTTP real.

**Correção (com duas voltas):** a primeira versão ignorava (retornava sem validar) qualquer
parâmetro cujo `ArgumentMetadata.type` não fosse `"body"`. Isso quebrou algo diferente: vários
endpoints de listagem (`GET /expenses`, `/fines`, `/maintenances`, `/recurring-costs`,
`/analytics/*`, `/dashboard/*`) usam o **mesmo** `ZodValidationPipe` só no parâmetro
`@Query(...)` — um padrão diferente do `@UsePipes` a nível de método, mas que o Nest reporta
com o mesmo `metadata.type = "query"` nos dois casos (não dá pra distinguir só pelo `type`). A
primeira correção passou a pular a validação do `@Query()` também, então os defaults de
paginação (`page=1`, `limit=20`) nunca eram aplicados — resultando em `.range(NaN, NaN)` no
Supabase e listas vazias com `meta.total` correto (foi assim que apareceu: "no front não há
nenhuma despesa registrada", com as 3 despesas ainda lá no banco).

A segunda tentativa passou a validar sempre `"body"` e `"query"`, mas isso reabriu o bug #1 de
um jeito mais sutil: `POST /expenses` e `PATCH /expenses/:id` também têm `@Query("strict")
strict?: string` no mesmo handler — um `type: "query"` legítimo, só que de uma **chave
específica** (`strict`), não do objeto inteiro. O schema de criação/atualização de despesa
passou a validar essa string solta contra o schema do corpo inteiro → 400 `"Required"` em toda
criação de despesa (foi assim que apareceu ao tentar popular dados de teste em lote). Correção
final: o sinal confiável não é `metadata.type`, é `metadata.data` — extrações de uma chave
específica (`@Query("strict")`, `@Param("id")`) sempre têm `data` preenchido; validação do
objeto inteiro (`@Body()`, `@Query()`/`@Query(pipe)` sem chave) sempre tem `data` vazio. Pula a
validação quando `data` está preenchido OU quando o tipo não é `"body"`/`"query"`.

**Recomendação:** esses bugs só existiam porque nenhum teste exercita o pipeline HTTP real
(guards + pipes) de ponta a ponta — reforça o gap já registrado em `important/` sobre a spec de
E2E Playwright (`specs/qa/SPEC-20260716-001`) ainda estar em `draft`. Vale priorizá-la.

### 3. Banco local desatualizado + erro de sintaxe numa migration (achado ao navegar pela UI)

Ao abrir o Header e selecionar um veículo, a tela quebrava com `TypeError: Cannot convert
undefined or null to object` em `TcoBreakdownChart` (`apps/web/src/components/charts/tco-breakdown-chart.tsx:24`).

**Causa raiz (duas camadas):**

1. O banco Supabase local estava com só as migrations até `20260713200000` aplicadas —
   faltavam 5 migrations já presentes no repositório (`20260713210000` até `20260716140000`),
   incluindo a reescrita de `calculate_vehicle_tco` (RPC) de `TABLE(...)` para `jsonb` (T6.1).
   O frontend já espera o formato novo (`{ breakdown: {...} }`); o banco local ainda servia o
   formato antigo — daí `breakdown` chegar `undefined`.
2. Ao tentar aplicar as migrations pendentes (`supabase migration up`), uma delas falhou com
   erro de sintaxe SQL real: `supabase/migrations/20260716130000_analytics_anomalies_benchmark.sql`
   usava `FILTER (WHERE ...)` sobre `(max(...) - min(...))` — `FILTER` só é válido sobre uma
   chamada de agregação isolada, nunca sobre uma expressão aritmética de duas agregações. Esse
   erro teria quebrado a aplicação da migration em **qualquer** ambiente (CI, staging,
   produção), não só no meu teste local.

**Correção:** `FILTER (WHERE ...)` removido (era redundante — `max()`/`min()` já ignoram `NULL`
nativamente) e `supabase migration up` reaplicado com sucesso, sem apagar os dados de teste já
cadastrados (`migration up` só aplica o que falta, diferente de `db reset`).

**Recomendação:** essa migration nunca tinha sido testada de ponta a ponta contra um banco real
antes — reforça o mesmo gap do achado #2 (falta de teste de integração que rode migrations
reais). Vale considerar um passo de CI que rode `supabase db reset` contra um banco limpo antes
do deploy, pegando erros de sintaxe de migration antes de chegar em produção.

### ⚠️ Nota de atenção (não é bug): cache do Service Worker "prende" respostas antigas

Depois da correção do achado #3, o mesmo erro (`Cannot convert undefined or null to object` em
`TcoBreakdownChart`) voltou a aparecer, mas só ao selecionar a Moto — não o Toro. Confirmado via
`curl` que `GET /analytics/tco/:vehicleId` já respondia certo para os dois veículos nesse
ponto. A causa não era mais um bug de código: era o **Service Worker do PWA** servindo uma
resposta antiga guardada em cache, de antes das correções.

`apps/web/src/app/sw.ts` usa `StaleWhileRevalidate` para toda leitura GET de `/api/backend/*`
(cache `navestory-api-data`, RF-08/RF-10 de `SPEC-20260712-001`) — por design, essa estratégia
**sempre** serve a resposta salva em disco instantaneamente, mesmo com internet normal, e só
atualiza em segundo plano depois. Diferente do cache HTTP comum do navegador, um hard refresh
(Ctrl+Shift+R) **não** contorna isso — o Service Worker intercepta a requisição antes dela
chegar na rede. Como a retenção é por teto de disco (30 dias, `api-cache-retention-plugin.ts`,
R-PWA-06), não por expiração por tempo, uma resposta quebrada guardada antes de um fix continua
sendo servida indefinidamente até ser despejada manualmente ou por espaço em disco.

**Correção manual necessária (uma vez, feita durante o teste):** DevTools → aba _Application_ →
_Storage_ → botão **Clear site data** → recarregar a página.

**Recomendação (não aplicada agora — decisão de design existente, `R-PWA-06`, não um bug a
corrigir sozinho):** esse comportamento é intencional para uso offline real, mas em
desenvolvimento local com mudança de contrato de API ele pode mascarar regressões já corrigidas
("achei que corrigi, mas a tela continua quebrada"). Vale avaliar, numa rodada dedicada e com
aprovação prévia, algum mecanismo de invalidação de cache por versão de contrato de API (ex:
um cache-buster de build, não TTL) — sem enfraquecer a garantia de leitura offline que é o
objetivo original da spec.

## Usuário de teste

| Campo     | Valor                                  |
| --------- | -------------------------------------- |
| Nome      | Douglas Teste                          |
| E-mail    | `teste.navestory+qa1@example.com`      |
| Senha     | `Teste123!`                            |
| `user_id` | `b69865a3-7c2f-46c2-ad6f-0a5f74d168f1` |
| Perfil    | `autonomous`                           |

Login pela tela: http://localhost:3000/login com as credenciais acima.

## O que foi cadastrado

### Veículos (`GET /vehicles`)

| Placa   | Marca/Modelo | Tipo  | Combustível | Odômetro  | `id`                                   |
| ------- | ------------ | ----- | ----------- | --------- | -------------------------------------- |
| ABC1234 | Fiat Toro    | carro | diesel_s10  | 15.000 km | `6f284a9b-590a-4d83-8d41-fc6846dc6ec9` |
| XYZ9A87 | Honda CG 160 | moto  | gasoline    | 8.000 km  | `26ca5fc7-9323-4611-ba66-31582304486f` |

### Grupo de veículos (`GET /vehicle-groups`)

- **Frota Teste** (cor `#3b82f6`) — `id` `48ed2aef-d88b-4e54-a593-2b36986c42e7`, com os 2
  veículos acima como membros (testado `PUT /vehicle-groups/:id/members`).

### Categoria personalizada (`GET /categories`)

- **Pedagio Ponte** (`value: pedagio_ponte`) — `id` `e2499a47-5aac-46b3-9c8a-44ffc2be714a`
  (recriada uma vez: a primeira tentativa corrompeu o acento por causa da codificação do
  terminal usado no teste, não é um bug do sistema — texto de teste ajustado para evitar
  acento).

### Ciclo de odômetro (`GET /vehicles/:id/odometer-cycles`)

- Veículo Fiat Toro: ciclo #2, valor inicial 15.000 km, motivo "Ciclo inicial de teste apos
  cadastro do veiculo" — `id` `135c9495-3d24-4a91-b2a1-44a7a2862c0d` (o ciclo #1 foi criado
  automaticamente ao cadastrar o veículo com odômetro preenchido).

### Despesas (`GET /expenses`)

| Categoria       | Valor     | Data       | Veículo      | Observação                                                                                                 |
| --------------- | --------- | ---------- | ------------ | ---------------------------------------------------------------------------------------------------------- |
| fuel            | R$ 250,75 | 2026-07-15 | Fiat Toro    | 40L, tanque cheio, diesel S10, posto "Posto Teste"                                                         |
| pedagio_ponte   | R$ 15,90  | 2026-07-16 | Fiat Toro    | categoria personalizada                                                                                    |
| fine (readonly) | R$ 195,23 | 2026-07-10 | Honda CG 160 | gerada automaticamente ao criar a multa (`source_type: fine`) — confirma a vinculação automática ao ledger |

### Modelo de despesa (`GET /expense-templates`)

- **Abastecimento Padrao** (Fiat Toro, categoria fuel, R$ 200,00, diesel S10, "Posto Teste") —
  `id` `892b6f12-c69e-4229-b2ef-5ab6b84f0334`.

### Manutenção (`GET /maintenances`)

- **Troca de oleo e filtro teste** (Fiat Toro), agendada para 2026-07-25, custo R$ 180,00 —
  `id` `1372f53d-7cfe-46ed-a17f-ac21793e2de1`. Testada a transição de status
  `scheduled → in_progress` via `PATCH`.

### Multa (`GET /fines`)

- **Excesso de velocidade teste** (Honda CG 160), R$ 195,23, auto de infração `AIT-000123`,
  vencimento 2026-08-10 — `id` `a162b3fd-b0d5-44b1-bd1a-8fc073cee573`. Testada a transição de
  status `pending → paid` via `PATCH` (gerou a despesa automática mencionada acima).

### Custo recorrente (`GET /recurring-costs`)

- **IPVA 2026** (Fiat Toro), R$ 890,50, vencimento 2026-09-10 — `id`
  `53e66ab3-623e-4812-a606-2c754fbfb2ed`.

### Preferências (`GET /preferences`)

- `auto_draft_enabled: true`, `vehicle_chip_fields: ["plate", "make", "model"]`.

## Lote de lançamentos aleatórios (2026-07-19, à tarde)

Depois de corrigir os bugs #2/#3, gerei mais 20 despesas aleatórias via script
(`scripts` locais de teste, não versionado) espalhadas nos últimos 60 dias, entre os 2
veículos e 7 categorias diferentes (`fuel`, `washing`, `toll`, `insurance`, `tax`, `parking`,
`other`), com valores entre R$ 15 e R$ 400. As de categoria `fuel` incrementam o odômetro do
veículo e preenchem litros/posto, como uma despesa de combustível real. 20/20 criadas com
sucesso — banco de despesas do usuário de teste foi de 4 para **24 despesas**.

| Data       | Categoria     | Valor     | Veículo      |
| ---------- | ------------- | --------- | ------------ |
| 2026-05-21 | parking       | R$ 196,35 | Honda CG 160 |
| 2026-05-24 | washing       | R$ 94,75  | Honda CG 160 |
| 2026-05-25 | other         | R$ 43,75  | Fiat Toro    |
| 2026-05-26 | washing       | R$ 287,98 | Fiat Toro    |
| 2026-05-29 | other         | R$ 240,54 | Honda CG 160 |
| 2026-06-03 | other         | R$ 56,75  | Honda CG 160 |
| 2026-06-06 | other         | R$ 205,01 | Fiat Toro    |
| 2026-06-06 | other         | R$ 335,50 | Fiat Toro    |
| 2026-06-08 | insurance     | R$ 313,62 | Fiat Toro    |
| 2026-06-10 | fuel          | R$ 357,32 | Fiat Toro    |
| 2026-06-13 | fuel          | R$ 73,99  | Honda CG 160 |
| 2026-06-15 | fuel          | R$ 111,21 | Honda CG 160 |
| 2026-06-17 | other         | R$ 66,57  | Fiat Toro    |
| 2026-06-21 | washing       | R$ 214,31 | Fiat Toro    |
| 2026-06-22 | tax           | R$ 240,35 | Honda CG 160 |
| 2026-07-03 | parking       | R$ 322,99 | Honda CG 160 |
| 2026-07-05 | tax           | R$ 174,05 | Fiat Toro    |
| 2026-07-08 | pedagio_ponte | R$ 290,82 | Fiat Toro    |
| 2026-07-10 | washing       | R$ 251,91 | Fiat Toro    |
| 2026-07-15 | insurance     | R$ 156,29 | Fiat Toro    |

Todas com descrição `"Lancamento teste seed #N (categoria)"` para ficar fácil de filtrar/apagar
depois, se quiser. Confira em `/expenses` na tela ou no Studio (tabela `expenses`,
`description LIKE 'Lancamento teste seed%'`).

## Endpoints agregados conferidos (leitura)

| Endpoint                        | Resultado                                                       |
| ------------------------------- | --------------------------------------------------------------- |
| `GET /dashboard/fleet-kpis`     | 1 manutenção urgente, próxima manutenção 2026-07-25 (Fiat Toro) |
| `GET /dashboard/vehicle-cards`  | 2 veículos, último abastecimento do Toro refletido corretamente |
| `GET /dashboard/alerts`         | 1 alerta de manutenção próxima (6 dias)                         |
| `GET /analytics/tco/:vehicleId` | vazio — precisa de mais histórico/ciclo fechado para calcular   |
| `GET /audit-logs`               | registro de `REGISTER` do usuário de teste presente             |

## Confirmação extra: o mesmo caminho que o navegador usa

Além de testar direto na API (porta 3001), reproduzi o exato mecanismo do frontend: login via
`POST http://localhost:3000/api/backend/auth/login` (rewrite same-origin do Next.js) e, só com
o cookie httpOnly resultante (sem header `Authorization`), `GET
http://localhost:3000/api/backend/vehicles` retornou os 2 veículos normalmente. Confirma que a
correção do guard resolve também o fluxo real do navegador, não só chamadas diretas à API.

## O que NÃO foi coberto neste teste

- Interação de fato pela **tela** (clicar em botões, preencher formulários no navegador) — só
  testei via chamadas HTTP (diretas à API e pelo rewrite do Next, ver seção acima). Vale um
  passe manual clicando pela UI para pegar eventuais bugs de front que não aparecem via API.
- Upload de arquivo, PWA offline, exportações CSV, e os fluxos de admin/LGPD (não fazem parte
  do cadastro básico por feature).
- Fase 9 (monetização) — ainda não implementada.

## Como conferir você mesmo

1. Studio do Supabase (http://127.0.0.1:54323) → tabelas `vehicles`, `expenses`,
   `maintenances`, `fines`, `recurring_costs`, `vehicle_groups`, `user_categories`,
   `expense_templates`, `odometer_cycles`, `user_preferences` — filtrar por
   `user_id = b69865a3-7c2f-46c2-ad6f-0a5f74d168f1`.
2. Login na tela (http://localhost:3000/login) com o e-mail/senha acima e navegar pelo
   dashboard, `/expenses`, `/maintenance`, `/fines`, `/analytics`, `/atividades`.
3. Swagger (http://localhost:3001/api/docs) para repetir/variar qualquer chamada manualmente.
