---
id: SPEC-20260720-002
title: "Aviso de Duplicata no Formulário de Criação de Despesa"
status: approved
date: 2026-07-20
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R2]
security: [S1]
camadas: [frontend]
---

# SPEC-20260720-002 — Aviso de Duplicata no Formulário de Criação de Despesa

---

## Contexto

`SPEC-20260601-002` especificou que o backend (`POST /expenses`) retorna `duplicate_warning: true`
e `duplicate_id` na resposta 201 quando uma despesa com os mesmos `vehicle_id`, `category`,
`amount` e data já existe para o mesmo usuário (R2 — nunca bloqueia, sempre persiste).

Essa spec tinha como Non-Goal explícito (NG-06) a exibição de qualquer interface relacionada a
duplicatas. O resultado prático: hoje, o campo `duplicate_warning` da resposta é completamente
ignorado pelo frontend. O `onSuccess` do mutation em `apps/web/src/app/(app)/expenses/new/page.tsx`
executa `router.push("/expenses")` imediatamente, sem ler o body da resposta além do `id`.

O gap foi identificado ao escrever `SPEC-20260716-003-e2e-playwright.md` (RF-E2E-05), que
espera que a UI exiba um aviso de duplicata na segunda criação de despesa idêntica.

Esta spec cobre **exclusivamente** o aviso informativo: um banner não-bloqueante exibido após
a criação bem-sucedida quando `duplicate_warning: true`. Não é a interface de resolução de
duplicatas (comparar, mesclar, excluir) que NG-06 excluiu — isso continua fora de escopo.

---

## Objetivo

Exibir um aviso informativo e não-bloqueante na página `/expenses/new` quando a API retornar
`duplicate_warning: true` na resposta 201, permitindo que o usuário reconheça a duplicata
potencial antes de prosseguir para `/expenses`.

---

## Histórias de Usuário e Critérios de Aceitação

### US-01: Aviso de duplicata após criação bem-sucedida

**Como** usuário que acabou de criar uma despesa, **quero** ser avisado quando o sistema
detectar que já existe um registro idêntico, **para** poder verificar se cometi um lançamento
duplicado antes de sair da tela.

- **Dado que** existe uma despesa com `vehicle_id` V, `category` C, `amount` A e `date` D,
  **quando** eu criar uma segunda despesa com os mesmos V, C, A e D,
  **então** a página exibe um banner com `role="alert"` informando que uma possível duplicata
  foi detectada, e a navegação para `/expenses` ocorre apenas após eu clicar em
  "Entendido" (ou botão equivalente de confirmação).

- **Dado que** a despesa criada não possui duplicata (API retorna sem `duplicate_warning` ou
  com `duplicate_warning: false`),
  **quando** o formulário for submetido com sucesso,
  **então** a página navega diretamente para `/expenses` sem exibir nenhum aviso de duplicata.

- **Dado que** o banner de duplicata está visível,
  **quando** eu clicar em "Ver despesa duplicada" (link opcional),
  **então** o link aponta para `/expenses/{duplicate_id}`, abrindo a despesa suspeita para
  comparação manual (sem abrir modal nem iniciar fluxo de merge — apenas navegação simples).

---

## Requisitos Funcionais

| ID    | Requisito                                                                                                                                                                                                                                                                                                                               | Prioridade | História relacionada |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------- |
| RF-01 | O tipo `ExpenseResponse` em `page.tsx` deve ser estendido para incluir os campos opcionais `duplicate_warning?: boolean` e `duplicate_id?: string`, refletindo o contrato real da API definido em SPEC-20260601-002 RF-03.                                                                                                              | Alta       | US-01                |
| RF-02 | O callback `onSuccess` do mutation de criação deve verificar se `data.duplicate_warning === true`. Se verdadeiro, armazenar o `duplicate_id` em estado local e **não** navegar para `/expenses` imediatamente — aguardar ação do usuário.                                                                                          | Alta       | US-01                |
| RF-03 | Quando `duplicate_warning === true`, exibir na página um elemento com `role="alert"` contendo: (a) texto indicando que uma possível despesa duplicada foi detectada; (b) botão "Entendido" que ao ser clicado executa `router.push("/expenses")`; (c) link opcional "Ver despesa duplicada" que aponta para `/expenses/{duplicate_id}`. | Alta       | US-01                |
| RF-04 | O banner de aviso deve ser posicionado de forma visível, acima dos botões de ação do formulário ou substituindo a área de erro (`fieldError`), usando o mesmo padrão visual já adotado para outros alertas no formulário (`<p role="alert">` ou `<div role="alert">`).                                                                  | Alta       | US-01                |
| RF-05 | Quando `duplicate_warning` está ausente ou é `false`, o comportamento de navegação permanece idêntico ao atual: `router.push("/expenses")` executado diretamente no `onSuccess`, sem nenhum estado intermediário.                                                                                                                  | Alta       | US-01                |
| RF-06 | O aviso de duplicata e o aviso de erro (`fieldError`, `mutation.isError`) são mutuamente exclusivos na renderização — apenas um é exibido por vez. O aviso de duplicata só é exibido após uma resposta 201 bem-sucedida; erros de API (4xx/5xx) continuam no fluxo de `onError` existente.                                              | Alta       | US-01                |

---

## Requisitos Não-Funcionais

| ID     | Requisito                                                                                                                                  | Métrica de Aceite                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| RNF-01 | Nenhuma chamada adicional à API para exibir o aviso — o `duplicate_id` já vem na resposta 201                                              | Zero requisições extras após a criação                                  |
| RNF-02 | O elemento `role="alert"` deve ser detectável por testes E2E via seletor semântico (`getByRole('alert')`)                                  | RF-E2E-05 de SPEC-20260716-003 passa sem seletor frágil de CSS          |
| RNF-03 | O aviso não bloqueia a criação da despesa — a persistência já ocorreu (R2); o usuário pode sair a qualquer momento clicando em "Entendido" | Tempo de resposta percebido não aumenta; nenhuma requisição de bloqueio |

---

## Fora de Escopo

- Não inclui: tela ou modal de comparação entre a despesa recém-criada e a suspeita (campos lado a lado, diff visual).
- Não inclui: ação de merge, mescla ou exclusão da duplicata diretamente nesta tela.
- Não inclui: listagem de múltiplas duplicatas potenciais — apenas a primeira (`duplicate_id` singular, conforme contrato de SPEC-20260601-002 RF-03).
- Não inclui: aviso de duplicata no fluxo de atualização (PATCH) — alinhado ao NG-02 de SPEC-20260601-002.
- Não inclui: persistência do aviso entre navegações (ex: flash message em `/expenses`) — o aviso é exibido exclusivamente na página de criação, antes da navegação.
- Não inclui: rota `/expenses/duplicates` — essa interface completa de resolução permanece como NG-06 de SPEC-20260601-002.

---

## Dependências

| Tipo | Referência                    | Descrição                                                                                                                                                        |
| ---- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec | SPEC-20260601-002             | Introduz R2, define o contrato de `duplicate_warning` e `duplicate_id` na resposta 201 de `POST /expenses`; esta spec é extensão de UI do NG-06 daquela.         |
| Spec | SPEC-20260716-003 (RF-E2E-05) | Spec de E2E com Playwright que consome este requisito — o critério de aceite de RF-E2E-05 só pode ser implementado após esta spec estar aprovada e implementada. |

---

## Notas Técnicas

**Ponto de intervenção mínimo:** O único arquivo que precisa ser alterado é
`apps/web/src/app/(app)/expenses/new/page.tsx`. Nenhuma mudança de backend, schema de banco,
rota de API ou componente compartilhado é necessária.

**Padrão de aviso existente no formulário:** O formulário já usa `<p role="alert">` para
erros (`fieldError`, `mutation.isError`) e para avisos de template (`templateNotice`). O aviso
de duplicata deve seguir o mesmo padrão estrutural. O elemento "Entendido" pode ser um `<button
type="button">` dentro do mesmo bloco de alerta.

**Estado necessário:** Um único estado local `duplicateId: string | null` é suficiente. Quando
`duplicateId !== null`, o banner é exibido; quando `null`, o comportamento atual prevalece.
O `onSuccess` do mutation passa a ser:

```ts
onSuccess: (data) => {
  if (data.duplicate_warning && data.duplicate_id) {
    setDuplicateId(data.duplicate_id);
    // navegação adiada — usuário deve clicar em "Entendido"
  } else {
    router.push("/expenses");
  }
};
```

**Anotação de rastreabilidade:** ao implementar, adicionar no topo da função/bloco
correspondente:

```ts
// @spec SPEC-20260720-002 RF-02 RF-03
```

**Relação com R-FORM-04:** A regra R-FORM-04 diz que "create actions redirecionam para
listagem do módulo (`redirect()`)". Esta spec não viola R-FORM-04 — o redirect para `/expenses`
ainda ocorre, apenas com uma etapa intermediária de confirmação quando há aviso. A despesa já
foi criada e persistida antes da interação do usuário com o aviso.

---

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`. Mudança estrutural (reverte/substitui requisito)
> não edita aqui — cria spec nova com `superseded_by`.

| Data       | O que mudou                                                 | Por quê                                                                                                                                                                                                                                                                                   |
| ---------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-20 | Status alterado de `draft` para `approved`, retroativamente | RF-01 a RF-06 já estavam implementados e testados (17/17 testes unitários passando em `page.spec.tsx`) antes da aprovação formal do texto — desvio do processo padrão (spec aprovada antes do código). Conteúdo revisado nesta aprovação e considerado correto; sem mudança de requisito. |
