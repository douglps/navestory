# Revisão de Gaps e Incoerências — navestory

**Status:** Revisado pelo agente `reviewer` | **Data:** 2026-07-13 | **Origem:** auditoria completa do repositório (4 agentes Explore) + revisão de priorização (`reviewer`) antes do início da Fase 0 de `docs/IMPLEMENTATION_STRATEGY.md`

## Objetivo deste documento

Consolidar, em um único lugar, todas as lacunas (conteúdo ausente) e incoerências (conteúdo contraditório entre documentos) encontradas na documentação do projeto navestory — que hoje é 100% especificação, 0% código. O objetivo é decidir o que precisa ser corrigido **antes** de iniciar o scaffold técnico (Fase 0), o que pode esperar, e o que já está resolvido e não precisa de nova auditoria.

Prioridade: **Crítico** (bloqueia decisão de arquitetura ou gera risco de segurança/compliance) > **Alto** (gera retrabalho ou confusão de processo) > **Médio** (inconsistência cosmética/documental) > **Baixo** (nice-to-have).

---

## A. Lacunas (conteúdo ausente)

### A1. Sete arquivos de documentação central vazios (0 bytes) — **Alto**

`docs/legal/lgpd-compliance.md`, `docs/legal/data-processing-agreement.md`, `docs/operations/disaster-recovery.md`, `docs/reference/database-schema.md`, `docs/reference/environment-variables.md`, `docs/reference/error-codes.md`, `docs/reference/api-reference.md`.
**Impacto:** o conteúdo equivalente existe espalhado (LGPD em `privacy-policy.md`/`RULES.md`; schema em `docs/architecture/entities.md`; error codes em `specs/API-SPEC.md`), mas os arquivos com nome dedicado — que um novo desenvolvedor ou auditor abriria primeiro — estão vazios. Risco de alguém assumir que "não há política de DR" ou "não há LGPD compliance" por olhar só o arquivo errado.
**Ação recomendada:** preencher com conteúdo consolidado das fontes já existentes (Tarefas T0.7, T0.8, T0.9 do `IMPLEMENTATION_STRATEGY.md`).

### A2. Nenhum pipeline de CI/CD — **Crítico**

`.github/workflows/` não existe, apesar do README referenciar um badge de CI e a estrutura-alvo do projeto listar essa pasta com "lint, test, build, deploy, security-scan".
**Impacto:** sem isso, não há gate automático de qualidade/segurança antes do merge — qualquer código entra sem verificação.
**Ação recomendada:** Tarefa T0.5 do `IMPLEMENTATION_STRATEGY.md`, antes de qualquer feature de domínio.

### A3. `docs/architecture/decisions/TEMPLATE.md` não existe — **Alto**

`.claude/CLAUDE.md` e `docs/IMPLEMENTATION_STRATEGY.md` exigem esse template para todo ADR novo, mas o arquivo não existe no disco.
**Impacto:** todo ADR criado até agora (incluindo os 8 existentes e o ADR-008 desta sessão) foi escrito sem template formal — funcionou por convenção implícita (Status/Context/Decision/Consequences/References), mas não há um arquivo-fonte único.
**Ação recomendada:** criar o template extraindo a estrutura já usada consistentemente nos ADRs existentes.

### A4. ADRs de infraestrutura 001 e 002 referenciados mas inexistentes — **Alto** _(revisado de Crítico)_

`001-monorepo-structure.md` e `002-supabase-rls-strategy.md` são citados em `docs/architecture/overview.md`, `specs/ARCHITECTURE.md`, `specs/RULES.md:140` e `specs/security/README.md:11` como decisões "Accepted", mas **não existem como arquivos**. Só `003-auth-jwt-strategy.md` existe de fato.
**Impacto:** duas decisões arquiteturais fundamentais (estrutura de monorepo, estratégia de RLS) são tratadas como formalizadas em 4 documentos diferentes, mas não há registro real. _Nota do `reviewer`:_ o conteúdo dessas decisões **não está perdido** — está descrito inline em `overview.md`, na regra S2 de `RULES.md` e na estrutura do README. O risco é de processo (um ADR prometido que não existe), não de conteúdo ausente — por isso a severidade foi reduzida de Crítico para Alto.
**Ação recomendada:** escrever os dois ADRs retroativamente (prática aceita — Michael Nygard também documenta esse padrão; o conteúdo já existe espalhado, baixo risco de "fabricar raciocínio post-hoc") ou remover as referências se a decisão for tratá-los como "nunca formalizados, só descritos inline".

### A5. Sete de oito links de diagramas/guias referenciados são quebrados — **Médio** — **Decisão: aguardar**

`docs/architecture/diagrams/{system-context,container-diagram,data-flow}.md`, `docs/architecture/security/`, `docs/guides/{developer,getting-started}.md`, `docs/operations/runbooks.md` — nenhum existe. Só `docs/architecture/entities.md` existe de fato, dos 8 links verificados.
**Impacto:** um leitor seguindo os "Links Rápidos" de `overview.md` encontra 404 em 7 de 8 tentativas — reduz a confiabilidade da documentação como fonte única de verdade.
**Decisão do usuário:** não criar placeholders agora. Esperar que esses documentos surjam naturalmente ao longo da implementação (diagramas quando a arquitetura for desenhada de fato; guias quando houver código para guiar; runbooks quando houver operação real para documentar). Os links continuam quebrados até lá — aceito como estado transitório de um projeto greenfield, não como pendência a resolver na Fase 0.

### A6. `docs/adr/` referenciada mas inexistente — **Baixo**

`docs/architecture/overview.md` afirma que essa pasta "contém versões legadas e resumidas dos ADRs de infraestrutura" — a pasta não existe.
**Ação recomendada:** remover essa nota de `overview.md`.

### A7. ADR-008 não catalogado no índice de `overview.md` — **Médio** _(revisado de Baixo)_

O ADR criado nesta sessão (decisão de state management) existe no disco mas não aparece na tabela de ADRs vigentes de `docs/architecture/overview.md`. _Nota do `reviewer`:_ o ADR-008 resolve uma contradição visível no próprio `overview.md` (que listava Zustand como solução de estado enquanto `.agents/rules/stack.md` proibia Zustand para dados de servidor) — um desenvolvedor lendo o "mapa do sistema" para começar a Fase 0 encontraria esse conflito sem resolução aparente. Severidade elevada por isso.
**Ação recomendada:** adicionar a linha na tabela.

### A8. _(Novo, do `reviewer`)_ ADR-006 cita caminhos de código que não existem — **Baixo — ✅ Corrigido**

A seção References de `ADR-006-unified-financial-ledger.md` citava `supabase/migrations/20260608000000_unified_ledger.sql`, `apps/api/src/modules/expenses/expenses.service.ts` e `apps/api/src/modules/fines/fines.service.ts` — nenhum existia, pois o projeto tem 0% de código ainda.
**Ação aplicada:** referências removidas da seção References; substituídas por uma nota explícita de que os caminhos de implementação serão criados na Fase 3 do `IMPLEMENTATION_STRATEGY.md`, não referenciados como se já existissem.

### A9. _(Novo, do `reviewer`)_ ADR-008 descreve como pendente uma ação já concluída — **Baixo**

A seção References do ADR-008 diz que `.agents/rules/stack.md` "deve ser atualizado" para refletir a fronteira TanStack Query/Zustand — mas essa atualização já foi feita nesta mesma sessão (`stack.md` já contém a redação corrigida).
**Ação recomendada:** atualizar a nota do ADR-008 para refletir que a propagação já ocorreu.

---

## B. Incoerências (conteúdo contraditório entre documentos)

### B1. R-LED-04 vs. ADR-006 — **Médio** _(revisado de Crítico)_ — **✅ Corrigido**

`ADR-006-unified-financial-ledger.md` (linha 30) afirmava que a constraint CHECK de `source_type`+`source_id` "é enforced no banco". `specs/RULES.md` (R-LED-04), com nota de 2026-07-12, documentava que o diagnóstico real do banco (IMPACTO-026) confirmou que essa constraint **não existe** — sem dizer em qual dos dois bancos. _Correção do `reviewer`:_ o achado do IMPACTO-026 é sobre o banco legado `NaveSaaS` (descartado); o IMPACTO-027 item #5 confirma que a constraint **já foi aplicada e verificada no projeto novo `navestory`**. Não há bug real de dados órfãos no projeto que será construído — era um problema de leitura cruzada (a nota antiga não dizia a qual banco se referia).

**Correção aplicada:**

- `specs/RULES.md` (R-LED-04): nota reescrita para dizer explicitamente que a constraint **não existia no `NaveSaaS`** (legado, descontinuado, sem migração de dados) e **já existe e foi verificada no `navestory`** (projeto atual, IMPACTO-027 #5). Nenhuma ação pendente.
- `docs/architecture/decisions/ADR-006-unified-financial-ledger.md`: linha da regra R-LED-04 atualizada com a mesma distinção NaveSaaS/navestory, nomeando a constraint real (`expenses_source_coherence_check`).
- Os dois documentos agora contam a mesma história, sem contradição.

### B2. R-CTX-02: localStorage vs. sessionStorage — **Alto**

`specs/RULES.md`, `context/SPEC-20260602-001-em-foco-contexto-global.md` e `vehicles/SPEC-20260602-003.md` ainda afirmam que os modos `single`/`group` persistem em `localStorage`. `context/SPEC-20260603-001-context-chip-subheader.md` (mais recente) corrigiu explicitamente essa decisão para `sessionStorage` e registrou nota pedindo que o `doc-keeper` propagasse a correção a `RULES.md` — isso nunca foi feito.
**Impacto:** três documentos do mesmo domínio (contexto/veículos) descrevem comportamentos de persistência diferentes para a mesma regra — se a implementação seguir a spec mais antiga, o comportamento correto (decidido por último) não será aplicado.
**Ação recomendada:** propagar a correção `sessionStorage` para `RULES.md`, `SPEC-20260602-001` e `SPEC-20260602-003` antes de implementar a Fase 5 (Dashboard e Contexto Global).

### B3. `specs/README.md` desatualizado — **Médio**

O índice geral não lista `SPEC-20260711-001` (Ciclos de Odômetro, `approved`) na linha de features de "Veículos", apesar de existir no filesystem e ter 4 regras (`R-ODO-03` a `R-ODO-06`) associadas.
**Ação recomendada:** atualizar a linha.

### B4. IMPACTO-026 sem referência cruzada a IMPACTO-027 — **Médio**

`IMPACTO-026` documenta 6 achados críticos/altos de segurança no banco legado `NaveSaaS`. `IMPACTO-027` (entrada seguinte) confirma que o schema do projeto novo `navestory` já nasceu corrigido desses achados. Só que `IMPACTO-026` não tem nenhuma nota de topo apontando para essa resolução — um leitor que pare nela concluiria (incorretamente) que os riscos críticos ainda estão abertos no projeto atual.
**Ação recomendada:** adicionar nota no cabeçalho de IMPACTO-026: "Resolvido para o projeto novo `navestory` — ver IMPACTO-027. Achados abaixo referem-se exclusivamente ao banco legado `NaveSaaS`, que foi descartado (ver decisão registrada em B5)."

### B5. Decisão "ignorar NaveSaaS" sem registro formal — **Alto**

Confirmado nesta sessão com o usuário: o banco de produção legado `NaveSaaS` será ignorado, sem migração de dados; o projeto novo `navestory` (já auditado como limpo em IMPACTO-027) é a base única daqui para frente. Essa decisão não tem entrada formal em `matrices/impacto.md` — está apenas implícita no fechamento de IMPACTO-027 e neste documento.
**Ação recomendada:** criar uma entrada nova (ex: IMPACTO-028) formalizando: "Decisão de produto: NaveSaaS descontinuado sem migração de dados. Projeto navestory (schema limpo, IMPACTO-027) é a única fonte de verdade a partir de 2026-07-13." Isso fecha o ciclo de auditoria e evita que a pergunta "o que fazemos com o NaveSaaS?" ressurja.

**Pendência pontual, explicada em linguagem simples:**

O que é o **HaveIBeenPwned**: é um serviço público (mantido por um pesquisador de segurança, Troy Hunt) que acumula bilhões de senhas que já vazaram em invasões conhecidas de outros sites (LinkedIn, Adobe, etc. — não é um vazamento do navestory, é um banco de dados de senhas que já circulam publicamente na internet por causa de vazamentos de terceiros). Quando um usuário cria conta ou troca de senha, o sistema pode consultar esse banco (de forma segura, sem enviar a senha em texto puro) e recusar a senha se ela já for conhecida como vazada — mesmo que a senha "pareça forte" (ex: `Corinthians2024!` pode ser forte na aparência, mas se já vazou em algum site, um invasor vai testá-la primeiro).

Por que importa para o navestory: sem essa checagem, um usuário pode cadastrar uma senha que já está numa lista pública de senhas vazadas, e a conta fica vulnerável a um ataque de "credential stuffing" (o invasor testa senhas vazadas conhecidas em massa contra vários sites).

**Qual é a pendência exatamente:** o Supabase (serviço de banco de dados/autenticação usado pelo navestory) já tem essa checagem pronta, mas ela é **desligada por padrão** e só se liga clicando num botão no painel administrativo do Supabase (não é algo que se resolve escrevendo código) — caminho: `Dashboard do projeto navestory → Auth → Security → habilitar "Password Strength" / "HaveIBeenPwned"`. Ninguém confirmou ainda se esse botão foi clicado no projeto `navestory` novo. Por ser uma ação manual fora do código, é fácil de esquecer — por isso a recomendação de virar uma tarefa própria e explícita no roadmap (Tarefa T0.11 da Fase 0), em vez de ficar só como observação dentro de uma entrada de matriz de impacto, onde passaria despercebida.

### B6. `.agents/rules/testing.md` com auditoria residual de outro ciclo — **Médio**

O arquivo carrega uma "auditoria" datada 13/03/2026 com métricas de 0% cobertura e metas de 30/90 dias, além de uma tabela de cobertura por tipo (UI 80%/Hooks 90%/Utils 95%/Pages 60%/E2E 40%) que não foi reconciliada com a meta global de 88% já fixada em `.agents/rules/stack.md` nesta sessão.
**Ação recomendada:** já rastreado como Tarefa T0.6 do `IMPLEMENTATION_STRATEGY.md` — decidir se o breakdown por tipo é mantido como refinamento por camada (sob o guarda-chuva de 88% global) ou substituído, e remover a auditoria datada.

### B7. Roadmap de 35 dias do PRD desatualizado — **Médio**

`docs/PRD/PRD-v1.0.md` mantém um roadmap de 35 dias escrito antes de existirem as ~38 specs atuais.
**Ação recomendada:** já endereçado pelo roadmap por fases do `docs/IMPLEMENTATION_STRATEGY.md` — recomenda-se adicionar uma nota em `PRD-v1.0.md` apontando para o novo roadmap, em vez de manter os dois em paralelo sem referência cruzada.

### B9. _(Novo, do `reviewer`)_ Contradição interna dentro do próprio ADR-006 — **Médio** — **✅ Corrigido**

`ADR-006-unified-financial-ledger.md` tinha duas frases que se contradiziam sobre como funciona a "trava" que impede duas despesas duplicadas vinculadas à mesma origem (ex: duas expenses para a mesma multa).

**O que é essa "trava" (`UNIQUE INDEX uq_expenses_source`):** é uma regra do banco de dados que impede a criação de duas linhas com a mesma combinação de `source_type` + `source_id` (ex: duas expenses com `source_type='fine'` e `source_id=123`, a mesma multa). Isso evita duplicidade acidental.

**Situação 1 (o que a linha 45 dizia — "trava parcial", só olha registros ativos):**
A trava só considera despesas que **não foram apagadas** (`deleted_at IS NULL`). Despesas soft-deletadas (apagadas "de mentirinha", só marcadas como apagadas mas continuam no banco) não contam para a trava.
_Exemplo prático:_ a multa #123 gera uma expense vinculada. O usuário cancela a multa → a expense vinculada é soft-deletada (fica marcada como "apagada", mas a linha continua existindo). Depois, o usuário registra a multa #123 de novo (reaberta). O sistema cria uma nova expense para `source_id=123` — funciona sem erro, porque a trava ignora a expense antiga (já marcada como apagada).

**Situação 2 (o que a linha 51 dizia — "trava total", olha até registros apagados):**
A trava considera **todas** as linhas, mesmo as soft-deletadas.
_Exemplo prático (mesmo cenário):_ multa #123 cancelada → expense soft-deletada, mas ainda "ocupa o lugar" na trava. Se o usuário registrar a multa #123 de novo, o sistema tenta criar uma nova expense com `source_id=123` — e o banco **recusa**, dizendo "já existe uma linha com essa combinação", mesmo a antiga estando marcada como apagada. O fluxo de "cancelar e reabrir" quebraria.

**Qual é a correta:** a Situação 1 (trava parcial). Isso está confirmado na decisão original registrada em `matrices/impacto.md` (IMPACTO-016, item 3: "Índice parcial — soft-delete libera o slot para nova criação futura") e no schema realmente aplicado no projeto `navestory` (IMPACTO-027, item 5). A linha 51 do ADR era um resquício de um raciocínio anterior que nunca foi atualizado depois que a decisão final (trava parcial) foi tomada.

**Ação aplicada:** a seção "Trade-offs aceitos" do ADR-006 foi reescrita para descrever a Situação 1 como comportamento intencional (não como uma limitação aceita a contragosto), deixando claro que soft-deletar a origem libera o slot automaticamente — coerente com o restante do documento e com o schema real.

### B10. _(Novo, do `reviewer`)_ R1 sem referência cruzada para seu modificador R-ODO-01 — **Médio**

`specs/RULES.md`: R-ODO-01 (linha 56) declara explicitamente que "supersede R1 apenas para o fluxo web; R1/SPEC-20260601-001 permanece válida para `apps/api`". A entrada de R1 (linha 11) não tem nenhuma nota apontando para esse modificador.
**Impacto:** um desenvolvedor da camada web que implemente a partir de R1 isoladamente (sem saber que precisa também ler R-ODO-01) vai construir uma validação de odômetro mais simples do que a regra real do sistema exige nesse fluxo.
**Ação recomendada:** adicionar a R1 uma nota "(ver R-ODO-01 para o comportamento no fluxo web)" — mesmo padrão de cross-reference já usado em outras regras do arquivo.

### B8. Mecanismo de versionamento de spec nunca usado — **Baixo**

`superseded_by`/`status: deprecated`, definidos em `.claude/CLAUDE.md`, nunca foram usados nas 38 specs — mesmo em casos de sobreposição de domínio (ex: `SPEC-20260603-001` corrige comportamento de `SPEC-20260602-001`), a prática foi referência cruzada em texto livre, não o mecanismo formal.
**Impacto:** baixo — a correção textual (B2) mostra que o mecanismo de propagação de mudança de regra funcionou parcialmente (a intenção foi registrada), só a etapa final (atualizar RULES.md) ficou pendente. Não é uma falha de processo, é uma execução incompleta do processo já certo.
**Ação recomendada:** nenhuma ação estrutural necessária; considerar se `SPEC-20260603-001` deveria formalmente marcar como alterando parte de `SPEC-20260602-001` via changelog (ver regra de "Changelog de spec pós-aprovação" em `.claude/CLAUDE.md`).

---

## C. Itens já verificados como corretos (não re-auditar)

- Nenhuma referência quebrada de `rules:`/`security:` no frontmatter das 38 specs para IDs em `RULES.md`. _Qualificação do `reviewer`:_ isso vale para referência direta (spec → regra); o sentido inverso tem uma omissão real — ver B10 (R1 sem backreference para R-ODO-01), que não é uma referência quebrada, mas uma lacuna de rastreabilidade reversa.
- `matrices/rastreabilidade.md` (linhas 757–1100): 100% em `⏳`, sem resíduo de status fictício "✅ implementado".
- `backlog/BACKLOG-admin.md` e `backlog/BACKLOG-auth.md`: já corrigidos, sem "✅ entregue" residual em itens ativos.
- As 6 specs em `draft`/`rascunho` já têm entrada em `matrices/rastreabilidade.md` (excede o gate de sincronia, que só exige isso para `approved`).
- Nenhuma spec `approved` tem sobreposição silenciosa de domínio sem referência cruzada em texto (exceto o caso pontual de B2, que tem referência mas propagação incompleta). _Qualificação do `reviewer`:_ esta afirmação é condicional — vale enquanto `SPEC-20260603-001` permanece em `draft`. Quando ela for promovida a `approved` (Tarefa T5.4 do roadmap), a condição se rompe automaticamente se B2 não tiver sido resolvido antes. Tratar B2 como bloqueador de T5.4, não como item independente.
- `docs/architecture/entities.md` já reflete corretamente os dois projetos Supabase (`navestory` limpo vs. `NaveSaaS` legado) e as 5 tabelas antes "não documentadas" — não está desatualizado, ao contrário do que uma leitura isolada de IMPACTO-026 sugeriria. Confirmado pelo `reviewer` via IMPACTO-027 item #12.

---

## Resumo por severidade (pós-revisão do `reviewer`)

| Severidade | Itens                                                                                                                                                                                                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Crítico    | A2 (sem CI/CD)                                                                                                                                                                                                                                                                                        |
| Alto       | A1 (7 docs vazios), A3 (sem template de ADR), A4 (ADRs 001/002 fantasmas), B2 (localStorage vs sessionStorage), B5 (decisão NaveSaaS sem registro formal + tarefa HaveIBeenPwned)                                                                                                                |
| Médio      | A5 (links quebrados), A7 (ADR-008 não catalogado), B1 (R-LED-04 vs ADR-006 — reclassificado), B3 (README desatualizado), B4 (IMPACTO-026 sem cross-ref), B6 (testing.md residual), B7 (roadmap PRD desatualizado), B9 (contradição interna ADR-006 sobre índice), B10 (R1 sem backreference R-ODO-01) |
| Baixo      | A6 (docs/adr/ fantasma), A8 (ADR-006 cita código inexistente), A9 (ADR-008 com pendência já resolvida), B8 (versionamento de spec não usado)                                                                                                                                                          |

**Mudanças da revisão:** B1 e A4 foram rebaixados (Crítico → Médio/Alto) por terem causa documental, não risco técnico real no projeto `navestory` (o achado de segurança real ficou confinado ao `NaveSaaS`, descartado). A7 foi elevado (Baixo → Médio) por resolver uma contradição visível no documento-mapa do sistema. Quatro achados novos foram incorporados (A8, A9, B9, B10) e a Seção C ganhou duas qualificações importantes (rastreabilidade reversa de R1, e a condicionalidade da afirmação sobre sobreposição de specs frente à promoção futura de `SPEC-20260603-001`).

## Próximo passo

**Validado pelo usuário em 2026-07-13.** Decisões tomadas nesta rodada:

- **A5** (links quebrados): aguardar — não criar placeholders agora, resolver organicamente conforme cada fase avança.
- **A8** (ADR-006 cita código inexistente): ✅ corrigido — referências removidas, nota de "caminho-alvo" adicionada.
- **B1** (R-LED-04 vs. ADR-006): ✅ corrigido — `RULES.md` e `ADR-006` agora contam a mesma história (constraint ausente só no `NaveSaaS` legado, já aplicada e verificada no `navestory`).
- **B5** (decisão NaveSaaS + HaveIBeenPwned): explicado em linguagem simples; HaveIBeenPwned é a checagem de senhas vazadas do Supabase Auth, hoje desligada, ativação manual pendente — vira Tarefa T0.11.
- **B9** (contradição do índice parcial no ADR-006): explicado com exemplos práticos e ✅ corrigido — o índice é parcial por design (soft-delete libera o slot), conforme IMPACTO-016/IMPACTO-027.
- **Demais itens (A1–A4, A6, A7, A9, B2–B4, B6–B8, B10):** aprovados como estavam.

Itens ainda não corrigidos no código/documentação (A1–A4, A6, A7, A9, B2–B4, B6–B8, B10) e a nova Tarefa T0.11 (HaveIBeenPwned) devem ser incorporados ao roadmap do `docs/IMPLEMENTATION_STRATEGY.md` antes do início da Fase 0.
