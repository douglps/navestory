---
id: SPEC-20260804-006
title: "Dashboard — Acessibilidade, Correções de Dado e Polimento Visual"
status: draft
date: 2026-08-04
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-DS-12, C-DS-01, R-KPI-04, R-KPI-01, R-KPI-02, R-ANA-02, R-DS-08, R-DS-10]
security: []
camadas: [frontend]
---

# Dashboard — Acessibilidade, Correções de Dado e Polimento Visual

## Contexto

Auditoria cruzada conduzida pelos agentes `ux-researcher` e `design-system` sobre a tela de Dashboard
(`apps/web/src/app/(app)/dashboard/page.tsx` e componentes em `apps/web/src/components/dashboard/`)
identificou 20 pontos de melhoria distribuídos em cinco blocos de prioridade.

Os achados cobrem falhas de acessibilidade WCAG AA (bloqueantes para o público com baixa visão),
erros de interpretação estatística que podem induzir o usuário a conclusões erradas, problemas de
forma de apresentação dos gráficos, conteúdo posicionado no lugar errado e inconsistências de
hierarquia visual / design tokens.

Esta spec formaliza esses achados como requisitos funcionais rastreáveis. Nenhum código é gerado
por este documento — ele é pré-requisito para a implementação.

---

## Objetivos

1. Corrigir falhas de acessibilidade (contraste WCAG AA, indicadores de foco) nos componentes do
   dashboard — Bloco 1, classificado como **crítico**.
2. Prevenir leitura equivocada de KPIs e gráficos por insuficiência de contexto (prazo relativo,
   supressão de métrica estatística sem amostra, rótulo de unidade ausente) — Bloco 2.
3. Melhorar clareza dos gráficos substituindo formas de apresentação inadequadas para o dado
   exibido — Bloco 3.
4. Remover ou realocar conteúdo que ocupa posição errada no fluxo de navegação — Bloco 4.
5. Estabelecer hierarquia visual clara e tokens consistentes entre os cards do dashboard — Bloco 5.

---

## Fora de Escopo

Os itens abaixo foram identificados durante a auditoria mas **não fazem parte desta spec**.
Qualquer implementação relacionada exige spec própria.

- **Resgate do `EventTimeline` do protótipo concept como componente de produção** (`apps/web/src/app/(app)/dashboard/concept/page.tsx`): mudança estrutural maior, depende de decisão de produto sobre valor do timeline em relação ao custo de migração.
- **Mini-gauge/meter para o KPI `fleet_health`**: melhoria visual futura; mencionada como ideia, não como requisito desta versão.
- **Guarda de rota para `/dashboard/concept*`**: questão de segurança/infra separada (evitar exposição do protótipo em produção); deve ser tratada em spec de segurança ou devops.

---

## Requisitos Funcionais

### Bloco 1 — Acessibilidade (crítico)

**RF-01 — Substituição de tamanho de fonte arbitrário nos badges de documento**

Arquivo: `apps/web/src/components/dashboard/VehicleHealthCard.tsx`, linhas ~88 e ~154.

A classe `text-[10px]` deve ser substituída por `text-xs` (12 px) — ou, no máximo, `text-[11px]`
quando o layout exigir compressão adicional justificada. A classe `text-[Npx]` viola R-DS-12
(escala tipográfica formal obrigatória) e gera texto abaixo do tamanho mínimo legível para
usuários com baixa acuidade visual.

Critério de aceitação: nenhuma ocorrência de `text-[10px]` permanece nos componentes de produção
do dashboard após a correção (verificável por `grep`).

---

**RF-02 — Correção de contraste em badge de documento no dark mode**

Arquivo: `apps/web/src/components/dashboard/VehicleHealthCard.tsx`, linha ~154.

A classe `text-warning-foreground` aplicada ao texto do badge de documento deve ser substituída
por `text-foreground`. Em dark mode, o token `--warning-foreground` produz um grafite quase-preto
sobre o fundo pastel escuro do próprio badge, resultando em contraste insuficiente para WCAG AA
(C-DS-01). O token `text-foreground` respeita o contraste correto em ambos os temas.

Critério de aceitação: o par `text-warning-foreground` sobre fundo de warning-pastel em dark mode
atinge relação de contraste ≥ 4,5:1 após a correção, ou a classe é removida conforme descrito.

---

**RF-03 — Indicadores de foco (`focus-visible:ring-*`) em elementos interativos**

Os três elementos abaixo não possuem indicador de foco visível por teclado e precisam receber
`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` (ou equivalente usando
os tokens de ring já definidos no design system):

- Link "Histórico de Atividades" em `apps/web/src/app/(app)/dashboard/page.tsx`, ~linhas 366–372.
- Botão × de fechamento do `StickyFocusChip` em `apps/web/src/components/dashboard/VehicleSpotlight.tsx`, ~linhas 77–86.
- Botão de ação em `apps/web/src/components/dashboard/VehicleHealthCard.tsx`, ~linha 115.

Critério de aceitação: ao navegar por teclado (Tab), cada um dos três elementos exibe anel de
foco visível em ambos os temas (light e dark), sem conflito com o layout adjacente.

---

### Bloco 2 — Correção de Dado e Interpretação

**RF-04 — KPI `next_maintenance`: prazo relativo como valor primário**

Arquivo(s): componente de KPI do `next_maintenance` no dashboard.

O card do KPI `next_maintenance` deve exibir o prazo relativo ("em 11 dias" / "venceu há 3 dias")
como valor primário — a informação mais importante para a persona que precisa agir. A data absoluta
(ex.: "12/08/2026") permanece como informação secundária (legenda/subtexto abaixo do valor principal).

A lógica de formatação de `relativeLabel` já existe no protótipo em
`apps/web/src/app/(app)/dashboard/concept/page.tsx` e deve ser extraída/reutilizada, não
reimplementada. Datas no passado devem indicar vencimento ("venceu há N dias"), não prazo futuro.

Critério de aceitação: o card exibe primeiro o rótulo relativo e depois a data; a função
`relativeLabel` utilizada é a mesma (ou derivada diretamente) do protótipo existente.

---

**RF-05 — KPI `expense_anomalies`: supressão com amostra histórica insuficiente**

O card do KPI `expense_anomalies` (anomalia por Z-Score) **não deve exibir o valor numérico de
anomalias** quando a amostra histórica do usuário for pequena demais para que o Z-Score seja
estatisticamente significativo — seguindo a mesma lógica de `DELTA_SUPPRESSION_MIN_SAMPLE` já
usada para supressão de deltas percentuais (R-KPI-02).

Comportamento esperado quando a amostra é insuficiente (conforme R-KPI-04):
- Opção A (preferida): exibir o card em estado "indisponível" com label "Amostra insuficiente" no
  lugar do valor numérico — sem seta, sem cor semântica.
- Opção B (alternativa): exibir o valor numérico mas acompanhado de um aviso textual explícito
  ("Resultado com poucos dados — interprete com cautela").

A escolha entre A e B é decisão de implementação, mas nunca pode omitir o contexto de amostra
insuficiente quando a condição for verdadeira.

A regra de negócio formal que governa este comportamento é R-KPI-04 (criada por esta spec — ver
seção de Dependências).

Critério de aceitação: dado um usuário com menos registros históricos que `DELTA_SUPPRESSION_MIN_SAMPLE`,
o card `expense_anomalies` exibe estado de supressão em vez de valor numérico.

---

**RF-06 — KPI `cost_per_km`: sufixo "/km" explícito**

Arquivo(s): `specForId` do KPI `cost_per_km` no catálogo de KPIs do dashboard.

O card do KPI `cost_per_km` deve exibir o sufixo `/km` junto ao valor monetário (ex.: "R$ 0,43 /km").
Atualmente o card exibe apenas o valor monetário sem unidade, tornando o indicador ambíguo para
usuários que não conhecem previamente o que está sendo medido.

Critério de aceitação: o valor exibido no card inclui o rótulo de unidade "/km" de forma legível,
sem interferir na formatação monetária BRL.

---

**RF-07 — KPI `cost_per_km` em visão de frota: indicação de média ponderada**

Quando o usuário estiver no contexto "toda a frota" ou grupo com múltiplos veículos, o card do
KPI `cost_per_km` deve indicar que o valor exibido é a **média ponderada da frota**, não o custo
por km de um veículo individual. A indicação pode ser feita via tooltip ou via label secundário
(ex.: "média da frota" abaixo do valor).

A ausência dessa indicação pode levar o usuário a comparar o agregado de frota com o custo de um
veículo específico sem perceber que os valores têm semânticas diferentes.

Critério de aceitação: em contexto de frota/grupo com 2+ veículos, o card exibe rótulo ou tooltip
indicando "média da frota"; em contexto de veículo único, o rótulo de média não aparece.

---

### Bloco 3 — Forma de Apresentação dos Gráficos

**RF-08 — `ExpenseCategoryPie`: substituição por BarChart horizontal**

Arquivo: `apps/web/src/components/dashboard/FleetCharts.tsx`, componente `ExpenseCategoryPie`.

O `PieChart` deve ser substituído por um `BarChart` horizontal com barras ordenadas em ordem
decrescente de valor (maior gasto no topo). Justificativa: gráficos de pizza são de comparação
difícil quando há 6 ou mais categorias com valores próximos — o BarChart horizontal permite
comparação direta de comprimento, que é o canal visual mais preciso disponível.

O chart deve continuar utilizando as cores categóricas do design system (`CHART_CATEGORY_COLORS`
/ `--categorical-1..5`), conforme R-DS-07. Rótulos de valor são obrigatórios em cada barra
(R-DS-08 — toda informação codificada por cor deve ter label textual).

Critério de aceitação: `FleetCharts.tsx` não contém mais a importação ou uso de componente
PieChart para categorias de despesa; o BarChart horizontal é exibido com barras ordenadas e
rótulos de valor visíveis.

---

**RF-09 — `UpcomingCostsWidget`: chip de urgência isolado em vez de fundo colorido no item**

Arquivo: `apps/web/src/components/dashboard/UpcomingCostsWidget.tsx`.

O fundo colorido que tinge o item inteiro por urgência deve ser removido. Em seu lugar, um chip de
urgência isolado (pill/badge) deve ser exibido junto ao rótulo do item — padrão já usado em
`FleetAlertBar.tsx` e consistente com R-DS-10 (badge para pill de status isolado) e R-DS-08
(escala de urgência sempre acompanhada de label textual).

O fundo do item permanece neutro (`bg-card` ou `bg-muted/40`) independentemente do nível de
urgência. Apenas o chip carrega a cor semântica de urgência.

Critério de aceitação: nenhum item do `UpcomingCostsWidget` aplica fundo colorido ao wrapper do
item; o chip de urgência é renderizado separado e usa as classes semânticas do design system
(`urgency-hot`, `warning`, `danger`, `info`).

---

**RF-10 — `UpcomingCostsWidget`: rótulo de valor estimado por extenso**

Arquivo: `apps/web/src/components/dashboard/UpcomingCostsWidget.tsx`.

O prefixo "~" antes de valores estimados (ex.: "~R$ 450,00") deve ser substituído pela forma por
extenso "R$ 450,00 (aprox.)". O símbolo "~" não é interpretável pela persona leiga (Carlos —
motorista autônomo) e passa despercebido por usuários com menor letramento digital.

Critério de aceitação: nenhuma ocorrência do padrão `~R$` permanece no template do
`UpcomingCostsWidget`; valores estimados exibem "(aprox.)" de forma legível.

---

**RF-11 — `FuelConsumptionChart`: nota explicativa de semântica do eixo Y**

Arquivo: componente do gráfico de combustível da frota no dashboard.

O gráfico de litros/mês de frota deve exibir uma nota ou `description` abaixo do título
explicando que o gráfico mede **volume consumido**, não eficiência (km/L). A ausência dessa
distinção induz leitura errônea: um aumento no volume pode significar apenas que mais km foram
rodados, não que a eficiência piorou.

Texto sugerido (pode ser adaptado): "Litros totais consumidos — aumento pode refletir maior
quilometragem, não piora de eficiência."

Critério de aceitação: o gráfico exibe nota de contexto visível junto ao título ou eixo Y;
o texto diferencia volume de eficiência.

---

### Bloco 4 — Remoção e Realocação de Conteúdo

**RF-12 — Remover `total_vehicles` do preset padrão de KPIs**

O KPI `total_vehicles` deve ser removido do conjunto padrão de 4 KPIs ativados por padrão
(R-KPI-01). O dado é de baixo valor informativo no dia a dia — a contagem de veículos da frota
não muda com frequência e não orienta nenhuma ação imediata.

O KPI continua disponível no catálogo e pode ser ativado manualmente pelo usuário via `KpiPicker`.

Critério de aceitação: o preset padrão não inclui `total_vehicles`; o KPI continua acessível via
`KpiPicker` para ativação manual.

---

**RF-13 — Mover `ExportControls` (exportação CSV) do dashboard para `/expenses`**

O componente `ExportControls` (exportação de dados em CSV) deve ser removido do dashboard e
reposicionado na tela `/expenses`, onde os dados de despesa residem e onde o usuário está no
contexto certo para realizar essa ação.

Justificativa: exportação é uma ação de gestão de dados transacionais, não uma ação de visão
consolidada. Colocá-la no dashboard cria confusão sobre qual recorte de dados será exportado e
ocupa espaço valioso no header do dashboard.

Critério de aceitação: `ExportControls` não é renderizado em `apps/web/src/app/(app)/dashboard/page.tsx`;
o componente (ou equivalente funcional) está acessível na tela de despesas.

---

**RF-14 — Mover link "Histórico de Atividades" para sidebar ou área de configurações**

O link "Histórico de Atividades" atualmente posicionado no header do dashboard deve ser
reposicionado para a sidebar de navegação principal ou para a área de configurações/perfil.

Justificativa: o header do dashboard deve conter apenas controles de contexto e ações primárias
da tela atual. "Histórico de Atividades" é uma navegação global que faz sentido estar sempre
acessível, não ancorada no header de uma tela específica.

Critério de aceitação: o link "Histórico de Atividades" não aparece no header do dashboard;
o usuário consegue acessar a funcionalidade a partir da sidebar ou do menu de configurações.

---

**RF-15 — `VehicleSpotlight`: aba inicial dinâmica baseada em flags de urgência**

Arquivo: `apps/web/src/components/dashboard/VehicleSpotlight.tsx`.

Ao selecionar um veículo no `VehicleSpotlight`, a aba inicial exibida deve ser determinada
pelo estado de urgência do veículo:

- Se o veículo tiver flag de manutenção vencida, documento a vencer ou alerta ativo (conforme
  flags emitidas por R-HS-10): abrir automaticamente na aba **"Docs"** ou na aba correspondente
  ao tipo de alerta mais urgente.
- Caso contrário: abrir na aba **"Despesas"** (comportamento atual / padrão).

A lógica de seleção da aba inicial não deve ser persistida em sessionStorage — é determinada
a cada seleção de veículo com base no estado atual das flags.

Critério de aceitação: dado um veículo com `maintenance_overdue.count > 0` ou qualquer `*_expiring`
flag ativa (conforme R-HS-10), ao selecioná-lo no spotlight a aba "Docs" é exibida por padrão;
dado um veículo sem flags, a aba "Despesas" é exibida.

---

### Bloco 5 — Hierarquia Visual e Polimento

**RF-16 — Headings `h2` com classe `.kicker` antes de cada seção principal**

Cada seção principal do dashboard deve ser precedida por um elemento `<h2>` com a classe `.kicker`
já definida em `apps/web/src/app/globals.css`. Seções afetadas:

- Alertas (`FleetAlertBar`)
- Indicadores (grid de KPI cards)
- Frota (`FleetCharts` / visão de frota)
- Em Foco (`VehicleSpotlight`)
- Próximos 7 Dias (`UpcomingCostsWidget`)
- Gráficos (seção de gráficos históricos)

O `.kicker` fornece âncora semântica para leitores de tela e define hierarquia visual clara entre
seções, que atualmente se fundem visualmente sem separação.

Critério de aceitação: cada uma das seções listadas possui `<h2 className="kicker">` imediatamente
antes do conteúdo da seção; a hierarquia H1 (título da página) → H2 (seções) é respeitada.

---

**RF-17 — Separação visual do `KpiPicker` em relação ao grid de KPIs**

O controle `KpiPicker` ("Personalizar KPIs") deve ser visualmente distinto do grid de KPI cards —
atualmente parece um card adicional colado ao grid, o que cria confusão sobre se é um KPI ativo
ou uma ação de configuração.

A separação pode ser feita por espaçamento, divider, agrupamento visual próprio (ex.: seção
"Configurar" separada) ou por posicionamento fora do grid (ex.: acima ou abaixo do grid, com
rótulo de ação). A solução exata é decisão de implementação, mas o resultado deve deixar claro ao
usuário que é uma ação, não um indicador.

Critério de aceitação: um usuário que vê o dashboard pela primeira vez consegue distinguir o
`KpiPicker` dos KPI cards ativos sem ambiguidade; validado por revisão visual com as personas
do PRD.

---

**RF-18 — `KpiCard`: largura responsiva via grid (remover `min-w`/`max-w` fixos)**

Arquivo: componente `KpiCard` do dashboard.

As classes `min-w-[150px]` e `max-w-[220px]` aplicadas ao `KpiCard` devem ser removidas. O card
deve usar `w-full` e deixar o grid responsivo controlar a largura — padrão já estabelecido pelo
grid do dashboard. Os valores fixos de `min-w`/`max-w` quebram o layout responsivo em viewports
intermediárias.

Critério de aceitação: o `KpiCard` renderiza sem `min-w-*` ou `max-w-*` hardcoded; o grid de KPI
cards mantém layout correto em viewports de 320px, 768px e 1280px.

---

**RF-19 — Token de "superfície ativa/selecionada" em `globals.css`**

Arquivo: `apps/web/src/app/globals.css`.

Os valores ad hoc `bg-primary/8` (em `VehicleHealthCard.tsx`) e `bg-primary/10` (em
`VehicleSpotlight.tsx`) representam o mesmo conceito semântico — superfície ativa/selecionada —
mas usam opacidades diferentes, gerando inconsistência visual entre os dois componentes.

Um token CSS único deve ser definido em `globals.css` (ex.: `--surface-selected`) e aplicado nos
dois lugares. O valor específico (8% ou 10% de `primary`, ou outro valor calibrado) é decisão de
implementação, mas deve ser único e documentado como token canônico para esse conceito.

Critério de aceitação: existe exatamente um token CSS definindo a superfície ativa/selecionada; os
dois componentes o referenciam; nenhuma ocorrência residual de `bg-primary/8` ou `bg-primary/10`
permanece em outro componente do dashboard sem ser substituída pelo token.

---

**RF-20 — Padronização de `glass-card` vs `bg-card` entre os cards do dashboard**

O `UpcomingCostsWidget` usa `glass-card` enquanto os demais cards do dashboard usam `bg-card`.
Um único padrão deve ser escolhido e aplicado consistentemente em todos os cards do dashboard.

A decisão de qual padrão adotar (glass ou sólido) é de responsabilidade do designer/implementador,
mas deve ser justificada em comentário no código e aplicada de forma uniforme. A inconsistência
atual produz hierarquia visual involuntária — o widget de custos aparece como elemento de destaque
sem intenção.

Critério de aceitação: todos os cards de primeiro nível do dashboard usam a mesma classe de
superfície (glass ou sólida); nenhum card usa o padrão alternativo sem justificativa explícita
em comentário.

---

## Requisitos Não-Funcionais

**RNF-01 — Sem regressão em contraste**

Qualquer mudança de cor ou token introduzida por esta spec deve ser verificada manualmente (ou
via `contrast.spec.ts` se coberta pelos pares críticos) para garantir que não introduz nova falha
de contraste WCAG AA. Aplica C-DS-01.

**RNF-02 — Sem nova dependência de biblioteca**

Nenhum dos RFs acima justifica a adição de uma nova biblioteca ao projeto. A lógica de
`relativeLabel` (RF-04) reutiliza código já existente no protótipo. O BarChart (RF-08) usa o
mesmo sistema de charts já presente (`recharts` ou equivalente já instalado).

**RNF-03 — Compatibilidade com ambos os temas**

Todos os ajustes de componente devem ser validados em light mode e dark mode. Em particular:
RF-01, RF-02, RF-03 (acessibilidade), RF-19 (token) e RF-20 (superfície de card).

**RNF-04 — Sem impacto em `/dashboard/concept*`**

O protótipo em `apps/web/src/app/(app)/dashboard/concept/` é isolado e não deve ser afetado por
esta implementação. Reutilizar lógica do protótipo (RF-04) é permitido; modificar o protótipo
para atender aos RFs não é.

---

## Histórias de Usuário e Critérios de Aceitação

### HU-01 — Carlos corrige interpretação de prazo de manutenção

Como Carlos (motorista autônomo), quero ver o prazo relativo de manutenção ("em 11 dias") em
destaque no card do dashboard, para entender imediatamente se preciso agir hoje ou posso esperar.

**Dado que** Carlos acessa o dashboard com um veículo com manutenção agendada para daqui a 11 dias,  
**quando** o card `next_maintenance` é exibido,  
**então** o valor principal do card é "em 11 dias" e a data absoluta aparece em texto menor abaixo.

**Dado que** o prazo de manutenção já venceu há 3 dias,  
**quando** o card `next_maintenance` é exibido,  
**então** o valor principal é "venceu há 3 dias" com cor semântica de urgência.

---

### HU-02 — Ana não é induzida por métrica estatística sem amostra

Como Ana (gestora de frota de PME), quero que o dashboard não me mostre um índice de anomalia de
despesas quando os dados históricos são insuficientes para calcular uma anomalia real, para que
eu não tome decisões baseadas em ruído estatístico.

**Dado que** Ana tem menos registros históricos de despesas do que o mínimo definido por R-KPI-04,  
**quando** o card `expense_anomalies` é renderizado,  
**então** o card exibe estado de "amostra insuficiente" em vez de um valor numérico.

**Dado que** Ana tem registros históricos suficientes,  
**quando** o card `expense_anomalies` é renderizado,  
**então** o valor numérico de anomalias é exibido normalmente.

---

### HU-03 — Carlos navega pelo dashboard usando apenas o teclado

Como Carlos (usuário com limitação motora que usa teclado), quero que todos os elementos
interativos do dashboard tenham indicador de foco visível ao navegar por Tab, para saber onde
estou na tela sem depender do mouse.

**Dado que** Carlos navega por Tab no dashboard,  
**quando** o foco chega ao link "Histórico de Atividades", ao botão × do chip e ao botão de ação
do card de saúde do veículo,  
**então** cada elemento exibe anel de foco visível e contrastante em ambos os temas.

---

### HU-04 — Ana vê o veículo problemático abrir na aba certa

Como Ana, quero que ao selecionar um veículo com alerta de documento no `VehicleSpotlight` a aba
de documentos seja aberta automaticamente, para não precisar procurar a informação urgente.

**Dado que** Ana seleciona no `VehicleSpotlight` um veículo com IPVA a vencer em 7 dias,  
**quando** o spotlight exibe o painel do veículo,  
**então** a aba "Docs" é exibida como aba ativa por padrão.

**Dado que** Ana seleciona um veículo sem alertas ativos,  
**quando** o spotlight exibe o painel do veículo,  
**então** a aba "Despesas" é exibida como aba ativa por padrão.

---

## Dependências

### Regra de negócio nova (criada por esta spec)

**R-KPI-04** — criada em `specs/RULES.md` como parte da aprovação desta spec. Governa RF-05:

> O KPI `expense_anomalies` (anomalia por Z-Score) não exibe o valor numérico — ou o exibe com
> aviso explícito de amostra insuficiente — quando a contagem total de registros históricos
> disponíveis para o usuário for menor que `DELTA_SUPPRESSION_MIN_SAMPLE` (mesmo limiar usado em
> R-KPI-02 para supressão de deltas). Exibir um índice de anomalia sem esse contexto induz leitura
> errônea de "zero anomalias" quando a realidade é "dados insuficientes para detectar anomalias".
> Esta regra estende R-ANA-02 à camada de apresentação do dashboard.

### Protótipos reutilizados

- `apps/web/src/app/(app)/dashboard/concept/page.tsx`: fonte da função `relativeLabel` a ser
  extraída para RF-04. A extração deve respeitar RNF-04 (não modificar o protótipo).

### Specs relacionadas (sem dependência de implementação)

- [SPEC-20260721-002](SPEC-20260721-002-dashboard-v2.md) — Dashboard v2 (KPI cards, sparklines,
  catálogo de KPIs). O catálogo de KPIs e o preset padrão a ser ajustado em RF-12 estão definidos
  nessa spec.
- [SPEC-20260730-001](../vehicles/SPEC-20260730-001-vehicle-health-score.md) — Score de Saúde
  (R-HS-10: flags canônicas usadas por RF-15 para determinar aba inicial do VehicleSpotlight).
- [SPEC-20260729-002](../design-system/SPEC-20260729-002-prata-fase-2-categoricos-urgencia-varredura.md) — Escala de urgência (R-DS-08: usada por RF-09 para os chips do UpcomingCostsWidget).
- [SPEC-20260731-005](../design-system/SPEC-20260731-005-remapeamento-escala-text-tailwind.md) — Remapeamento da escala tipográfica (R-DS-12: governa RF-01).
