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
| R-MON-01 | `writeAuditLog` e `AuditService.log` são sempre fire-and-forget; erros nunca propagam para a operação principal | [SPEC-20260602-005](dashboard/SPEC-20260602-005.md) |
| R-MON-02 | O campo `changes` em `audit_logs` não armazena PII; campos sensíveis (`user_id`, `photo_url`, tokens) são omitidos no registro e filtrados na exibição | [SPEC-20260602-005](dashboard/SPEC-20260602-005.md) |
| R-MON-03 | `audit_logs.user_id` é `ON DELETE SET NULL`; registros são preservados após exclusão de conta para fins de compliance | [SPEC-20260602-005](dashboard/SPEC-20260602-005.md) |
| R-CAT-01 | Máximo 20 categorias personalizadas por usuário — enforced no service (`CategoriesService.MAX_CUSTOM`); retorna 422 ao exceder | [SPEC-20260602-004](expenses/SPEC-20260602-004.md) |
| R-CAT-02 | `value` de categoria personalizada segue slug `^[a-z0-9_-]+$`, 1–50 caracteres; validado por Zod e por constraint de DB | [SPEC-20260602-004](expenses/SPEC-20260602-004.md) |
| R-CAT-03 | `value` de categoria personalizada não pode coincidir com o `value` de nenhuma categoria padrão; retorna 409 se coincidir | [SPEC-20260602-004](expenses/SPEC-20260602-004.md) |
| R-CAT-04 | Hard-delete de categoria; despesas existentes com aquele `category` value não são afetadas (campo TEXT, sem FK) | [SPEC-20260602-004](expenses/SPEC-20260602-004.md) |
| R-GRP-01 | Máximo 200 veículos por grupo — validado pelo schema Zod em `setGroupMembersInputSchema` | [SPEC-20260602-003](vehicles/SPEC-20260602-003.md) |
| R-GRP-02 | `setGroupMembers` usa replace-all; histórico de membros anteriores não é preservado | [SPEC-20260602-003](vehicles/SPEC-20260602-003.md) |
| R-GRP-03 | Apenas veículos ativos (`deleted_at IS NULL`) do próprio usuário podem ser membros de um grupo; veículos inválidos são descartados silenciosamente | [SPEC-20260602-003](vehicles/SPEC-20260602-003.md) |
| R-GRP-04 | Exclusão de grupo é hard-delete; membros são removidos por cascade FK, não por lógica de aplicação | [SPEC-20260602-003](vehicles/SPEC-20260602-003.md) |
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
| R-BIZ-11 | Grace period = 50% do tempo como assinante, cap 1 ano, minimo 30d (1-3m) / 60d (4-11m) / 90d (12m+) | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |
| R-BIZ-12 | Export bloqueado no plano Gratis; Pro mensal com rate limit (a definir); Pro anual e Frota ilimitados | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |
| R-BIZ-13 | API publica requer simulacao de custos de infraestrutura aprovada antes do lancamento | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |
| R-BIZ-14 | Consolidacao e irreversivel — apos expirar o grace, dados gerais sao permanentes e nao podem ser reexpandidos em detalhes | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |
| R-BIZ-15 | Resolucao de features segue precedencia Usuario > Plano > Sistema, exceto kill-switch de Sistema (`force`); toda alteracao e auditada e exige motivo obrigatorio | [SPEC-20260620-001](business/SPEC-20260620-001-business-strategy-stories.md) |

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

### Regras de PWA / Offline (R-PWA)

| ID | Regra | Spec |
|----|-------|------|
| R-PWA-01 | Estratégia de cache por tipo de recurso no Service Worker: assets estáticos versionados usam `CacheFirst`; navegação HTML usa `NetworkFirst` com fallback para cache/página offline; `GET` de dados da API usa `StaleWhileRevalidate`; mutações (`POST`/`PUT`/`PATCH`/`DELETE`) nunca são interceptadas — sempre `NetworkOnly` | [SPEC-20260712-001](pwa/SPEC-20260712-001-pwa-offline.md) |
| R-PWA-02 | Toda tentativa de mutação feita sem conexão é bloqueada no cliente antes do envio, com mensagem explícita; não há fila de sincronização nesta fase (Fase 2) | [SPEC-20260712-001](pwa/SPEC-20260712-001-pwa-offline.md) |
| R-PWA-03 | Atualização do Service Worker é opt-in — nova versão detectada dispara toast; `skipWaiting()`/`clientsClaim()` só executam após ação explícita do usuário, nunca automaticamente | [SPEC-20260712-001](pwa/SPEC-20260712-001-pwa-offline.md) |
| R-PWA-04 | O manifest deve incluir ícones 192×192 e 512×512 em formato `any` e `maskable`; `theme_color`/`background_color` seguem a paleta Nave | [SPEC-20260712-001](pwa/SPEC-20260712-001-pwa-offline.md) |
| R-PWA-05 | Em navegadores sem suporte a `beforeinstallprompt` (Safari iOS/iPadOS), a UI exibe instrução manual de instalação ("Compartilhar → Adicionar à Tela de Início") em vez do prompt automático | [SPEC-20260712-001](pwa/SPEC-20260712-001-pwa-offline.md) |
| R-PWA-06 | O cache de dados de API (`StaleWhileRevalidate`) nunca ultrapassa 7 dias (validade do refresh token, ADR-003); todas as entradas de dados de usuário são removidas no evento `SIGNED_OUT` do Supabase Auth | [SPEC-20260712-001](pwa/SPEC-20260712-001-pwa-offline.md) |

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

---

## Limites de Performance (P)

| ID | Regra |
|----|-------|
| P1 | Todas as listagens paginadas; máximo 100 registros/página, default 20; campo `cursor` disponível para paginação por cursor |
| P2 | Atualização de `last_used_at` em templates é fire-and-forget — não bloqueia a resposta ao usuário |
| P3 | Sem `console.log`, `console.warn` ou `debugger` em codigo de producao; backend usa `Logger` do NestJS; frontend usa condicionais de `NODE_ENV` para logs de desenvolvimento. **Nota 2026-06-22:** 11 ocorrencias residuais identificadas em IMPACTO-021 #6 |
| P4 | Policies RLS usam `(SELECT auth.uid())` em vez de `auth.uid()` direto — permite ao planner do Postgres cachear o resultado como InitPlan (avaliado uma vez por query) em vez de reavaliar por linha. **Achado real 2026-07-12:** 35 policies em 15 tabelas do banco de produção usam a forma não otimizada — achado [IMPACTO-026](../matrices/impacto.md#impacto-026-diagnóstico-dba-do-banco-real-navesaas-supabase--achados-críticos-de-segurança-e-integridade) |
| P5 | O endpoint `GET /health` deve concluir em no máximo 5 segundos, incluindo a verificação de dependências externas; cada dependência individual tem timeout de 3 segundos. Falha de dependência não-crítica retorna `status: "degraded"` (HTTP 200) em vez de interromper o processo — monitores externos não confundem disponibilidade da API com disponibilidade da dependência | [SPEC-20260716-002](devops/SPEC-20260716-002-observabilidade.md) |

---

## Restrições de Compliance (C)

| ID | Regra | Referência |
|----|-------|------------|
| C1 | Dados pessoais processados sob LGPD; exclusão completa acionada via `DELETE /users/me` com cascata em todas as tabelas do usuário | [SPEC-20260521-004](admin/SPEC-20260521-004.md) |
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

### R-ODO-01 — Nota de relacionamento com R1 (não é mudança de versão)
R-ODO-01 não é uma versão de R1 — é uma regra própria que supersede R1 **apenas no fluxo web** (server actions de `expenses`); R1/SPEC-20260601-001 permanece válida para `apps/api`. As duas regras coexistem por camada de aplicação, não por substituição temporal de uma pela outra.

---

## Como usar

- **Ao criar uma spec:** liste os IDs aplicáveis no frontmatter (`rules: [R1, R4]`)
- **Ao implementar:** anote no código (`// valida R1`)
- **Ao escrever testes:** referencie o ID no describe (`describe('EC-01: valida R1 — odômetro retroativo')`)
- **Ao adicionar uma regra nova:** defina o ID aqui antes de implementar e antes de escrever o teste
