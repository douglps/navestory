---
id: SPEC-20260721-001
title: "Design System — Fundamentos de Marca, Tokens de Cor, Tema e Componentes de Navegação Global"
status: approved
date: 2026-07-21
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-DS-01, C-DS-01]
security: []
camadas: [frontend, design]
---

# SPEC-20260721-001: Design System — Fundamentos de Marca, Tokens de Cor, Tema e Componentes de Navegação Global

**Status:** approved
**Criada em:** 2026-07-21
**Autor:** Douglas Lopes (lps.doug@protonmail.com)

---

## Contexto

Em 2026-07-21, uma pesquisa aprofundada de fundamentos de design system foi concluída e registrada em `specs/design-system/PESQUISA-FUNDAMENTOS-DESIGN-SYSTEM.md`. A pesquisa cobriu metodologia (token-first + Atomic Design apenas como vocabulário de documentação), arquitetura de dark/light mode (`next-themes`, classe `.dark`, zero mudança em componentes), paleta de marca calibrada em OKLCH, regras de contraste WCAG AA, e especificação de novos componentes de navegação global.

A seção **F** desse documento consolidou seis pontos que exigiam decisão explícita do proprietário do produto. Todas as seis decisões foram tomadas em 2026-07-21 e são **vinculantes** — esta spec as formaliza como requisitos rastreáveis.

O estado atual sem esta spec:
- O token `--gold` não existe; usos de dourado (ex: `StatusBadge` de destaque premium) recorrem a `--warning`, mesclando semântica de "alerta" com "destaque de marca".
- O tema padrão do app não está declarado — `next-themes` nunca foi configurado; na ausência de configuração explícita o comportamento depende do browser.
- `--muted-foreground` usa L=48% em OKLCH, que pode falhar o contraste WCAG AA (4.5:1) em determinadas combinações de fundo.
- Não existe seletor de veículo ativo no header shell; o contexto de veículo só é manipulável dentro de telas específicas.
- Não existe Command Palette de busca global.
- NavBadge de contagem não tem regra explícita de truncamento; implementações futuras poderiam renderizar "10", "47", "129" quebrando o layout.

Esta spec não duplica o conteúdo técnico da pesquisa — referencia-o como fonte de racional e exemplos de implementação.

---

## Objetivo

Formalizar as seis decisões de produto de 2026-07-21 como requisitos rastreáveis, garantindo que a implementação dos fundamentos visuais do Nave (paleta OKLCH de marca, dark/light mode, acessibilidade de contraste, seletor de veículo global e Command Palette) seja guiada por regras explícitas e critérios de aceite mensuráveis — sem ambiguidade de escopo ou comportamento.

---

## Material de Referência (não duplicar aqui)

| Documento | Conteúdo | Caminho |
|-----------|----------|---------|
| Pesquisa de Fundamentos | Metodologia, paleta OKLCH, dark mode, StatusBadge, NavBadge, Command Palette — racional técnico detalhado e exemplos de código | `specs/design-system/PESQUISA-FUNDAMENTOS-DESIGN-SYSTEM.md` |
| Inventário do Design System | Estado atual dos tokens e componentes implementados em `packages/ui` | `specs/design-system/INVENTARIO-DESIGN-SYSTEM.md` |
| Spec de Componentes UI (aprovada) | Escopo de implementação de componentes de `packages/ui` (T8.1) | `specs/design-system/SPEC-20260525-001.md` |

---

## Histórias de Usuário e Critérios de Aceitação

**Persona P1 — Douglas, mantenedor do Nave**, responsável pela implementação e consistência visual.
**Persona P2 — Gestor de frota**, usuário final que consome a interface em diferentes dispositivos e preferências de tema.

### US-01 — Token de marca dourada independente de alerta

**Como** P1, **quero** um token `--gold` dedicado para o dourado de marca, **para** não confundir destaque premium com sinal de alerta amarelo ao usar os tokens no código.

- **Dado que** o tema light está ativo, **quando** um elemento usa `var(--gold)`, **então** a cor exibida corresponde ao dourado reluzente de marca (calibrado em OKLCH, distinto de `--warning`) — ver valor de referência em `PESQUISA-FUNDAMENTOS-DESIGN-SYSTEM.md` seção C.
- **Dado que** o tema dark está ativo, **quando** um elemento usa `var(--gold)`, **então** a cor exibida é a variante dark do token dourado, sem qualquer mudança no componente que o consome (troca ocorre só nos tokens).
- **Dado que** `--gold-foreground` é aplicado sobre fundo `--gold`, **quando** verificado com ferramenta de contraste, **então** a razão é ≥ 4.5:1 (WCAG AA).

### US-02 — Contraste mínimo em todo texto

**Como** P2 com baixa acuidade visual, **quero** que textos secundários (placeholders, labels, metadados) sejam legíveis sem esforço, **para** conseguir usar o app sem depender de configurações de acessibilidade do dispositivo.

- **Dado que** o tema light está ativo, **quando** qualquer texto renderizado com `--muted-foreground` é medido sobre `--background`, **então** a razão de contraste é ≥ 4.5:1 (WCAG AA para texto de tamanho normal).
- **Dado que** o tema dark está ativo, **quando** o mesmo texto é medido, **então** a razão de contraste continua ≥ 4.5:1.
- **Dado que** um componente usa `--muted-foreground` em texto abaixo de 18px regular (ou 14px bold), **quando** auditado com `jest-axe`, **então** nenhuma violação de contraste é reportada.

### US-03 — Tema que respeita preferência do SO e do usuário

**Como** P2, **quero** que o app abra no tema que meu SO prefere, **para** não ter de trocar manualmente o tema toda vez que abro o app.

- **Dado que** o usuário acessa o app pela primeira vez sem preferência salva, **quando** o SO tem `prefers-color-scheme: dark`, **então** o app carrega em dark mode sem flash de tema errado.
- **Dado que** o usuário ativa manualmente o light mode via toggle, **quando** fecha e reabre o app (nova sessão), **então** a preferência manual persiste (armazenada em localStorage pelo `next-themes`).
- **Dado que** o usuário remove manualmente a preferência salva, **quando** o app carrega novamente, **então** volta a seguir `prefers-color-scheme` do SO.

### US-04 — NavBadge com truncamento previsível

**Como** P1, **quero** que badges de contagem em itens de navegação nunca ultrapassem dois caracteres visuais, **para** que o layout da sidebar não quebre em frotas com grande volume de notificações.

- **Dado que** um item de navegação tem 8 itens pendentes, **quando** o badge é renderizado, **então** exibe "8".
- **Dado que** um item de navegação tem 9 itens pendentes, **quando** o badge é renderizado, **então** exibe "9".
- **Dado que** um item de navegação tem 10 ou mais itens pendentes, **quando** o badge é renderizado, **então** exibe "9+" (nunca um número maior, nunca "10", "47" ou "99+").
- **Dado que** o valor real é 0, **quando** o badge é renderizado, **então** o badge não aparece (oculto, não exibe "0").

### US-05 — Seletor de veículo ativo no header

**Como** P2 com múltiplos veículos, **quero** trocar o veículo ativo diretamente no header sem navegar para uma tela de configuração, **para** visualizar despesas e manutenções de qualquer veículo com um clique.

- **Dado que** o usuário está autenticado e tem ao menos um veículo cadastrado, **quando** qualquer tela do shell carrega, **então** o seletor de veículo ativo (`VehicleContextSelector`) é exibido no header com o veículo atual selecionado.
- **Dado que** o usuário seleciona um veículo diferente no seletor, **quando** navega para `/expenses`, `/maintenance` ou `/fines`, **então** a listagem exibe somente registros do veículo selecionado.
- **Dado que** o usuário não tem veículo cadastrado, **quando** o header carrega, **então** o seletor exibe um CTA "Adicionar veículo" em vez de um dropdown vazio.
- **Dado que** o usuário faz logout, **quando** o fluxo de logout conclui, **então** o contexto de veículo ativo é limpo (alinhado com R-CTX-02 / SPEC-20260603-001).

### US-06 — Command Palette de busca global

**Como** P2, **quero** uma busca global acessível por atalho de teclado, **para** navegar para qualquer veículo, despesa ou multa sem precisar abrir menus encadeados.

- **Dado que** o usuário pressiona `Ctrl+K` (Windows/Linux) ou `⌘K` (macOS) em qualquer tela do shell, **quando** o atalho é capturado, **então** a Command Palette abre com o campo de busca já focado.
- **Dado que** o usuário digita uma query com 2+ caracteres, **quando** resultados são encontrados, **então** a lista exibe itens categorizados (veículos, despesas, multas) sem reload de página.
- **Dado que** o usuário seleciona um resultado com Enter ou clique, **quando** a seleção é confirmada, **então** a Command Palette fecha e o app navega para a tela correspondente.
- **Dado que** a query não retorna nenhum resultado, **quando** a lista processa o retorno, **então** uma mensagem "Nenhum resultado para [query]" é exibida dentro da palette, sem fechar o componente.
- **Dado que** o usuário pressiona `Esc`, **quando** a tecla é capturada, **então** a Command Palette fecha sem navegação.

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | História relacionada | Decisão de produto |
|----|-----------|------------|----------------------|-------------------|
| RF-01 | Criar tokens `--gold` e `--gold-foreground` em `packages/ui/src/tokens/colors.ts` e em `globals.css`, com valores calibrados em OKLCH para light e dark mode, distintos de `--warning` | Alta | US-01 | F-1 |
| RF-02 | `--muted-foreground` deve usar valor de L ≤ 42% em OKLCH em ambos os temas, garantindo contraste AA (4.5:1) sobre `--background` sem exceção | Alta | US-02 | F-3 |
| RF-03 | Configurar `next-themes` com `defaultTheme="system"` e `enableSystem={true}`; preferência manual do usuário armazenada em localStorage sobrepõe `prefers-color-scheme` | Alta | US-03 | F-2 |
| RF-04 | O componente `NavBadge` deve truncar qualquer contagem > 9 para a string literal "9+"; valores ≤ 9 exibem o número real; valor 0 não exibe badge | Alta | US-04 | F-6 |
| RF-05 | Implementar `VehicleContextSelector` no header shell: dropdown de veículos do usuário, sincronizado com o store de contexto global (Zustand); seleção propaga filtro para `/expenses`, `/maintenance` e `/fines` | Alta | US-05 | F-4 |
| RF-06 | Implementar `CommandPalette` ativada por `Ctrl+K` / `⌘K`: campo de busca livre, resultados cruzando veículos, despesas e multas do usuário autenticado; navegação por teclado (setas, Enter, Esc) | Média | US-06 | F-5 |

---

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Dark/light mode via troca de tokens — nenhum componente deve ter lógica condicional de cor interna | Auditoria de código: zero ocorrências de `dark:` diretamente em componentes de `packages/ui`; toda troca via variável CSS |
| RNF-02 | Contraste mínimo WCAG AA em todos os tokens de texto (C-DS-01) | `jest-axe` sem violações de contraste em todos os componentes do pacote `packages/ui` |
| RNF-03 | `CommandPalette` não bloqueia renderização inicial do shell | Lazy import (`next/dynamic` ou `React.lazy`); bundle inicial não aumenta em mais de 5 kB gzipped |
| RNF-04 | `VehicleContextSelector` não introduz waterfall de rede adicional na navegação entre telas | Dados de veículos reutilizados do cache do store (Zustand) já populado no carregamento do shell; sem novo fetch por mudança de rota |

---

## Fora de Escopo

- Implementação dos componentes `StatusBadge`, `KpiCard` (sparkline já parcialmente existente) — cobertos por `SPEC-20260525-001`.
- Sincronização automática de tokens com Figma Variables via Style Dictionary — adiado conforme decisão registrada em `PESQUISA-FUNDAMENTOS-DESIGN-SYSTEM.md` seção A.3.
- Busca server-side full-text para `CommandPalette` (fase posterior); esta spec cobre o componente de UI e integração com API existente de listagem.
- Autenticação ou controle de acesso específico ao `VehicleContextSelector` — herda o modelo já definido em `SPEC-20260602-001` (R-CTX-01 a R-CTX-07).
- Definição de paleta de marca além do token `--gold` (azul formal e grafite já documentados no inventário; racional completo em `PESQUISA-FUNDAMENTOS-DESIGN-SYSTEM.md` seção C).

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260525-001 | Tokens base e componentes de `packages/ui` — pré-requisito para RF-01, RF-02 |
| Spec | SPEC-20260602-001 | Store de contexto global de veículo (Zustand) — pré-requisito para RF-05 |
| Spec | SPEC-20260603-001 | `VehicleContextChip` no subheader — RF-05 coexiste com este componente; não duplicar responsabilidade de seleção |
| Biblioteca | `next-themes` | Gerenciamento de tema dark/light (`defaultTheme="system"`) — RF-03 |
| Biblioteca | `cmdk` | Primitivo headless de command palette já listado em SPEC-20260525-001 (§7.2) — RF-06; não instalar lib adicional |
| Regra | R-DS-01 | Cap de "9+" no NavBadge — RF-04 |
| Regra | C-DS-01 | Contraste WCAG AA mínimo em todo texto — RF-02, RNF-02 |
| Regra | R-CTX-01 a R-CTX-07 | Comportamento do contexto global de veículo — RF-05 herda todas |

---

## Notas Técnicas

> Esta seção registra decisões de implementação e restrições relevantes. O racional detalhado e os exemplos de código estão em `specs/design-system/PESQUISA-FUNDAMENTOS-DESIGN-SYSTEM.md` — não duplicar aqui.

**Tokens OKLCH e dark mode (RF-01, RF-02, RF-03):**
Toda troca de tema ocorre na camada de token (`globals.css`, seletor `.dark`), sem condicional de cor em nenhum componente. `next-themes` injeta a classe `.dark` no `<html>` — Tailwind v4 já suporta isso nativamente. Ver seção B e C da pesquisa para valores OKLCH exatos e a arquitetura de duas camadas (primitivos + semânticos).

**NavBadge (RF-04):**
O truncamento "9+" é uma regra de domínio/UX (R-DS-01), não uma decisão de implementação opcional. A renderização deve ser: `value > 9 ? "9+" : String(value)`. A prop do componente aceita o valor real (`number`); o truncamento é responsabilidade interna do componente, não do chamador.

**VehicleContextSelector (RF-05):**
O `VehicleContextSelector` no header é distinto do `VehicleContextChip` no subheader (`SPEC-20260603-001`). O primeiro é o ponto de **seleção** do veículo ativo (dropdown/popover de troca); o segundo é o **indicador** de contexto e ponto de entrada para o Dialog de troca mais completo. A fronteira de responsabilidade deve ser definida na implementação para não violar R-CTX-07 (chip é único ponto de entrada para abertura do switcher) — avaliar se o header usa o chip como âncora ou cria seletor paralelo; decisão arquitetural deve ser registrada em ADR se criar nova responsabilidade.

**CommandPalette (RF-06):**
Usa `cmdk` (já declarado em SPEC-20260525-001 como dependência do `Combobox`) — não instalar lib adicional. O atalho `Ctrl+K` / `⌘K` deve ser capturado globalmente via `useEffect` no componente de layout do shell, com limpeza no unmount. Ver seção E da pesquisa para o mapa de interação completo.

---

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`. Mudança estrutural (reverte/substitui requisito) não edita aqui — cria spec nova com `superseded_by`.

| Data | O que mudou | Por quê |
|------|-------------|---------|
| 2026-07-21 | Implementação concluída (RF-01 a RF-06) e spec movida de `draft` para `approved`. Três desvios registrados: (1) RF-05 reaproveita `VehicleContextChip` existente (SPEC-20260603-001) em vez de criar um `VehicleContextSelector` paralelo, para não violar R-CTX-07; (2) o filtro por veículo ativo não se aplica a `/fines` porque a rota ainda não existe no app — fica pendente de spec futura; (3) os overrides `.dark` em `globals.css`/`colors.ts` cobrem só os tokens indispensáveis para o tema funcionar de forma legível (neutros, `--primary`, `--gold`) — recalibração perceptual completa da paleta em dark mode (secondary/accent/success/warning/danger/info) permanece fora do escopo, coerente com a seção "Fora de Escopo" já existente. | Gate de sincronia spec↔código↔matriz exige `matrices/rastreabilidade.md` atualizado com caminhos reais ao concluir a implementação; ver `matrices/rastreabilidade.md` para status detalhado por requisito (RF-05 e RF-06 marcados como parciais). |
| 2026-07-21 | Corrigido `KpiCard` (`packages/ui/src/components/kpi-card.tsx`), que violava RNF-02: o texto da tendência usava `text-{variant}` (tons "solid") direto sobre `--card`, medindo ~2.1:1 (warning), ~3.4:1 (success) e ~4.2:1 (info) — todos abaixo de 4.5:1 AA. Os tons "solid" são calibrados para contraste sobre o `-pastel` da mesma família (ver `tokens/colors.ts`), não sobre `--card`/`--background`. Corrigido para `bg-{variant}-pastel text-foreground`, mesmo padrão já usado em `Alert`/`Toast` (contraste ≥14:1). `kpi-card.test.tsx` ganhou casos `jest-axe` para os variants `warning`/`success`/`info`/`danger`, que antes não eram cobertos (só `danger`, caso limítrofe, era testado). | Falha de contraste identificada em auditoria solicitada pelo usuário após mudanças recentes no design system; RNF-02 exige zero violações de `jest-axe` em `packages/ui`, e o gap de cobertura de teste mascarava a regressão. |
| 2026-07-22 | RF-06 completado: `CommandPaletteTrigger` passou a buscar também multas (`GET /fines`, categoria "Multas", navega para `/fines/:id`). A rota `/fines` — que na implementação original de 2026-07-21 ainda não existia, motivando a omissão — foi criada por `SPEC-20260722-005`. Criado `command-palette-trigger.spec.tsx` (6 casos), que antes não existia: abertura via botão/`Ctrl+K`, busca cruzando veículos/despesas/manutenções/multas, navegação ao selecionar multa, query <2 chars e mensagem de "nenhum resultado". Ver `matrices/rastreabilidade.md`. | Rota `/fines` deixou de ser um bloqueio; a omissão anterior era premissa desatualizada, não decisão de escopo. |
| 2026-07-22 | RNF-03 completado: `CommandPalette` (e as dependências `cmdk`/`@radix-ui/react-dialog`) agora carrega via `next/dynamic({ ssr: false })` sobre `import("@nave/ui")`, montado só após a primeira abertura (`hasOpenedOnce`) — nem clique no botão nem `Ctrl+K` disparam o fetch do chunk antes disso. Verificado com `pnpm build`: o chunk isolado (~44,8 kB gzip) não aparece em nenhum `build-manifest.json` de rota, confirmando que não é parte do bundle inicial do shell. Caso de teste dedicado adicionado em `command-palette-trigger.spec.tsx`. | Item pendente desde a implementação original (RNF-03 "não verificado"); usuário solicitou o fechamento pontual. |
| 2026-07-22 | RF-05 completado: `VehicleContextChip` agora detecta frota vazia (modo `none` + lista de veículos vazia) e exibe CTA "Adicionar veículo" (link para `/vehicles/new`) em vez do seletor/Dialog sem nada para listar. `useVehicleContext` passou a buscar a lista de veículos também no modo `none` (antes só em `single`), necessário para detectar a ausência de veículos antes de qualquer seleção. Ver `matrices/rastreabilidade.md` para os caminhos de código/teste atualizados. | Item estava pendente desde a implementação original de 2026-07-21 (marcado ⚠️ parcial na matriz); usuário solicitou o fechamento pontual. |
