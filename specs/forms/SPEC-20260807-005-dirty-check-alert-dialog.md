---
id: SPEC-20260807-005
title: "Substituição de window.confirm por AlertDialog em formulários transacionais"
status: approved
date: 2026-08-07
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-FORM-05]
security: []
camadas: [frontend]
---

## Contexto

A regra **R-FORM-05** (registrada em `specs/RULES.md`) exige que todo formulário transacional exiba um `AlertDialog` de confirmação "Descartar alterações?" ao cancelar com `isDirty === true`. No entanto, 7 arquivos do módulo `apps/web` continuam usando `window.confirm` nativo do navegador para esse mesmo fluxo — violando a regra e quebrando a consistência visual e de acessibilidade do produto.

Estado atual (padrão com bug):

```tsx
function handleCancel(): void {
  if (isDirty && !window.confirm("Descartar alterações?")) return;
  router.push("/expenses");
}
```

`window.confirm` não é estilizável, não respeita o design system, não é acessível via teclado da mesma forma que o `AlertDialog` do Radix UI, não recebe `aria-*` automático e bloqueia a thread do navegador. O componente `AlertDialog` foi criado em `packages/ui/src/components/alert-dialog.tsx` na SPEC-20260807-003 (S17 — exclusão de veículo) e está disponível sem nenhuma dependência nova.

Um caso adicional foi identificado durante a análise: `maintenance/[id]/page.tsx` invoca `window.confirm("Descartar alterações?")` **sem verificar `isDirty`** — confirmação sempre é exibida, independente do formulário ter sido alterado ou não. Isso é um bug secundário que esta spec também fecha.

Os três pontos em `vehicle-groups/[id]/page.tsx` (linhas 118, 123 e 147) foram investigados e **não seguem o padrão de dirty-check de R-FORM-05**: são confirmações de ação operacional antes de salvar membros (substituição total ou parcial) e antes de excluir o grupo. Apesar de serem fluxos distintos, também usam `window.confirm` e devem migrar para `AlertDialog` pela mesma motivação de UX/acessibilidade — eles são incluídos nesta spec como requisitos separados.

## Objetivo

Substituir todos os usos de `window.confirm` de dirty-check e de confirmação de ação em formulários transacionais por `AlertDialog` do design system navestory, reutilizando o componente já existente em `packages/ui`, sem introduzir nenhuma dependência nova. Corrigir concomitantemente o bug de ausência de `isDirty` em `maintenance/[id]/page.tsx`.

## Histórias de Usuário e Critérios de Aceitação

### US-01: Cancelamento com dados não salvos em despesa (criação e edição)

**Como** gestor de frota, **quero** que ao cancelar um formulário de despesa com alterações não salvas o sistema me peça confirmação visualmente consistente com o restante do app, **para** que eu não perca dados acidentalmente e tenha clareza sobre a ação antes de confirmar.

- **Dado que** estou no formulário de criação de despesa (`/expenses/new`) e alterei ao menos um campo, **quando** clico em "Cancelar" ou "Voltar", **então** um `AlertDialog` com título "Descartar alterações?" é exibido (não um `window.confirm` nativo), com botões "Continuar editando" e "Descartar".
- **Dado que** o `AlertDialog` está aberto, **quando** clico em "Continuar editando" ou pressiono Esc, **então** o diálogo fecha e permaneço no formulário sem perda de dados.
- **Dado que** o `AlertDialog` está aberto, **quando** clico em "Descartar", **então** sou redirecionado para `/expenses` e os dados do formulário são descartados.
- **Dado que** não alterei nenhum campo do formulário (`isDirty === false`), **quando** clico em "Cancelar", **então** sou redirecionado imediatamente para `/expenses` sem exibir nenhum diálogo.
- **Dado que** estou no formulário de edição de despesa (`/expenses/[id]`) e alterei ao menos um campo, **quando** clico em "Cancelar", **então** o mesmo `AlertDialog` é exibido com o mesmo comportamento descrito acima.

### US-02: Cancelamento com dados não salvos em multa (criação e edição)

**Como** gestor de frota, **quero** que ao cancelar um formulário de multa com alterações não salvas o sistema me peça confirmação visualmente consistente, **para** não perder o registro antes de confirmar a navegação.

- **Dado que** estou em `/fines/new` com `isDirty === true`, **quando** clico em "Cancelar", **então** um `AlertDialog` "Descartar alterações?" é exibido.
- **Dado que** estou em `/fines/[id]` com `isDirty === true`, **quando** clico em "Cancelar", **então** o mesmo `AlertDialog` é exibido.
- **Dado que** `isDirty === false` em qualquer um dos dois formulários de multa, **quando** clico em "Cancelar", **então** navego imediatamente sem diálogo.

### US-03: Cancelamento com dados não salvos em manutenção (criação e edição)

**Como** gestor de frota, **quero** que ao cancelar um formulário de manutenção com alterações não salvas o sistema me peça confirmação visualmente consistente, **para** não perder o registro em andamento.

- **Dado que** estou em `/maintenance/new` com `isDirty === true`, **quando** clico em "Cancelar", **então** um `AlertDialog` "Descartar alterações?" é exibido.
- **Dado que** estou em `/maintenance/[id]` e o formulário tem campos diferentes dos dados originais carregados (`isDirty === true`), **quando** clico em "Cancelar", **então** o `AlertDialog` é exibido.
- **Dado que** estou em `/maintenance/[id]` e o formulário não foi alterado (`isDirty === false`), **quando** clico em "Cancelar", **então** navego imediatamente sem diálogo (corrige o bug atual onde a confirmação era sempre exibida).

### US-04: Confirmação antes de salvar membros de grupo

**Como** gestor de frota, **quero** que ao salvar alterações na composição de um grupo de veículos o sistema me peça confirmação visual antes de aplicar, **para** que eu revise a operação (especialmente ao remover todos os membros de uma vez).

- **Dado que** estou em `/vehicle-groups/[id]` e removi todos os veículos do grupo (a lista ficaria vazia), **quando** clico em "Salvar membros", **então** um `AlertDialog` é exibido com a mensagem informando quantos veículos serão removidos, e só aplica ao confirmar.
- **Dado que** estou em `/vehicle-groups/[id]` e alterei a composição (adicionar e/ou remover, mas não esvaziar completamente), **quando** clico em "Salvar membros", **então** um `AlertDialog` é exibido com a mensagem resumindo os acréscimos e remoções, e só aplica ao confirmar.
- **Dado que** o `AlertDialog` de membros está aberto, **quando** clico em "Cancelar" ou pressiono Esc, **então** o diálogo fecha e nenhuma alteração é aplicada.

### US-05: Confirmação antes de excluir grupo de veículos

**Como** gestor de frota, **quero** que ao excluir um grupo o sistema me peça confirmação visual antes de aplicar, **para** evitar exclusões acidentais.

- **Dado que** estou em `/vehicle-groups/[id]` e clico no botão de exclusão do grupo, **então** um `AlertDialog` é exibido com a mensagem "Remover este grupo? Os veículos membros não serão afetados."
- **Dado que** o `AlertDialog` de exclusão está aberto, **quando** clico em "Cancelar" ou pressiono Esc, **então** o diálogo fecha e o grupo não é excluído.
- **Dado que** o `AlertDialog` de exclusão está aberto, **quando** clico em "Excluir", **então** a exclusão é processada e o grupo é removido.

## Requisitos Funcionais

| ID | Requisito | Prioridade | História relacionada |
|----|-----------|------------|----------------------|
| RF-01 | Substituir `window.confirm("Descartar alterações?")` em `apps/web/src/app/(app)/expenses/new/page.tsx` (linha 415) por `AlertDialog` controlado por estado (`useState<boolean>`), preservando a lógica de `isDirty` existente | Alta | US-01 |
| RF-02 | Substituir `window.confirm("Descartar alterações?")` em `apps/web/src/app/(app)/expenses/[id]/page.tsx` (linha 203) por `AlertDialog` controlado por estado, preservando a lógica de `isDirty` existente | Alta | US-01 |
| RF-03 | Substituir `window.confirm("Descartar alterações?")` em `apps/web/src/app/(app)/fines/new/page.tsx` (linha 135) por `AlertDialog` controlado por estado, preservando a lógica de `isDirty` existente | Alta | US-02 |
| RF-04 | Substituir `window.confirm("Descartar alterações?")` em `apps/web/src/app/(app)/fines/[id]/page.tsx` (linha 178) por `AlertDialog` controlado por estado, preservando a lógica de `isDirty` existente | Alta | US-02 |
| RF-05 | Substituir `window.confirm("Descartar alterações?")` em `apps/web/src/app/(app)/maintenance/new/page.tsx` (linha 120) por `AlertDialog` controlado por estado, preservando a lógica de `isDirty` existente | Alta | US-03 |
| RF-06 | Substituir `window.confirm("Descartar alterações?")` em `apps/web/src/app/(app)/maintenance/[id]/page.tsx` (linha 127) por `AlertDialog` controlado por estado **e** adicionar cálculo de `isDirty` comparando o estado atual dos campos com os dados originais de `maintenance` carregados — corrigindo o bug onde a confirmação era sempre exibida independente de o formulário ter sido alterado | Alta | US-03 |
| RF-07 | Em `apps/web/src/app/(app)/vehicle-groups/[id]/page.tsx`, substituir o `window.confirm` de remoção total de membros (linha 118) por `AlertDialog` que exibe a mensagem informando o número de veículos que serão removidos; a mutação `setMembersMutation.mutate()` só é chamada após confirmação | Alta | US-04 |
| RF-08 | Em `apps/web/src/app/(app)/vehicle-groups/[id]/page.tsx`, substituir o `window.confirm` de alteração normal de membros (linha 123) por `AlertDialog` que resume a operação (quantos adicionados, quantos removidos); a mutação só é chamada após confirmação | Alta | US-04 |
| RF-09 | Em `apps/web/src/app/(app)/vehicle-groups/[id]/page.tsx`, substituir o `window.confirm` de exclusão do grupo (linha 147) por `AlertDialog` com a mensagem "Remover este grupo? Os veículos membros não serão afetados."; `deleteMutation.mutate()` só é chamada após confirmação | Alta | US-05 |

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Foco e acessibilidade | `AlertDialog` recebe foco automaticamente ao abrir (comportamento nativo do Radix Dialog); Esc fecha o diálogo sem confirmar; `aria-*` corretos (`role="alertdialog"`, `aria-labelledby`, `aria-describedby`) emitidos pelo componente existente sem configuração adicional |
| RNF-02 | Sem dependência nova | Reutilizar exclusivamente `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel` de `@navestory/ui` — nenhum pacote novo instalado |
| RNF-03 | Consistência visual | Aparência do diálogo idêntica à do `AlertDialog` de exclusão de veículo já em produção (SPEC-20260807-003); botão de confirmação destrutiva usa `variant="destructive"` (padrão do `AlertDialogAction`) |
| RNF-04 | Comportamento de navegação preservado | O redirect (`router.push`) chamado após confirmação deve ser o mesmo destino que era chamado antes; nenhum fluxo de navegação é alterado além da interposição do diálogo |
| RNF-05 | Sem regressão de dirty check | Formulários com `isDirty === false` devem navegar imediatamente, sem exibir o diálogo; a lógica de `isDirty` de cada formulário não deve ser alterada (exceto `maintenance/[id]` onde a lógica é criada — ver RF-06) |

## Fora de Escopo

- `window.confirm` de exclusões destrutivas em `expenses/new/page.tsx:136` ("excluir modelo de despesa") e `expenses/[id]/page.tsx:182` ("remover despesa") — não são dirty-check de R-FORM-05; podem ser tratados em spec futura se o padrão S17 for generalizado para todos os módulos.
- `window.alert("Despesa registrada com data futura.")` em `expenses/new/page.tsx:333` — é aviso informativo, não confirmação de ação; fora do escopo de R-FORM-05.
- Criação de qualquer componente wrapper ou utilitário novo além do uso direto de `AlertDialog` de `@navestory/ui`.
- Testes automatizados — sem decisão registrada em `specs/TEST_DECISIONS.md`; o agente `tester` deve propor entrada ao concluir a implementação.

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260807-003 | Origem do componente `AlertDialog` em `packages/ui/src/components/alert-dialog.tsx`, construído sobre `@radix-ui/react-dialog` (sem nova dependência); esta spec reutiliza esse componente sem alterações |
| Spec | SPEC-20260619-001 | Origem da regra R-FORM-05 que esta spec fecha; define o padrão canônico de comportamento de formulários transacionais |
| Componente | `@navestory/ui/alert-dialog` | `AlertDialog`, `AlertDialogTrigger`, `AlertDialogClose`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel` — todos já exportados |

## Notas Técnicas

### Padrão de implementação — dirty-check (RF-01 a RF-06)

**Antes (padrão com bug):**
```tsx
function handleCancel(): void {
  if (isDirty && !window.confirm("Descartar alterações?")) return;
  router.push("/expenses");
}
```

**Depois (padrão correto com AlertDialog):**
```tsx
// @spec SPEC-20260807-005 RF-01
const [showDiscardDialog, setShowDiscardDialog] = useState(false);

function handleCancel(): void {
  if (isDirty) {
    setShowDiscardDialog(true);
    return;
  }
  router.push("/expenses");
}

// No JSX, fora do fluxo principal do formulário:
<AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
      <AlertDialogDescription>
        As alterações não salvas serão perdidas permanentemente.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Continuar editando</AlertDialogCancel>
      <AlertDialogAction onClick={() => router.push("/expenses")}>
        Descartar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Nota sobre `AlertDialogAction`:** o componente não fecha o diálogo automaticamente (por design — em confirmações de delete, o handler decide após sucesso da mutation). Aqui o redirect faz a navegação sair da página, então o diálogo desaparece naturalmente. Se por algum motivo a navegação falhar, o diálogo ainda estará aberto — comportamento aceitável e mais seguro que o `window.confirm`.

### Caso especial — maintenance/[id] (RF-06): adicionar isDirty

O formulário de `maintenance/[id]` inicializa os campos via `useEffect` quando `maintenance` é carregado, mas não calcula `isDirty`. O `handleCancel` atual dispara `window.confirm` incondicionalmente. A implementação deve:

1. Calcular `isDirty` comparando o estado atual dos campos com os valores do objeto `maintenance` (analogamente ao que `expenses/[id]/page.tsx` já faz):

```tsx
const isDirty =
  !!maintenance &&
  (description !== maintenance.description ||
    cost !== (maintenance.cost ?? undefined) ||
    odometerKm !== (maintenance.odometer_km ?? undefined) ||
    scheduledDate !== isoToDatetimeLocal(maintenance.scheduled_date, tz) ||
    completionDate !==
      (maintenance.completion_date
        ? isoToDatetimeLocal(maintenance.completion_date, tz)
        : "") ||
    nextStatus !== "");
```

2. Aplicar o padrão `AlertDialog` acima, com `isDirty` como guarda.

### Padrão de implementação — confirmação de ação (RF-07 a RF-09)

Para `vehicle-groups/[id]`, os três `window.confirm` são confirmações de ação, não dirty-check. A solução recomendada é um estado de diálogo genérico para evitar proliferação de `useState`:

```tsx
// @spec SPEC-20260807-005 RF-07 RF-08 RF-09
const [confirmDialog, setConfirmDialog] = useState<{
  message: string;
  description?: string;
  onConfirm: () => void;
} | null>(null);

function handleSaveMembers(): void {
  if (!group) return;
  const currentIds = group.vehicleIds ?? [];
  const added = selectedVehicleIds.filter((v) => !currentIds.includes(v)).length;
  const removed = currentIds.filter((v) => !selectedVehicleIds.includes(v)).length;

  if (selectedVehicleIds.length === 0 && currentIds.length > 0) {
    setConfirmDialog({
      message: "Remover todos os membros?",
      description: `Isso removerá todos os ${currentIds.length} veículo(s) deste grupo.`,
      onConfirm: () => setMembersMutation.mutate(),
    });
  } else {
    setConfirmDialog({
      message: "Confirmar alterações?",
      description: `Adicionar ${added} veículo(s), remover ${removed} veículo(s).`,
      onConfirm: () => setMembersMutation.mutate(),
    });
  }
}

function handleDelete(): void {
  setConfirmDialog({
    message: "Remover este grupo?",
    description: "Os veículos membros não serão afetados.",
    onConfirm: () => deleteMutation.mutate(),
  });
}

// No JSX:
<AlertDialog open={confirmDialog !== null} onOpenChange={(open) => { if (!open) setConfirmDialog(null); }}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{confirmDialog?.message}</AlertDialogTitle>
      {confirmDialog?.description && (
        <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
      )}
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction
        onClick={() => {
          confirmDialog?.onConfirm();
          setConfirmDialog(null);
        }}
      >
        Confirmar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Import necessário

Em cada arquivo alterado, adicionar o import dos sub-componentes necessários:

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@navestory/ui/alert-dialog";
```

### Checklist de validação pós-implementação

- [ ] Nenhum `window.confirm("Descartar alterações?")` restante nos 7 arquivos listados
- [ ] `maintenance/[id]` tem `isDirty` calculado e o diálogo não aparece com formulário limpo
- [ ] Esc fecha o diálogo sem confirmar em todos os pontos
- [ ] Foco vai para o diálogo ao abrir (verificar com Tab)
- [ ] `variant="destructive"` usado no botão de confirmação de ações destrutivas (RF-07, RF-08, RF-09)
- [ ] Sem erros de TypeScript (`pnpm typecheck`)
- [ ] Sem erros de lint (`pnpm lint`)

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`. Mudança estrutural (reverte/substitui requisito) não edita aqui — cria spec nova com `superseded_by`.

| Data | O que mudou | Por quê |
|------|-------------|---------|
| | | |
