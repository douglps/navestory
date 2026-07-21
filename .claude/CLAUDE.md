# Convenções do Projeto Nave

> Preferências pessoais de idioma, git e qualidade de código gerais estão em `~/.claude/CLAUDE.md` e já valem aqui automaticamente. Este arquivo cobre apenas o processo específico deste projeto.

## Quando aplicar o processo completo abaixo

As regras de specs, ADRs e matrizes valem para **features com regra de negócio, dado sensível de paciente/usuário, ou impacto em produção**.
Para protótipos, scripts utilitários e provas de conceito, esse processo é opcional — use o bom senso em vez de burocracia forçada.

## Testes

- Testes obrigatórios para funcionalidades novas com regra de negócio ou impacto em produção
- Protótipos e spikes podem ficar sem testes até serem promovidos a feature real

## Rastreabilidade no código

Todo arquivo que implementa um requisito rastreável anota, usando a sintaxe de comentário da própria linguagem, no topo ou na função:

```
// @spec SPEC-YYYYMMDD-NNN RF-XX     (JS/TS/Java/C...)
# @spec SPEC-YYYYMMDD-NNN RF-XX      (Python/Bash/Ruby...)
-- @spec SPEC-YYYYMMDD-NNN RF-XX     (SQL)
```

- Ao adicionar regra de negócio nova, registrar no `RULES.md` antes de implementar
- ADR novo é obrigatório ao mudar padrão arquitetural estabelecido — usar template em `docs/architecture/decisions/TEMPLATE.md`

## Estrutura Padrão de Projeto

Todo projeto (com processo completo aplicável) deve conter a seguinte estrutura (criada via `/iniciar-projeto`):

```
{projeto}/
  .gitignore
  README.md
  specs/
    README.md             ← índice geral + convenções
    PRD.md                ← ponteiro para docs/PRD/ + resumo
    ARCHITECTURE.md       ← ponteiro para docs/architecture/ + resumo
    API-SPEC.md           ← convenções e erros de API
    RULES.md              ← R, S, P, C — criar primeiro
    TESTS_SPEC.md         ← estratégia de testes
    AGENTS.md             ← diretrizes para agentes IA
    <feature>/
      README.md           ← obrigatório com 2+ specs
      SPEC-YYYYMMDD-NNN.md
  matrices/
    impacto.md            ← mudanças avaliadas e riscos
    rastreabilidade.md    ← requisitos → specs → código → testes
    permissoes.md         ← roles × recursos × ações
  docs/
    PRD/                  ← documento completo do PRD
    architecture/
      overview.md         ← mapa técnico
      decisions/          ← ADRs
```

## Specs

- Toda feature relevante deve ter uma spec antes da implementação
- Specs são **obrigatórias e internas a cada projeto** — ficam em `{projeto}/specs/`, nunca em escopo global
- ID no formato `SPEC-YYYYMMDD-NNN` (ex: `SPEC-20260512-001`)
- Usar o agente `spec-writer` ou o comando `/nova-spec` para criá-las

### Organização por feature

Cada domínio/feature tem sua própria subpasta dentro de `specs/`:
```
specs/
├── <feature>/
│   ├── README.md         ← índice da feature (obrigatório quando há 2+ specs)
│   └── SPEC-YYYYMMDD-NNN.md
```
Não colocar specs na raiz de `specs/` — toda spec pertence a uma feature.

### Frontmatter obrigatório

```yaml
---
id: SPEC-YYYYMMDD-NNN
title: "Título da Feature"
status: draft | review | approved | deprecated
date: YYYY-MM-DD
author: <nome> (<email>)
rules: [R1, R4]      # IDs de regras de domínio que esta spec implementa
security: [S1]       # IDs de regras de segurança que esta spec implementa
camadas: [backend, database]  # camadas técnicas tocadas — vocabulário canônico em ~/.claude/CLAUDE.md
---
```

**Campo `camadas`:** array com pelo menos 1 valor. Permite consulta horizontal ("quais specs tocam backend?") sem quebrar a organização vertical por feature deste projeto. Usar o vocabulário canônico definido em `~/.claude/CLAUDE.md` (`frontend`, `backend`, `database`, `infra`, `devops`, `qa`, `design`, `data`, `mobile`, `security`) — o Nave não precisa estender essa lista hoje.

**Formato do campo `author`:** `Douglas Lopes (lps.doug@protonmail.com)` — nome completo seguido do e-mail entre parênteses. Este é o autor padrão de toda spec deste projeto, salvo quando outro colaborador estiver devidamente identificado (nome e e-mail próprios registrados no projeto).

Não criar seção `## Implementação` dentro da spec — o código aponta para a spec, nunca o contrário.

### Gate de sincronia (spec ↔ código ↔ matriz)

Uma spec só pode transicionar para `status: approved` se `matrices/rastreabilidade.md` já tiver a linha correspondente (requisito → spec → código → teste), ainda que código/teste estejam marcados como `pendente`. Não existe spec aprovada sem entrada na matriz, mesmo que incompleta.

Ao concluir a implementação, atualizar a matriz com os caminhos reais de código e teste **faz parte da definição de "pronto"** da feature — não é uma tarefa solta a ser lembrada depois. O agente `doc-keeper` é acionado como parte do fechamento da feature, não sob demanda eventual. Uma spec `approved` cujo código existe mas cuja matriz não reflete isso é um desvio de processo a ser sinalizado em revisão.

### Changelog de spec pós-aprovação

Depois que uma spec vira `approved`, qualquer edição de conteúdo (não frontmatter trivial) exige uma entrada de changelog no rodapé da spec: data, o que mudou, por quê.

- **Mudança estrutural** (reverte ou substitui requisito): não editar in-place — criar spec nova (`SPEC-YYYYMMDD-NNN`) que referencia a antiga; a spec antiga muda para `status: deprecated` com `superseded_by:` apontando para a nova.
- **Mudança pequena** (correção, clarificação sem mudar comportamento): pode ser edição direta, mas ainda registrada no changelog da spec, sem trocar de status.

### Destino de specs `deprecated`

Ao marcar uma spec como `deprecated`, preencher obrigatoriamente um dos campos:
- `superseded_by: SPEC-YYYYMMDD-NNN` — quando há substituição; o prazo de remoção do código antigo entra em `matrices/impacto.md`, não fica implícito.
- `motivo_remocao: <texto>` — quando é descontinuação sem substituição; nesse caso, verificar se há código com `@spec` apontando para essa spec e tratá-lo (remover ou reatribuir), evitando referências mortas no código.

## Matrizes

- **Impacto** (`matrices/impacto.md`): atualizar antes de implementar mudanças significativas — usar `/impacto`
- **Rastreabilidade** (`matrices/rastreabilidade.md`): manter o mapa requisito → spec → código → teste atualizado; caminhos devem refletir a estrutura `specs/<feature>/SPEC-ID.md`. Nenhuma spec `approved` existe sem entrada aqui (ver Gate de sincronia)
- **Permissões** (`matrices/permissoes.md`): atualizar ao adicionar novos recursos ou roles
- Usar o agente `doc-keeper` para manutenção das matrizes

## Documentação Central de Specs

Todo projeto deve manter estes documentos em `specs/`:

| Arquivo | Propósito | Criar quando |
|---------|-----------|-------------|
| `specs/RULES.md` | Regras de domínio (R), segurança (S), performance (P), compliance (C) com IDs estáveis | Antes da 1ª spec aprovada |
| `specs/TESTS_SPEC.md` | Pirâmide de testes, casos críticos, o que NÃO testar | Antes dos primeiros testes |
| `specs/AGENTS.md` | Diretrizes para agentes IA: permitido, proibido, output | Antes de usar IA no projeto |
| `specs/API-SPEC.md` | Convenções de API, tabela de códigos de erro | Quando há API REST |
| `specs/PRD.md` | Ponteiro para o PRD completo + resumo de 10 linhas | Sempre |
| `specs/ARCHITECTURE.md` | Ponteiro para docs de arquitetura + resumo de 10 linhas | Sempre |

**Regra anti-duplicação:** `specs/PRD.md` e `specs/ARCHITECTURE.md` são **ponteiros** (índice de links + resumo), nunca cópias dos documentos que vivem em `docs/`. Uma informação tem exatamente um lugar canônico.

### Identificadores de Regra

Regras de negócio recebem IDs estáveis categorizados:

| Prefixo | Categoria | Exemplos |
|---------|-----------|---------|
| `R` | Regras de domínio | R1 odômetro não retrocede, R2 duplicata requer confirmação |
| `S` | Segurança | S1 JWT obrigatório, S2 RLS ativo |
| `P` | Performance | P1 listagens paginadas max 100, P2 operações fire-and-forget |
| `C` | Compliance | C1 LGPD exclusão cascata, C2 audit log em mutações |

IDs são **estáveis e citáveis** — casos de teste referenciam por ID (`CT-001 valida R1`), código comenta com `// valida R1`.

### Versionamento de regra

Cada regra em `RULES.md` mantém um histórico de versões junto da definição atual:

```markdown
### R1 — Odômetro não retrocede
**Versão atual:** v2 (2026-07-12)

| Versão | Data | Mudança |
|--------|------|---------|
| v1 | 2026-03-01 | Criação: odômetro não aceita valor menor que o último registrado |
| v2 | 2026-07-12 | Passou a permitir exceção com justificativa de manutenção/troca de veículo |
```

Specs citam a regra de duas formas, conforme a intenção:
- **Sem versão** (`rules: [R1]`) — adota "sempre a regra vigente"; usar para comportamento genérico que deve acompanhar a evolução da regra.
- **Com versão fixa** (`rules: [R1@v1]`) — trava o comportamento na versão citada; usar quando a spec documenta uma decisão pontual que não deve mudar sozinha se a regra evoluir.

Ao subir a versão de uma regra (`vN → vN+1`): registrar a linha de histórico com o delta e varrer specs `approved` que citam a regra sem `@vN` fixo, sinalizando quais podem estar assumindo o comportamento antigo para revisão manual.

## Agentes Disponíveis

| Agente            | Quando usar                                                      |
| ----------------- | ---------------------------------------------------------------- |
| `spec-writer`     | Criar ou atualizar especificações de features                    |
| `impact-analyzer` | Analisar impacto antes de mudanças significativas                |
| `reviewer`        | Revisar código e specs antes de commitar                        |
| `tester`          | Criar planos de teste e verificar cobertura                     |
| `e2e-tester`      | Implementar e manter testes E2E com Playwright (Page Object Model, fixtures de auth) conforme `specs/qa/SPEC-20260716-003-e2e-playwright.md` |
| `doc-keeper`      | Manter documentação, matrizes e RULES.md atualizados            |
| `design-system`   | Pesquisar tendências, criar/evoluir componentes UI, auditar consistência visual, propor paletas e identidade |
| `clinical-reviewer` | Revisar specs/telas de sistemas de saúde sob perspectiva de médico/enfermeiro: segurança do paciente, completude clínica e simplicidade de uso |
| `dba`              | Revisar/projetar schema, índices, queries, migrações, backups e segurança em nível de banco de dados |
| `data-engineer`    | Projetar/revisar pipelines ETL/ELT, orquestração, transformação e confiabilidade do fluxo de dados |
| `data-architect`   | Modelar domínios de dado e decidir arquitetura de armazenamento de longo prazo (relacional, warehouse, lake) |
| `data-steward`     | Governança de dados: classificação, política de acesso/retenção, conformidade LGPD e qualidade de dado |

> Ao criar uma spec nova, o `spec-writer` preenche automaticamente o frontmatter com `rules:` e `security:` conforme o `RULES.md` do projeto.

## Comandos Disponíveis

| Comando            | Descrição                         |
| ------------------ | ---------------------------------- |
| `/nova-spec`       | Cria uma nova spec de feature     |
| `/impacto`         | Analisa impacto de uma mudança    |
| `/iniciar-projeto` | Scaffold completo de projeto novo |
| `/cleanup`         | Varredura e limpeza de lixo no repositório |
| `/design-system`   | Pesquisa de tendências, criação de componentes, auditoria visual ou evolução de tema |
