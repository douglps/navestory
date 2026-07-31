# Definição de Brand + Design System — Nave (Direção Azul-Índigo)

> **Status:** **aprovado por Douglas em 2026-07-30.** Esta é a direção de marca decidida — substitui a direção "Prata" (`SPEC-20260729-001`). Nenhum token de produção foi alterado ainda: este documento é a etapa de **definição**, a formalização em ADR/spec/tokens de código está descrita em "Plano de Adoção", ao final.
>
> **Por que esta revisão existe:** o Nave ainda não foi lançado — não há usuário real, não há dado de conversão/retenção, não há custo de reconhecimento de marca a proteger. Era o momento de menor custo possível para revisar a identidade visual antes que ela se tornasse cara de mudar. Este documento cobre a substituição da cor primária "Prata" e a definição completa e madura do design system ao redor dela — tipografia, arquitetura de tokens, estados de componente, elevação, iconografia, motion, acessibilidade, voz de marca e governança — pesquisando padrões de mercado atuais para embasar cada decisão, não apenas preferência estética.

---

## Sumário Executivo

1. A direção **Prata** (`SPEC-20260729-001`) tinha fundamentação empírica real em psicologia das cores (Heller: acorde azul-prata-cinza = "tecnologia e funcionalidade"), mas carregava dois problemas confirmados por pesquisa de mercado: **frieza emocional** num produto que lida com momentos de estresse financeiro do usuário, e **invisibilidade competitiva** — azul naval e tons acromáticos frios são o padrão quase universal em apps de frota/mobilidade (Samsara, Motive).
2. A pesquisa de mercado em fintech mostrou o caminho oposto funcionando: Nubank (roxo), Monzo (coral), Mercury (paleta escura + roxo) construíram reconhecimento de marca justamente por romper com o azul corporativo genérico da categoria.
3. **Decisão: substituir a cor primária por Azul-Índigo** (H≈250°, deliberadamente mais próximo do azul puro que uma primeira exploração em H≈265 — reduz o risco de ler como "roxo de fintech genérico" mantendo distância clara do azul-prata acromático da direção anterior).
4. **Fundo do dark mode passa a ser um grafite dedicado** (`≈#13131A`), independente da família do azul — o azul e o ouro aparecem *sobre* essa superfície neutra, em vez de o fundo ser "mais um tom escuro do primário". Evita a sensação de tela inteira "tingida".
5. **Ouro assume dois papéis**: o acento de brilho já validado (badge de destaque, detalhe pontual, ~5-10% da superfície) **e**, novo nesta decisão, uma **secundária estrutural** — um ouro mais profundo e dessaturado ("bronze"), usado em elementos de maior área (botão secundário, divisor, composições de marca externas). A referência que ancora essa dupla não é "azul-marinho + dourado corporativo" genérico, e sim o **Barroco Mineiro** — talha dourada sobre azulejo azul nas igrejas históricas de Ouro Preto —, um par cromático de sofisticação genuinamente brasileira.
6. **Paleta tonal completa** (12 tons do azul-índigo) substitui o antigo par "só primário + neutro", resolvendo a sensação de superfície vazia/abandonada em telas de pouco conteúdo (empty state, onboarding, cabeçalhos) via degradês contidos — sempre dentro da própria família de cor, nunca atrás de texto.
7. **Voz de marca**: calorosa e próxima, mas em registro correto — sem fórmulas de reasseguração institucional ("seus dados estão seguros") e sem coloquialismo de fala solta ("tá", "bora"). O calor vem da atenção ao detalhe e da pergunta direta, não da informalidade.
8. O restante do documento define o design system completo ao redor dessa base: tipografia (inexistente formalmente hoje), arquitetura de tokens em 3 camadas, matriz de estados de componente, elevação/superfícies, iconografia e ilustração, motion, checklist de acessibilidade e processo de governança — pesquisados contra padrões de mercado atuais (Material Design 3, Radix, IBM Carbon, Shopify Polaris).

---

## 1. Foundations

**Produto:** Nave é um SaaS de gestão de veículos/frota (despesas, manutenção, odômetro, dashboards) — consultado repetidamente ao longo do dia, com momentos de uso emocionalmente neutros (consulta de rotina) e momentos emocionalmente carregados (despesa inesperada, manutenção cara, alerta de atraso).

**Princípio central, herdado e reafirmado:** a interface deve responder "meu veículo/minha frota está saudável hoje?" em segundos — "Calm UI" anti-fadiga. Nenhuma decisão de cor, tipografia ou componente deste documento pode comprometer esse princípio.

**Personas:**
- **P1 — Douglas, mantenedor do Nave.** Responsável pela identidade visual e consistência do design system, decisor final de marca.
- **P2 — Gestor de frota / usuário final.** Consulta dashboards densos de dados por longos períodos, em light e dark mode, e usa o app tanto em rotina tranquila quanto em momentos de estresse financeiro/operacional.

**O que muda em relação ao estado atual (Prata):**

| Fundamento | Estado atual (Prata, `SPEC-20260729-001`) | Decisão desta rodada |
|---|---|---|
| Cor primária | Azul-prata frio (H≈259, tecnologia/funcionalidade) | Azul-Índigo (H≈250, mesma leitura de inteligência/confiança, mais diferenciação de mercado) |
| Fundo dark mode | Tom escurecido da própria família do primário | Grafite dedicado (`≈#13131A`), família neutra própria |
| Papel do ouro | Acento único, ~5-10% da superfície | Acento (inalterado) **+** secundária estrutural nova (bronze, maior área permitida) |
| Escala tipográfica | Inexistente (defaults do Tailwind, fonte do SO) | Sistema formal com família, escala modular e regra de tabular-nums |
| Arquitetura de tokens | 2 camadas implícitas (primitivo solto + semântico) | 3 camadas explícitas (primitivo → semântico → componente), alinhado a Material 3/Radix |
| Voz de marca | Não documentada formalmente | Personalidade, tom por contexto e exemplos — calorosa, sem coloquialismo |
| Governança de cor | CI bloqueia hardcode (bom), mas sem fluxo de proposta de token novo | Fluxo de proposta/aprovação formalizado |

---

## 2. Pesquisa de Mercado — Por Que a Cor Primária Mudou

Pesquisa conduzida sobre branding real de players das duas categorias mais próximas do Nave.

**Fintech / gestão financeira pessoal:**
- **Nubank** escolheu roxo deliberadamente como a cor "mais anti-banco possível" — diferenciação radical numa categoria saturada de azul.
- **Monzo** apostou em coral quente (laranja-rosa) e gerou reconhecimento orgânico pelo contraste com a homogeneidade visual do setor.
- **Mercury** combina paleta escura (cinza-chumbo) com toques de roxo — posicionamento de sofisticação/luxo-fintech.
- **Revolut** e **YNAB** mantiveram azul — trust de categoria, mas sem diferenciação.
- **Diagnóstico:** a tendência 2025-2026 em fintech é abandonar o azul corporativo genérico em favor de paletas com propósito psicológico explícito. Quem manteve azul não construiu identidade distintiva; quem rompeu, construiu.

**Mobilidade / automotivo / frotas:**
- **Samsara** usa navy profundo, justificando explicitamente "confiança e segurança" para dados de IoT.
- **Motive** opera com wordmark limpo sem cor dominante forte.
- A categoria inteira converge quase monoliticamente em azul naval/cinza — **nenhum player relevante de frota ocupa o espaço do espectro azul-índigo mais expressivo.**
- A única ruptura visível foi o redesign do **Waze** (Pentagram), que abandonou o minimalismo em favor de paleta multicolorida e otimismo comunitário — caso extremo, não diretamente replicável para um SaaS B2B de dados densos.

**Conclusão de mercado:** o Nave, ao manter um azul-prata frio, estava exatamente onde toda a concorrência de frota já está — reforça segurança, mas não diferencia. Fintech mostra que romper esse padrão com racional psicológico sólido (não modismo) é o que gera reconhecimento de marca de verdade.

**Fontes:** Nubank brand strategy (riffon.com), Fintech Branding Trends 2025-2026 (fintechbranding.studio), Samsara brand history (designyourway.net), Waze redesign by Pentagram (underconsideration.com/brandnew), Mercury banking design (blakecrosley.com), Fintech Brand Design case studies (feelystudio.com), B2B SaaS Color Palettes 2026 (tentackles.com).

---

## 3. Substituição da Cor Primária

### 3.1 Direções avaliadas

**Direção A — Âmbar Operacional.** H≈42–50°. Ouro/âmbar associado a valor, durabilidade, qualidade duradoura; par âmbar-azul é contraste quente-frio clássico. Nenhum concorrente de frota usa âmbar como primário. Trade-off: risco de "aquecer demais" telas densas de dado — a frieza da Prata era uma vantagem ergonômica real; a versão clara do ouro já ocupada pelo acento falha contraste como primário funcional.

**Direção B — Azul-Índigo *(escolhida)*.** H≈250°. Violeta/índigo associado a transformação e futuro — território que Nubank e Mercury exploraram em fintech, ainda vazio em frotas — mas calibrado mais perto do azul puro que uma primeira exploração em H≈265, para não cruzar para o registro "roxo de app de produtividade". O acorde azul-ouro sustenta contraste complementar amplo (tensão visual útil, sensação premium), sem descartar o trabalho já validado nos neutros frios.

**Direção C — Verde Profissional.** H≈155–165° (verde floresta, não neon). Verde lidera quase toda métrica positiva (simpatia, harmonia, confiança) depois do azul. Trade-off crítico: o Nave já usa verde como token semântico de `success` — tornar verde a cor de marca cria ambiguidade grave entre "isto é a marca" e "este item está OK", exigindo recalibrar o `success` inteiro.

### 3.2 Por que Azul-Índigo

Motivos, em ordem de peso:
1. **Nenhum concorrente de frota ocupa esse espaço** — diferenciação real, não cosmética.
2. **Validado por Heller** como cor de transformação/futuro — alinhado ao posicionamento "substituir planilha por gestão inteligente".
3. **Preserva o trabalho já validado**: ouro e neutros frios permanecem em uso, reduzindo o escopo de mudança ao token primário e seus derivados diretos.
4. **Não cria conflito semântico** com `success` (verde) nem exige recalibrar `danger` (terracota já funciona bem com qualquer primário frio).
5. **Calibração final mais próxima do azul puro** (H≈250, não H≈265) reduz o risco de o produto ler como "fintech genérico" — mantendo ainda assim distância suficiente do azul-prata acromático anterior para ser percebido como identidade nova.

### 3.3 Reorganização das cores derivadas

| Papel | Antes (Prata) | Decisão (Azul-Índigo) | Muda? |
|---|---|---|---|
| Primary (light) | `35.3% 0.093 259` (azul-prata) | `~44% 0.19 250` (azul-índigo) | **Sim** |
| Primary (dark) | `70.7% 0.038 250` | `~66% 0.16 250` | **Sim** |
| Primary foreground | = background | = background (mesma lógica) | Recalcular por contraste |
| **Background (dark)** | derivado da própria família azul-prata | **grafite dedicado**, próximo de `#13131A` — fora da família do primário | **Sim (novo)** |
| **Secondary** | neutro frio derivado de primary, sem consumidor | **ouro estrutural** (bronze dessaturado) — segunda cor de marca, ver §3.4 | **Sim (novo papel)** |
| Gold (acento, ~5–10%) | `67.4% 0.122 86` | **inalterado** — continua o "ouro de brilho" | Não |
| Danger | terracota `56.3% 0.14 32` | **inalterado** | Não |
| Success | verde H=150 | **inalterado** | Não |
| Warning | âmbar H=85 | avaliar migrar para H≈48 (derivado do próprio ouro) | Avaliação futura, não bloqueante |

> Os valores acima são ponto de partida para o exercício de conversão OKLCH e validação de contraste (mesmo processo aplicado em `SPEC-20260729-001`), não valores finais de implementação. A adoção formal exige uma rodada de `contrastExpectations` e testes `jest-axe`, como já é praxe no projeto.

### 3.4 Ouro como segunda cor de marca — Barroco Mineiro

A referência que sustenta "azul + ouro" com precisão cultural não é "azul-marinho + dourado corporativo" genérico (isso lê como seguradora europeia tradicional) — é o **Barroco Mineiro**: talha dourada (entalhe em folha de ouro) sobre azulejo azul nas igrejas históricas de Ouro Preto e região, um par cromático de sofisticação genuinamente brasileira, não decorativo nem turístico. Isso justifica dar ao ouro um segundo papel, mais estrutural que o acento pontual original:

- **`secondary` (papel novo)** — um ouro mais profundo e dessaturado ("bronze"/"ouro velho"), usado em elementos estruturais de maior área que o acento tradicional permitiria: botão secundário, divisor de seção, composições de duas cores em materiais de marca externos (site, apresentação, e-mail). Aproximadamente `48% 0.10 82` (light) / `62% 0.09 82` (dark).
- **`gold` (papel existente, inalterado)** — continua o "ouro de brilho" mais claro e saturado, reservado a badge de destaque, ícone de conquista, detalhe pontual — nunca área grande.

As duas variantes do ouro convivem pela mesma regra que já protegia o acento único: nunca ouro-estrutural e ouro-de-brilho lado a lado na mesma composição, para não competir entre si. O resultado é um sistema de duas cores de marca deliberadas — azul (estrutural, propósito primário) e ouro em dois registros (estrutural discreto + brilho pontual) — mais próximo, em proporção, do que a talha dourada faz sobre o azulejo: presença real, não só brilho.

### 3.5 Paleta Tonal — evitar a sensação de "vazio"

Uma paleta reduzida a poucos tons planos (primary + neutro + 3 semânticos) tende a deixar telas com muito espaço negativo — comuns em empty state, onboarding e cabeçalhos de dashboard — com aparência de "inacabado" ou "abandonado". A correção de mercado (Material Design 3, Radix Colors) não é adicionar mais cores semânticas — é expor a **escala tonal completa** de um mesmo matiz, para que superfícies decorativas usem variação de luminosidade da própria marca em vez de cinza neutro genérico.

**Escala tonal — Azul-Índigo (H≈250, primitivo, não semântico ainda):**

| Tom | OKLCH aproximado | Uso pretendido |
|---|---|---|
| 99 | `99% 0.005 250` | Ponta clara de degradê decorativo |
| 95 | `95% 0.015 250` | Ponta clara alternativa, cards de destaque em light mode |
| 90 | `90% 0.03 250` | Hover de superfície neutra, fundo de badge suave |
| 80 | `80% 0.06 250` | Início de degradê decorativo (ponta clara) |
| 70 | `70% 0.10 250` | Ilustração/ícone decorativo de baixo destaque; primary em dark mode |
| 60 | `60% 0.15 250` | Elemento decorativo de médio destaque |
| 50 | `50% 0.18 250` | Fim de degradê decorativo (ponta escura), hover de primary |
| 44 | `44% 0.19 250` | **Primary (light)** — token semântico |
| 40 | `40% 0.18 250` | Active/pressed de primary |
| 30 | `30% 0.14 250` | Superfície escura decorativa em dark mode, ponta escura de degradê |
| 20 | `20% 0.09 250` | Card de destaque com degradê em dark mode |
| 10 | `10% 0.05 250` | Reservado a degradê muito escuro pontual — **não é o fundo de página** (papel do grafite dedicado, §3.6) |

**Escala de grafite (neutro dedicado — fundo de página, independente da escala do azul):**

| Tom | Hex aproximado | Uso |
|---|---|---|
| graphite-99 | `#F4F5F7` | Fundo de página, light mode |
| graphite-95 | `#EAEBEE` | Card/painel, light mode |
| graphite-20 | `#1B1B22` | Card/painel, dark mode |
| graphite-15 | `#17171D` | Superfície intermediária, dark mode |
| graphite-10 | `#13131A` | **Fundo de página, dark mode** |

### 3.6 Regra de uso de degradês (proposta para `R-DS-08`)

1. Degradê é permitido **apenas em áreas sem texto direto sobreposto** — cabeçalho decorativo de dashboard, fundo de ilustração de empty state, fundo de card de destaque (upsell, onboarding), área de preenchimento sob linha de gráfico. Texto de corpo, label, valor de KPI e conteúdo funcional continuam sobre superfície sólida (`card`/`background`), nunca sobre gradiente.
2. Direção e amplitude: degradê linear (135° ou radial a partir de um canto) entre dois tons adjacentes ou próximos da mesma escala tonal do azul (ex.: tom 80 → tom 50), nunca entre matizes diferentes (índigo → verde, por exemplo).
3. Se, excepcionalmente, um ícone ou rótulo curto precisar ficar sobre a área do degradê, o contraste é validado contra o ponto **mais escuro** do degradê (não a média), seguindo o mesmo rigor de `C-DS-01`.
4. O fundo de página em si é **sempre grafite sólido**, nunca o degradê — o degradê decorativo do azul aparece *sobre* o grafite (cards, cabeçalhos, gráficos), nunca substitui o fundo de página.
5. Áreas de gráfico (`ChartWrapper`, preenchimento sob linha/área) podem usar o degradê tom 60 → transparente como preenchimento padrão, substituindo o preenchimento sólido de baixa opacidade atual — mais alinhado ao tratamento visual de dashboards de mercado (Linear, Vercel Analytics, Datadog) sem introduzir cor nova.

Isso resolve "trabalhar com tonalidades, evitar sensação de vazio" sem contradizer o princípio "Calm UI": o degradê é sempre da própria cor de marca, nunca decoração multicolor, e nunca compete com dado real em tela.

---

## 4. Arquitetura de Tokens

Padrão de mercado (Material Design 3, Radix Themes) converge em **três camadas**, que o Nave deve adotar explicitamente:

**Camada 1 — Primitivos.** Valores brutos sem contexto de uso (hoje em `colorChannels`/`darkColorChannels`, `colors.ts`). Nunca referenciados diretamente por componentes. Convenção de nome: `--[família]-[papel]-[lightness]` (ex.: `--indigo-base-44`, `--graphite-10`).

**Camada 2 — Semânticos.** Tokens com significado funcional, agnósticos de componente (`--background`, `--primary`, `--secondary`, `--danger-pastel`). Todo semântico aponta para um primitivo — nunca encadeia outro semântico (alinhado ao W3C Design Tokens Format Module). É aqui que vive a pendência **C-DS-01**: os tokens `warning`/`success` foram calibrados para uso *sobre* seu próprio `-pastel`, não sobre o canvas geral — o contrato precisa ser documentado explicitamente no token, não só corrigido por valor.

**Camada 3 — Componente.** Escopo restrito a um componente específico (ex.: `--button-primary-bg`), criado apenas quando o mesmo valor aparece em ≥ 3 lugares dentro do componente ou quando o componente precisa de um estado que inverte o significado semântico padrão. O Nave ainda não tem nenhum — a expansão de `packages/ui/` deve criá-los via `class-variance-authority` (CVA), não variáveis CSS soltas.

---

## 5. Sistema Tipográfico

Hoje inexistente formalmente — o Tailwind roda no default e a fonte efetiva é a do sistema operacional, por omissão, não decisão.

**Família recomendada: Inter (única, variável).** Cobre pesos 100–900 num único arquivo, inclui `tnum` (algarismos tabulares) e `cv03`/`cv04` (zero cortado, distinção `l`/`1`) nativamente — critério citado por engenharia de produtos SaaS de dados densos. IBM Carbon usa a mesma lógica com IBM Plex. Não é necessária uma fonte de display separada — o custo de manutenção não se paga em telas de dashboard.

**Escala modular — razão 1.2** (a 1.25 gera saltos grandes demais para interfaces densas):

| Token | `font-size` | `line-height` | Peso | Uso |
|---|---|---|---|---|
| `--text-xs` | 11px | 1.5 | 400 | Labels de campo, metadados |
| `--text-sm` | 13px | 1.45 | 400/500 | Corpo de tabela, badges |
| `--text-base` | 15px | 1.5 | 400 | Corpo padrão, parágrafos |
| `--text-md` | 18px | 1.4 | 500 | Subtítulos de seção |
| `--text-lg` | 22px | 1.3 | 600 | Título de página |
| `--text-xl` | 26px | 1.25 | 700 | KPI principal |
| `--text-2xl` | 32px | 1.2 | 700 | Display de destaque |

**Regra obrigatória de `tabular-nums`:** toda célula de tabela, KPI, contador, valor monetário e leitura de odômetro deve declarar `font-variant-numeric: tabular-nums`. Sem isso, dígitos de largura proporcional quebram alinhamento vertical em listas de valores.

**Pesos necessários:** 400 (corpo), 500 (ênfase leve/interativo), 600 (label, badge), 700 (heading, KPI). Evitar 300 em texto funcional — legibilidade cai em telas de baixa resolução.

---

## 6. Componentes — Matriz de Estados Obrigatórios

Checklist de cobertura esperada por componente-base já existente em `packages/ui`. **O** = obrigatório e documentado no showcase; **—** = não aplicável.

| Estado | Button | Input | Textarea | Checkbox | Switch | Badge | Card | Table (row) | Tooltip | Skeleton |
|---|---|---|---|---|---|---|---|---|---|---|
| default | O | O | O | O | O | O | O | O | O | O |
| hover | O | O | O | O | O | — | O | O | — | — |
| focus-visible | O | O | O | O | O | — | — | — | O | — |
| active/pressed | O | — | — | O | O | — | O | O | — | — |
| disabled | O | O | O | O | O | O | — | — | — | — |
| loading | O | — | — | — | — | — | — | — | — | O |
| error/invalid | — | O | O | O | — | O (variant) | — | — | — | — |
| checked/on | — | — | — | O | O | — | — | — | — | — |
| indeterminate | — | — | — | O | — | — | — | — | — | — |
| selected (row) | — | — | — | — | — | — | — | O | — | — |

`Skeleton` não tem hover/disabled — seu único estado variante é a animação `pulse`, que precisa respeitar `prefers-reduced-motion` (seção 9).

---

## 7. Elevação e Superfícies

Elevação no Nave não é sombra pesada — é variação de luminosidade da própria escala tonal, seguindo o mesmo racional "Calm UI" já em vigor (dark-first por variação de luminosidade, não sombra).

**Escala de superfície (3 níveis):**

| Nível | Papel | Light | Dark | Uso |
|---|---|---|---|---|
| `surface-0` | Base | grafite 99 | grafite 10 (`≈#13131A`) | Fundo de página |
| `surface-1` | Elevada | grafite 95 | grafite 20 | Card, painel, tabela |
| `surface-2` | Destaque | grafite 95 + degradê azul-índigo tom 90→70 | grafite 20 + degradê azul-índigo tom 30→10 | Card de KPI em destaque, banner de onboarding, upsell |

Sombra (`box-shadow`) é reservada a elementos **flutuantes de verdade** — popover, dropdown, modal, toast — nunca a cards estáticos na grade (que usam só a variação tonal acima para se diferenciar do fundo). Isso evita o efeito "cartão de papel" datado e mantém a leitura plana e rápida que dashboards densos exigem.

**Onde `surface-2` resolve o problema de "vazio":** cabeçalho de página com título + poucos elementos (topo do Dashboard, boas-vindas do onboarding), fundo de card de destaque ("Resumo do mês"), fundo atrás de ilustração de empty state. Em todos os casos, o degradê é decorativo e nunca compete com o dado.

---

## 8. Iconografia e Ilustração

**Ícones — não reinventar, adotar biblioteca madura.** Recomenda-se **Lucide** (ou equivalente MIT, stroke-based) como fonte única de ícones — já é o padrão de facto do ecossistema shadcn/ui/Radix que o Nave já usa como base de componentes. Regras de uso:

- Peso de traço único (stroke, não filled) em 1.5–2px, cantos arredondados compatíveis com a linguagem de forma já definida (`rounded-md` para controles) — nunca misturar ícones line com ícones filled na mesma tela.
- Grid de 24×24px, satisfazendo o alvo mínimo de toque de 24×24 CSS px quando o ícone é interativo.
- Ícone herda cor via `currentColor` — nunca cor hardcoded no próprio SVG. Preserva `R-DS-03` (cor comunica status real).
- Proibido ícone multicolor "sticker".

**Ilustração — geométrica, tonal, nunca "sticker colorido".** Para empty states, onboarding e telas de erro, usar ilustração line-art simples construída só com a escala tonal do azul-índigo (§3.5) e o ouro como acento pontual — nunca um pacote de ilustração multicolor genérico. Três aplicações:

1. **Empty state de despesas** — silhueta simples de um veículo/recibo em tom 70–80, sem fundo degradê.
2. **Onboarding (boas-vindas)** — composição maior pode usar `surface-2` (§7) atrás de uma ilustração line-art tom 50–60.
3. **Erro/sem conexão** — ilustração minimalista, tom claro (70–90) para não competir com a mensagem de erro.

---

## 9. Motion e Animação

Motion no Nave segue o princípio "Calm UI": existe para dar feedback funcional, nunca para decorar.

| Categoria | Duração | Easing | Exemplos |
|---|---|---|---|
| Micro-feedback | 100–150ms | ease-out | Hover de botão, toggle de switch, ripple de clique |
| Entrada/saída de componente | 200–250ms | ease-out (entrada) / ease-in (saída) | Abrir/fechar Dialog, Toast, Tooltip, Dropdown |
| Reflow de layout | 300–350ms (teto) | ease-in-out | Expandir Accordion, abrir Drawer, colapsar seção |

**Regras:**
- Nunca animar cor além do degradê estático já definido (§3.6) — transição de cor "piscando" entre estados semânticos quebra a leitura instantânea de status.
- Um único momento de motion "com personalidade" é permitido de propósito: confirmação de sucesso (despesa salva, manutenção marcada como feita) pode ter uma micro-animação levemente mais expressiva (easing spring/overshoot curto, ≤200ms).
- `prefers-reduced-motion: reduce` desativa toda animação decorativa e reduz as demais a ≤100ms sem removê-las por completo.
- Proibido parallax, scroll-jacking ou qualquer animação que atrase a leitura de dado.

---

## 10. Acessibilidade

**Contraste (WCAG 2.2):**
- [ ] Texto corpo (≥14px regular / ≥18px bold): razão ≥ 4.5:1 (AA), incluindo `--muted-foreground` sobre `--background`
- [ ] Texto grande e elementos gráficos de UI significativos: razão ≥ 3:1
- [ ] `--warning`/`--success` usados como fundo de texto (sobre `-pastel`), nunca como texto direto sobre o canvas — fechamento formal de C-DS-01
- [ ] `--success-pastel`/`--warning-pastel`/`--danger-pastel`/`--info-pastel` ganham override de dark mode em `darkColorChannels` — hoje (`packages/ui/src/tokens/colors.ts`) nenhum dos quatro tem override dark, então em dark mode caem no valor claro do light mode; combinado com `--foreground` claro em dark, `text-foreground` sobre `bg-*-pastel` (`Alert`/`Badge`/`Toast`) fica quase ilegível — gap encontrado ao construir o Design System Showcase (`C-DS-02`, ver changelog)
- [ ] Anel de foco visível com razão ≥ 3:1 contra o fundo adjacente (SC 1.4.11)

**Foco visível:**
- [ ] Todo elemento interativo expõe `:focus-visible` com outline ≥2px — nunca `outline: none` sem substituto
- [ ] Modais/drawers implementam focus trap com retorno ao trigger ao fechar
- [ ] Ordem de tabulação segue o fluxo visual

**Alvo de toque (SC 2.5.8):**
- [ ] Área de toque ≥ 24×24 CSS px (AA), preferencialmente ≥ 44×44 px mobile-first
- [ ] Ícones standalone sem label visível garantem área via padding, não pelo tamanho do ícone

**Movimento:**
- [ ] `prefers-reduced-motion: reduce` desativa pulse do Skeleton e transições decorativas
- [ ] Transições funcionais reduzem duração (≤100ms) em reduced-motion, sem remoção total

**Screen reader:**
- [ ] Estados dinâmicos (loading/error/sucesso) anunciados via `aria-live="polite"` ou `role="status"`
- [ ] Badges com conteúdo semântico incluem `aria-label` quando o visual é insuficiente isolado
- [ ] Skeleton usa `aria-busy="true"` no container pai + `aria-label` descritivo
- [ ] Switch/Checkbox expõem `aria-checked` corretamente

---

## 11. Voz de Marca e Diretrizes de Conteúdo

Calorosa e próxima, em registro correto — sem fórmulas de reasseguração institucional ("seus dados estão seguros", que soam a rodapé de termo de uso) e sem coloquialismo de fala solta ("tá", "bora"). O calor vem da atenção ao detalhe e da pergunta direta, coerente com a sofisticação discreta que a paleta azul-índigo + ouro estrutural carrega.

### Personalidade — cinco adjetivos

**Competente.** Conhece o assunto; usa termo técnico quando ajuda, nunca para performar autoridade.
**Direto.** Cada frase tem função; sem enrolação, sem eufemismo para más notícias.
**Acolhedor.** Aparece nos momentos de estresse do usuário (despesa inesperada, manutenção vencida) sem julgar nem dramatizar.
**Confiável.** Faz o que diz; mostra que resolveu com fatos concretos, não com frases de efeito — confiança se demonstra, não se declara.
**Caloroso, com compostura.** É o tom-base do produto nas interações neutras e positivas — próximo e humano, mas em português correto e sem gírias regionais ou contrações de fala. Recua para mais sóbrio em alertas críticos e erros graves.

### Tom por contexto

| Contexto | Tom |
|---|---|
| Erro de sistema | Assume o problema com naturalidade, sem drama nem desculpa formal; nunca expõe jargão técnico de log na UI; se for tranquilizar, é com informação concreta, nunca com frase pronta |
| Confirmação de sucesso | Breve e calorosa — reconhece o que foi feito sem soar burocrático nem efusivo |
| Alerta de manutenção vencida | Direto e presente — urgente sem alarmismo, sempre com o próximo passo à mão |
| Onboarding | O ponto mais expansivo do produto, com boas-vindas genuínas — ainda sem gíria |
| Empty state | Convite claro, não aviso de ausência |

### Diretrizes de microcopy

**Evitar:**
- Jargão técnico sem contexto ("erro 422", "timeout", "payload")
- Tom acusatório em erro de usuário ("Você não preencheu")
- **Fórmulas de reasseguração institucional** ("seus dados estão seguros", "nossa equipe foi notificada", "pedimos desculpas pelo transtorno") — se precisar tranquilizar, use um fato específico
- **Contrações e gírias de fala regional** ("tá", "bora", "pra", interjeições como "Ih") — quebram o registro de sofisticação discreta da marca
- Passividade excessiva ("O registro não pode ser processado")
- Imperativo agressivo em CTA ("Clique aqui")
- Frieza burocrática em confirmações simples ("Operação concluída com sucesso")

**Fazer:**
- Voz ativa em segunda pessoa ("Adicione", "Você salvou")
- Verbos de cuidado, em português correto ("acompanhar", "manter em dia", "revisar")
- Perguntas diretas em vez de só declarar ("Vamos agendar?", "Quer revisar agora?")
- Nomear o problema sem amplificar culpa
- CTA descritivo do resultado ("Salvar despesa" em vez de "Confirmar")

### Exemplos — antes/depois

| Contexto | Antes (genérico/frio) | Depois (voz do Nave) |
|---|---|---|
| Erro de sistema | "Erro interno do servidor. Tente novamente." | "Algo não saiu como devia aqui do nosso lado. Tente novamente em instantes — o que você já salvou continua guardado." |
| Confirmação de despesa | "Registro salvo com sucesso." | "Despesa registrada. Seu histórico já está atualizado." |
| Manutenção vencida | "Manutenção atrasada detectada." | "A revisão dos 10.000 km está em atraso. Vamos agendar?" |
| Empty state | "Nenhuma despesa encontrada." | "Nenhuma despesa por aqui ainda. Registre a primeira e comece a ver para onde o dinheiro do seu carro está indo." |
| Erro de preenchimento | "Campo obrigatório não pode estar vazio." | "Falta informar o valor da despesa." |
| Notificação/lembrete | "Lembrete: manutenção pendente para o veículo ABC-1234." | "O ABC-1234 está aguardando uma revisão. Vale reservar um horário — ele agradece." |
| Confirmação de exclusão | "Item excluído." | "Despesa removida. Para desfazer, você tem alguns segundos." (com opção de desfazer) |
| Primeiro login (onboarding) | "Bem-vindo ao sistema." | "Bem-vindo. Vamos ver, de verdade, quanto seu carro está custando?" |

---

## 12. Governança

**Prevenção de cor hardcoded (CI):** regra de lint (`no-hardcoded-color`) detecta literais `#hex`/`rgb(`/`hsl(`/`oklch(` fora dos arquivos de token e falha o build — já em vigor desde `SPEC-20260729-002` RF-04; manter e estender ao Stylelint para `.css`/`.module.css`.

**Fluxo de proposta de novo token:**
1. PR adiciona o token exclusivamente em `colors.ts` (primitivo) ou `globals.css` (semântico), com justificativa de uso no corpo do PR.
2. Confirmar que nenhum token semântico existente já resolve o caso.
3. Aprovação de ao menos um revisor com contexto de design system.
4. Atualizar `specs/RULES.md` se o token introduzir regra nova de uso.
5. Token de componente só é criado após o padrão aparecer em ≥3 componentes distintos.

**Versionamento:** tokens semânticos rastreados por `@spec` no changelog da spec que os alterou. Tokens primitivos renomeados mantêm alias `@deprecated since DS-vX.Y` por um ciclo antes de remover, evitando regressão silenciosa.

---

## Plano de Adoção

A direção **Azul-Índigo** está aprovada. Este documento continua sendo a etapa de **definição** — a formalização, seguindo as próprias regras do projeto, é:

1. **ADR novo** registrando a decisão arquitetural de substituir a cor primária (mudança de padrão estabelecido exige ADR, conforme `.claude/CLAUDE.md` do projeto).
2. **Spec nova** (`SPEC-YYYYMMDD-NNN`), com `superseded_by` apontando `SPEC-20260729-001` para `deprecated` — não se edita a spec da Prata in-place, pois é mudança estrutural.
3. Conversão OKLCH completa do Azul-Índigo e do grafite (light/dark) com `contrastExpectations` e validação `jest-axe`, mesmo processo já usado na adoção da Prata.
4. Atualização de `specs/RULES.md` (nova regra de degradê `R-DS-08`; revisão de regras que citam a paleta) e `matrices/rastreabilidade.md`.
5. Atualização de `/Design.md` (hoje desatualizado — ainda referencia "Steel & Sapphire"; deve refletir a base final decidida).
6. Migração de tokens de produção em `packages/ui/src/tokens/colors.ts` e `apps/web/src/app/globals.css`, seguindo o mesmo padrão de execução de `SPEC-20260729-001`.
7. Fechamento paralelo das pendências C-DS-01 (contraste de `warning`/`success` sobre o canvas) e **C-DS-02** (ausência de override dark para `success-pastel`/`warning-pastel`/`danger-pastel`/`info-pastel` — ver §10 e changelog), aproveitando a mesma rodada de revisão de tokens.
8. Showcase visual de referência (componentes reais de `@nave/ui`, re-temizados localmente) já construído em `apps/web/src/app/(app)/design-system/` — usar como base e prova de contraste ao migrar os tokens reais.

Nenhuma dessas ações foi executada por este documento — é a definição aprovada, pronta para virar ADR e spec formal.

---

## Changelog

- **2026-07-31** — Sem mudança de conteúdo neste documento (paleta, tipografia e tokens
  permanecem como definidos abaixo). Nota de rastreabilidade: o conceito de símbolo/logotipo do
  Nave — fora do escopo deste documento, coberto em `PROPOSTA-BRAND-PLATAFORMA-2026-07-30.md` §3.1 —
  foi revisado nessa mesma data, de "O Arco Aberto" para a "Estrela-Rosácea", com referência visual
  aprovada em `HANDOFF-SIMBOLO-EQUIPE-DESIGN-2026-07-31.md`. Os tokens de cor usados no símbolo
  (`gold`, `secondary`/bronze) são os mesmos já definidos aqui — nenhum token novo foi criado.
- **2026-07-30** — Construído o Design System Showcase (`apps/web/src/app/(app)/design-system/`), substituindo o antigo `/brand-showcase` (6 direções especulativas, já sem função após a decisão). Usa os componentes reais de `@nave/ui`, re-temizados localmente via CSS custom properties — nenhum token de produção foi alterado. Ao montar as abas de Feedback & Overlays e Exibição de Dados, dois problemas de fidelidade vieram à tona:
  - **C-DS-02 (novo):** `successPastel`/`warningPastel`/`dangerPastel`/`infoPastel` não têm override de dark mode em `packages/ui/src/tokens/colors.ts`. Em dark mode, `--foreground` inverte para um tom claro, mas o `-pastel` permanece no valor claro do light mode — o texto de `Alert`/`Badge`/`Toast` (`text-foreground` sobre `bg-*-pastel`) fica quase ilegível. Corrigido apenas no showcase (valores dark inéditos, ~13:1 de contraste); a correção real — adicionar os quatro overrides em `darkColorChannels` — é trabalho do Plano de Adoção (item 7), no mesmo ciclo de C-DS-01.
  - Listra de `Table` (`striped`, `bg-muted/15`) pouco perceptível contra o card no dark mode — ajuste pontual de intensidade feito só na demonstração do showcase (`className`), sem alterar `table.tsx`.
