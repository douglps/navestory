# Regras do Domínio — Nave SaaS

> Identificadores estáveis e citáveis. Casos de teste referenciam por ID (`CT-001 valida R1`). Código anota com `// valida R1`.

---

## Regras de Domínio (R)

| ID | Regra | Spec |
|----|-------|------|
| R1 | `odometer_km` não pode ser menor que o maior valor já registrado para aquele veículo | [SPEC-20260601-001](expenses/SPEC-20260601-001-odometer-validation.md) |
| R2 | Despesa criada com os mesmos `vehicle_id`, `category`, `amount` e data de um registro ativo existente do mesmo usuário é sempre persistida (nunca bloqueada); a resposta é enriquecida com `duplicate_warning: true` e `duplicate_id` do registro suspeito. **v2** — ver [Histórico de Versões](#histórico-de-versões) | [SPEC-20260601-002](expenses/SPEC-20260601-002-duplicate-detection.md) |
| R3 | Limite de 20 templates por usuário — enforced por DB trigger e validado no service | [SPEC-20260601-003](expenses/SPEC-20260601-003-expense-templates.md) |
| R4 | `odometer_km` é obrigatório para despesas de categoria `fuel` (abastecimento) | [SPEC-20260601-001](expenses/SPEC-20260601-001-odometer-validation.md) |
| R5 | Soft-delete via `deleted_at`; registros com `deleted_at IS NOT NULL` são invisíveis por padrão em todas as listagens | todos os domínios |
| R6 | Template não persiste `date` nem `odometer_km` — esses campos são sempre preenchidos no momento do uso | [SPEC-20260601-003](expenses/SPEC-20260601-003-expense-templates.md) |
| R7 | Transições válidas de manutenção: `scheduled → [in_progress, completed, cancelled]`; `in_progress → [completed, cancelled]`; `completed` e `cancelled` são estados terminais sem transições de saída; transições fora desse grafo são rejeitadas com 409 | [SPEC-20260603-002](maintenance/SPEC-20260603-002-maintenance-status-transitions.md) |
| R-VEH-01 | Soft-delete de veículo é em cascata: todas as despesas e manutenções vinculadas recebem `deleted_at` com o mesmo timestamp | [SPEC-20260602-002](vehicles/SPEC-20260602-002.md) |
| R-VEH-02 | Placa normalizada para uppercase sem hífens antes de persistir; aceita padrão BR (ABC1234) e Mercosul (ABC1D23); placa com formato inválido retorna 400 | [SPEC-20260602-002](vehicles/SPEC-20260602-002.md) |
| R-MON-01 | `AuditService.log()` é sempre fire-and-forget; erros nunca propagam para a operação principal | [SPEC-20260602-005](dashboard/SPEC-20260602-005.md) |
| R-MON-02 | O campo `changes` em `audit_logs` não armazena PII; campos sensíveis (`user_id`, `photo_url`, tokens) são omitidos no registro e filtrados na exibição | [SPEC-20260602-005](dashboard/SPEC-20260602-005.md) |
| R-MON-03 | `audit_logs.user_id` é `ON DELETE SET NULL`; registros são preservados após exclusão de conta para fins de compliance | [SPEC-20260602-005](dashboard/SPEC-20260602-005.md) |
| R-MON-04 | `audit_logs` é imutável — `UPDATE`/`DELETE` bloqueados por RLS (`audit_logs_no_update`, `audit_logs_no_delete`), independente do client usado | [SPEC-20260602-005](dashboard/SPEC-20260602-005.md) |
| R-CAT-01 | Máximo 20 categorias personalizadas por usuário — enforced no service (`CategoriesService.MAX_CUSTOM`); retorna 422 ao exceder | [SPEC-20260602-004](expenses/SPEC-20260602-004.md) |
| R-CAT-02 | `value` de categoria personalizada segue slug `^[a-z0-9_-]+$`, 1–50 caracteres; validado por Zod e por constraint de DB | [SPEC-20260602-004](expenses/SPEC-20260602-004.md) |
| R-CAT-03 | `value` de categoria personalizada não pode coincidir com o `value` de nenhuma categoria padrão; retorna 409 se coincidir | [SPEC-20260602-004](expenses/SPEC-20260602-004.md) |
| R-CAT-04 | Hard-delete de categoria; despesas existentes com aquele `category` value não são afetadas (campo TEXT, sem FK) | [SPEC-20260602-004](expenses/SPEC-20260602-004.md) |
| R-GRP-01 | Máximo 200 veículos por grupo — validado pelo schema Zod em `setGroupMembersInputSchema` | [SPEC-20260602-003](vehicle-groups/SPEC-20260602-003.md) |
| R-GRP-02 | `setGroupMembers` usa replace-all; histórico de membros anteriores não é preservado | [SPEC-20260602-003](vehicle-groups/SPEC-20260602-003.md) |
| R-GRP-03 | Apenas veículos ativos (`deleted_at IS NULL`) do próprio usuário podem ser membros de um grupo; veículos inválidos são descartados silenciosamente | [SPEC-20260602-003](vehicle-groups/SPEC-20260602-003.md) |
| R-GRP-04 | Exclusão de grupo é hard-delete; membros são removidos por cascade FK, não por lógica de aplicação | [SPEC-20260602-003](vehicle-groups/SPEC-20260602-003.md) |
| R-CTX-01 | Apenas um modo de contexto (`single`, `group`, `multi`, `attribute`) pode estar ativo simultaneamente; ativar qualquer modo zera os demais campos conflitantes no store | [SPEC-20260602-001](context/SPEC-20260602-001-em-foco-contexto-global.md) |
| R-CTX-02 | Contextos `single` e `group` persistem em sessionStorage (isolado por aba); `multi` e `attribute` são efêmeros (somente sessão); logout limpa todos os campos de contexto e remove explicitamente a chave do sessionStorage. **v2** — ver [Histórico de Versões](#histórico-de-versões) | [SPEC-20260602-001](context/SPEC-20260602-001-em-foco-contexto-global.md), [SPEC-20260603-001](context/SPEC-20260603-001-context-chip-subheader.md) |
| R-CTX-03 | Formulários transacionais (despesa, manutenção) exigem `vehicle_id` singular para gravar; contextos coletivos (`group`, `multi`, `attribute`) nunca propagam automaticamente para o campo de veículo | [SPEC-20260602-001](context/SPEC-20260602-001-em-foco-contexto-global.md) |
| R-CTX-04 | `VehicleActivator` é o único ponto de sincronização entre URL searchParams e o store Zustand; nenhum outro componente deve realizar essa ponte | [SPEC-20260602-001](context/SPEC-20260602-001-em-foco-contexto-global.md) |
| R-CTX-05 | Staleness de contexto (veículo/grupo com soft-delete detectado) é resolvida no carregamento do `FleetAside`, não no store; o store não valida existência de entidades | [SPEC-20260602-001](context/SPEC-20260602-001-em-foco-contexto-global.md) |
| R-CTX-06 | Formulários capturam o contexto ativo apenas no mount; mudanças posteriores no store não afetam o formulário já aberto — **exceto** o campo `vehicle_id` do `ExpenseForm`, que permanece reativo ao store enquanto `isInherited === true` | [SPEC-20260602-001](context/SPEC-20260602-001-em-foco-contexto-global.md), [SPEC-20260612-001](expenses/SPEC-20260612-001-expense-form-ux-improvements.md) |
| R-CTX-07 | O chip de contexto (`VehicleContextChip`) no subheader é o único ponto de entrada para abertura do Dialog/Sheet de seleção de veículo; nenhum outro componente deve abrir o switcher diretamente | [SPEC-20260603-001](context/SPEC-20260603-001-context-chip-subheader.md) |
| R-DISP-01 | O usuário pode configurar quais campos exibir no chip de veículo: exatamente 1 a 3 campos, sendo a **placa sempre obrigatória**; campos disponíveis: Placa, Marca, Modelo, Apelido — livres para combinar, mas sem repetição e com placa fixa | [SPEC-20260603-003](vehicles/SPEC-20260603-003-vehicle-display-preferences.md) |
| R-DISP-02 | O campo Apelido (`nickname`) é opcional por veículo; se selecionado como campo de exibição mas ausente no veículo, o chip exibe o Modelo como fallback | [SPEC-20260603-003](vehicles/SPEC-20260603-003-vehicle-display-preferences.md) |
| R-DISP-03 | A preferência de exibição é global por usuário (não por veículo); persiste em `user_preferences.vehicle_chip_fields` (JSON array, máx 3 itens) com fallback em localStorage | [SPEC-20260603-003](vehicles/SPEC-20260603-003-vehicle-display-preferences.md) |
| R-PREF-01 | Toda preferência de usuário tem um valor default seguro e funcional; ausência de preferência nunca causa erro — retorna o default silenciosamente | [SPEC-20260603-004](preferences/SPEC-20260603-004-user-preferences-migration.md) |
| R-FUEL-01 | `fuel_type` é opcional para `category = fuel`; quando informado, deve ser um dos valores do enum `FuelType` (`gasoline`, `gasoline_premium`, `ethanol`, `diesel`, `diesel_s10`, `gnv`, `electric`, `hybrid`); valor inválido retorna 400 | [SPEC-20260606-001](expenses/SPEC-20260606-001-fuel-enrichment.md) |
| R-FUEL-02 | km/l é calculado e retornado em `computed.km_per_liter` somente quando: `full_tank = true` E existe registro anterior com `odometer_km` para o mesmo veículo E `liters > 0`; em qualquer outro caso `computed.km_per_liter` é `null` | [SPEC-20260606-001](expenses/SPEC-20260606-001-fuel-enrichment.md) |
| R-FUEL-03 | `price_per_liter` é sempre derivado (`amount ÷ liters`); nunca é persistido na tabela `expenses`; retornado somente em `computed.price_per_liter` quando `liters > 0` | [SPEC-20260606-001](expenses/SPEC-20260606-001-fuel-enrichment.md) |
| R-FUEL-04 | `supplier` é texto livre, máx 100 caracteres, com `.trim()` aplicado no schema; `null` é válido | [SPEC-20260606-002](expenses/SPEC-20260606-002-fuel-supplier.md) |
| R-FUEL-05 | Templates de abastecimento podem persistir `fuel_type` e `supplier`, mas nunca `full_tank` — o estado do tanque é pontual e não reutilizável | [SPEC-20260606-001](expenses/SPEC-20260606-001-fuel-enrichment.md) |
| R-LED-01 | Expenses com `source_type IS NOT NULL` têm `is_readonly = true`; tentativas de PATCH ou DELETE retornam 403 | EPIC-FIN-001 |
| R-LED-02 | Manutenção transitando para `completed` com `cost IS NOT NULL` cria ou atualiza a expense vinculada via `ExpensesService.createFromSource()`; multa criada (`POST /fines`) cria expense vinculada automaticamente com `source_type = 'fine'` — usa `amount_with_discount` quando disponível | EPIC-FIN-001 |
| R-LED-03 | Manutenção ou multa transitando para `cancelled` soft-deleta (`deleted_at = NOW()`) a expense vinculada via `ExpensesService.softDeleteBySource()` | EPIC-FIN-001 |
| R-LED-04 | `source_type` e `source_id` são sempre definidos juntos — estado parcial é inválido (enforced por constraint `expenses_source_coherence_check` no banco e por validação de schema). Nota de auditoria — ver [Histórico de Versões](#histórico-de-versões) | EPIC-FIN-001 |
| R-LED-05 | `vehicle_recurring_costs` com `paid_at` preenchido cria expense vinculada com `source_type = 'recurring_cost'` via `ExpensesService.createFromSource()` | EPIC-FIN-001 |
| R-HUB-01 | Soft-delete individual de manutenção ou multa (`deleted_at` preenchido) também soft-deleta a expense vinculada, se existir | EPIC-FIN-001 |
| R-HUB-02 | Criação de expense vinculada é idempotente — unique index `uq_expenses_source` garante no máximo uma expense ativa por `(source_type, source_id)` | EPIC-FIN-001 |
| R-REC-01 | `vehicle_recurring_costs` aceita no máximo um registro por `(vehicle_id, cost_type, year)` — enforced por `UNIQUE` constraint | EPIC-FIN-001 |
| R-REC-02 | Recorrência anual é manual; UX exibe banner quando vencimento de documento em `vehicles` está ≤ 60 dias sem `vehicle_recurring_costs` correspondente | EPIC-FIN-001 |
| R-ODO-01 | No fluxo web (server actions de `expenses`), `odometer_km` informado é validado contra o histórico do veículo por data: não pode ser menor que o máximo registrado em data anterior/igual, nem maior que o mínimo registrado em data posterior. Violação rejeita a operação (hard block). Relação com R1 — ver [Histórico de Versões](#histórico-de-versões) | [SPEC-20260612-001](expenses/SPEC-20260612-001-expense-form-ux-improvements.md) |
| R-ODO-02 | `odometer_km`, quando informado, não pode exceder `9.999.999` (7 dígitos) — validado em `expenseBaseSchema`, alinhado ao limite de digitação do `OdometerInput` | [SPEC-20260612-002](expenses/SPEC-20260612-002-form-fields-adjustments.md) |
| R-EXP-01 | `amount` de uma despesa deve estar entre `0,01` e `100.000.000,00` (inclusive) | [SPEC-20260612-002](expenses/SPEC-20260612-002-form-fields-adjustments.md) |
| R-FUEL-06 | `full_tank` é tri-state (`true` / `false` / `null`); default `null` ("Tanque cheio?" sem seleção). `R-FUEL-02` (cálculo de km/L exige `full_tank = true`) permanece válida sem alterações | [SPEC-20260612-002](expenses/SPEC-20260612-002-form-fields-adjustments.md) |
| R-FUEL-07 | Pre-fill de `fuel_type` segue prioridade: favorito do veículo (`vehicles.favorite_fuel_type`) > último abastecimento > vazio. Respeitar a preferência explícita do usuário sobre a inferência automática | [SPEC-20260619-001](forms/SPEC-20260619-001-form-standard.md) |
| R-FUEL-08 | Pre-fill de `price_per_liter` por fornecedor não sobrescreve edição manual do usuário — pre-fill é sugestão, não imposição. Pilha `fuelEditOrder` (ordem de edição manual dos campos `amount`/`liters`/`price_per_liter`) controla elegibilidade, e também rege o recálculo cruzado entre os três campos (R-FUEL-03, RF-05.2) | [SPEC-20260619-001](forms/SPEC-20260619-001-form-standard.md) |
| R-PREF-02 | `auto_draft_enabled` controla se formulários (iniciando por `ExpenseForm`) persistem rascunho em `sessionStorage`; default `false` (sem rascunho). Aplica R-PREF-01 | [SPEC-20260612-003](preferences/SPEC-20260612-003-auto-draft-preference.md) |
| R-FORM-01 | Todo formulário usa `mode: 'onBlur'` e `reValidateMode: 'onChange'` — validação ao sair do campo, revalidação imediata após primeiro erro | [SPEC-20260619-001](forms/SPEC-20260619-001-form-standard.md) |
| R-FORM-02 | Todo campo de formulário usa `FormField` + `Controller` pattern; nunca `.register()` direto — garante a11y automática via `FormControl` (`aria-invalid`, `aria-describedby`) | [SPEC-20260619-001](forms/SPEC-20260619-001-form-standard.md) |
| R-FORM-03 | Valores monetários (R$) sempre usam `CurrencyInput` (ATM-style acumulador); nunca `<input type="number">` — UX consistente para BRL | [SPEC-20260619-001](forms/SPEC-20260619-001-form-standard.md) |
| R-FORM-04 | Create actions redirecionam para listagem do módulo (`redirect()`); update e delete fazem `revalidate()` sem redirect | [SPEC-20260619-001](forms/SPEC-20260619-001-form-standard.md) |
| R-FORM-05 | Todo formulário transacional implementa dirty check: ao cancelar com `isDirty === true`, exibe `AlertDialog` de confirmação "Descartar alterações?" | [SPEC-20260619-001](forms/SPEC-20260619-001-form-standard.md) |
| R-FORM-06 | Server Actions de formulários retornam `ActionResult` padrão: `{ success: true; message: string } \| { success: false; error: string; fieldErrors?: Record<string, string[]> }` | [SPEC-20260619-001](forms/SPEC-20260619-001-form-standard.md) |
| R-FORM-07 | Todo formulário transacional sem veículos cadastrados exibe empty state com CTA para cadastrar veículo em vez do formulário | [SPEC-20260619-001](forms/SPEC-20260619-001-form-standard.md) |
| R-DS-01 | `NavBadge` de contagem nunca renderiza mais de dois caracteres visuais: valores ≤ 9 exibem o número real; valores > 9 exibem a string literal "9+"; valor 0 oculta o badge completamente — regra de UX para preservar integridade do layout da sidebar em qualquer volume de notificações | [SPEC-20260721-001](design-system/SPEC-20260721-001-design-system-fundamentos.md) |
| R-DS-02 | Toda documentação de design system do projeto (`Design.md`, `docs/ui-design/design-system.md`, specs futuras da feature `design-system`) segue estrutura obrigatória de seções, nesta ordem: Foundations, Tokens, Componentes, Padrões, Acessibilidade, Content/Voice, Governança. Seção sem conteúdo nesta fase declara "não aplicável", nunca é omitida silenciosamente | [SPEC-20260722-001](design-system/SPEC-20260722-001-design-system-v2-direcao-criativa.md) |
| R-DS-03 | Cor semântica (`success`/`warning`/`danger`/`info`) é reservada exclusivamente a comunicar status real de dado (saúde de veículo, urgência, custo); o token `gold` é o único elemento decorativo/destaque de marca permitido. Nenhuma paleta decorativa multicolor sem significado de status é introduzida no sistema | [SPEC-20260722-001](design-system/SPEC-20260722-001-design-system-v2-direcao-criativa.md) |
| R-DS-04 | `rounded-full` é reservado a badge, tag e preset de filtro; todo botão de ação de interface (formulário, tabela, header) usa raio máximo `rounded-md` | [SPEC-20260722-001](design-system/SPEC-20260722-001-design-system-v2-direcao-criativa.md) |
| R-DS-05 | Proporção cromática de referência para auditoria visual de telas novas: ~60% neutro / ~30% estrutural (primary/border em card, header, divisor) / ~10% acento saturado (gold + danger) — desvio relevante é sinalizado em revisão, não é lint automatizado. **v2** — ver [Histórico de Versões](#histórico-de-versões) | [SPEC-20260722-001](design-system/SPEC-20260722-001-design-system-v2-direcao-criativa.md), [SPEC-20260729-001](design-system/SPEC-20260729-001-adocao-direcao-prata.md) |
| R-DS-06 | O token `danger` (e `finance-outgoing`) usa um terracota dessaturado (H≈32, C≈0.14), nunca vermelho puro/alta saturação — evita competir em intensidade perceptual com `gold`, o único acento que deve "gritar" na tela; `danger` nunca é aplicado como fundo sólido diretamente sobre `background`/`card` do tema ativo, só sobre `danger-pastel` (mesmo racional de "vermelho nunca direto sobre fundo escuro") | [SPEC-20260729-001](design-system/SPEC-20260729-001-adocao-direcao-prata.md) |
| R-DS-07 | A paleta categórica (`--categorical-1..5`) é reservada exclusivamente para dados sem status real — gráficos multi-série (`CHART_CATEGORY_COLORS`) e indicadores de modo/contexto (ex: seletor de veículo único/grupo/múltiplo/atributo). Nunca usada para comunicar status real de dado — isso continua sendo papel exclusivo de `success`/`warning`/`danger`/`info` | [SPEC-20260729-002](design-system/SPEC-20260729-002-prata-fase-2-categoricos-urgencia-varredura.md) |
| R-DS-08 | Toda escala de urgência/intensidade codificada por cor usa no máximo 4 níveis (ISO 11064-4) e é sempre acompanhada de label textual/numérico — nunca só cor. A escala de vencimento de despesas (`urgencyBadge`) é a referência: Vencido/`danger`, ≤7d/`urgency-hot`, ≤30d/`warning`, ≤60d/`info` | [SPEC-20260729-002](design-system/SPEC-20260729-002-prata-fase-2-categoricos-urgencia-varredura.md) |
| R-DS-09 | Todo campo de texto/número livre usa `Input`/`Textarea` de `@nave/ui`, todo checkbox usa `Checkbox`, todo botão usa `Button`, e todo `<select>` nativo usa `Combobox` (extensão de R-FORM-03 para além de campos monetários) — nunca elemento HTML nativo sem estilo. Exceções documentadas: `dashboard/concept/*` (protótipos isolados) e controles com forma customizada que a API do componente não cobre (ex: swatch de cor circular, botão de ícone do dock) | [SPEC-20260729-003](design-system/SPEC-20260729-003-formularios-input-textarea-checkbox-switch.md) |
| R-DS-10 | Todo badge de status semântico (pill pequeno, `inline-flex ... px-1.5 py-0.5 text-xs`) usa `Badge` de `@nave/ui`; todo placeholder de carregamento (`animate-pulse rounded-* bg-muted`) usa `Skeleton`; todo wrapper `<main>` de página usa `Container`; todo tooltip usa `Tooltip` (Radix) — nunca `title=` nativo do navegador. Exceção: indicadores que tingem uma linha/card inteiro por urgência (não um pill isolado, ex. `UpcomingCostsWidget`/`FleetAlertBar`/urgência de `expenses/page.tsx`) não usam `Badge` — a classe semântica ad hoc no wrapper é o padrão correto para esse caso, distinto de um badge de status | [SPEC-20260730-001](design-system/SPEC-20260730-001-padronizacao-showcase-badge-skeleton-container-tooltip.md) |
| R-DS-11 | Degradê é permitido apenas em áreas sem texto direto sobreposto (cabeçalho decorativo, fundo de ilustração de empty state, card de destaque, preenchimento sob linha de gráfico); nunca atrás de texto de corpo/label/valor de KPI. Direção/amplitude: linear (135°) ou radial, sempre entre dois tons adjacentes/próximos da mesma escala tonal de uma única cor de marca — nunca entre matizes diferentes. Se um ícone/rótulo curto precisar ficar sobre a área do degradê, o contraste é validado contra o ponto mais escuro (não a média), mesmo rigor de `C-DS-01`. O fundo de página em si é sempre superfície sólida (nunca o degradê) — o degradê decorativo aparece só sobre cards/cabeçalhos/gráficos | [SPEC-20260731-001](design-system/SPEC-20260731-001-adocao-direcao-azul-indigo.md) |
| R-DS-12 | Toda classe de tamanho tipográfico em código de produção deve referenciar uma chave da escala formal do Nave (`text-xs`, `text-sm`, `text-base`, `text-md`, `text-lg`, `text-xl`, `text-2xl`) — nunca valores arbitrários (`text-[Npx]`, `text-[1rem]`, `text-3xl` e acima) fora das exceções documentadas. Exceções válidas: (1) protótipos isolados em `design-system/concept/*`; (2) copy de marketing/ilustração sem texto funcional, com comentário explícito justificando a exceção no mesmo arquivo. Validação: code review e eventual lint automatizado. **v1** | [SPEC-20260731-005](design-system/SPEC-20260731-005-remapeamento-escala-text-tailwind.md) |

### Regras de Fuso Horário (R-TZ)

| ID | Regra | Spec |
|----|-------|------|
| R-TZ-01 | "Hoje" (`today`) para alertas, KPIs e cálculo de urgência é sempre o dia calendário corrente **no fuso do usuário autenticado**; nunca o dia em UTC do servidor ou do processo Node.js; quando `user_preferences.timezone` está `null` ou é inválido, o fallback documentado é `'UTC'` como constante nomeada (`FALLBACK_TIMEZONE`) — nunca o fuso implícito do SO | [SPEC-20260715-002](timezone/SPEC-20260715-002-timezone-aware-datetime.md) |
| R-TZ-02 | Fusos de usuário são armazenados como nomes IANA (ex: `'America/Sao_Paulo'`), nunca como offset fixo (ex: `'-03:00'`); offset fixo não sobrevive a mudanças de DST; detecção automática usa `Intl.DateTimeFormat().resolvedOptions().timeZone` (API nativa do browser) | [SPEC-20260715-002](timezone/SPEC-20260715-002-timezone-aware-datetime.md) |
| R-TZ-03 | Datas e horas de lançamento (`expenses.date`, `maintenances.scheduled_date`, `maintenances.completion_date`) são persistidas como `timestamptz` em UTC; o frontend captura data+hora no fuso do usuário via `datetime-local` e envia com offset explícito; hora corrente no fuso do usuário é preenchida automaticamente no mount do formulário, editável manualmente | [SPEC-20260715-002](timezone/SPEC-20260715-002-timezone-aware-datetime.md) |
| R-TZ-04 | Despesa criada com `occurred_at` no futuro (dia calendário do usuário) emite `future_date_warning: true` na resposta, sem bloquear a operação — pré-registro de despesas é válido. `completion_date` de manutenção não pode exceder a data/hora atual em mais de 24 h (422) | [SPEC-20260715-002](timezone/SPEC-20260715-002-timezone-aware-datetime.md) |

---

### Regras de Sanitização (R-SAN)

| ID | Regra | Spec |
|----|-------|------|
| R-SAN-01 | Todo campo de texto livre (`z.string()`) nos schemas Zod deve aplicar `.trim()` antes de qualquer validação de comprimento | [SPEC-20260619-001](forms/SPEC-20260619-001-form-standard.md) §2.12 |
| R-SAN-02 | Todo campo de texto livre deve aplicar `.normalize('NFC')` para normalização Unicode | [SPEC-20260619-001](forms/SPEC-20260619-001-form-standard.md) §2.12 |
| R-SAN-03 | Campos de identificador (placa, RENAVAM, chassi) aplicam `.toUpperCase()` + strip de não-alfanuméricos | [SPEC-20260619-001](forms/SPEC-20260619-001-form-standard.md) §2.12 |
| R-SAN-04 | Parâmetros de ID em server actions e controllers devem ser validados como UUID antes de uso | [SPEC-20260619-001](forms/SPEC-20260619-001-form-standard.md) §2.12 |
| R-SAN-05 | Upload de arquivos deve validar tipo MIME contra allowlist e tamanho máximo no servidor | [SPEC-20260619-001](forms/SPEC-20260619-001-form-standard.md) §2.12 |
| R-SAN-06 | Mensagens de erro de banco de dados nunca são expostas ao cliente; usar mensagens genéricas | [SPEC-20260619-001](forms/SPEC-20260619-001-form-standard.md) §2.12 |

---

## Regras de Negocio / Monetizacao (R-BIZ)

| ID | Regra | Spec |
|----|-------|------|
| R-BIZ-01 | Cadastro e self-service, sem aprovacao, para qualquer email valido nao-descartavel | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |
| R-BIZ-02 | Limites de plano nunca bloqueiam criacao de registros — apenas restringem visibilidade do historico e export | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |
| R-BIZ-03 | Trial Pro de 14 dias para toda conta nova; downgrade automatico ao expirar | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |
| R-BIZ-04 | Referral: 30 dias Pro para convidado, 15 dias Pro para quem convidou; maximo 10 referrals ativos por conta | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |
| R-BIZ-05 | Exclusao de conta e self-service com periodo de graca de 30 dias (LGPD) | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |
| R-BIZ-06 | Re-aceite de termos atualizados bloqueia escrita mas nao leitura | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |
| R-BIZ-07 | Emails descartaveis e contas banidas por admin nao podem re-registrar | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |
| R-BIZ-08 | NPS coletado a cada 30 dias ativos; feedback negativo gera alerta automatico | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |
| R-BIZ-09 | Dados gerais (resumos mensais consolidados) sao retidos indefinidamente enquanto a conta existir, independente do plano | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |
| R-BIZ-10 | Downgrade consolida dados fora da janela visivel em resumo mensal; nunca deleta registros durante o grace period | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |
| R-BIZ-11 | Grace period = 50% do tempo como assinante, cap 1 ano, mínimo 30d (1-3m) / 60d (4-11m) / 90d (12m+); fórmula: `max(min_faixa, min(365, tempo_assinante_dias * 0.5))` onde `tempo_assinante_dias` é a soma de dias pagos (sem contar trial) | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |
| R-BIZ-12 | Export bloqueado no plano Grátis; Pro mensal com rate limit (a definir); Pro anual e Frota ilimitados | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |
| R-BIZ-13 | API publica requer simulacao de custos de infraestrutura aprovada antes do lancamento | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |
| R-BIZ-14 | Consolidacao e irreversivel — apos expirar o grace, dados gerais sao permanentes e nao podem ser reexpandidos em detalhes | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |
| R-BIZ-15 | Resolução de features segue precedência Usuário > Plano > Sistema, exceto kill-switch de Sistema (`force`); toda alteração é auditada e exige motivo obrigatório | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |
| R-BIZ-16 | Oferta de win-back é enviada por email e exibida como banner in-app durante todo o grace period (e apenas durante ele); o desconto é proporcional ao tempo como assinante pago: 20% OFF (1–3m), 30% OFF (4–11m), 40% OFF + 1 mês grátis (12m+); não se aplica durante o trial inicial (R-BIZ-03); oferta não é cumulativa com outros cupons ativos | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |

---

## Regras de Analytics / Data Science (R-ANA)

| ID | Regra | Spec |
|----|-------|------|
| R-ANA-01 | Análises de consumo de combustível exigem no mínimo 5 registros com `full_tank = true` para calcular km/L confiável; abaixo disso, retornar `null` | [SPEC-20260622-001](analytics/SPEC-20260622-001-analytics-engine.md) |
| R-ANA-02 | Detecção de anomalias (Z-Score) exige no mínimo 5 registros na combinação `(vehicle_id, category)` e `stddev > 0`; categorias com menos dados são excluídas silenciosamente | [SPEC-20260622-001](analytics/SPEC-20260622-001-analytics-engine.md) |
| R-ANA-03 | Cost Forecasting exige no mínimo 6 meses de histórico; abaixo disso, retornar apenas dados históricos sem projeção | [SPEC-20260622-001](analytics/SPEC-20260622-001-analytics-engine.md) |
| R-ANA-04 | TCO `cost_per_km` é `null` quando `total_km = 0`; `cost_per_month` é `null` quando período < 30 dias — nunca exibir `Infinity` ou `NaN` ao usuário | [SPEC-20260622-001](analytics/SPEC-20260622-001-analytics-engine.md) |
| R-ANA-05 | Insights em linguagem natural nunca expõem dados de outros usuários; toda query de analytics filtra por `auth.uid()` ou valida ownership explicitamente | [SPEC-20260622-001](analytics/SPEC-20260622-001-analytics-engine.md) |
| R-ANA-06 | RPCs de analytics pesadas (TCO, benchmark, forecast) devem ser cacheáveis com TTL de 1h; invalidação ocorre ao criar/atualizar/deletar expense, manutenção ou multa | [SPEC-20260622-001](analytics/SPEC-20260622-001-analytics-engine.md) |
| R-ANA-07 | Seasonal analysis (heatmap) requer mínimo de 6 meses distintos de dados; abaixo disso, retornar resultado vazio (nunca erro) | [SPEC-20260622-001](analytics/SPEC-20260622-001-analytics-engine.md) |
| R-ODO-03 | `odometer_km` é obrigatório para manutenções com `status = completed` (estende R4; fecha NG-04 de SPEC-20260601-001) | [SPEC-20260711-001](vehicles/SPEC-20260711-001-odometer-cycles.md) |
| R-ODO-04 | `findMaxOdometerByVehicle` (em `expenses` e `maintenances`) filtra por `date >= started_at` do ciclo mais recente em `vehicle_odometer_cycles` para o veículo; sem linha registrada, nenhum filtro é aplicado (comportamento idêntico ao pré-existente) | [SPEC-20260711-001](vehicles/SPEC-20260711-001-odometer-cycles.md) |
| R-ODO-05 | Apenas o dono do veículo (`vehicles.user_id`) pode criar um novo ciclo em `vehicle_odometer_cycles`; a ação exige `reason` obrigatório e é auditada via `AuditService` (aplica R-MON-01, R-MON-02) | [SPEC-20260711-001](vehicles/SPEC-20260711-001-odometer-cycles.md) |
| R-ODO-06 | O "ciclo 1" é implícito — nenhuma linha é criada em `vehicle_odometer_cycles` para ele; a primeira linha inserida nasce com `cycle_number = 2`; a UI exibe badge de ciclo somente a partir do 2º em diante | [SPEC-20260711-001](vehicles/SPEC-20260711-001-odometer-cycles.md) |

### Regras de Score de Saúde (R-HS)

| ID | Regra | Spec |
|----|-------|------|
| R-HS-01 | Score começa em 100 e tem piso em 0; cálculo é exclusivo da RPC PostgreSQL `calculate_vehicle_health(p_vehicle_id)`; jamais recalculado no NestJS ou no frontend | [SPEC-20260730-001](vehicles/SPEC-20260730-001-vehicle-health-score.md) |
| R-HS-02 | Manutenções pendentes (`status IN ('scheduled','in_progress')`, `deleted_at IS NULL`): -5 pontos/item, máximo -20 pontos | [SPEC-20260730-001](vehicles/SPEC-20260730-001-vehicle-health-score.md) |
| R-HS-03 | Manutenções vencidas (pendentes com `scheduled_date < CURRENT_DATE`): desconto **adicional** de -15 pontos/item, máximo -30 pontos; cumulativo com R-HS-02 | [SPEC-20260730-001](vehicles/SPEC-20260730-001-vehicle-health-score.md) |
| R-HS-04 | Documento a vencer em ≤ 30 dias: -10 pontos/documento (IPVA, Seguro, CRLV são penalizados individualmente); campos `NULL` ignorados sem penalidade; "hoje" usa `CURRENT_DATE` do PostgreSQL (aplica R-TZ-01 apenas na exibição de dias restantes no frontend) | [SPEC-20260730-001](vehicles/SPEC-20260730-001-vehicle-health-score.md) |
| R-HS-05 | Alerta de km: `vehicles.odometer >= vehicles.next_maintenance_km - 1000` → -5 pontos (desconto único, independente do valor de km dentro da janela); campos `NULL` ignorados sem penalidade | [SPEC-20260730-001](vehicles/SPEC-20260730-001-vehicle-health-score.md) |
| R-HS-06 | Multas pendentes (`fines.status = 'pending'`, `deleted_at IS NULL`): -5 pontos/item, máximo -15 pontos | [SPEC-20260730-001](vehicles/SPEC-20260730-001-vehicle-health-score.md) |
| R-HS-07 | Semáforo canônico: 70-100 = success ("Em dia"), 40-69 = warning ("Atenção"), 0-39 = danger ("Crítico"); nenhuma tela usa mapeamento diferente; o componente `VehicleHealthScore` de `@nave/ui` é a implementação de referência | [SPEC-20260730-001](vehicles/SPEC-20260730-001-vehicle-health-score.md) |
| R-HS-08 | `calculate_vehicle_health` persiste `vehicles.health_score` e `vehicles.updated_at = NOW()` como efeito colateral de cada chamada | [SPEC-20260730-001](vehicles/SPEC-20260730-001-vehicle-health-score.md) |
| R-HS-09 | `vehicles.health_score` é write-only pela RPC — NestJS, server actions e client nunca escrevem diretamente nessa coluna; `calculate_fleet_health` delega a `calculate_vehicle_health` para cada veículo; score de frota (KPI) = média aritmética dos scores individuais | [SPEC-20260730-001](vehicles/SPEC-20260730-001-vehicle-health-score.md) |
| R-HS-10 | Flags canônicas emitidas pela RPC: `maintenance_overdue` (campo `count`), `ipva_expiring` (campo `days`), `insurance_expiring` (campo `days`), `crlv_expiring` (campo `days`), `km_alert` (campo `km_until`), `fines_pending` (campo `count`); manutenções pendentes mas não vencidas não emitem flag visual | [SPEC-20260730-001](vehicles/SPEC-20260730-001-vehicle-health-score.md) |

---

### Regras de KPIs do Dashboard (R-KPI)

| ID | Regra | Spec |
|----|-------|------|
| R-KPI-01 | KPIs do dashboard vêm de um catálogo fixo (`KPI_CATALOG_IDS`), nunca de métricas livres definidas pelo usuário; cada usuário ativa entre 1 e 6 simultaneamente (`dashboard_kpi_ids`), com 4 ativos por padrão — teto justificado por carga cognitiva (Miller's Law/Hick's Law), não por limitação técnica | [SPEC-20260721-002](dashboard/SPEC-20260721-002-dashboard-v2.md) |
| R-KPI-02 | O delta percentual mês a mês de um KPI (`delta_pct`) é `null` — nunca colorido nem exibido com seta — quando a contagem de registros do período anterior é menor que 3; evita ler ruído estatístico de amostra pequena como tendência | [SPEC-20260721-002](dashboard/SPEC-20260721-002-dashboard-v2.md) |

### Regras do Subheader Financeiro (R-SUB)

| ID | Regra | Spec |
|----|-------|------|
| R-SUB-01 | O subheader financeiro exibe no máximo 3 chips de categoria, correspondendo às 3 categorias de despesa com maior `SUM(amount)` no mês corrente para o escopo de usuário/contexto ativo; o `LIMIT 3` é aplicado na query SQL (backend), nunca por corte em memória no JavaScript do service ou no frontend | [SPEC-20260722-004](dashboard/SPEC-20260722-004-financial-subheader.md) |
| R-SUB-02 | Os links dos chips de categoria no subheader incluem o parâmetro de contexto ativo: `vehicleId=<id>` para contexto `single`, `group=<ids>` para contexto `group`; contextos coletivos `multi` e `attribute` não propagam parâmetro de filtro (consistente com R-CTX-03) | [SPEC-20260722-004](dashboard/SPEC-20260722-004-financial-subheader.md) |
| R-SUB-03 | O status agregado de multas no subheader considera apenas multas com `status IN ('pending', 'appealing')` e `deleted_at IS NULL`; multas pagas (`paid`) ou canceladas (`cancelled`) são sempre ignoradas neste indicador | [SPEC-20260722-004](dashboard/SPEC-20260722-004-financial-subheader.md) |
| R-SUB-04 | A classificação de multa vencida para o indicador do subheader é: `status = 'pending'` AND `due_date < hoje` (data no fuso do usuário, aplica R-TZ-01); multas em recurso (`appealing`) com `due_date` vencida não são classificadas como vencidas neste indicador — recurso suspende o prazo de pagamento | [SPEC-20260722-004](dashboard/SPEC-20260722-004-financial-subheader.md) |

### Regras de PWA / Offline (R-PWA)

| ID | Regra | Spec |
|----|-------|------|
| R-PWA-01 | Estratégia de cache por tipo de recurso no Service Worker: assets estáticos versionados usam `CacheFirst`; navegação HTML usa `NetworkFirst` com fallback para cache/página offline; `GET` de dados da API usa `StaleWhileRevalidate`; mutações (`POST`/`PUT`/`PATCH`/`DELETE`) nunca são interceptadas — sempre `NetworkOnly` | [SPEC-20260712-001](pwa/SPEC-20260712-001-pwa-offline.md) |
| R-PWA-02 | Toda tentativa de mutação feita sem conexão é bloqueada no cliente antes do envio, com mensagem explícita; não há fila de sincronização nesta fase (Fase 2) | [SPEC-20260712-001](pwa/SPEC-20260712-001-pwa-offline.md) |
| R-PWA-03 | Atualização do Service Worker é opt-in — nova versão detectada dispara toast; `skipWaiting()`/`clientsClaim()` só executam após ação explícita do usuário, nunca automaticamente | [SPEC-20260712-001](pwa/SPEC-20260712-001-pwa-offline.md) |
| R-PWA-04 | O manifest deve incluir ícones 192×192 e 512×512 em formato `any` e `maskable`; `theme_color`/`background_color` seguem a paleta Nave | [SPEC-20260712-001](pwa/SPEC-20260712-001-pwa-offline.md) |
| R-PWA-05 | Em navegadores sem suporte a `beforeinstallprompt` (Safari iOS/iPadOS), a UI exibe instrução manual de instalação ("Compartilhar → Adicionar à Tela de Início") em vez do prompt automático | [SPEC-20260712-001](pwa/SPEC-20260712-001-pwa-offline.md) |
| R-PWA-06 | O cache de dados de API (`StaleWhileRevalidate`) tem teto de retenção em disco de 30 dias (decisão de produto, não decorre do ADR-003 — ver Decision Log D9 da spec) — teto de armazenamento, não de exibição: dado offline continua exibível além desse prazo enquanto não houver conexão para revalidar/remover; todas as entradas de dados de usuário são removidas no evento `SIGNED_OUT` do Supabase Auth | [SPEC-20260712-001](pwa/SPEC-20260712-001-pwa-offline.md) |
| R-PWA-07 | O indicador fixo de status de conectividade (ver R-PWA-01/03) exibe, quando offline, a idade do dado em cache no formato "Hoje HH:mm" / "Ontem HH:mm" / "DD/MM/AA HH:mm" — nunca um aviso genérico de "dados desatualizados" sem timestamp | [SPEC-20260712-001](pwa/SPEC-20260712-001-pwa-offline.md) |
| R-PWA-08 | `navigator.onLine` é usado apenas como sinal rápido inicial de conectividade, nunca como fonte única de verdade; uma falha de rede (erro de conexão, não resposta HTTP) mesmo com `navigator.onLine === true` é tratada como offline retroativo, atualizando o indicador (R-PWA-07) e bloqueando a submissão (R-PWA-02) com a mesma mensagem | [SPEC-20260712-001](pwa/SPEC-20260712-001-pwa-offline.md) |

---

## Regras de Navegação / Shell (R-NAV)

| ID | Regra | Spec |
|----|-------|------|
| R-NAV-01 | Abaixo do breakpoint `md` (768 px), a sidebar opera exclusivamente como drawer/overlay (`fixed inset-y-0 left-0 z-[4000]`, alternado entre `translate-x-0` e `-translate-x-full`); acima de `md` retorna ao comportamento inline atual. Nunca exibir a sidebar inline em telas menores que `md`. | [SPEC-20260722-003](layout-responsivo/SPEC-20260722-003-shell-mobile-first.md) |
| R-NAV-02 | Toda área de toque de elemento interativo do shell (botão hamburger, item de sidebar, item de nav) deve ter área mínima de 44 × 44 px em mobile — alinhado a WCAG 2.5.8 (AAA) e Apple HIG; o valor `min-h-[44px]` é o teto mínimo, não o default | [SPEC-20260722-003](layout-responsivo/SPEC-20260722-003-shell-mobile-first.md) |
| R-NAV-03 | O padding horizontal do shell é mobile-first (`px-4 md:px-6 lg:px-8`); nenhum componente do shell aplica `pl-16` ou `pl-64` fixo sem breakpoint condicional — o offset da sidebar é zerado em mobile pois ela vira overlay | [SPEC-20260722-003](layout-responsivo/SPEC-20260722-003-shell-mobile-first.md) |
| R-NAV-04 | O drawer mobile fecha automaticamente ao: (a) clicar no backdrop, (b) pressionar `Esc`, (c) navegar para qualquer rota diferente da atual. A ação de fechar usa `toggleMobileNav()` do `useUIStore` — nenhum outro mecanismo de fechamento é criado em paralelo | [SPEC-20260722-003](layout-responsivo/SPEC-20260722-003-shell-mobile-first.md) |
| R-NAV-05 | O botão de logout na sidebar usa hold-to-confirm: o usuário deve manter pressionado por 1.000 ms; uma barra de progresso visual avança durante esse tempo; soltar antes de completar cancela sem invocar `logout()`; o `logout()` é chamado apenas ao término completo do timer. O segundo ponto de logout (dropdown de avatar no header) não exige hold-to-confirm — confirmação por clique simples é suficiente para esse ponto de acesso mais explícito | [SPEC-20260730-002](layout-responsivo/SPEC-20260730-002-shell-ux-improvements.md) |
| R-NAV-06 | `isSidebarCollapsed` em `useUIStore` persiste entre reloads via `zustand/middleware persist` em `sessionStorage` (key `"nave-ui-state"`); somente `isSidebarCollapsed` é serializado no `partialize` (excluindo `isMobileNavOpen` e `toasts`, que são efêmeros); a função `logout()` remove a chave `"nave-ui-state"` do `sessionStorage` junto com `"nave-dashboard-context"` | [SPEC-20260730-002](layout-responsivo/SPEC-20260730-002-shell-ux-improvements.md) |
| R-NAV-07 | O wrapper raiz do shell usa `flex-col`; o `Header` é filho direto desse wrapper (não da coluna de conteúdo), tornando-o irmão de uma row `flex` que contém sidebar e conteúdo — assim ocupa 100% da largura da viewport em qualquer estado da sidebar. A sidebar no desktop (≥ md) é in-flow (`md:static`); em mobile permanece como drawer `fixed inset-y-0 left-0` (R-NAV-01 preservada por CSS condicional). O padding de compensação `md:pl-16`/`md:pl-64` é eliminado | [SPEC-20260730-002](layout-responsivo/SPEC-20260730-002-shell-ux-improvements.md) |
| R-NAV-08 | O header deve exibir um avatar/identidade do usuário autenticado (iniciais do nome como fallback quando não há foto de perfil); ao clicar, abre um dropdown com nome completo, email (somente leitura), link para `/settings/account` e botão de logout (clique simples, sem hold-to-confirm); os dados do usuário são obtidos do cache de TanStack Query já existente, sem nova chamada de API exclusiva para esse componente | [SPEC-20260730-002](layout-responsivo/SPEC-20260730-002-shell-ux-improvements.md) |

---

## Regras de Segurança (S)

| ID | Regra | Referência |
|----|-------|------------|
| S1 | Toda rota privada exige `SupabaseAuthGuard`; JWT deve ter `aud = authenticated` e não estar expirado. **Nota 2026-06-22:** O middleware SSR (`apps/web/middleware.ts`) que aplica S1 no lado web via refresh de token esta ausente do repositorio — achado critico IMPACTO-021 #1, correcao prioritaria | [SPEC-20260521-001](security/SPEC-20260521-001.md) |
| S2 | RLS ativo em todas as tabelas; policy padrão: `auth.uid() = user_id` | `docs/architecture/decisions/002-supabase-rls-strategy.md` |
| S3 | `SUPABASE_SERVICE_ROLE_KEY` somente no backend; nunca exposta como `NEXT_PUBLIC_*` | [SPEC-20260521-001](security/SPEC-20260521-001.md) |
| S4 | Rate limit global via `ThrottlerGuard` (APP_GUARD) com default 100 req/60s; endpoints de auth com limites restritivos: `POST /auth/register` → 5 req/15min, `POST /auth/login` → 10 req/15min por IP | [SPEC-20260524-001](auth/SPEC-20260524-001.md) §4.2 |
| S5 | Stack trace oculto em produção — `HttpExceptionFilter` retorna apenas `message` e `statusCode` quando `NODE_ENV=production` | [SPEC-20260521-001](security/SPEC-20260521-001.md) |
| S6 | Cache Storage e qualquer dado persistido pelo Service Worker (exceto assets estáticos públicos) são limpos no evento `SIGNED_OUT` do Supabase Auth Client — evita exposição de dados de um usuário a outro em dispositivo compartilhado | [SPEC-20260712-001](pwa/SPEC-20260712-001-pwa-offline.md) |
| S7 | Functions `SECURITY DEFINER` que aceitam identificador de recurso como parâmetro (`p_user_id`, `p_vehicle_id` etc.) devem validar internamente que `auth.uid()` corresponde ao dono do recurso antes de retornar dado; `EXECUTE` nunca é concedido ao role `anon` a menos que a função seja explicitamente pública por design. **Achado real 2026-07-12:** `calculate_vehicle_health`, `calculate_fleet_health`, `get_upcoming_costs` e `get_vehicle_cost_per_km` violam esta regra no banco de produção (executáveis por `anon`, sem confirmação de validação interna) — achado crítico [IMPACTO-026](../matrices/impacto.md#impacto-026-diagnóstico-dba-do-banco-real-navesaas-supabase--achados-críticos-de-segurança-e-integridade) #1 | — |
| S8 | Buckets do Supabase Storage nunca têm policy que permita `LIST` público de objetos — apenas acesso por URL/path direto quando o conteúdo é intencionalmente público. **Achado real 2026-07-12:** bucket `vehicles` tem policy `"Public access to vehicle photos"` que permite listar todos os arquivos — achado crítico [IMPACTO-026](../matrices/impacto.md#impacto-026-diagnóstico-dba-do-banco-real-navesaas-supabase--achados-críticos-de-segurança-e-integridade) #2 | — |
| S9 | Toda function PL/pgSQL define `search_path` fixo (`SET search_path = ''` ou schema explícito) — nunca deixa o `search_path` mutável, especialmente em functions `SECURITY DEFINER`, para evitar sequestro de objeto via schema malicioso. **Achado real 2026-07-12:** 6 functions no banco de produção sem `search_path` fixo — achado [IMPACTO-026](../matrices/impacto.md#impacto-026-diagnóstico-dba-do-banco-real-navesaas-supabase--achados-críticos-de-segurança-e-integridade) #6 | — |
| S10 | Logs estruturados nunca devem conter PII ou dados sensíveis. Campos proibidos (redacted para `[REDACTED]` pelo serializer do Pino antes de serem escritos): `password`, `token`, `accessToken`, `refreshToken`, `jwt`, `authorization`, `service_role_key`, `cpf`, `email` em texto plano, `photo_url`. Qualquer campo cujo nome case com o padrão `/password\|token\|secret\|key\|cpf\|ssn/i` é redacted automaticamente. Aplica-se a todos os logs de `apps/api` e a qualquer pipeline de logging futuro | [SPEC-20260716-002](devops/SPEC-20260716-002-observabilidade.md) |
| S11 | O `apps/web/middleware.ts` que aplica S1 no lado web protege apenas a navegação de página — o matcher exclui `api/backend`, então toda chamada client-side de dados (`apiClient`) não passa por ele. Por isso `apiClient` também precisa interceptar `401` de qualquer chamada (exceto `/auth/*`, que tem 401 como fluxo normal de credenciais inválidas) e redirecionar para `/login?redirect=<pathname>` — sem essa camada, sessão inválida em página já carregada exibe erro genérico de carregamento em vez de levar ao login. **Achado real 2026-07-31:** reportado por Douglas — o gap existia desde a criação do middleware (2026-06-22) | [SPEC-20260731-003](auth/SPEC-20260731-003-redirect-login-sessao-invalida.md) |
| S12 | Dados de autorização (role, permissões) nunca devem ser lidos de `user_metadata` do Supabase Auth — campo gravável pelo próprio usuário autenticado via API pública (`PUT /auth/v1/user`). Todo claim usado para decisão de autorização no backend deve vir exclusivamente de `app_metadata`, gravável apenas via API administrativa com `SUPABASE_SERVICE_ROLE_KEY`. **Achado real 2026-07-31:** `RolesGuard` (`roles.guard.ts:25`) lia `user_metadata.role` para decidir acesso admin, permitindo que qualquer usuário autenticado escalasse privilégio chamando a API pública do Supabase diretamente, fora do backend NestJS | [SPEC-20260731-006](security/SPEC-20260731-006-correcao-role-user-metadata.md) |
| S13 | Toda policy RLS de `UPDATE` que restringe por `deleted_at is null` (padrão de soft-delete) precisa de `WITH CHECK` explícito que valide apenas posse (`auth.uid() = user_id`/`id`) — nunca deixar o `WITH CHECK` herdar implicitamente o mesmo predicado do `USING`. **Além disso (v2):** a policy de `SELECT` da mesma tabela nunca deve restringir por `deleted_at is null` — o Postgres combina (AND) o `USING` da policy de `SELECT` com o `WITH CHECK` da policy de `UPDATE` ao validar a linha resultante, então mesmo com o `WITH CHECK` do `UPDATE` correto, uma policy de `SELECT` que exige `deleted_at is null` bloqueia o soft-delete do mesmo jeito. O filtro de "não mostrar registro deletado" é responsabilidade da query da aplicação (`.is("deleted_at", null)`), nunca da policy de `SELECT`. **Achado real 2026-07-31 (v1):** `profiles_update_own`, `vehicles_update_own`, `expenses_update_own`, `maintenances_update_own`, `fines_update_own` e `recurring_costs_update_own` tinham apenas `USING`, sem `WITH CHECK` — corrigido, mas insuficiente. **Achado real 2026-07-31 (v2):** mesmo após o fix do `WITH CHECK`, `DELETE /expenses/:id` continuava retornando 500 (42501) — reproduzido em SQL puro simulando o JWT do usuário de teste, isolando que `UPDATE expenses SET deleted_at = now()` falha mas `UPDATE expenses SET <outra coluna>` funciona; causa era a policy `expenses_select_own` (e as 5 equivalentes) exigindo `deleted_at is null`. **Corrigido e aplicado ao banco remoto em 2026-07-31, confirmado com teste real de soft-delete (transação com rollback, sem alterar dados)** | [migration 20260731192440](../supabase/migrations/20260731192440_fix_soft_delete_rls_with_check.sql), [migration 20260731204319](../supabase/migrations/20260731204319_fix_soft_delete_select_policy_implicit_check.sql) |
| S14 | Toda alteração de role de admin (promoção ou rebaixamento via `PATCH /admin/users/:id/role`) é auditada obrigatoriamente via `AuditService` (aplica C2); um admin não pode rebaixar o próprio role via este endpoint — a tentativa retorna 422 com mensagem explícita, para prevenir lockout acidental do sistema por ausência de admin ativo | [SPEC-20260731-008](../specs/admin/SPEC-20260731-008-painel-admin-gestao-roles-ui.md) |

---

## Limites de Performance (P)

| ID | Regra |
|----|-------|
| P1 | Todas as listagens paginadas; máximo 100 registros/página, default 20; campo `cursor` disponível para paginação por cursor |
| P2 | Atualização de `last_used_at` em templates é fire-and-forget — não bloqueia a resposta ao usuário |
| P3 | Sem `console.log`, `console.warn` ou `debugger` em codigo de producao; backend usa `Logger` do NestJS; frontend usa condicionais de `NODE_ENV` para logs de desenvolvimento. **Nota 2026-06-22:** 11 ocorrencias residuais identificadas em IMPACTO-021 #6 |
| P4 | Policies RLS usam `(SELECT auth.uid())` em vez de `auth.uid()` direto — permite ao planner do Postgres cachear o resultado como InitPlan (avaliado uma vez por query) em vez de reavaliar por linha. **Achado real 2026-07-12:** 35 policies em 15 tabelas do banco de produção usam a forma não otimizada — achado [IMPACTO-026](../matrices/impacto.md#impacto-026-diagnóstico-dba-do-banco-real-navesaas-supabase--achados-críticos-de-segurança-e-integridade) |
| P5 | O endpoint `GET /health` deve concluir em no máximo 5 segundos, incluindo a verificação de dependências externas; cada dependência individual tem timeout de 3 segundos. Falha de dependência não-crítica retorna `status: "degraded"` (HTTP 200) em vez de interromper o processo — monitores externos não confundem disponibilidade da API com disponibilidade da dependência | [SPEC-20260716-002](devops/SPEC-20260716-002-observabilidade.md) |
| P6 | Widget "Próximos 7 dias" exibe e carrega no máximo 10 eventos por consulta; itens além desse limite não são buscados nem renderizados — o `LIMIT 10` deve ser aplicado na RPC ou endpoint, nunca filtrado no frontend após receber uma lista maior | [SPEC-20260721-002](dashboard/SPEC-20260721-002-dashboard-v2.md) |
| P7 | O endpoint `GET /dashboard/spending-highlights` aplica `GROUP BY category ORDER BY SUM(amount) DESC LIMIT 3` na query SQL; a agregação e o corte das top-3 categorias nunca são feitos em memória no service ou no frontend | [SPEC-20260722-004](dashboard/SPEC-20260722-004-financial-subheader.md) |

---

## Restrições de Compliance (C)

| ID | Regra | Referência |
|----|-------|------------|
| C-DS-01 | Todo texto visível ao usuário (primário, secundário, placeholder) deve atingir contraste mínimo WCAG AA (4.5:1 para texto de tamanho normal, 3:1 para texto grande ≥ 18px/14px bold, e para elementos não-textuais) em ambos os temas (light e dark); `--muted-foreground` usa valor máximo de L=42% em OKLCH para garantir AA inclusive em texto secundário — nenhuma exceção por nível de hierarquia visual. `--warning`/`--success` são calibrados para uso como fundo de texto (sobre o próprio `-pastel`), nunca como texto direto sobre o canvas — contrato documentado no token, não só corrigido por valor. `apps/web/.../design-system/_lib/contrast.spec.ts` cobre todos os pares críticos e passa 100% desde `SPEC-20260731-002` (recalibração de `--warning`, único par ainda abaixo do piso não-textual em light mode, e de `--danger-foreground`, unificado com a família de grafite) | [SPEC-20260721-001](design-system/SPEC-20260721-001-design-system-fundamentos.md), [SPEC-20260731-001](design-system/SPEC-20260731-001-adocao-direcao-azul-indigo.md), [SPEC-20260731-002](design-system/SPEC-20260731-002-recalibracao-warning-fecho-c-ds-01.md) |
| C-DS-02 | Todo token `*-pastel` (`success-pastel`, `warning-pastel`, `danger-pastel`, `info-pastel`) tem override próprio em `darkColorChannels` (`packages/ui/src/tokens/colors.ts`) — nunca herda silenciosamente o valor claro do light mode. Gap encontrado ao construir o Design System Showcase em 2026-07-30: sem o override, `text-foreground` (claro em dark mode) sobre `bg-*-pastel` (ainda claro, herdado do light) fica quase ilegível em `Alert`/`Badge`/`Toast` | [SPEC-20260731-001](design-system/SPEC-20260731-001-adocao-direcao-azul-indigo.md) |
| C1 | Dados pessoais processados sob LGPD; exclusão completa acionada via `DELETE /users/me`. Fluxo: (1) soft-delete imediato — `profiles.deleted_at` preenchido, `name`/`preferences` permanecem intactos durante a janela (sem anonimização imediata — estratégia definitiva de anonimização de PII fica para spec dedicada futura), acesso bloqueado pelo `SupabaseAuthGuard` em toda rota autenticada; (2) restauração possível via `POST /users/me/restore` dentro da janela (R-BIZ-05); (3) hard delete via job agendado (`pg_cron`) após 30 dias de período de graça, caso não haja restore. Cascata `ON DELETE CASCADE` a partir de `auth.users` remove todos os dados transacionais do usuário no hard delete. Admin pode executar hard delete imediato via `DELETE /admin/users/:id` (sem período de graça) para atender pedidos urgentes de compliance | [SPEC-20260521-004](admin/SPEC-20260521-004.md), [SPEC-20260719-002](admin/SPEC-20260719-002-soft-delete-retencao-conta.md) |
| C2 | Audit log registrado em toda Server Action mutante e em toda operação REST que altera dados; campos obrigatórios: `action`, `table_name`, `record_id`, `changes` | [SPEC-20260521-001](security/SPEC-20260521-001.md) |

---

## Histórico de Versões

> Formato conforme `~/.claude/CLAUDE.md` — regras cujo comportamento mudou entre specs ganham
> tabela de histórico aqui, em vez de nota inline na tabela principal. Specs podem citar a versão
> vigente (`rules: [R2]`) ou travar numa versão específica (`rules: [R2@v1]`).

### R2 — Detecção de duplicata em despesas
**Versão atual:** v2 (2026-07-15)

| Versão | Data | Mudança |
|--------|------|---------|
| v1 | 2026-06-01 | Criação (SPEC-20260601-002): despesa duplicada (mesmo `vehicle_id`/`category`/`amount`/data) nunca é bloqueada — sempre persistida com `duplicate_warning: true` e `duplicate_id` |
| v2 | 2026-07-15 | SPEC-20260715-002: `expenses.date` renomeada para `occurred_at` e migrada de `DATE` para `timestamptz`; "mesma data" passa a significar mesmo dia calendário no fuso do usuário, não igualdade de `timestamptz` |

### R-CTX-02 — Persistência de contexto (single/group)
**Versão atual:** v2 (2026-07-16)

| Versão | Data | Mudança |
|--------|------|---------|
| v1 | 2026-06-02 | Criação (SPEC-20260602-001): contextos `single` e `group` persistem em `localStorage` |
| v2 | 2026-07-16 | SPEC-20260603-001 RF-21/RF-23: migrado para `sessionStorage` isolado por aba — `localStorage` compartilhava contexto entre abas simultâneas, sobrescrevendo-se mutuamente |

### R-LED-04 — Nota de auditoria (não é mudança de versão)
A regra nunca mudou de comportamento — o texto abaixo é status de verificação, não histórico de versão. O diagnóstico [IMPACTO-026](../matrices/impacto.md#impacto-026-diagnóstico-dba-do-banco-real-navesaas-supabase--achados-críticos-de-segurança-e-integridade) #4 (2026-07-12) confirmou que a constraint `expenses_source_coherence_check` **não existia no banco legado `NaveSaaS`** (descontinuado, sem migração de dados). No projeto atual `Nave`, a constraint **já foi criada e verificada** — ver [IMPACTO-027](../matrices/impacto.md#impacto-027-criação-do-projeto-nave-schema-higienizado-e-fechamento-dos-achados-do-impacto-026) #5. Nenhuma ação pendente.

### P4 — Nota de auditoria (não é mudança de versão)
A regra nunca mudou — o texto abaixo é status de verificação, não histórico de versão. O achado "35 policies em 15 tabelas usam `auth.uid()` não otimizado" ([IMPACTO-026](../matrices/impacto.md#impacto-026-diagnóstico-dba-do-banco-real-navesaas-supabase--achados-críticos-de-segurança-e-integridade), 2026-07-12) era sobre o banco **legado** `NaveSaaS` (descontinuado). No projeto atual `Nave`, todas as 41 policies criadas em `supabase/migrations/20260712172047_rls_policies.sql` já usam `(select auth.uid())` desde a origem — confirmado por varredura em 2026-07-31 (nenhuma ocorrência não otimizada no arquivo) e por [IMPACTO-027](../matrices/impacto.md#impacto-027-criação-do-projeto-nave-schema-higienizado-e-fechamento-dos-achados-do-impacto-026) #8 (`get_advisors`). Nenhuma ação pendente.

### R-ODO-01 — Nota de relacionamento com R1 (não é mudança de versão)
R-ODO-01 não é uma versão de R1 — é uma regra própria que supersede R1 **apenas no fluxo web** (server actions de `expenses`); R1/SPEC-20260601-001 permanece válida para `apps/api`. As duas regras coexistem por camada de aplicação, não por substituição temporal de uma pela outra.

### R-DS-05 — Proporção cromática de referência
**Versão atual:** v2 (2026-07-29)

| Versão | Data | Mudança |
|--------|------|---------|
| v1 | 2026-07-22 | Criação (SPEC-20260722-001): ~70% neutro / ~15% primary / ~10% semântico / ~5% gold |
| v2 | 2026-07-29 | SPEC-20260729-001 (adoção da direção Prata): revisada para 60-30-10 (neutro/estrutural/acento saturado), alinhada à pesquisa de proporção e distribuição de cor trazida pelo usuário e ao ajuste feito no showcase Prata, que corrigiu um fundo majoritariamente colorido (gradiente cobrindo ~100% de uma seção) para a nova proporção. `SPEC-20260722-001` cita a regra sem versão travada (`R-DS-05`, não `R-DS-05@v1`) — herda v2 automaticamente, sem precisar de edição própria. |

### R-DS-12 — Escala tipográfica formal obrigatória em `text-*`
**Versão atual:** v1 (2026-07-31)

| Versão | Data | Mudança |
|--------|------|---------|
| v1 | 2026-07-31 | Criação (SPEC-20260731-005): proíbe `text-[Npx]` e chaves não formais (`text-3xl` e acima) em código de produção; exceções documentadas: `concept/*` e copy de marketing com comentário explícito. |

### S13 — Bloqueio de soft-delete via RLS: WITH CHECK do UPDATE e USING do SELECT
**Versão atual:** v2 (2026-07-31)

| Versão | Data | Mudança |
|--------|------|---------|
| v1 | 2026-07-31 | Criação: `WITH CHECK` das policies de `UPDATE` precisa validar apenas posse, nunca herdar `deleted_at is null` do `USING` — 6 policies corrigidas (`migration 20260731192440`). Insuficiente sozinho: o bug persistia. |
| v2 | 2026-07-31 | Causa-raiz completa: o Postgres também combina o `USING` da policy de `SELECT` no `WITH CHECK` efetivo do `UPDATE`. As 6 policies de `SELECT` (`profiles`, `vehicles`, `expenses`, `maintenances`, `fines`, `vehicle_recurring_costs`) removeram `deleted_at is null` do `USING` (`migration 20260731204319`). Confirmado com teste real (transação com rollback simulando JWT de usuário real): soft-delete passa a funcionar. |

### S12 — `app_metadata` como única fonte de autorização no Supabase Auth
**Versão atual:** v1 (2026-07-31)

| Versão | Data | Mudança |
|--------|------|---------|
| v1 | 2026-07-31 | Criação (SPEC-20260731-006): achado crítico de escalação de privilégio via `user_metadata`; proíbe o uso de `user_metadata` para decisões de autorização em toda a codebase do backend; `app_metadata` passa a ser a única fonte permitida de claim de role. |

### S14 — Gestão de role de admin: auditoria obrigatória e bloqueio de auto-rebaixamento
**Versão atual:** v1 (2026-07-31)

| Versão | Data | Mudança |
|--------|------|---------|
| v1 | 2026-07-31 | Criação (SPEC-20260731-008): toda alteração de role via endpoint admin é auditada; auto-rebaixamento é bloqueado com 422 para prevenir lockout acidental. |

---

## Como usar

- **Ao criar uma spec:** liste os IDs aplicáveis no frontmatter (`rules: [R1, R4]`)
- **Ao implementar:** anote no código (`// valida R1`)
- **Ao escrever testes:** referencie o ID no describe (`describe('EC-01: valida R1 — odômetro retroativo')`)
- **Ao adicionar uma regra nova:** defina o ID aqui antes de implementar e antes de escrever o teste
