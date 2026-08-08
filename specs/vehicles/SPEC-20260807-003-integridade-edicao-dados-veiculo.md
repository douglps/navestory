---
id: SPEC-20260807-003
title: "Integridade e Edição de Dados de Veículo"
status: approved
date: 2026-08-07
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-VEH-02, R-VEH-03, R-SAN-01, R-SAN-02, R-SAN-03, R-FORM-08]
security: [S1, S2, S17]
camadas: [frontend, backend]
---

# SPEC-20260807-003: Integridade e Edição de Dados de Veículo

## Contexto

Uma auditoria de UX comparativa (2026-08-07) contra o projeto de referência Nave-SaaS-main encontrou cinco lacunas na feature de veículos do navestory que comprometem a integridade de dados hoje — não são apenas itens de desejo futuro.

**Lacunas identificadas:**

1. **Edição incompleta**: `/vehicles/[id]/page.tsx` só permite editar Apelido e Cor. `updateVehicleInputSchema` (em `@navestory/validators`) aceita somente `nickname` e `color`. Não existe caminho para corrigir Marca, Modelo, Ano, Tipo de Veículo, Combustível ou Odômetro após o cadastro — violação silenciosa do RF-05 da SPEC-20260602-002 ("Usuário pode atualizar qualquer campo editável").

2. **Placa sem máscara no frontend**: `/vehicles/new/page.tsx` aceita placa em texto livre sem máscara. Usuários misturam formatos ("ABC-1234", "abc1234", "ABC 1D23") antes da normalização do backend (R-VEH-02), gerando erros de validação tardios e experiência degradada.

3. **Marca e modelo sem normalização de casing**: Os campos `make` e `model` são texto livre sem controle de casing. A auditoria constatou que o mesmo veículo aparece como "Fiat Strada", "FIAT STRADA" e "Strada" em relatórios distintos, quebrando as agregações de analytics de "gastos por veículo" e o dashboard de frota.

4. **Exclusão com `window.confirm` nativo**: A ação de excluir veículo em `/vehicles/[id]/page.tsx` usa `window.confirm` — modal nativo do navegador, inconsistente com o design system (`AlertDialog`) e sem barreira efetiva para uma ação destrutiva e irreversível com cascata em despesas e manutenções (R-VEH-01).

5. **Formulário de cadastro exibe apenas o primeiro erro Zod**: O formulário de novo veículo usa `issues[0]?.message` do schema Zod. Com 3 campos inválidos, o usuário precisa de 3 ciclos de submissão para descobrir todos os erros.

---

## Objetivo

Fechar as cinco lacunas de integridade e UX no domínio de veículos, tornando a edição completa, a validação de placa mais clara, a normalização de marca/modelo consistente, a exclusão segura e a exibição de erros simultânea — sem alterar as regras de negócio ou o schema do banco já existentes.

---

## Decisão de Escopo

Itens 1, 2, 3, 4 e 5 são consolidados em uma única spec porque:

- Todos tocam exclusivamente o domínio `vehicles` (frontend + backend)
- Todos têm causa-raiz em integridade de dado e UX de formulário de veículo
- Nenhum depende de feature de outro domínio
- A implementação natural ocorre num mesmo PR de "hardening de veículos"

A separação em specs menores criaria overhead de rastreabilidade sem ganho: nenhum destes itens é candidato a ser aprovado e implementado independentemente dos outros dentro do mesmo ciclo imediato.

---

## Histórias de Usuário e Critérios de Aceitação

### US-01: Edição completa de dados do veículo

**Como** gestor de frota, **quero** editar qualquer campo de um veículo já cadastrado (inclusive Marca, Modelo, Ano, Tipo, Combustível e Odômetro), **para** corrigir informações erradas sem precisar excluir e recadastrar o veículo com perda do histórico.

- **Dado que** acesso `/vehicles/[id]/edit` ou a modal de edição completa, **quando** o formulário carrega, **então** todos os campos editáveis estão pré-preenchidos com os valores atuais do veículo.
- **Dado que** altero o campo Marca e submeto, **quando** a server action executa, **então** `vehicles.make` é atualizado no banco e a página reflete o novo valor sem reload completo.
- **Dado que** altero o Odômetro para um valor menor que o maior já registrado em despesas, **quando** submeto, **então** a operação é bloqueada com mensagem de erro (R1 + R-VEH-02).
- **Dado que** acesso `/vehicles/[id]/page.tsx` hoje (edição de Apelido/Cor), **quando** a implementação desta spec for concluída, **então** a rota de edição parcial existente é substituída ou expandida para cobrir todos os campos.

### US-02: Máscara automática de placa no frontend

**Como** gestor de frota, **quero** que o campo de placa aplique máscara enquanto digito, **para** ver imediatamente se estou no formato BR (ABC-1234) ou Mercosul (ABC1D23) e não receber erro de validação apenas no submit.

- **Dado que** digito "ABC1" no campo de placa, **quando** o 4º caractere é numérico, **então** a máscara formata como "ABC-1..." (padrão BR em andamento).
- **Dado que** digito "ABC1D" no campo de placa, **quando** o 5º caractere é uma letra, **então** a máscara reconhece o padrão Mercosul e formata sem hífen (ABC1D...).
- **Dado que** digito uma placa completa válida, **quando** submeto, **então** o backend recebe a placa normalizada (uppercase sem hífen) conforme R-VEH-02 — nenhuma dupla normalização.
- **Dado que** a placa digitada não corresponde a nenhum dos dois formatos, **quando** o campo perde foco, **então** uma mensagem de erro inline é exibida antes do submit.

### US-03: Seleção de marca e modelo via catálogo (normalização de casing)

**Como** gestor de frota, **quero** selecionar marca e modelo a partir do catálogo FIPE, ou ao menos ter o texto normalizado automaticamente, **para** garantir que "Fiat Strada" e "FIAT STRADA" sejam a mesma entrada nos relatórios.

- **Dado que** uso o FipeCombobox para selecionar "Fiat" / "Strada", **quando** submeto, **então** `make = "FIAT"` e `model = "STRADA"` são persistidos (uppercase + trim conforme R-VEH-03).
- **Dado que** digito "fiat" no campo livre de Marca (fallback sem FipeCombobox), **quando** submeto, **então** `make = "FIAT"` é persistido (normalização garantida pela server action / schema Zod antes do INSERT/UPDATE).
- **Dado que** dois registros de veículo existentes têm `make` em casings diferentes, **quando** a query de analytics agrega por `make`, **então** os registros criados a partir desta spec são agrupados corretamente (registros históricos pré-existentes não são migrados por esta spec).

### US-04: Confirmação de exclusão digitando a placa

**Como** gestor de frota, **quero** ser obrigado a digitar a placa do veículo antes de confirmar a exclusão, **para** ter certeza de que estou excluindo o veículo correto e não agir por acidente numa operação irreversível.

- **Dado que** clico em "Excluir veículo", **quando** o `AlertDialog` abre, **então** um campo de texto exibe o placeholder "Digite a placa para confirmar" e o botão "Excluir" fica desabilitado.
- **Dado que** digito a placa incorreta no campo, **quando** o campo muda, **então** o botão "Excluir definitivamente" permanece desabilitado.
- **Dado que** digito a placa correta (case-insensitive — "ABC1234", "abc1234" e "Abc1234" são equivalentes), **quando** o campo passa na validação, **então** o botão "Excluir definitivamente" fica habilitado.
- **Dado que** confirmo a exclusão com a placa correta, **quando** a server action executa, **então** o soft-delete em cascata (R-VEH-01) é aplicado e o usuário é redirecionado para `/vehicles`.
- **Dado que** fecho o AlertDialog sem confirmar, **quando** o dialog é descartado, **então** nenhuma ação de exclusão é executada e o veículo permanece ativo.

### US-05: Exibição simultânea de todos os erros de validação

**Como** gestor de frota, **quero** ver todos os campos com erro destacados de uma vez ao submeter um formulário inválido, **para** corrigir tudo numa única revisão sem precisar resubmeter múltiplas vezes.

- **Dado que** submeto o formulário de veículo com 3 campos inválidos simultaneamente, **quando** a validação é executada, **então** todos os 3 campos exibem seus respectivos erros ao mesmo tempo.
- **Dado que** corrijo um campo com erro e submeto novamente, **quando** a validação é executada, **então** apenas os campos ainda inválidos exibem erros, e o campo corrigido não exibe erro.

---

## Requisitos Funcionais

| ID    | Requisito | Prioridade | História relacionada |
|-------|-----------|------------|----------------------|
| RF-01 | Criar rota `/vehicles/[id]/edit` (ou expandir a tela atual `/vehicles/[id]`) com formulário completo cobrindo todos os campos editáveis: `plate`, `make`, `model`, `year`, `vehicle_type`, `fuel_type`, `nickname`, `color`, `odometer`, e campos opcionais de documentação (`ipva_due_date`, `renavam`, `chassi`) | Alta | US-01 |
| RF-02 | Expandir `updateVehicleInputSchema` em `@navestory/validators` para incluir todos os campos editáveis além de `nickname` e `color`; aplicar R-VEH-02 (normalização de placa) e R-VEH-03 (normalização de make/model) no schema | Alta | US-01, US-03 |
| RF-03 | Implementar máscara automática no campo de placa: detectar padrão BR (3 letras + 4 dígitos → `XXX-9999`) e Mercosul (3 letras + 1 dígito + 1 letra + 2 dígitos → `XXX9X99`) enquanto o usuário digita; a máscara é puramente visual — o valor enviado ao backend é sempre sem hífen e em uppercase | Alta | US-02 |
| RF-04 | Exibir mensagem de erro inline no campo de placa quando o formato não corresponde a nenhum dos dois padrões válidos, sem aguardar o submit (validação `onBlur` — R-FORM-01) | Alta | US-02 |
| RF-05 | Aplicar normalização uppercase + `.trim()` (R-VEH-03) nos campos `make` e `model` na server action de criação e atualização de veículos, antes do INSERT/UPDATE; manter o `FipeCombobox` como modo preferencial de entrada para esses campos nos formulários | Alta | US-03 |
| RF-06 | Substituir o `window.confirm` atual em `/vehicles/[id]/page.tsx` por um `AlertDialog` do design system com campo de texto para digitação da placa do veículo; o botão de confirmação permanece desabilitado até que o valor digitado corresponda à placa do veículo (case-insensitive, normalizado conforme R-VEH-02) | Alta | US-04 |
| RF-07 | A server action de exclusão de veículo deve receber e validar a placa digitada como parâmetro de confirmação; se a placa informada não corresponder ao registro, a operação retorna erro sem executar o soft-delete | Média | US-04 |
| RF-08 | Todos os formulários do domínio de veículos (criação e edição) devem exibir todos os erros de validação por campo simultaneamente após o primeiro submit inválido (R-FORM-08); remover qualquer uso de `issues[0]?.message` ou `.errors[campo][0]` em favor de `FormMessage` por campo | Alta | US-05 |

---

## Requisitos Não-Funcionais

| ID     | Requisito   | Métrica de Aceite |
|--------|-------------|------------------|
| RNF-01 | Performance | Server action de atualização completa de veículo em p95 < 300 ms (adiciona campos mas não queries extras em relação ao update parcial atual) |
| RNF-02 | Segurança   | Server action de edição completa exige sessão autenticada (S1) e o veículo deve pertencer ao usuário autenticado (S2); tentativa de editar veículo de outro usuário retorna 404 |
| RNF-03 | Segurança   | A validação de placa no AlertDialog de exclusão é executada no cliente (UX) E revalidada no servidor (server action), nunca apenas no cliente |
| RNF-04 | Acessibilidade | AlertDialog de exclusão deve ter `aria-label` descritivo e o campo de texto deve ter `aria-describedby` apontando para a instrução de digitação da placa |
| RNF-05 | Consistência | Máscara de placa usa o mesmo componente em todos os formulários do projeto (criação e edição); não criar implementações paralelas |

---

## Fora de Escopo

- Migração retroativa de `make`/`model` existentes no banco para uppercase — registros históricos permanecem como estão; apenas novos registros e edições a partir desta spec aplicam R-VEH-03.
- Integração com API externa de validação de placa (consulta DETRAN, DENATRAN) — a validação é somente de formato.
- Histórico de alterações de campos do veículo (audit trail de quais campos mudaram e quando) — já coberto pelo `audit_logs` existente (RF-17 de SPEC-20260602-002).
- Hard-delete de veículo — somente soft-delete no MVP (R5).
- Upload/edição de foto de capa de veículo — coberto por RF-11 de SPEC-20260602-002 e não alterado aqui.
- Edição de dados de odômetro histórico retroativo — coberto pela SPEC-20260711-001 (ciclos de odômetro).

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260602-002 | Gestão de Veículos (CRUD) — esta spec estende RF-05 e substitui o comportamento de exclusão que usa `window.confirm`; RF-17 (audit log) permanece ativo |
| Spec | SPEC-20260619-001 | Padrão de Formulário — R-FORM-01, R-FORM-02, R-FORM-05, R-FORM-08 aplicados |
| Spec | SPEC-20260711-001 | Ciclos de Odômetro — R-ODO-01 a R-ODO-06 permanecem válidos; a edição de odômetro em veículo não interfere com os ciclos |
| Spec | SPEC-20260729-003 | Design System — Formulários: Input, Checkbox, AlertDialog; componentes usados no formulário de edição e no diálogo de confirmação de exclusão |
| Validador | `@navestory/validators` | `updateVehicleInputSchema` a ser expandido; `createVehicleInputSchema` a receber normalização de make/model |
| Lib | `react-imask` ou similar | Máscara de input para placa; verificar se já existe no monorepo antes de adicionar nova dependência |
| API externa | BrasilAPI FIPE | Catálogo de marcas e modelos — já usado via `FipeCombobox` (RF-12 de SPEC-20260602-002); não adicionar nova integração |

---

## Notas Técnicas

### Máscara de placa

O campo de placa deve aplicar máscara progressiva enquanto o usuário digita:
- Caracteres 1–3: letras (A-Z) — detecta prefixo de ambos os formatos
- Caractere 4: se dígito → formato BR em andamento; inserir hífen visual após o 3º caractere
- Caractere 5: se letra (após `XXX-9`) → virou Mercosul; remover hífen, reformatar sem separador
- Formato final BR: `ABC-1234` (máscara visual); valor enviado: `ABC1234`
- Formato final Mercosul: `ABC1D23` (sem separador); valor enviado: `ABC1D23`

A máscara é puramente visual no cliente. O backend (R-VEH-02) normaliza independentemente, removendo hífens e aplicando uppercase. Não criar lógica de normalização paralela além da já existente no `LicensePlate` VO (`apps/api/src/modules/vehicles/value-objects/license-plate.vo.ts`) e no `vehicleBaseSchema`.

### Normalização de make/model (R-VEH-03)

Aplicar `.toUpperCase().trim()` em `make` e `model` no schema Zod (`createVehicleInputSchema`, `updateVehicleInputSchema`) com `.transform()`:

```ts
// @spec SPEC-20260807-003 RF-02 RF-05
make: z.string().min(1).transform(v => v.trim().toUpperCase()),
model: z.string().min(1).transform(v => v.trim().toUpperCase()),
```

Isso cobre tanto o path da API (NestJS) quanto o path das server actions (Next.js), pois ambos importam os schemas de `@navestory/validators`.

### AlertDialog de exclusão (S17)

O `AlertDialog` de confirmação de exclusão deve:
1. Exibir o nome do veículo (apelido ou `make + model`) e sua placa no corpo do dialog
2. Apresentar campo `<Input>` com `placeholder="Digite [PLACA] para confirmar"`
3. Comparar o valor digitado (normalizado: uppercase, sem hífens) com `vehicle.plate` (já normalizado no banco)
4. Habilitar o botão "Excluir definitivamente" apenas quando `normalizedInput === vehicle.plate`
5. Ao confirmar, chamar a server action; ao receber sucesso, redirecionar para `/vehicles`

A validação no servidor (RF-07) recebe o parâmetro `confirmationPlate` e executa `normalizedInput === vehicle.plate` antes de qualquer operação de delete — proteção contra bypass via chamada direta à server action.

### Formulário de edição completa

Verificar se a rota `/vehicles/[id]/edit` já existe como rascunho ou se é preciso criar. Se a tela atual `/vehicles/[id]` já tem um modo de edição parcial, avaliar se expandir o mesmo componente é mais simples do que criar uma rota separada. Decisão fica para o implementador, desde que o formulário resultante cubra todos os campos de RF-01.

### Exibição de todos os erros (R-FORM-08)

O padrão correto com React Hook Form + Zod via `zodResolver`:

```tsx
// Errado — oculta erros dos campos subsequentes
<p>{errors.make?.message}</p>

// Correto — FormMessage renderiza o erro do campo corrente
<FormField name="make" render={({ field, fieldState }) => (
  <FormItem>
    <FormControl><Input {...field} /></FormControl>
    <FormMessage /> {/* usa fieldState.error automaticamente */}
  </FormItem>
)} />
```

O react-hook-form com `mode: 'onBlur'` (R-FORM-01) e `resolver: zodResolver(schema)` já coleta todos os erros de todos os campos na primeira submissão — o problema está somente no template, não na configuração do hook.

---

## Changelog (pós-aprovação)

| Data | O que mudou | Por quê |
|------|-------------|---------|
| | | |
