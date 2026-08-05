---
id: SPEC-20260804-005
title: "Correção de Bug: Membros de Grupo Não Inicializados na Tela de Edição"
status: approved
date: 2026-08-04
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-GRP-02, R-GRP-03, R-GRP-05]
security: [S1, S2]
camadas: [frontend, backend]
---

# SPEC-20260804-005: Correção de Bug — Membros de Grupo Não Inicializados na Tela de Edição

**Status:** Aprovado
**Criada em:** 2026-08-04
**Autor:** Douglas Lopes (lps.doug@protonmail.com)
**Contexto:** Correção de bug crítico identificado em auditoria de UX (2026-08-03/04)
**Spec relacionada:** [SPEC-20260602-003](SPEC-20260602-003.md) — Grupos de Veículos (aprovada, não deprecada)

---

## Contexto

A página de detalhe de um grupo de veículos (`/vehicle-groups/[id]`) contém um bug crítico de perda silenciosa de dados.

O estado `selectedVehicleIds` nasce como array vazio (`useState<string[]>([])`) e **nunca é inicializado** com os membros atuais do grupo. Não existe nenhuma query buscando a composição atual de `vehicle_group_members` para o grupo em exibição.

O botão "Salvar membros" dispara `PUT /vehicle-groups/:id/members` com `vehicleIds: selectedVehicleIds`. No backend, essa operação é um **replace-all** (R-GRP-02): apaga todos os membros atuais e insere os do payload. Com `selectedVehicleIds = []`, o resultado prático é o apagamento completo de todos os membros do grupo — silenciosamente, sem diff, sem aviso, sem confirmação.

Esse é o bug de maior risco real de perda de dado no sistema na data desta spec. A falha estrutural tem duas dimensões:

1. **Backend**: `GET /vehicle-groups` (endpoint `findAll`) já realiza internamente o join com `vehicle_group_members(vehicle_id)` para calcular `member_count`, mas descarta os IDs individuais no mapeamento — o array de `vehicleIds` nunca chega ao cliente.
2. **Frontend**: sem receber os `vehicleIds` no response, a página não tem como inicializar os checkboxes, e não há proteção nenhuma contra o envio prematuro do formulário.

A spec original (SPEC-20260602-003) documentou o replace-all como comportamento intencional (R-GRP-02) e definiu o requisito RF-10 ("Página de detalhe carrega dados do grupo, permite editar nome/cor, gerenciar membros e excluir o grupo"), mas **não especificou o carregamento prévio dos membros atuais antes do save** — esse é o gap real desta spec de correção.

---

## Objetivo

Eliminar o risco de perda de dados na tela de edição de membros de grupo através de três mudanças complementares:

1. Expor `vehicleIds` (IDs dos membros atuais) no response do `GET /vehicle-groups`, aproveitando o join já existente.
2. Inicializar `selectedVehicleIds` na página de detalhe com os dados reais vindos da API.
3. Adicionar confirmação informativa antes do save, com proteção adicional quando a operação resultaria na remoção de todos os membros.

---

## Histórias de Usuário e Critérios de Aceitação

### HU-01 — Editar membros de um grupo populado sem perder dados

**Como** gestora de frota, **quero** que ao entrar na página de detalhe de um grupo, os veículos membros atuais já apareçam marcados nos checkboxes, **para** não correr o risco de apagar silenciosamente a composição do grupo ao salvar.

**Dado que** acesso `/vehicle-groups/[id]` de um grupo com 3 veículos membros,
**quando** a página termina de carregar,
**então** os 3 checkboxes correspondentes aparecem marcados e os demais veículos da frota aparecem desmarcados.

**Dado que** a página ainda está carregando os dados do grupo,
**quando** o usuário tenta clicar em "Salvar membros",
**então** o botão está desabilitado e não dispara nenhuma requisição.

---

### HU-02 — Confirmação antes do replace-all com diff visível

**Como** gestora de frota, **quero** ver um resumo do que vai mudar antes de confirmar o save dos membros, **para** ter controle consciente sobre a operação de replace-all.

**Dado que** modifiquei a seleção de membros (adicionei 2, removi 1) e clico em "Salvar membros",
**quando** a confirmação é exibida,
**então** a mensagem informa: quantos veículos serão adicionados e quantos serão removidos (ex: "Adicionar 2, remover 1. Confirmar?").

**Dado que** não fiz nenhuma alteração nos checkboxes em relação ao estado atual do grupo,
**quando** clico em "Salvar membros",
**então** a confirmação pode ser dispensada (nenhuma mudança a confirmar) ou apresentada com diff "0 adições, 0 remoções" — qualquer comportamento é aceitável, desde que nenhuma requisição desnecessária seja disparada se o usuário cancelar.

---

### HU-03 — Confirmação adicional ao remover todos os membros

**Como** gestora de frota, **quero** receber um aviso explícito quando minha ação resultaria na remoção de todos os veículos do grupo, **para** evitar esvaziar o grupo por acidente.

**Dado que** o grupo tem 4 veículos membros e desmarco todos antes de salvar,
**quando** clico em "Salvar membros",
**então** recebo uma confirmação com texto específico: "Isso removerá todos os 4 veículos deste grupo. Confirmar?"

**Dado que** o grupo está vazio (zero membros) e não marco nenhum checkbox,
**quando** clico em "Salvar membros",
**então** não há confirmação especial (o grupo já estava vazio; a operação é idempotente).

---

## Requisitos Funcionais

| ID    | Requisito                                                                                                                                                                                                                                                                                                                | Prioridade | História relacionada |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------------------- |
| RF-01 | `GET /vehicle-groups` (método `findAll` do `VehicleGroupsService`) deve incluir o campo `vehicleIds: string[]` no objeto de cada grupo retornado, contendo os IDs dos membros ativos do grupo. O filtro de veículos ativos segue R-GRP-03 (`deleted_at IS NULL`) e usa o Set `activeVehicleIds` já calculado internamente | Alta       | HU-01                |
| RF-02 | A página `/vehicle-groups/[id]` deve inicializar `selectedVehicleIds` com `group.vehicleIds` assim que o objeto `group` estiver disponível no `useQuery` — via `useEffect` observando `group`, analogamente ao já feito com `name` e `color`                                                                              | Alta       | HU-01                |
| RF-03 | O botão "Salvar membros" deve ficar `disabled` enquanto `isLoading === true` ou enquanto `group` for `null`/`undefined`, prevenindo o envio com estado não inicializado (R-GRP-05)                                                                                                                                        | Alta       | HU-01                |
| RF-04 | Ao clicar em "Salvar membros" (com grupo já carregado), a página deve calcular o diff entre `selectedVehicleIds` (novo estado) e `group.vehicleIds` (estado atual) e exibir um resumo via `window.confirm` com o texto: "Adicionar X veículo(s), remover Y veículo(s). Confirmar?"                                        | Alta       | HU-02                |
| RF-05 | Se `selectedVehicleIds.length === 0` e `group.vehicleIds.length > 0`, exibir confirmação adicional (pode ser um segundo `window.confirm` ou texto integrado ao mesmo diálogo de RF-04) com o texto: "Isso removerá todos os N veículo(s) deste grupo. Confirmar?"                                                         | Alta       | HU-03                |
| RF-06 | Se o usuário cancelar qualquer uma das confirmações de RF-04 ou RF-05, a mutação `setMembersMutation` não deve ser disparada                                                                                                                                                                                              | Alta       | HU-02, HU-03         |

---

## Requisitos Não-Funcionais

| ID     | Requisito  | Métrica de Aceite                                                                                                                                                                         |
| ------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Segurança  | Nenhuma mudança no modelo de autenticação — `GET /vehicle-groups` continua exigindo JWT válido (S1) e RLS do Supabase (S2)                                                                |
| RNF-02 | Performance | O campo `vehicleIds` é derivado do join `vehicle_group_members(vehicle_id)` já realizado por `findAll`; nenhuma query adicional é necessária — impacto de performance esperado: nulo     |
| RNF-03 | Retrocompatibilidade | A inclusão de `vehicleIds` no response do `findAll` é aditiva; nenhum consumer existente do endpoint precisa ser alterado — `member_count` permanece presente e inalterado  |

---

## Fora de Escopo

- Não inclui: criação de endpoint específico `GET /vehicle-groups/:id` ou `GET /vehicle-groups/:id/members` — a solução usa o `findAll` existente para evitar request adicional
- Não inclui: substituição de `window.confirm` por um componente `AlertDialog` do Design System — o Design System ainda não entregou um componente de confirmação reutilizável para este padrão de uso (mesma limitação já documentada em outras telas, como `handleDelete` na mesma página); o uso de `window.confirm` é a forma mínima aceitável nesta fase
- Não inclui: atomicidade da operação replace-all no backend (já documentada como melhoria futura em SPEC-20260602-003 — "Melhoria futura: envolver em uma RPC Supabase transacional")
- Não inclui: histórico de composição de membros (R-GRP-02, explicitamente fora de escopo)
- Não inclui: alterações no fluxo de criação de grupo (`/vehicle-groups/new`) — o novo grupo nasce sem membros, não há estado anterior a preservar

---

## Dependências

| Tipo | Referência                                    | Descrição                                                                                                                  |
| ---- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Spec | SPEC-20260602-003                             | Spec original do domínio de Grupos de Veículos — RF-05, RF-07, R-GRP-02 e R-GRP-03 definem o comportamento do replace-all |
| Code | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.ts` | Método `findAll` — a alteração de RF-01 ocorre aqui                              |
| Code | `apps/web/src/app/(app)/vehicle-groups/[id]/page.tsx`          | Página de detalhe — as alterações de RF-02 a RF-06 ocorrem aqui                 |
| Type | `interface VehicleGroup` (definida em `page.tsx`)              | Precisa incluir o campo `vehicleIds?: string[]` para tipar o response ampliado   |

---

## Notas Técnicas

### Por que expandir `findAll` em vez de criar endpoint novo

O método `findAll` em `vehicle-groups.service.ts` já executa:

```ts
client
  .from("vehicle_groups")
  .select(`${GROUP_COLUMNS}, vehicle_group_members(vehicle_id)`)
```

O array `vehicle_group_members` é usado apenas para calcular `member_count` e é descartado no `map`. Incluir `vehicleIds` no retorno é uma mudança de 2 linhas no mapeamento — sem query extra, sem latência adicional.

Criar `GET /vehicle-groups/:id` ou `GET /vehicle-groups/:id/members` adicionaria uma request extra ao carregamento da página (que já faz `GET /vehicle-groups` + `GET /vehicles`), sem nenhum benefício de dados — todo o conteúdo necessário já está disponível na listagem.

### Filtragem de `vehicleIds` por veículos ativos

O campo `vehicleIds` deve conter apenas IDs de veículos **ativos** (`deleted_at IS NULL`), usando o mesmo Set `activeVehicleIds` já calculado internamente em `findAll`. Isso mantém consistência com `member_count` e com R-GRP-03.

Motivo: se um veículo for soft-deletado após ter sido adicionado ao grupo, ele não deve aparecer pré-selecionado na tela de edição — pré-selecionar um veículo inativo levaria ao envio de um ID que seria descartado silenciosamente pelo backend (R-GRP-03), causando confusão na UX.

### Inicialização de `selectedVehicleIds` via `useEffect`

A inicialização deve ocorrer em um `useEffect` observando `group` (o objeto retornado pelo `useQuery`), analogamente ao padrão já presente na página para `name` e `color`:

```ts
useEffect(() => {
  if (group) {
    setName(group.name);
    setColor(group.color);
    setSelectedVehicleIds(group.vehicleIds ?? []);  // inicialização a adicionar
  }
}, [group]);
```

O `?? []` é necessário porque `vehicleIds` é um campo novo no response — versões antigas do cache do TanStack Query podem não tê-lo.

### Confirmação com `window.confirm` vs. `AlertDialog`

O padrão atual da página usa `window.confirm` para a confirmação de exclusão de grupo (`handleDelete`). Esta spec mantém o mesmo padrão para as confirmações de RF-04 e RF-05 por consistência e pela ausência de um componente `AlertDialog` no Design System para esse caso de uso.

Quando o Design System entregar um componente de confirmação reutilizável, as confirmações desta spec e de `handleDelete` devem ser migradas juntas (não em isolamento).

### Tipagem do campo `vehicleIds`

A interface local `VehicleGroup` em `page.tsx` precisa ser atualizada:

```ts
interface VehicleGroup {
  id: string;
  name: string;
  color: string;
  vehicleIds: string[];   // campo a adicionar
}
```

A interface `VehicleGroup` em `vehicle-groups.service.ts` deve ser atualizada de forma equivalente para tipar o campo no response do backend.

---

## Critérios de Aceite

- [ ] CA-01: Acessar `/vehicle-groups/[id]` de um grupo com N membros → checkboxes dos N veículos aparecem marcados após o carregamento
- [ ] CA-02: Acessar a página e clicar em "Salvar membros" antes do `useQuery` completar → botão está `disabled`, nenhuma request `PUT` é disparada
- [ ] CA-03: Sem alterar nenhum checkbox e clicar em "Salvar membros" → a confirmação exibe "Adicionar 0 veículo(s), remover 0 veículo(s). Confirmar?"
- [ ] CA-04: Adicionar 2 e remover 1 veículo e confirmar → `PUT /vehicle-groups/:id/members` é enviado com o payload correto
- [ ] CA-05: Desmarcar todos os checkboxes de um grupo com membros e clicar em "Salvar membros" → confirmação específica: "Isso removerá todos os N veículo(s) deste grupo. Confirmar?"
- [ ] CA-06: Cancelar qualquer confirmação → nenhuma request `PUT` é disparada, `selectedVehicleIds` permanece com o valor anterior
- [ ] CA-07: `GET /vehicle-groups` retorna `vehicleIds: string[]` para cada grupo, contendo apenas IDs de veículos ativos (`deleted_at IS NULL`) — validar com veículo soft-deletado que era membro: seu ID não aparece em `vehicleIds`

---

## Regras de Domínio Referenciadas

> Ver `specs/RULES.md` para definição completa.

| ID       | Resumo                                                                                                                                                |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-GRP-02 | `setGroupMembers` usa replace-all; histórico de membros anteriores não é preservado — motivo pelo qual a inicialização correta do estado é crítica    |
| R-GRP-03 | Apenas veículos ativos do próprio usuário podem ser membros; veículos inválidos são descartados silenciosamente — `vehicleIds` no response respeita isso |
| R-GRP-05 | Tela de edição de membros deve inicializar `selectedVehicleIds` com o estado atual do banco antes de habilitar o botão "Salvar membros" (**nova**) |

---

## Histórico de Revisões

| Data       | Versão | Mudança              | Autor         |
| ---------- | ------ | -------------------- | ------------- |
| 2026-08-04 | 1.0    | Criação da spec — bug crítico identificado em auditoria de UX (2026-08-03/04) | Douglas Lopes |
| 2026-08-04 | 1.1    | Aprovada por Douglas Lopes — segue para implementação | Douglas Lopes |
