# ADR-007: Ciclos de Odômetro como Série Temporal Segmentada

## Status

Accepted

## Context

O odômetro é o dado fundamental de controle da linha do tempo operacional de um veículo — usado para calcular km/L, custo/km, TCO e o health score. Hoje ele existe de forma fragmentada e sem obrigatoriedade suficiente:

- `vehicles.odometer`: snapshot estático definido no cadastro/edição do veículo, desconectado de qualquer histórico.
- `expenses.odometer_km`: obrigatório apenas para `category = fuel` (**R4**), validado com soft-warning (ADR-001/D2, `SPEC-20260601-001`) e, no fluxo web, com hard-block (**R-ODO-01**).
- `maintenances.odometer_km`: coluna existe, mas está **fora do escopo de validação** (`SPEC-20260601-001`, Non-Goal NG-04).

Esse desenho tem duas lacunas conhecidas:

1. **Manutenção não valida sequência de odômetro** — dado inconsistente aceito sem aviso.
2. **Não existe mecanismo formal para tratar quebras legítimas de sequência** — troca de painel/instrumento, revenda do veículo, ou correção de digitação propagada. Hoje qualquer valor menor que o máximo histórico gera apenas um warning genérico, sem forma de o usuário declarar "isso é um novo início, não um erro".

Três desenhos foram avaliados para resolver a segunda lacuna:

| Opção | Descrição | Por que foi ou não escolhida |
|---|---|---|
| A — Campo único sobrescrito (`vehicles.odometer_baseline_value/at`) | Reset sobrescreve dois campos no próprio veículo | Descartada: perde histórico a cada novo reset (não sustenta 2+ resets ao longo da vida do veículo), motivo do reset não é estruturado/filtrável |
| B — Reaproveitar `audit_logs` genérico | Registrar reset como mais um evento de auditoria | Descartada: `audit_logs` é log genérico, não fonte de verdade para regra de negócio; obrigaria `JOIN` frágil fora do padrão Repository Port já estabelecido |
| **C — Nova entidade `vehicle_odometer_cycles` (série temporal)** | Cada reset é uma linha imutável, nunca sobrescrita | **Escolhida** |

A decisão recaiu sobre a **opção C**, alinhada ao padrão observado em ferramentas de gestão de frota do mercado (Fleetio "Meter Entries", Samsara "odometer history"), que tratam correção/rollback de odômetro como série auditável, não como campo único.

## Decision

Introduzir a tabela `vehicle_odometer_cycles` como série temporal de marcos de reinício do odômetro, e estender a obrigatoriedade/validação de odômetro para o domínio de manutenção, fechando o NG-04 do `SPEC-20260601-001`.

### Modelo de dados

```sql
vehicle_odometer_cycles (
  id uuid primary key,
  vehicle_id uuid not null references vehicles(id),
  cycle_number int not null,        -- calculado: 2, 3, 4... nunca 1
  started_at timestamptz not null,  -- a partir de quando este ciclo vale
  starting_value int not null,      -- valor informado no reset (geralmente 0)
  previous_cycle_max int,           -- máximo do ciclo anterior, para auditoria
  reason text not null,             -- texto livre: "troca de painel", "revenda", etc.
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
)
```

**O Ciclo 1 é implícito**: nenhuma linha é criada para ele. Enquanto `vehicle_odometer_cycles` estiver vazia para um `vehicle_id`, o comportamento é idêntico ao atual (sem filtro de data, série completa). A primeira linha inserida nasce com `cycle_number = 2`. A UI só exibe o badge de ciclo a partir do 2º em diante — nunca para veículos que nunca resetaram.

### Regras de negócio derivadas (a registrar em `specs/RULES.md`)

- **R-ODO-03**: `odometer_km` passa a ser obrigatório também para manutenções com `status = completed` (estende R4, fecha NG-04). Categorias administrativas (multa, seguro, IPVA) permanecem fora do escopo.
- **R-ODO-04**: Toda consulta de "máximo de odômetro" (`findMaxOdometerByVehicle`, em `expenses` e `maintenances`) filtra por `date >= started_at do ciclo mais recente` daquele veículo. Sem linha em `vehicle_odometer_cycles`, nenhum filtro é aplicado — zero regressão para veículos sem reset.
- **R-ODO-05**: Apenas o dono do veículo (`vehicles.user_id`) pode criar um novo ciclo. A ação é feita em Configurações, exige `reason` obrigatório, e é auditada via `AuditService` (padrão R-MON-01/R-MON-02).
- **R-ODO-06**: Ao detectar `odometer_km` menor que o máximo do ciclo ativo, o sistema mantém o padrão soft-warning exception-based (`confirmed: true`, já usado em R-ODO-01 e detecção de duplicatas) com a mensagem "Odômetro atual: {maximo_atual} km. Odômetro digitado: {valor_digitado} km. Deseja manter o valor retroativo?". Quando o valor sugerir reset (próximo de zero ou salto grande), a UI oferece um segundo caminho explícito para o fluxo de novo ciclo, em vez de apenas confirmar o retroativo.

### Escopo de análises

`fuel_consumption_trend`, `get_vehicle_cost_per_km` e `calculate_vehicle_tco` passam a considerar apenas o ciclo ativo (mesmo filtro `date >= started_at`), evitando que um reset gere quilometragem negativa ou consumo distorcido nos gráficos. Não há soma vitalícia entre ciclos nesta versão — cada ciclo é analisado isoladamente.

## Consequences

**Facilita:**
- Histórico de resets é preservado indefinidamente — nenhum dado é perdido em resets sucessivos, ao contrário da opção A.
- `findMaxOdometerByVehicle` ganha uma única regra de filtro (`started_at` do ciclo mais recente) reutilizável entre `expenses` e `maintenances` — sem duplicar lógica de validação.
- Reaproveita o padrão exception-based (`confirmed: true`) já validado em produção para duplicatas e para R-ODO-01, reduzindo a superfície de código novo.
- Compatível com o padrão Repository Port já estabelecido (`ExpenseRepositoryPort`, `MaintenanceRepositoryPort` ganham um método a mais cada).
- Zero regressão para o caso comum (veículo nunca resetado): ausência de linhas em `vehicle_odometer_cycles` mantém o comportamento idêntico ao pré-ADR.

**Dificulta:**
- Quatro funções SQL analíticas em produção precisam ser alteradas (`fuel_consumption_trend`, `get_vehicle_cost_per_km`, `calculate_vehicle_tco`) para considerar o filtro de ciclo — exige deploy coordenado: **a atualização dessas funções deve preceder a liberação da UI de reset**, ou dados de analytics podem ficar silenciosamente incoerentes para veículos resetados antes do fix.
- `maintenances` nunca teve validação de odômetro — a extensão da obrigatoriedade (R-ODO-03) tem zero cobertura de teste prévia; todos os cenários (happy path, edge cases, warning) precisam ser escritos do zero.
- Introduz uma nova tabela e um novo módulo (`OdometerCyclesModule`), aumentando a superfície de manutenção do domínio de veículos.
- `vehicles.odometer` (cadastro) permanece desconectado da série de ciclos — decisão deliberada para não expandir ainda mais o escopo desta ADR; pode ser revisitada em versão futura se o cadastro precisar refletir o ciclo ativo automaticamente.

**Trade-offs aceitos:**
- Análises isoladas por ciclo (sem soma vitalícia) foram aceitas como suficientes para o MVP desta feature; TCO vitalício cruzando ciclos fica como evolução futura caso vire requisito de negócio explícito.
- A obrigatoriedade de odômetro não se estende a despesas administrativas (multa, seguro, IPVA) — o dado que essas categorias captam já tem o próprio campo `odometer_km` (ex: `fines.odometer_km`), mas seu preenchimento continua opcional e fora da nova validação de sequência.

## References

- `specs/RULES.md` — R1, R4, R-ODO-01, R-ODO-02, R-FUEL-02 (regras existentes afetadas); R-ODO-03 a R-ODO-06 (novas, a adicionar)
- `docs/architecture/decisions/ADR-001-expense-insertion-rules.md` — D2, decisão original de soft-warning que esta ADR estende sem reverter
- `specs/expenses/SPEC-20260601-001-odometer-validation.md` — Non-Goal NG-04, fechado por esta decisão
- `specs/expenses/SPEC-20260612-001-expense-form-ux-improvements.md` — origem de R-ODO-01
- `matrices/impacto.md` — IMPACTO-025
- `supabase/migrations/20260622000000_analytics_tco_fuel_trend.sql`, `20260615000000_vehicle_health_score_fn.sql` — funções a atualizar com filtro de ciclo
