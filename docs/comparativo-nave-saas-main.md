# Comparativo: Nave-SaaS-main vs. navestory

**Data:** 2026-08-13
**Autor:** Levantamento assistido (Claude)
**Repositórios comparados:**
- `C:\Dev\Antigravity\Nave-SaaS-main` — versão anterior do produto (specs até ~2026-07-11/12; CHANGELOG parado em `[Unreleased]` ~2026-07-04; `FEATURE_STATUS.md` autodeclarado desatualizado desde 2026-05-21)
- `C:\Dev\Nave` (navestory) — projeto atual, ativo (specs até 2026-08-08)

---

## Conclusão executiva (leia isto primeiro)

A premissa inicial — de que o Nave-SaaS-main é "mais maduro em quantidade de artefatos" e o navestory precisaria alcançá-lo — **não se confirma na maior parte do escopo**. Evidência decisiva: os arquivos `backlog/BACKLOG-admin.md` e `backlog/BACKLOG-auth.md` do navestory contêm um aviso de correção datado de **2026-07-12** afirmando que o navestory é um repositório **greenfield**, e que versões anteriores (herdadas do Nave-SaaS-main) marcavam itens como `✅ entregue` com caminhos de arquivo e contagens de teste que **não correspondiam ao filesystem real**. Ou seja: o navestory nasceu como um reinício corrigido do Nave-SaaS-main, preservando a descrição funcional das stories mas zerando o status de "entregue" fictício.

A partir daí, quase toda pasta `specs/` do Nave-SaaS-main tem os mesmos IDs de spec presentes no navestory — **mais** specs adicionais e posteriores (agosto/2026) em praticamente todas as áreas (expenses, vehicles, security, auth, dashboard, maintenance, fines, forms, preferences, context, analytics, business, admin, design-system). O navestory está adiante do Nave-SaaS-main em quase todas as frentes de spec e em algumas UI reais (`FleetAlertBar`/`FleetCharts` é uma versão mais madura, orientada a spec e dados reais, do que `fleet-command.tsx`).

O gap real e relevante está concentrado em **um padrão de UI concreto que existia como código funcional no Nave-SaaS-main e foi decapitado ao portar**: o painel lateral direito de frota (`fleet-aside.tsx`). Esse é o achado central deste relatório.

---

## Achado central — Aside de Frota (`fleet-aside.tsx`)

| | |
|---|---|
| **Onde (Nave-SaaS-main)** | `apps/web/components/layout/fleet-aside.tsx` (~710 linhas), montado globalmente em `apps/web/app/(dashboard)/layout.tsx` como `<FleetAside />`, irmão do `<Sidebar />` esquerdo |
| **Onde (navestory)** | `apps/web/src/components/layout/fleet-aside.tsx`, montado em `apps/web/src/app/(app)/layout.tsx` — **mesmo nome, mesmo ponto de montagem** |
| **Status Nave-SaaS-main** | Implementado e funcional (código real, não protótipo) |
| **Existe em navestory?** | **Parcial** — o nome e o ponto de montagem existem, mas a implementação foi reduzida a um componente **headless** que retorna `null` |

### O que existe no Nave-SaaS-main e não existe mais no navestory

O componente original renderiza um painel visual completo, sempre visível em telas `lg+`:

- **Aba de recolher** (`w-[22px]` colapsado / `w-[282px]` expandido) com label vertical "PAINEL"
- **Seção "Grupos da Frota"**: chips coloridos por grupo com contagem de membros, criação/edição inline (nome + color picker de 8 cores + checkboxes de veículos-membro), exclusão com toast de undo (timer de 5.5s antes de persistir)
- **Seção "Veículo Ativo"**: dropdown searchável (placa Mercosul, make/model, status dot verde/amarelo/cinza)
- **Bloco de detalhe do veículo selecionado**: nome + placa, tabela de "Informações" (placa/combustível/status), dois indicadores de saúde binários (manutenção vencida vs. em dia; documento vencendo vs. válido), calculados a partir da RPC `calculate_fleet_health`
- **Ações rápidas**: botões "Registrar Manutenção" e "Ver Ficha Completa"
- Estado via Zustand (`useDashboardStore`) + chamadas diretas ao client Supabase (sem camada de API/React Query)

### O que sobrou no navestory

```ts
// apps/web/src/components/layout/fleet-aside.tsx
export function FleetAside(): null {
  // só detecção de staleness de contexto (veículo/grupo ativo excluído)
  // via TanStack Query, reaproveitando as query keys do FocusSlot
  // @spec SPEC-20260602-001 RF-16, RNF-03
  ...
  return null;
}
```

Ou seja: **o painel visual de frota não existe hoje em nenhuma tela do navestory** — apenas o efeito colateral de limpar o contexto quando o veículo/grupo ativo é excluído (soft delete) foi preservado, sob o mesmo nome de componente. Confirmado por leitura de `app/(app)/layout.tsx`: não há elemento de aside/rail à direita do conteúdo principal em nenhum lugar do shell atual.

### A RPC de saúde da frota já existe no navestory

Verificação importante: a função `calculate_fleet_health` (base do indicador de saúde do veículo no aside original) **já está portada e ativa** nas migrations do navestory:
- `supabase/migrations/20260712172020_analytics_functions.sql`
- `supabase/migrations/20260712172105_function_grants_hardening.sql`
- `supabase/migrations/20260712172205_analytics_functions_security_invoker.sql`
- `supabase/migrations/20260712172220_fix_fleet_health_double_call.sql` (correção de bug de chamada duplicada)

Isso reduz consideravelmente o esforço de reconstrução: o dado que alimentaria os indicadores de saúde no aside já é servido pelo backend do navestory (via analytics), só falta a camada de apresentação.

### Recomendação

**Considerar depois — adotar como inspiração de UX, não como código a colar.** Vale para o `ui-layout-reviewer`/`ux-researcher` avaliarem se um painel de contexto de frota sempre visível (grupos + veículo ativo + saúde) resolve uma necessidade real das personas (especialmente Ana/Roberto, gestores de frota) versus o padrão atual do navestory (chip de contexto no header + subheader financeiro). Se aprovado, a reimplementação deve:
- Usar React Query + `apiClient` (padrão já estabelecido no navestory), não Supabase client direto no componente
- Reaproveitar `calculate_fleet_health` (já existe)
- Adotar os tokens semânticos de design system do navestory (`bg-{variant}-pastel`, etc. — ver `FleetAlertBar.tsx`) em vez das cores hardcoded do original (`bg-red-500/10 text-red-600`)
- Ganhar uma spec própria em `specs/dashboard/` ou `specs/workspace/`, com ADR se implicar mudança de layout do shell (`docs/architecture/decisions/`)

**Impacto:** UX (nova área permanente de tela, reduz espaço útil de conteúdo em telas médias) e arquitetura (novo padrão de dado ao vivo no shell global, hoje o shell só tem `VehicleActivator`/`TimezoneDetector` como componentes headless).

---

## Achado secundário — Menu flutuante de navegação por veículo (`VehicleSidebarMenu`)

| | |
|---|---|
| **Onde** | `apps/web/components/vehicles/VehicleSidebarMenu.tsx`, usado em `apps/web/app/(dashboard)/vehicles/[id]/layout.tsx` como pílula sticky no topo da página de detalhe do veículo |
| **Status Nave-SaaS-main** | Implementado visualmente, mas **majoritariamente quebrado** |
| **Existe em navestory?** | Não |

Pílula flutuante com 10 ícones de navegação (Histórico, Motorista, Kanban, Documentos, Agenda, Multas, Abastecimentos, Manutenção, Telemetria, Seguro) + painel expansível de "Ações Rápidas" (Abastecer, Manutenção, Multa, Pedágio, Estacionamento).

**Problema crítico encontrado:** das 10 rotas linkadas, checando `apps/web/app/(dashboard)/vehicles/[id]/` no Nave-SaaS-main, **só existem de fato `history` e `manage`**. As outras 8 (`driver`, `kanban`, `docs`, `schedule`, `fines`, `fuel`, `maintenance`, `telemetry`, `insurance`, mais `tolls`/`parking` das ações rápidas) são links mortos (404) — o componente é aspiracional, não uma feature madura testada em produção.

### Recomendação

**Descartar o código, mas considerar o padrão de interação depois.** Não portar como está — a maioria dos destinos não existe em nenhum dos dois produtos, e portar um componente com 80% de links quebrados criaria dívida de UX imediata. O *padrão* (navegação rápida por veículo com pílula sticky + atalho de ações rápidas) pode valer avaliação de produto para a tela `apps/web/src/app/(app)/vehicles/[id]/page.tsx` do navestory, que hoje não tem navegação lateral/pílula equivalente — mas isso é decisão de escopo de produto (`product-owner`), condicionada a quais dessas sub-telas (multas, abastecimento, manutenção por veículo) o navestory realmente vai construir.

**Impacto:** UX apenas (não há dado ou arquitetura nova envolvida além das rotas que já existiriam por outro motivo).

---

## Achados menores

### 1. ADRs fundacionais não copiados

| | |
|---|---|
| **Onde** | `docs/architecture/decisions/001-monorepo-structure.md` e `002-supabase-rls-strategy.md` (Nave-SaaS-main) |
| **Status Nave-SaaS-main** | Aceito (ADR formal) |
| **Existe em navestory?** | Não — navestory pula direto para `003-auth-jwt-strategy.md` |

Conteúdo de ambos é genérico/fundacional: decisão de usar monorepo (workspaces) e decisão de usar RLS estrito no Postgres/Supabase para multi-tenant. Ambas as decisões **já estão implicitamente em vigor** no navestory (a regra de segurança S2 "RLS ativo", citada no `CLAUDE.md` do projeto, já assume isso).

**Prós de adotar:** fecha rastreabilidade de decisões arquiteturais desde o início do projeto; custo de leitura baixo para novos colaboradores.
**Contras:** nenhum risco técnico — é só lacuna documental.
**Trade-off:** esforço mínimo (adaptar 2 arquivos curtos, trocar "Nave" por "navestory", validar se algo mudou), benefício baixo mas non-zero (auditoria/onboarding).
**Impacto:** nenhum (documentação apenas).
**Recomendação: adotar agora** — é o item de menor esforço/risco de todo o levantamento. Pode ser delegado ao `doc-keeper`.

### 2. `FEATURE_STATUS.md`

Existe só no Nave-SaaS-main, mas o próprio arquivo se autodeclara desatualizado desde 2026-05-21 e diz explicitamente que `matrices/rastreabilidade.md` é a fonte de verdade — o navestory já segue exatamente esse padrão de matrizes (mais maduro, com `impacto.md`/`permissoes.md`/`rastreabilidade.md` versionados).

**Recomendação: descartar.** Não há informação de valor a resgatar; portar um documento que a própria origem descreve como obsoleto seria retrabalho sem benefício.

### 3. Alertas de manutenção por email (SPEC-20260521-002)

Pendente no Nave-SaaS-main (a Edge Function `send-maintenance-alerts` nunca foi implementada, apesar da migration `pg_cron_maintenance_alerts` existir). Não é gap no navestory: já é uma decisão consciente e registrada em memória do usuário (`decisao_alertas_email_fase9.md`) — adiada para a Fase 9, condicionada a domínio próprio + Resend, vinculada ao lançamento da monetização.

**Recomendação: já decidido, nenhuma ação — manter como está.**

### 4. Página `/reports`

| | |
|---|---|
| **Onde** | `apps/web/app/(dashboard)/reports/page.tsx` (Nave-SaaS-main) |
| **Status Nave-SaaS-main** | UI estática/mockup — cards de relatório com percentuais **hardcoded** ("4.2% melhor"), sem integração de dados real visível no arquivo |
| **Existe em navestory?** | Não como rota dedicada, mas **sim em espírito** — `specs/analytics/SPEC-20260622-001-analytics-engine.md` e `SPEC-20260801-002-analytics-avancado-correlacoes-simulacoes.md` cobrem escopo equivalente ou maior (TCO, fuel intelligence, anomalias, benchmark, forecast, correlações, simulações), com dados reais |

**Recomendação: descartar.** A página do Nave-SaaS-main é um protótipo visual sem dados reais; o navestory já superou esse escopo com um motor de analytics de verdade. Não há nada a resgatar além, no máximo, do layout de grid de cards (decisão visual, não funcional — delegar ao `design-system` se um dia fizer sentido um índice de relatórios).

### 5. Botão flutuante de "consulta IA" (`floating-ia-button.tsx` / `ia-consultation.tsx`)

Referenciado em `FEATURE_STATUS.md` do Nave-SaaS-main (tabela de componentes de dashboard), mas **os arquivos não existem mais no filesystem atual do Nave-SaaS-main** — busca por nome de arquivo não retornou nenhum resultado (só artefatos de build do Next.js sem relação). Não há spec formal para "IA"/"assistant" em nenhum dos dois repositórios que descreva essa feature de forma completa (as ocorrências de "IA" encontradas em `specs/` de ambos os lados são todas sobre "odômetro **ia**..." e outras palavras que contêm a substring, falsos positivos de busca).

**Recomendação: descartar / não é um item real.** É uma referência morta em documentação desatualizada, não uma feature ou padrão a avaliar.

### 6. Alertas de frota unificados (`fleet-command.tsx` + `vehicle-health-card.tsx`)

| | |
|---|---|
| **Onde (Nave-SaaS-main)** | `apps/web/components/dashboard/fleet-command.tsx` — painel de comando com lista de alertas unificados (manutenção/IPVA/seguro/CRLV/km/multa), health score de frota e filtro por grupo, cálculo local no componente |
| **Existe em navestory?** | **Sim, e mais maduro** — `apps/web/src/components/dashboard/FleetAlertBar.tsx` + `FleetCharts.tsx`, alimentados por `GET /dashboard/alerts` (dado já ordenado por urgência no backend, não recalculado no cliente), com tokens semânticos de design system (`bg-danger-pastel`/`bg-warning-pastel`) documentados com justificativa de contraste, e rastreabilidade via `@spec SPEC-20260531-001 RF-DA-01, RF-DA-02, CA-S3-02` e `SPEC-20260729-002` |

**Recomendação: nenhuma ação — navestory já superou este item.** Citado aqui apenas para deixar registrado que a comparação foi feita e o resultado é "navestory à frente", evitando redundância futura de alguém reabrir esse tema achando que é gap.

### 7. Backlogs (`BACKLOG-admin.md`, `BACKLOG-auth.md`)

Ambos os arquivos existem nos dois repositórios com o mesmo conteúdo-base de stories, critérios de aceite e pontuação — a diferença é que o navestory **corrigiu** (2026-07-12) o status de entrega que estava fabricado no Nave-SaaS-main (itens marcados `✅` com caminhos de arquivo e contagens de teste fictícios). `BACKLOG-auth.md` do navestory inclusive tem mais pontos totais (48 pts/14 itens vs. 38 pts/10 itens no Nave-SaaS-main), sinal de que o backlog cresceu depois da correção.

**Recomendação: nenhuma ação.** Não há item órfão exclusivo do Nave-SaaS-main a resgatar — o navestory já tem uma versão igual ou mais completa e, além disso, factualmente correta.

### 8. Convenção de organização de componentes (observação, não gap)

Nave-SaaS-main organiza componentes de domínio em `apps/web/components/<dominio>/` (ex: `components/expenses/expense-form.tsx`). O navestory usa co-location dentro da própria rota (`app/(app)/<rota>/_components`), e não foi encontrado um `ExpenseForm.tsx` dedicado no nível de componentes — a única referência a "ExpenseForm" no navestory está em `app/(app)/maintenance/new/page.tsx`.

Isso é uma diferença de **convenção de estrutura de projeto**, não uma lacuna de feature. Não recomendamos mudar isso a partir deste levantamento — mudar o padrão de organização de componentes exigiria um ADR novo (regra do `CLAUDE.md` do projeto: "ADR novo é obrigatório ao mudar padrão arquitetural estabelecido") e não há evidência de que o padrão atual do navestory esteja causando problema.

---

## Tabela-resumo

| # | Item | Onde encontrado | Status Nave-SaaS-main | Existe em navestory? | Recomendação |
|---|------|------------------|------------------------|------------------------|--------------|
| 1 | Aside visual de frota (grupos + veículo ativo + saúde) | `components/layout/fleet-aside.tsx` | Implementado | Parcial (só lógica headless sobrou) | **Considerar depois** — validar com ux-researcher/product-owner antes de reconstruir |
| 2 | Pílula de navegação por veículo (`VehicleSidebarMenu`) | `components/vehicles/VehicleSidebarMenu.tsx` | Implementado, mas 8/10 links mortos | Não | **Descartar código; considerar padrão de interação depois**, condicionado ao escopo de sub-telas de veículo |
| 3 | ADRs 001 (monorepo) e 002 (RLS) | `docs/architecture/decisions/00{1,2}-*.md` | Aceito | Não | **Adotar agora** (baixo esforço, fecha rastreabilidade) |
| 4 | `FEATURE_STATUS.md` | raiz do repo | Autodeclarado obsoleto | Não (superado por matrizes) | **Descartar** |
| 5 | Alertas de manutenção por email | SPEC-20260521-002 | Pendente (Edge Function não implementada) | Adiado para Fase 9 (decisão já tomada) | **Nenhuma ação** |
| 6 | Página `/reports` | `app/(dashboard)/reports/page.tsx` | Mockup estático, dados hardcoded | Superado por `analytics` (dados reais) | **Descartar** |
| 7 | Botão flutuante de consulta IA | citado em `FEATURE_STATUS.md` | Arquivos não existem mais no filesystem | Não | **Descartar** (referência morta) |
| 8 | Alertas de frota unificados | `components/dashboard/fleet-command.tsx` | Implementado, cálculo no cliente | Sim, mais maduro (`FleetAlertBar`/`FleetCharts`) | **Nenhuma ação** — navestory à frente |
| 9 | Backlogs admin/auth | `backlog/BACKLOG-*.md` | Continha status fabricado | Sim, corrigido e mais completo | **Nenhuma ação** |
| 10 | Organização de componentes por domínio vs. co-location | `apps/web/components/<dominio>/` | Padrão usado | Padrão diferente (co-location) | **Nenhuma ação** — é convenção, não gap; mudar exigiria ADR novo |

---

## Metodologia e limitações

- Levantamento feito por leitura direta de arquivos (specs, backlog, docs/architecture, componentes de UI reais) nos dois repositórios, com buscas por glob/grep para mapear presença/ausência de temas equivalentes.
- Datas de spec foram usadas como proxy de "quem está mais avançado" em cada domínio — não fiz leitura fina de todo o conteúdo de cada spec compartilhada (ex.: não confirmei se alguma spec do navestory divergiu de forma regressiva do conteúdo do Nave-SaaS-main; assumi que datas mais recentes implicam evolução, consistente com o padrão de changelog append-only observado no projeto).
- Não foi feita auditoria completa de todos os componentes de UI de ambos os repositórios (volume grande demais para 100% de cobertura); a busca foi guiada pelo pedido explícito do usuário (aside de frota) e depois expandida para os itens de maior sinal (ADRs, backlog, reports, IA, fleet-command) identificados durante a exploração.
- `packages/` (design system compartilhado, validators, types) não foi comparado em profundidade — o volume de specs de design-system do navestory (12+ specs vs. 1 no Nave-SaaS-main) já é sinal forte o suficiente de que essa frente está à frente no navestory, mas uma auditoria componente-a-componente do Storybook não foi feita.
