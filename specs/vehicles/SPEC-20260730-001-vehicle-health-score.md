---
id: SPEC-20260730-001
title: "Score de Saúde de Veículo e Frota"
status: approved
date: 2026-07-30
author: Douglas Lopes (lps.doug@protonmail.com)
rules:
  [
    R-HS-01,
    R-HS-02,
    R-HS-03,
    R-HS-04,
    R-HS-05,
    R-HS-06,
    R-HS-07,
    R-HS-08,
    R-HS-09,
    R-HS-10,
    R-TZ-01,
    S2,
    S7,
  ]
security: [S2, S7]
camadas: [database, backend, frontend]
---

# SPEC-20260730-001: Score de Saúde de Veículo e Frota

**Status:** Approved
**Criada em:** 2026-07-30
**Autor:** Douglas Lopes (lps.doug@protonmail.com)
**Revisores:** —

---

## Changelog (pós-aprovação)

| Data       | O que mudou                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Por quê                                                                                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-31 | RF-13 a RF-20 implementados: `GET /vehicles/:id/health` (`VehiclesController`/`VehiclesService.getHealth`, chama `calculate_vehicle_health` via RPC) para a página de detalhe; `/vehicles` passou a consumir `GET /dashboard/fleet-health` (já implementado) para exibir `VehicleHealthScore` em cada item e ordenar por score ascendente (RF-15), com fallback silencioso para "Calculando" em caso de falha (RF-16); `/vehicles/[id]` ganhou a seção "Saúde do Veículo" com score, flags humanizadas (reexportando `FLAG_LABEL`/`HealthFlag` de `VehicleHealthCard.tsx`), estado "Nenhum problema identificado" (RF-18) e links de ação por tipo de flag (RF-20). Testes novos em `vehicles.service.spec.ts`, `vehicles.controller.spec.ts` e `page.spec.tsx` (o mock de `apiClient` do spec de detalhe foi refeito para responder por URL/método, já que a página agora dispara duas queries em paralelo). Verificado manualmente via browser logado com o usuário E2E: score e anel exibidos na listagem e no detalhe, flag `km_alert` com link funcional. Suíte completa sem regressão (`apps/api` 511/511, `apps/web` 358+/358+). | RF-01 a RF-12 (algoritmo e semáforo) já estavam implementados antes desta spec; faltava só a camada de exibição em `/vehicles` e `/vehicles/[id]`, que foi o escopo real desta rodada. |

---

## 1. Contexto

O score de saúde é uma pontuação de 0 a 100 que representa o estado atual de cada veículo, considerando manutenções pendentes/vencidas, documentos próximos do vencimento, proximidade de revisão por quilometragem e multas pendentes. O cálculo já existe no banco de dados desde a migration `supabase/migrations/20260712172020_analytics_functions.sql` (funções `calculate_vehicle_health` e `calculate_fleet_health`), corrigida pela `20260712172220_fix_fleet_health_double_call.sql`.

A tabela `vehicles` já possui a coluna `health_score numeric check (health_score is null or (health_score >= 0 and health_score <= 100))`.

O dashboard consome o score via `GET /dashboard/fleet-health` (backend: `DashboardService.getFleetHealth`) e exibe o componente `VehicleHealthCard` com semáforo, conforme especificado em SPEC-20260531-001 seção 5.6 (RF-SH-01 a RF-SH-04). O componente de exibição `VehicleHealthScore` já existe em `packages/ui/src/components/vehicle-health-score.tsx`.

**Esta spec faz o seguinte:**

1. Formaliza o algoritmo de cálculo como contrato normativo (R-HS-01 a R-HS-10) — o código SQL é a implementação de referência, não o contrário.
2. Define a exibição do score na página `/vehicles` (lista de veículos), que atualmente não mostra saúde.
3. Define a exibição do breakdown de flags na página `/vehicles/[id]` (detalhe do veículo).

O que esta spec **não redefine**: o consumo do score no dashboard (coberto por SPEC-20260531-001), a lógica de chamada a RPC no `DashboardController`/`DashboardService` (já implementada), ou os semáforos do `VehicleHealthCard` no dashboard (idem).

---

## 2. Objetivo

Tornar o score de saúde de cada veículo visível em todos os pontos de contato esperados pelo usuário — lista de veículos, ficha do veículo e dashboard — e documentar formalmente a fórmula para que mudanças futuras nos pesos ou tiers partam de um contrato claro, versionável e rastreável.

---

## 3. Fora de Escopo

- Recálculo agendado (cron/job) — o score é on-demand via RPC a cada chamada; nenhum scheduler é introduzido por esta spec.
- Histórico de evolução do score ao longo do tempo.
- Configuração de pesos pelo usuário.
- Notificações push baseadas em queda de score — previstas para feature futura.
- Integração com telemetria GPS ou dados externos.
- Qualquer mudança de peso/threshold nas funções SQL — mudanças nesse contrato exigem atualização desta spec e uma migration nova.

---

## 4. Personas

| ID    | Persona                                   | Necessidade                                                                                                 |
| ----- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| P-001 | Carlos (motorista autônomo, 1-3 veículos) | Saber rapidamente quais veículos precisam de atenção sem abrir cada ficha individualmente                   |
| P-002 | Ana (gestora de frota pequena)            | Entender os motivos do score de cada veículo para priorizar ações de manutenção ou regularização documental |

---

## 5. Histórias de Usuário e Critérios de Aceitação

### HU-01 — Score na lista de veículos

**Como motorista autônomo (P-001), quero ver o indicador de saúde de cada veículo na lista da minha frota, para identificar qual precisa de atenção sem precisar abrir cada ficha individualmente.**

**CA-01 — Semáforo correto por tier:**

```gherkin
Dado que o usuário acessa /vehicles
E possui 3 veículos com scores 85, 55 e 25 respectivamente
Quando a página é renderizada
Então o primeiro veículo exibe o anel VehicleHealthScore na cor success com label "Em dia"
E o segundo exibe cor warning com label "Atenção"
E o terceiro exibe cor danger com label "Crítico"
```

**CA-02 — Score ainda não calculado:**

```gherkin
Dado que um veículo acabou de ser cadastrado e vehicles.health_score é NULL
Quando o usuário acessa /vehicles
Então o VehicleHealthScore exibe estado neutro "Calculando" (score undefined)
E nenhum alerta de erro é mostrado ao usuário
```

---

### HU-02 — Breakdown de flags no detalhe do veículo

**Como gestora de frota (P-002), quero ver o detalhamento dos fatores que compõem o score de saúde na ficha do veículo, para tomar decisões informadas sobre priorização de ações.**

**CA-03 — Flags exibidas em linguagem humana:**

```gherkin
Dado que o veículo "ABC-1234" tem:
  - 2 manutenções vencidas
  - IPVA vencendo em 12 dias
  - 1 multa pendente
Quando o usuário acessa /vehicles/[id] e visualiza a seção de saúde
Então o score exibido é o valor retornado pela RPC (não recalculado no frontend)
E os flags são listados:
  - "2 manutenção(ões) vencida(s)"
  - "IPVA vence em 12 dias"
  - "1 multa(s) pendente(s)"
```

**CA-04 — Veículo sem nenhum problema:**

```gherkin
Dado que o veículo "DEF-5678" tem score 100 e flags vazio
Quando o usuário acessa /vehicles/[id]
Então a seção de saúde exibe "Nenhum problema identificado" e o score 100 em cor success
```

---

### HU-03 — RPC como fonte de verdade

**Como sistema, quero que o score seja sempre calculado e persistido pela RPC PostgreSQL, para que não haja divergência entre o valor armazenado e o exibido em diferentes telas.**

**CA-05 — Score calculado via RPC:**

```gherkin
Dado que a lista /vehicles chama calculate_fleet_health
Quando o resultado é retornado
Então vehicles.health_score de cada veículo é atualizado no banco como efeito colateral da RPC
E o frontend exibe o score retornado pela RPC, nunca recalcula pesos localmente
```

**CA-06 — Isolamento por usuário:**

```gherkin
Dado que dois usuários A e B possuem veículos distintos
Quando ambos chamam calculate_fleet_health simultaneamente
Então cada chamada só retorna veículos do próprio usuário (auth.uid() = user_id)
E nenhum score de veículo alheio é retornado ou persistido
```

---

## 6. Requisitos Funcionais

### 6.1 Algoritmo de Cálculo (R-HS-01 a R-HS-10)

| ID    | Requisito                                                                                                                                                                                                                                                                                                                                                                                   | Prioridade |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| RF-01 | O score começa em 100 e nunca vai abaixo de 0. Cada fator de penalização subtrai pontos conforme os pesos definidos em RF-02 a RF-06. O cálculo é executado exclusivamente pela RPC `calculate_vehicle_health(p_vehicle_id UUID)` no PostgreSQL; nunca no NestJS nem no frontend (R-HS-01).                                                                                                 | Alta       |
| RF-02 | Manutenções pendentes (`status IN ('scheduled', 'in_progress')`, `deleted_at IS NULL`): -5 pontos por item, máximo -20 pontos (R-HS-02).                                                                                                                                                                                                                                                    | Alta       |
| RF-03 | Manutenções vencidas (subconjunto de RF-02 com `scheduled_date < CURRENT_DATE`): desconto adicional de -15 pontos por item, máximo -30 pontos. O desconto de RF-02 e o de RF-03 são cumulativos para o mesmo item (R-HS-03).                                                                                                                                                                | Alta       |
| RF-04 | Documento a vencer em ≤ 30 dias: -10 pontos por documento, aplicado individualmente a IPVA (`vehicles.ipva_due_date`), Seguro (`vehicles.insurance_expires_at`) e CRLV (`vehicles.crlv_expires_at`). Cada um é penalizado de forma independente — máximo -30 pontos combinados. Campos `NULL` são ignorados (sem penalidade). A janela usa `CURRENT_DATE` do servidor PostgreSQL (R-HS-04). | Alta       |
| RF-05 | Alerta de km: quando `vehicles.odometer >= vehicles.next_maintenance_km - 1000`, aplica -5 pontos (desconto único, independente de quantos km faltam dentro da janela). Campos `NULL` em qualquer um dos dois são ignorados (R-HS-05).                                                                                                                                                      | Alta       |
| RF-06 | Multas pendentes (`fines.status = 'pending'`, `deleted_at IS NULL`): -5 pontos por item, máximo -15 pontos (R-HS-06).                                                                                                                                                                                                                                                                       | Alta       |
| RF-07 | A RPC persiste `vehicles.health_score = v_score` e `vehicles.updated_at = NOW()` como efeito colateral de cada chamada (R-HS-08). A coluna `health_score` é write-only pela RPC — a aplicação NestJS, server actions e client nunca escrevem diretamente nessa coluna (R-HS-09).                                                                                                            | Alta       |
| RF-08 | `calculate_fleet_health(p_user_id UUID)` itera sobre os veículos do usuário e chama `calculate_vehicle_health` para cada um — uma única RPC para toda a frota. O score de frota para fins de KPI no dashboard é a média aritmética simples dos scores individuais dos veículos ativos (R-HS-09).                                                                                            | Alta       |

### 6.2 Flags Emitidas (R-HS-10)

| ID    | Requisito                                                                                                                                                                                                                                                                                                                                                                                                   | Prioridade |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| RF-09 | A RPC retorna um array `flags` JSONB com os objetos de motivo de penalização. Os tipos canônicos de flag são: `maintenance_overdue` (campo `count`), `ipva_expiring` (campo `days`), `insurance_expiring` (campo `days`), `crlv_expiring` (campo `days`), `km_alert` (campo `km_until`), `fines_pending` (campo `count`). Nenhuma tela inventa tipos de flag adicionais; exibir apenas o que a RPC retorna. | Alta       |
| RF-10 | Manutenções apenas pendentes (não vencidas) não geram flag — a penalização de RF-02 ocorre no score sem emitir um flag visual. Apenas a condição de vencido (`scheduled_date < CURRENT_DATE`) gera `maintenance_overdue` (R-HS-10).                                                                                                                                                                         | Alta       |

### 6.3 Exibição no Semáforo (R-HS-07)

| ID    | Requisito                                                                                                                                                                                                                                                                                            | Prioridade |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| RF-11 | O score é mapeado para semáforo com os seguintes tiers e labels canônicos: 70–100 = success ("Em dia"), 40–69 = warning ("Atenção"), 0–39 = danger ("Crítico"). Nenhuma tela usa mapeamento diferente. O componente `VehicleHealthScore` de `@navestory/ui` já implementa esse mapeamento (R-HS-07). | Alta       |
| RF-12 | Score `undefined` (veículo sem cálculo ainda) exibe estado neutro "Calculando" sem alerta de erro — o campo `vehicles.health_score` pode ser `NULL` para veículos recém-cadastrados.                                                                                                                 | Média      |

### 6.4 Exibição na Lista de Veículos (`/vehicles`)

| ID    | Requisito                                                                                                                                                                                                         | Prioridade |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| RF-13 | A página `/vehicles` exibe o componente `VehicleHealthScore` (do `@navestory/ui`) para cada veículo na listagem. O score exibido é lido de `vehicles.health_score` (campo já persistido na última chamada à RPC). | Alta       |
| RF-14 | A lista de veículos chama `calculate_fleet_health` ao carregar a página para atualizar os scores antes de exibi-los. A chamada é feita via `GET /dashboard/fleet-health` (backend já implementado).               | Alta       |
| RF-15 | Os veículos são ordenados por score ascendente por padrão na listagem (pior score primeiro), ajudando o usuário a identificar rapidamente os que precisam de atenção (P-001).                                     | Média      |
| RF-16 | Em caso de falha da RPC de health, a listagem exibe os veículos sem o indicador de saúde (fallback para `undefined`/estado neutro "Calculando"), sem bloquear a renderização ou exibir erro ao usuário.           | Alta       |

### 6.5 Exibição no Detalhe do Veículo (`/vehicles/[id]`)

| ID    | Requisito                                                                                                                                                                                                                                                                                                                          | Prioridade |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| RF-17 | A página `/vehicles/[id]` exibe uma seção "Saúde do Veículo" com: o `VehicleHealthScore` com o score numérico, e a lista de flags em linguagem humana (usando as labels do `FLAG_LABEL` já definido em `VehicleHealthCard.tsx`).                                                                                                   | Alta       |
| RF-18 | Se `flags` for vazio ou `null`, a seção exibe "Nenhum problema identificado" em vez de uma lista vazia.                                                                                                                                                                                                                            | Alta       |
| RF-19 | A página chama `calculate_vehicle_health(vehicle_id)` ao carregar para atualizar o score do veículo individual antes de exibi-lo. Pode ser feito via `POST /rpc/calculate_vehicle_health` do Supabase client autenticado ou via endpoint de backend — a escolha de implementação segue o padrão arquitetural vigente.              | Alta       |
| RF-20 | A seção de saúde exibe um link de ação para cada flag acionável: `maintenance_overdue` → `/maintenance?vehicleId=[id]&filter=overdue`; `ipva_expiring`, `insurance_expiring`, `crlv_expiring` → `/vehicles/[id]` (seção de documentos); `fines_pending` → `/fines?vehicleId=[id]`; `km_alert` → `/maintenance/new?vehicleId=[id]`. | Média      |

---

## 7. Requisitos Não-Funcionais

| ID     | Requisito                          | Métrica de Aceite                                                                                                                                                                                         |
| ------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Performance — listagem de veículos | `calculate_fleet_health` deve completar em < 2 s para frotas de até 20 veículos em p95.                                                                                                                   |
| RNF-02 | Segurança — isolamento de usuário  | `calculate_vehicle_health` valida internamente `auth.uid() = vehicles.user_id`; `calculate_fleet_health` valida `auth.uid() = p_user_id`. Nenhuma query retorna dados de outro usuário (S7).              |
| RNF-03 | Acessibilidade                     | O componente `VehicleHealthScore` usa `role="img"` com `aria-label` descritivo (já implementado). O semáforo de saúde nunca é comunicado apenas por cor — o label textual é sempre obrigatório (R-DS-08). |
| RNF-04 | Consistência                       | O score exibido em `/vehicles`, `/vehicles/[id]` e no dashboard (SPEC-20260531-001) sempre reflete a última chamada à RPC. Não há cache local de score fora do campo `vehicles.health_score`.             |

---

## 8. Dependências

| Tipo                       | Referência                                                                                         | Descrição                                                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec — consumo existente   | [SPEC-20260531-001](../dashboard/SPEC-20260531-001.md) (approved, seção 5.6)                       | Define RF-SH-01 a RF-SH-04: como consumir o score no dashboard (`calculate_fleet_health`, semáforo, tooltip de flags, fix do double-call). Esta spec não sobrescreve esses requisitos. |
| Spec                       | [SPEC-20260602-002](SPEC-20260602-002.md) (approved)                                               | CRUD de veículos — contexto de `/vehicles` e `/vehicles/[id]`.                                                                                                                         |
| Spec                       | [SPEC-20260603-002](../maintenance/SPEC-20260603-002-maintenance-status-transitions.md) (approved) | Transitions de status de manutenção; define quais valores de `status` são considerados "pendentes".                                                                                    |
| Spec                       | [SPEC-20260607-001](../fines/SPEC-20260607-001-fines-module.md) (approved)                         | Módulo de multas; define `status = 'pending'` para multas.                                                                                                                             |
| Banco — já implementado    | `supabase/migrations/20260712172020_analytics_functions.sql`                                       | Funções `calculate_vehicle_health` e `calculate_fleet_health`.                                                                                                                         |
| Banco — já implementado    | `supabase/migrations/20260712172220_fix_fleet_health_double_call.sql`                              | Corrige chamada dupla a `calculate_vehicle_health` dentro de `calculate_fleet_health`.                                                                                                 |
| Banco — já implementado    | `supabase/migrations/20260712171830_core_tables.sql`                                               | Coluna `vehicles.health_score`, campos `ipva_due_date`, `insurance_expires_at`, `crlv_expires_at`, `odometer`, `next_maintenance_km`.                                                  |
| Backend — já implementado  | `apps/api/src/modules/dashboard/dashboard.service.ts`                                              | `getFleetHealth()`, `getFleetHealthAverage()`.                                                                                                                                         |
| Backend — já implementado  | `apps/api/src/modules/dashboard/dashboard.controller.ts`                                           | `GET /dashboard/fleet-health`.                                                                                                                                                         |
| Frontend — já implementado | `packages/ui/src/components/vehicle-health-score.tsx`                                              | Componente `VehicleHealthScore` com tiers e labels canônicos.                                                                                                                          |
| Frontend — já implementado | `apps/web/src/components/dashboard/VehicleHealthCard.tsx`                                          | Consome score e flags; define `FLAG_LABEL` para humanização dos flags.                                                                                                                 |

---

## 9. Campos de Banco Necessários

Todos os campos utilizados pelo cálculo já existem. Nenhuma migration é necessária para esta spec.

| Campo                  | Tabela         | Tipo                              | Status       |
| ---------------------- | -------------- | --------------------------------- | ------------ |
| `health_score`         | `vehicles`     | `numeric` (check 0-100, nullable) | ✅ já existe |
| `odometer`             | `vehicles`     | `numeric`                         | ✅ já existe |
| `next_maintenance_km`  | `vehicles`     | `integer`                         | ✅ já existe |
| `ipva_due_date`        | `vehicles`     | `date` (nullable)                 | ✅ já existe |
| `insurance_expires_at` | `vehicles`     | `date` (nullable)                 | ✅ já existe |
| `crlv_expires_at`      | `vehicles`     | `date` (nullable)                 | ✅ já existe |
| `status`               | `maintenances` | `maintenance_status` enum         | ✅ já existe |
| `scheduled_date`       | `maintenances` | `date`                            | ✅ já existe |
| `status`               | `fines`        | `fine_status` enum                | ✅ já existe |

---

## 10. Glossário

| Termo                 | Definição no contexto do navestory                                                                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Score de saúde**    | Pontuação inteira de 0 a 100 calculada e persistida pela RPC PostgreSQL `calculate_vehicle_health`. Representa o estado geral de um veículo considerando manutenções, documentos, km e multas. |
| **Semáforo de saúde** | Indicador visual derivado do score: success/verde (70-100 "Em dia"), warning/amarelo (40-69 "Atenção"), danger/vermelho (0-39 "Crítico").                                                      |
| **Flag**              | Objeto JSONB retornado no array `flags` pela RPC que descreve um fator de penalização ativo — tipo canônico e payload de detalhe (count, days, km_until).                                      |
| **Score de frota**    | Média aritmética dos scores individuais dos veículos ativos do usuário. Usado como KPI de frota no dashboard (SPEC-20260531-001 RF-DA-03).                                                     |
| **On-demand**         | O score é recalculado e persistido somente quando a RPC é chamada — não há job periódico.                                                                                                      |
| **IPVA**              | Imposto sobre Propriedade de Veículos Automotores — tributo estadual com vencimento anual.                                                                                                     |
| **CRLV**              | Certificado de Registro e Licenciamento de Veículo — documento anual obrigatório.                                                                                                              |
