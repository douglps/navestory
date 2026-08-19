---
id: SPEC-20260814-003
title: "Formulário de Abastecimento: Autocomplete de Fornecedor"
status: approved
date: 2026-08-14
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-FUEL-04, R-SAN-01, R-SAN-02, R-FORM-01, R-FORM-02, R-SUGG-01, R-SUGG-02, R-SUGG-03]
security: [S1, S2]
camadas: [frontend, backend, database]
---

# SPEC-20260814-003: Formulário de Abastecimento — Autocomplete de Fornecedor

## Contexto

O campo `supplier` (fornecedor/posto de abastecimento) já existe no schema e na SPEC-20260606-002 (approved), com regra R-FUEL-04 definindo-o como texto livre de até 100 caracteres. Atualmente o campo é um `Input` simples, sem nenhum tipo de sugestão.

Usuários que abastecem regularmente nos mesmos postos digitam o nome do fornecedor manualmente a cada registro, criando fricção repetitiva e inconsistências de grafia ("Shell", "SHELL", "Shell Centro", "Shell - Centro" para o mesmo posto). Essas inconsistências dificultam agrupamentos e análises futuras por fornecedor.

**Gap de campos ausentes:** o campo `supplier` não é renderizado no formulário atual — gap de frontend identificado em auditoria de 2026-08-14. Esta spec pressupõe que o campo esteja visível (pré-requisito, não objeto desta spec).

---

## Objetivo

Implementar autocomplete no campo `supplier` do formulário de abastecimento, com sugestões priorizadas pelo histórico pessoal do usuário e, secundariamente, pelo histórico do workspace. Definir regras de normalização e deduplicação que garantam consistência de dados sem forçar um vocabulário controlado (o campo permanece texto livre).

---

## Histórias de Usuário e Critérios de Aceitação

### US-01: Sugestões do histórico pessoal

**Como** motorista preenchendo um abastecimento, **quero** ver sugestões de fornecedores que já usei anteriormente, **para** selecionar rapidamente sem redigitar.

- **Dado que** já registrei 3 abastecimentos nos postos "Shell Centro", "Ipiranga BR" e "Auto Posto Alfa", **quando** começo a digitar "sh" no campo Fornecedor, **então** a lista sugere "Shell Centro" como primeira opção, filtrada por correspondência de prefixo.
- **Dado que** nunca registrei nenhum abastecimento anteriormente, **quando** foco no campo Fornecedor, **então** nenhuma sugestão pessoal é exibida (lista vazia ou apenas sugestões de workspace, se houver).
- **Dado que** a lista de sugestões está visível, **quando** clico em uma sugestão, **então** o campo é preenchido com o valor selecionado e a lista fecha.
- **Dado que** a lista de sugestões está visível, **quando** pressiono `Esc`, **então** a lista fecha e o texto digitado permanece no campo.
- **Dado que** digito um fornecedor novo que não aparece nas sugestões, **quando** submeto o formulário, **então** o valor é aceito normalmente (texto livre — R-FUEL-04).

### US-02: Sugestões do workspace (secundário)

**Como** motorista membro de um workspace, **quero** ver sugestões de fornecedores usados por outros membros da minha empresa, **para** padronizar o nome sem perguntar aos colegas.

- **Dado que** pertenço a um workspace, **quando** nenhum resultado pessoal corresponde ao que digitei e há resultados de workspace, **então** as sugestões de workspace aparecem em seção separada com label "Mais usado no workspace" (ou similar), com indicação de quem mais usou.
- **Dado que** não pertenço a nenhum workspace, **quando** busco fornecedores, **então** nenhuma seção de workspace é exibida.
- **Dado que** a busca retorna resultados pessoais e de workspace, **quando** a lista total supera 10 itens, **então** apenas os 10 primeiros são exibidos (pessoais têm precedência sobre workspace).

### US-03: Deduplicação de fornecedor

**Como** usuário, **quero** que "Shell" e "SHELL" sejam tratados como o mesmo fornecedor nas sugestões, **para** não ter entradas duplicadas no meu histórico.

- **Dado que** meu histórico tem "Shell" (cadastrado primeiro) e "SHELL" (cadastrado depois, mesmo posto), **quando** digito "shell" no campo, **então** aparece apenas uma entrada "Shell" (forma da primeira ocorrência).
- **Dado que** seleciono a sugestão "Shell", **quando** o formulário é submetido, **então** o valor persistido é "Shell" (forma canônica — primeira ocorrência), independente do que o usuário digitou.

---

## Requisitos Funcionais

| ID    | Requisito | Prioridade | História relacionada |
|-------|-----------|------------|----------------------|
| RF-01 | Implementar server action `getSuggestedSuppliers(vehicleId: string, query: string, workspaceId?: string): Promise<SupplierSuggestion[]>` que retorna no máximo 10 sugestões combinadas de histórico pessoal e de workspace | Alta | US-01, US-02 |
| RF-02 | Histórico pessoal: últimos 10 fornecedores distintos (após normalização de deduplicação — R-SUGG-02) usados pelo usuário autenticado em despesas `category = 'fuel'`, ordenados pela data da despesa mais recente com aquele fornecedor (`MAX(occurred_at) DESC`); filtro por `query` aplicado via `ILIKE '%' || normalized_query || '%'` | Alta | US-01 |
| RF-03 | Histórico de workspace: top 5 fornecedores distintos mais frequentes (`COUNT(*) DESC`) usados por qualquer `workspace_member` do mesmo workspace do usuário; incluir no resultado o campo `used_by_count` (quantidade de membros distintos que usaram) e `most_recent_user_name` (nome do membro mais recente); retornar apenas se `workspaceId` não for nulo e o usuário pertencer ao workspace | Média | US-02 |
| RF-04 | A busca de sugestões é disparada com debounce de 200ms após a última tecla pressionada no campo Fornecedor (R-SUGG-03); nenhuma busca é feita enquanto o usuário digita continuamente | Alta | US-01 |
| RF-05 | A lista de sugestões exibe no máximo 10 itens; sugestões pessoais têm prioridade e ocupam as primeiras posições; sugestões de workspace preenchem posições restantes | Alta | US-01, US-02 |
| RF-06 | Deduplicação (R-SUGG-02): a chave de busca e agrupamento usa `LOWER(TRIM(supplier))` + normalização NFC (R-SAN-02); o valor exibido e persistido é o da primeira ocorrência (`MIN(occurred_at)` como critério de desempate de qual forma é a "canônica") | Alta | US-03 |
| RF-07 | A lista de sugestões fecha ao: (a) selecionar um item, (b) pressionar `Esc`, (c) clicar fora do componente; o campo permanece editável após fechar (texto livre — R-FUEL-04) | Alta | US-01 |
| RF-08 | A server action `getSuggestedSuppliers` aplica `.trim()` (R-SAN-01) e `.normalize('NFC')` (R-SAN-02) no parâmetro `query` antes de qualquer comparação ou query SQL | Alta | US-01 |
| RF-09 | Se `query` estiver vazio (foco no campo sem ter digitado nada), exibir os últimos 5 fornecedores pessoais distintos sem filtro de texto (histórico imediato) | Média | US-01 |
| RF-10 | `getSuggestedSuppliers` é fire-and-forget no cliente: erro de rede ou de banco resulta em lista vazia (sem mensagem de erro ao usuário); o campo permanece funcional como texto livre | Média | US-01 |

---

## Requisitos Não-Funcionais

| ID     | Requisito | Métrica de Aceite |
|--------|-----------|-----------------|
| RNF-01 | Performance | `getSuggestedSuppliers` retorna em p95 < 150ms (queries com índice em `expenses(user_id, supplier)` — ver Notas Técnicas) |
| RNF-02 | Segurança | A server action valida que o usuário autenticado (S1) tem acesso ao `workspaceId` informado antes de buscar histórico de workspace; não é possível consultar o histórico de workspace de terceiros (S2 — RLS por `workspace_member`) |
| RNF-03 | UX — debounce | 200ms de debounce (R-SUGG-03) previne chamadas excessivas; usuário não percebe latência de busca em conexões normais |
| RNF-04 | UX — keyboard | A lista de sugestões é totalmente navegável por teclado (setas ↑↓ para mover, Enter para selecionar, Esc para fechar); compatível com leitores de tela via `role="listbox"` / `role="option"` |
| RNF-05 | Volume esperado | O volume de dados no MVP (centenas de abastecimentos por usuário) não justifica tabela de cache dedicada — query direta com índice é suficiente (ver Notas Técnicas) |

---

## Fora de Escopo

- Fontes externas de fornecedores: base de postos ANP, integração com Google Places, geolocalização de postos próximos — explicitamente fora deste ciclo; oportunidade futura a levantar quando houver demanda e orçamento de API.
- Vocabulário controlado de fornecedores: o campo permanece texto livre (R-FUEL-04); as sugestões são facilitadores, não restrições.
- Criação ou gerenciamento de um catálogo de fornecedores pelo usuário — fora de escopo.
- Sugestões de preço médio por fornecedor — coberto parcialmente por R-FUEL-08 (SPEC-20260619-001); não duplicar aqui.
- Tabela `supplier_autocomplete_cache` dedicada: avaliado no brainstorm e descartado para o MVP — ver Notas Técnicas.

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260606-002 | Define `supplier` (R-FUEL-04); esta spec adiciona autocomplete ao campo existente |
| Spec | SPEC-20260804-004 | Workspace foundation — estrutura de `workspace_members` usada para sugestões de workspace (RF-03) |
| Schema | `expenses(user_id, category, supplier, occurred_at)` | Fonte das sugestões pessoais; índice composto necessário (ver Notas Técnicas) |
| Schema | `workspace_members` | Fonte de membros do workspace para sugestões compartilhadas (RF-03) |
| Regra | R-SAN-01, R-SAN-02 | Trim e NFC já obrigatórios; reaproveitados na normalização de `query` (RF-08) e na deduplicação (RF-06) |

---

## Notas Técnicas

### Decisão: query direta vs tabela de cache

Avaliamos criar uma tabela `supplier_autocomplete_cache` com trigger de atualização (sugestão inicial do brainstorm). Decidimos por **query direta com índice** para o MVP pelas seguintes razões:

1. **Volume esperado:** um usuário intensivo com 2 abastecimentos/semana teria ~100 registros/ano em `expenses` com `supplier IS NOT NULL`. Uma query com índice nesse volume retorna em <10ms.
2. **Complexidade adicional:** a tabela de cache exige trigger em INSERT/UPDATE/DELETE em `expenses`, manutenção de consistência e eventual invalidação. Adiciona risco operacional sem ganho mensurável em escala de MVP.
3. **Critério de revisão:** se o p95 de `getSuggestedSuppliers` superar 200ms em produção (RNF-01), reconsiderar a tabela de cache. A decisão de não criar a tabela agora não fecha a porta para criá-la depois — a server action centraliza a lógica e pode ser refatorada sem mudar o contrato de chamada.

**Índice necessário (migration nova):**

```sql
-- @spec SPEC-20260814-003 RF-01
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_user_supplier
  ON expenses (user_id, supplier)
  WHERE supplier IS NOT NULL
    AND category = 'fuel'
    AND deleted_at IS NULL;
```

### Query de sugestões pessoais

```sql
-- @spec SPEC-20260814-003 RF-02
SELECT
  MIN(supplier) FILTER (WHERE occurred_at = MIN(occurred_at) OVER (PARTITION BY LOWER(TRIM(supplier)))) AS canonical_supplier,
  MAX(occurred_at) AS last_used_at
FROM expenses
WHERE user_id = (SELECT auth.uid())
  AND category = 'fuel'
  AND supplier IS NOT NULL
  AND deleted_at IS NULL
  AND LOWER(TRIM(supplier)) LIKE '%' || LOWER(TRIM($1)) || '%'
GROUP BY LOWER(TRIM(supplier))
ORDER BY last_used_at DESC
LIMIT 10;
```

Na prática, a forma canônica é obtida com subquery ou via `DISTINCT ON` + ordenação por `occurred_at ASC` (primeira ocorrência). Implementação exata pode variar; a regra de negócio é R-SUGG-02.

### Componente UI

Usar `Combobox` do design system (R-DS-09, que exige `Combobox` no lugar de `<select>` nativo) como base, configurado para modo de texto livre (permite digitar valores não presentes na lista). Alternativamente, usar `Command` + `Popover` do shadcn/ui com `CommandInput` — padrão já presente no projeto. Avaliar qual tem melhor suporte a `creatable` (digitar valor novo não presente na lista).

### Separação visual de sugestões pessoais vs workspace

Se ambas as fontes têm resultados, usar `CommandGroup` com labels distintos: "Seus postos recentes" e "Mais usado no workspace". Sem sugestões de workspace, exibir apenas uma lista flat sem label de grupo.

---

## Changelog (pós-aprovação)

| Data | O que mudou | Por quê |
|------|-------------|---------|
| 2026-08-14 | Gate técnico concluído; status promovido de `draft` para `approved`. Dois ajustes de implementação: (1) "gap de campos ausentes" estava incorreto — o campo `supplier` já é renderizado como `<Input list="supplier-suggestions">` com `<datalist>` alimentado por `/expenses/suppliers`; o campo existe e a spec o substitui/melhora. (2) `getSuggestedSuppliers` deve ser implementada como extensão do endpoint `GET /expenses/suppliers` existente em `apps/api/ExpensesController` (parâmetros `q`, `workspace_id`), não como Server Action — segue padrão estabelecido. A decisão de query direta com índice partial foi aprovada sem alteração. | Gate técnico (tech-lead, 2026-08-14). |
| 2026-08-14 | Implementação concluída. Dois ajustes registrados: (1) o índice `idx_expenses_user_supplier` foi criado **sem** `CREATE INDEX CONCURRENTLY` — nenhuma outra migration do projeto usa essa forma (roda fora de transação, incompatível com o runner de migrations padrão do projeto) e o volume atual de `expenses` não justifica o risco/latência extra agora; reavaliar se o volume crescer. (2) O componente de UI usa `Popover`+`Input` (`@navestory/ui`) com navegação por teclado própria, não `Command`(cmdk)+`Popover` — `cmdk`/`Combobox` do design system força seleção de uma opção da lista existente, incompatível com o requisito de texto livre (R-FUEL-04) mesmo com o menu de sugestões aberto. Nenhuma regra de negócio foi alterada. Código: `apps/api/src/modules/expenses/expenses.service.ts` (`getSupplierSuggestions`), `apps/web/src/components/expenses/supplier-combobox.tsx`, `supabase/migrations/20260814150000_expenses_supplier_autocomplete_index.sql`. | Implementação (2026-08-14). |
