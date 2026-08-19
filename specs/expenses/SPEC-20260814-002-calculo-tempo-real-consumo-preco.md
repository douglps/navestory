---
id: SPEC-20260814-002
title: "Formulário de Abastecimento: Cálculo em Tempo Real de Consumo e Preço por Litro"
status: approved
date: 2026-08-14
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-FUEL-02, R-FUEL-03, R-FUEL-06, R-FUEL-10, R-FUEL-11, R-FUEL-12, R-FORM-01, R-FORM-02, R-ANA-01]
security: [S1, S2]
camadas: [frontend, backend]
---

# SPEC-20260814-002: Formulário de Abastecimento — Cálculo em Tempo Real de Consumo e Preço por Litro

## Contexto

O formulário `/expenses/new` com `category = fuel` já persiste `price_per_liter` e `km_per_liter` no backend via SPEC-20260606-001 (approved), seguindo as regras R-FUEL-02 e R-FUEL-03. Entretanto, o usuário não recebe nenhum feedback em tempo real dessas métricas enquanto preenche o formulário — ele só descobre os valores após submeter, ou nunca, caso não acesse o histórico.

**Gap silencioso identificado no brainstorm (2026-08-14):** se o usuário preenche `amount` e `liters` mas não marca `full_tank = true` (ou deixa o campo como `null` — R-FUEL-06), o cálculo de `km_per_liter` simplesmente não ocorre no backend (R-FUEL-02), sem qualquer aviso para o usuário. O mesmo ocorre quando `liters` não é preenchido: `price_per_liter` não é calculado (R-FUEL-03). O formulário falha silenciosamente em fornecer contexto ao usuário.

**Gap de campos ausentes:** o formulário atual não renderiza os campos de combustível (`fuel_type`, `liters`, `full_tank`) — gap de frontend identificado em auditoria de 2026-08-14. Esta spec pressupõe que esses campos já estejam visíveis (o trabalho de torná-los visíveis é pré-requisito, seja pela implementação desta spec ou por trabalho paralelo). Os cálculos definidos aqui dependem diretamente dos valores de `liters`, `amount` e `full_tank` presentes no formulário.

---

## Objetivo

Exibir no formulário de abastecimento, em tempo real e sem chamadas de rede adicionais durante a digitação, as métricas calculadas `price_per_liter` e `km_per_liter`. Emitir avisos não-bloqueantes quando os valores divergem significativamente do histórico do veículo. Tornar explícito para o usuário quando o cálculo de consumo não vai ocorrer, eliminando a falha silenciosa atual.

---

## Decisão de Escopo

Esta spec cobre exclusivamente a camada de apresentação e feedback em tempo real. A lógica de cálculo persistido já definida em SPEC-20260606-001 permanece inalterada — esta spec não redefine nem altera nenhuma regra de backend. O cálculo client-side é uma mirror do cálculo backend, usada apenas para feedback imediato.

A média histórica para detecção de anomalias é carregada uma única vez no mount do formulário via server action, não recalculada a cada keystroke.

---

## Histórias de Usuário e Critérios de Aceitação

### US-01: Exibição de preço por litro em tempo real

**Como** motorista preenchendo um abastecimento, **quero** ver o preço por litro calculado automaticamente enquanto digito valor e litros, **para** conferir se o preço está coerente antes de salvar.

- **Dado que** `amount = 150,00` e `liters = 50`, **quando** o segundo campo é preenchido, **então** o formulário exibe "R$ 3,00/L" como texto informativo próximo aos campos, atualizado imediatamente sem submissão.
- **Dado que** `liters` está vazio ou zero, **quando** o campo de valor está preenchido, **então** o indicador de preço/litro não exibe nenhum valor (campo oculto ou estado "—").
- **Dado que** o valor calculado existe, **quando** é exibido, **então** usa formatação BRL com 2 casas decimais e o sufixo "/L" (ex: "R$ 3,57/L").

### US-02: Exibição de consumo (km/L) em tempo real

**Como** motorista preenchendo um abastecimento com tanque cheio, **quero** ver o consumo km/L calculado enquanto preencho os campos, **para** confirmar se o valor está dentro do esperado para o veículo.

- **Dado que** `full_tank = true`, `liters = 50` e o veículo tem odômetro anterior de 45.230 km e o atual é 46.100 km, **quando** o campo de litros é preenchido, **então** o formulário exibe "17,4 km/L" como texto informativo.
- **Dado que** `full_tank = false` ou `full_tank = null`, **quando** o formulário é renderizado, **então** o indicador de km/L não é exibido e **um aviso não-bloqueante** é exibido: "Com tanque cheio selecionado, calcularemos o consumo automaticamente."
- **Dado que** `liters` não está preenchido com um valor positivo, **quando** `full_tank = true`, **então** o indicador de km/L exibe "—" e nenhum aviso é emitido (usuário ainda está preenchendo).
- **Dado que** não existe registro de odômetro anterior para o veículo, **quando** todos os campos de combustível estão preenchidos, **então** o indicador de km/L exibe "—" com texto informativo "Histórico insuficiente para calcular consumo".

### US-03: Aviso de inconsistência com histórico

**Como** motorista, **quero** ser avisado quando o preço/litro ou consumo que digitei diverge muito do histórico do meu veículo, **para** detectar erros de digitação antes de salvar.

- **Dado que** o histórico tem 3 ou mais abastecimentos com `full_tank = true` e a média histórica de preço/litro é R$ 6,00/L, **quando** o valor calculado é R$ 12,00/L (divergência > 50%), **então** o formulário exibe um aviso amarelo não-bloqueante "Preço muito acima do histórico (média: R$ 6,00/L)" próximo ao indicador.
- **Dado que** o histórico tem menos de 3 abastecimentos com `full_tank = true`, **quando** o formulário carrega, **então** nenhum aviso de anomalia é exibido (amostra insuficiente para referência confiável).
- **Dado que** um aviso de anomalia está visível, **quando** o usuário corrige o valor para dentro da faixa histórica, **então** o aviso desaparece imediatamente.
- **Dado que** um aviso de anomalia está visível, **quando** o usuário clica em "Salvar" mesmo assim, **então** o formulário submete normalmente — o aviso nunca bloqueia a submissão.

### US-04: Aviso de cálculo impossível (gap silencioso)

**Como** motorista, **quero** ser avisado quando o cálculo de consumo não vai ocorrer por falta de dados, **para** saber que preciso ajustar os campos antes de salvar se quiser o consumo registrado.

- **Dado que** `liters` não está preenchido, **quando** o formulário está na seção de combustível, **então** exibe texto informativo "Preencha os litros para calcular preço/litro e consumo."
- **Dado que** `full_tank` está `false` ou `null`, **quando** o formulário está na seção de combustível com `liters` preenchido, **então** exibe texto informativo "Marque 'Tanque cheio' para que o consumo (km/L) seja calculado e registrado."
- **Dado que** ambos `liters` e `full_tank = true` estão preenchidos, **quando** todos os campos relevantes têm valor, **então** nenhum aviso de "gap silencioso" é exibido.

---

## Requisitos Funcionais

| ID    | Requisito | Prioridade | História relacionada |
|-------|-----------|------------|----------------------|
| RF-01 | Calcular `price_per_liter` client-side como `amount / liters` e exibir em tempo real próximo aos campos de valor e litros; exibição apenas quando `liters > 0`; atualiza a cada mudança de `amount` ou `liters` sem debounce (cálculo instantâneo, sem rede) | Alta | US-01 |
| RF-02 | Calcular `km_per_liter` client-side como `(odometer_atual - odometer_anterior) / liters` e exibir em tempo real quando: `full_tank = true` E `liters > 0` E `odometer_anterior` disponível; em qualquer outro caso, exibir "—" | Alta | US-02 |
| RF-03 | `odometer_anterior` (último odômetro registrado para o veículo) é carregado uma única vez no mount do formulário via `getOdometerHintAction` (já definida em SPEC-20260807-004); este valor é reaproveitado pelo cálculo client-side de km/L — nenhuma nova server action é criada exclusivamente para este fim | Alta | US-02 |
| RF-04 | Carregar no mount, via server action `getFuelHistoricalStats(vehicleId)`, a média histórica de `price_per_liter` e `km_per_liter` para o veículo, filtrada a abastecimentos com `full_tank = true` e mínimo de 3 registros (R-FUEL-11); retornar `null` se amostra insuficiente | Alta | US-03 |
| RF-05 | Emitir aviso não-bloqueante amarelo quando `price_per_liter` calculado diverge em mais de 50% da média histórica (acima ou abaixo); aviso desaparece assim que o valor entra na faixa; nenhum aviso quando `getFuelHistoricalStats` retornou `null` | Alta | US-03 |
| RF-06 | Emitir aviso não-bloqueante amarelo quando `km_per_liter` calculado diverge em mais de 50% da média histórica; mesmas regras de exibição de RF-05 | Alta | US-03 |
| RF-07 | Exibir aviso informativo (não-erro) quando `liters` está vazio: "Preencha os litros para calcular preço/litro e consumo." (R-FUEL-12); aviso some assim que `liters` recebe valor positivo | Alta | US-04 |
| RF-08 | Exibir aviso informativo quando `liters > 0` mas `full_tank` não é `true`: "Marque 'Tanque cheio' para que o consumo (km/L) seja calculado e registrado." (R-FUEL-12) | Alta | US-04 |
| RF-09 | Todos os indicadores e avisos client-side não interferem com a validação e submissão do formulário — são puramente informativos; o formulário pode ser submetido com qualquer combinação de valores, desde que passe a validação Zod existente (R-FUEL-02, R-FUEL-03 continuam sendo aplicados no backend) | Alta | US-01..04 |
| RF-10 | `getFuelHistoricalStats` é fire-and-forget no cliente: erros de execução (timeout, DB error) resultam em `null` para as médias, sem exibição de erro ao usuário e sem bloquear o formulário | Média | US-03 |
| RF-11 | O componente de indicadores (preço/litro, km/L, avisos) é renderizado apenas quando `category = 'fuel'`; para outras categorias, nada é exibido e nenhuma server action de histórico é disparada | Alta | US-01..04 |

---

## Requisitos Não-Funcionais

| ID     | Requisito | Métrica de Aceite |
|--------|-----------|-----------------|
| RNF-01 | Performance client-side | Cálculo de `price_per_liter` e `km_per_liter` executa em < 1ms (operação aritmética pura sem I/O) |
| RNF-02 | Performance de carga inicial | `getFuelHistoricalStats` retorna em p95 < 200ms (query com GROUP BY e COUNT em `expenses`, indexada por `vehicle_id`) |
| RNF-03 | Segurança | `getFuelHistoricalStats` valida que `vehicleId` pertence ao `auth.uid()` autenticado antes de retornar dados (S1 + S2); resultado de outro usuário nunca é retornado |
| RNF-04 | UX — formatação | Valores monetários usam `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`; km/L usa `Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })` |
| RNF-05 | UX — não-intrusivo | Avisos de inconsistência usam cor `warning` (amarelo, R-DS-03); nunca cor `danger`; nunca toast ou modal — apenas inline próximo ao campo relevante |
| RNF-06 | Acessibilidade | Indicadores e avisos têm `role="status"` ou `aria-live="polite"` para anunciar mudanças a leitores de tela; nunca `aria-live="assertive"` (interromperia o usuário durante a digitação) |

---

## Fora de Escopo

- Qualquer alteração ao cálculo persistido ou à lógica de backend de `km_per_liter` e `price_per_liter` — já definidos em SPEC-20260606-001 (approved) e não modificados por esta spec.
- Pre-fill automático dos campos `amount`, `liters` ou `price_per_liter` a partir do histórico — fora deste ciclo.
- Persitência de preferências de alerta de anomalia pelo usuário (ex: desativar avisos de inconsistência por veículo) — fora deste ciclo.
- Alertas por e-mail ou push notification sobre anomalias de abastecimento — bloqueado até Fase 9.
- Cálculo de eficiência comparativa entre veículos (benchmark de frota) — coberto por SPEC-20260622-001.
- Detecção de fraude em abastecimento — fora de escopo do MVP.
- Renderização dos campos de combustível ausentes (`fuel_type`, `liters`, `full_tank`, `supplier`) — pré-requisito desta spec, não objeto dela.

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260606-001 | Cálculo de km/L e price_per_liter no backend — regras R-FUEL-02 e R-FUEL-03; esta spec expõe o mesmo cálculo client-side como feedback |
| Spec | SPEC-20260612-002 | Definição de `full_tank` como tri-state (R-FUEL-06) — impacta condição de exibição do cálculo |
| Spec | SPEC-20260807-004 | `getOdometerHintAction` — reaproveitada (RF-03) para obter `odometer_anterior` sem duplicar server action |
| Schema | `expenses(vehicle_id, full_tank, liters, price_per_liter, km_per_liter)` | Colunas já existentes; `getFuelHistoricalStats` consulta estas colunas com filtro `full_tank = true` |
| Regra | R-ANA-01 | Define limiar de 5 registros para analytics; esta spec usa limiar diferente de 3 para feedback em formulário (R-FUEL-11 — ver Notas Técnicas) |

---

## Notas Técnicas

### Decisão de limiar: 3 vs 5 abastecimentos para referência histórica

R-ANA-01 exige mínimo de 5 registros `full_tank = true` para calcular km/L confiável na engine de analytics. Esta spec usa limiar de **3** para o feedback em tempo real do formulário.

**Justificativa:** o contexto é diferente. R-ANA-01 produz métricas persistidas e exibidas em dashboards — onde precisão estatística é prioritária. O aviso em formulário é feedback imediato e não-bloqueante: o usuário pode ignorá-lo e submeter normalmente. Usar 5 como limiar significaria que usuários com poucos abastecimentos (início de uso, novo veículo) nunca receberiam o feedback, mesmo com 3-4 registros úteis disponíveis. O custo de um falso positivo (aviso desnecessário) é baixo — o usuário ignora; o custo de ausência de feedback (erro de digitação não detectado) pode ser alto (dado incorreto persistido). Portanto, 3 é o limiar adequado para este contexto de UX, distinto do contexto analítico de R-ANA-01 que justifica 5.

Esta distinção fica registrada em R-FUEL-11.

### Estrutura de `getFuelHistoricalStats`

```sql
-- @spec SPEC-20260814-002 RF-04
SELECT
  AVG(price_per_liter) AS avg_price_per_liter,
  AVG(km_per_liter)    AS avg_km_per_liter,
  COUNT(*)             AS record_count
FROM expenses
WHERE vehicle_id = $1
  AND (SELECT auth.uid()) = user_id
  AND full_tank = true
  AND deleted_at IS NULL
  AND liters > 0
  AND price_per_liter IS NOT NULL
```

Retornar `null` se `record_count < 3`.

### Posicionamento dos indicadores no layout

Os indicadores são exibidos como uma linha de chips/badges informativos (`text-xs text-muted-foreground`) abaixo da linha de campos `amount` + `liters`, usando tokens do design system. Avisos de anomalia são `Badge` com variante `warning` (R-DS-10).

### Controle de estado client-side

Usar `useMemo` ou `useEffect` do React para recalcular os valores derivados toda vez que `amount`, `liters`, `full_tank` ou `odometer_km` mudarem no `watch` do `react-hook-form`. Não usar `useState` separado para os valores calculados — derivar diretamente dos valores do formulário.

---

## Changelog (pós-aprovação)

| Data | O que mudou | Por quê |
|------|-------------|---------|
| 2026-08-14 | Gate técnico concluído; status promovido de `draft` para `approved`. Dois ajustes de implementação registrados: (1) a referência ao "gap de campos ausentes" nos campos `fuel_type`, `liters`, `full_tank`, `supplier` estava incorreta — todos os campos já são renderizados condicionalmente no formulário atual (`page.tsx` linhas 631-714); o pré-requisito está satisfeito sem trabalho adicional. (2) `getFuelHistoricalStats` deve ser implementada como endpoint REST `GET /expenses/fuel-stats?vehicle_id=:id` em `apps/api/ExpensesController`, não como Next.js Server Action — segue o padrão estabelecido do projeto (`apiClient` + TanStack Query). Nenhuma regra de negócio foi alterada. | Gate técnico (tech-lead, 2026-08-14). |
| 2026-08-14 | Implementação concluída. Ajuste de RF-03 identificado durante a implementação: `getOdometerHintAction` (SPEC-20260807-004) referenciada como pré-existente nunca foi construída neste projeto. Em vez de introduzir uma 3ª chamada de rede (violando a intenção original de RF-03), `GET /expenses/fuel-stats` passou a devolver também `last_odometer_km` (maior odômetro já registrado para o veículo, independente do limiar de 3 usado nas médias de R-FUEL-11) — o formulário reaproveita a mesma chamada de RF-04 para obter o odômetro anterior. Nenhuma regra de negócio foi alterada; a mudança é de mecanismo de obtenção do dado, não de comportamento observável. Código: `apps/api/src/modules/expenses/expenses.service.ts` (`getFuelStats`), `packages/validators/src/expense.schemas.ts` (`FuelStats.last_odometer_km`), `apps/web/src/lib/fuel-realtime-calc.ts`. | Implementação (2026-08-14). |
| 2026-08-15 | Correção de premissa de contexto em RF-01: a frase do Contexto "o usuário não recebe nenhum feedback em tempo real dessas métricas" estava desatualizada — `useFuelCrossCalc` (SPEC-20260612-001 RF-05.2) já exibia `price_per_liter` calculado em tempo real via campo editável "Valor por litro". O componente `FuelRealtimeIndicators` removeu a exibição redundante de `formattedPrice` (`R$ X,XX/L` como texto informativo), que duplicava o valor já visível no campo editável. RF-01 continua satisfeito pelo campo editável pré-existente; `FuelRealtimeIndicators` cobre RF-02 (km/L), RF-05/RF-06 (anomalias vs. histórico) e RF-07/RF-08 (avisos de gap silencioso) — que são o valor diferencial real desta spec. Removido também `summaryConsistent` de `page.tsx` (texto resumo matemático sem rastreabilidade de spec, redundante com campo editável e indicadores). Nenhuma regra de negócio foi alterada; os testes de `fuel-realtime-calc.spec.ts` permanecem válidos sem modificação. Código: `apps/web/src/components/expenses/fuel-realtime-indicators.tsx`, `apps/web/src/app/(app)/expenses/new/page.tsx`. | Gate técnico — reconciliação de mecanismos sobrepostos (tech-lead, 2026-08-15). |
| 2026-08-15 | Gap de escopo identificado: `/expenses/[id]` (edição de abastecimento) não recebe `FuelRealtimeIndicators` — só `/expenses/new` (criação) tem km/L, avisos de anomalia vs. histórico e avisos de gap silencioso. Decisão de produto: aprovado para inclusão no próximo ciclo de refinamento de expenses, sem urgência de sprint dedicado. Justificativa: a edição é exatamente o momento em que o usuário corrige um erro de digitação já cometido (litros, odômetro) — negar o feedback de anomalia nesse momento contradiz o objetivo central desta spec ("detectar erros de digitação antes de salvar"), mas não bloqueia o fechamento da spec porque a criação (fluxo primário do JTBD #1, "registrar logo após abastecimento") já está entregue. Critério de aceleração: qualquer relato de usuário de "corrigi o valor mas não percebi que ainda estava errado" sobe este item para o próximo ciclo imediato. Esforço estimado como baixo — `FuelRealtimeIndicators` já existe como componente isolado; a página de edição já carrega `vehicleId` e os valores necessários. Antes de entrar em sprint, o `tech-lead` deve validar o esforço real de implementação. | Decisão de produto (product-owner, 2026-08-15), a partir de gap levantado pelo tech-lead. |
| 2026-08-15 | Validação técnica de esforço concluída (tech-lead, 2026-08-15). Veredito: esforço P, aprovado para sprint. Padrão de estado da edição é idêntico ao da criação (estado local + `useFuelCrossCalc` já instanciado em `[id]/page.tsx` linha 114) — nenhuma adaptação estrutural necessária. `useFuelHistoricalStats` pode ser reaproveitado como está, passando `expense?.vehicle_id ?? ""` como fallback enquanto o carregamento não conclui (o `enabled` interno do hook cobre o caso). Cinco passos concretos: (1) adicionar os dois imports; (2) instanciar `useFuelHistoricalStats`; (3) substituir o bloco `summaryConsistent` + sua renderização por `<FuelRealtimeIndicators>` com as props equivalentes às de `new/page.tsx`; (4) remover a variável `summaryConsistent` (desnecessária, removida de `new/page.tsx` no ciclo anterior pelo mesmo motivo); (5) anotar `@spec SPEC-20260814-002 RF-02, RF-05, RF-06, RF-07, RF-08, RF-11`. Nenhuma mudança de backend. Ressalva de baixa prioridade registrada como débito técnico: `GET /expenses/fuel-stats` inclui o próprio registro sendo editado no cálculo da média histórica de referência — viés de 1/N, tolerável para aviso não-bloqueante com N >= 3 (R-FUEL-11), mas futuro parâmetro `exclude_id` eliminaria o viés em casos extremos. | Validação técnica (tech-lead, 2026-08-15). |
| 2026-08-15 | Implementação da paridade concluída, seguindo exatamente os 5 passos validados pelo tech-lead. `FuelRealtimeIndicators` + `useFuelHistoricalStats` agora presentes em `/expenses/[id]`; `summaryConsistent` removida (mesma reconciliação já aplicada a `/expenses/new`). Matriz de rastreabilidade atualizada (RF-11). Nenhum teste dedicado novo criado para a tela de edição — cobertura por reaproveitamento do componente já testado em `fuel-realtime-calc.spec.ts`, registrado como lacuna conhecida na matriz. Código: `apps/web/src/app/(app)/expenses/[id]/page.tsx`. | Implementação (2026-08-15). |
