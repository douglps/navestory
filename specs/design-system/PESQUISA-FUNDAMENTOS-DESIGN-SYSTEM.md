# Pesquisa de Fundamentos — Design System Nave

**Status:** documento de trabalho (alimenta spec formal futura)
**Data:** 2026-07-21
**Autor:** Douglas Lopes (lps.doug@protonmail.com)
**Contexto:** Resultado da revisão do Figma Make e das decisões de produto tomadas a partir dela.
**Decisões que este documento formaliza:** dark mode + light mode, paleta de marca (azul formal / dourado reluzente / grafite escuro), status pill/badge, badges de navegação, sparklines, header shell.

---

## Como ler este documento

Cada seção segue a estrutura: **resumo técnico** (para quem implementa) + **explicação para leigos** (para quem decide), seguidos de prós/contras, exemplos práticos e recomendações concretas. Itens marcados com `[ DECIDIR ]` precisam de aprovação explícita do usuário antes de virar spec formal.

---

## A. Metodologia de Design System

### A.1 Onde estamos e qual é o problema

O Nave já tem uma base funcional: tokens OKLCH em `packages/ui/src/tokens/*.ts`, 16 componentes implementados com CVA e Tailwind v4, e um inventário documentado. O que falta é um **framework decisório** — uma metodologia explícita que responda à pergunta "quando crio um token novo? Quando crio um componente? Como estruturo variantes?" sem depender de bom senso ad hoc.

**Para leigos:** É como a diferença entre ter tijolos e ter uma planta de construção. Os tijolos (componentes e tokens) já existem — agora precisamos da planta que diz onde cada tijolo vai, como encaixar, e o que fazer quando surgir um novo tipo de tijolo.

---

### A.2 Comparativo de abordagens

#### Atomic Design (Brad Frost, 2013)

A abordagem mais conhecida. Divide interfaces em: **átomos** (botão, input, ícone), **moléculas** (campo de formulário = label + input + mensagem de erro), **organismos** (formulário completo), **templates** (estrutura de página sem dados reais) e **páginas** (templates com dados reais).

**Prós:**
- Vocabulário claro e amplamente adotado — qualquer desenvolvedor novo entende o que é "átomo" vs "organismo"
- Incentiva granularidade: evita componentes monolíticos que fazem tudo
- Ainda relevante em 2025, mas evoluiu — equipes de mercado adaptam sem seguir à risca (Muzli, 2025)

**Contras:**
- Hierarquia rígida pode não mapear bem para domínio de produto (o que é átomo e o que é molécula depende de perspectiva)
- Não responde à pergunta "onde vivem os tokens?", que é a camada mais crítica para um design system baseado em CSS variables + OKLCH como o Nave
- Nomenclatura (átomo/molécula/organismo) conflita com nomenclatura de componentes em código — KpiCard não é "átomo" nem "organismo", é um composto com semântica de produto

**Trade-off de manutenção:** médio. Requer disciplina de categorização. Boa para documentar "o que existe", mas não diz "como decidir o que criar".

---

#### Token-First + Component Library (abordagem atual do Nave)

A camada de tokens vem antes de qualquer componente. Cada decisão visual (cor, espaçamento, raio, tipografia) é um token com nome semântico. Componentes consomem tokens, nunca valores hardcoded. Esta é a abordagem de Radix UI, GitHub Primer, Material Design 3 e Vercel Geist.

**Para leigos:** Imagine que as cores do sistema são variáveis de uma planilha. "Azul do botão de ação" é uma linha da planilha que pode ter um valor diferente no modo claro e no modo escuro. Os componentes consultam a planilha em vez de guardar o valor da cor dentro deles — assim, basta mudar a planilha (o token) e tudo muda junto.

**Prós:**
- Zero duplicação: dark mode funciona sem tocar em código de componente
- Escala de forma previsível: novo tema = novo conjunto de valores de token
- Rastreável: cada valor visual tem um nome e um dono
- Alinhado ao que o Nave já tem (`--primary`, `--background`, etc. em `globals.css`)
- Alinhado à nova especificação estável da Design Tokens Community Group (2025.10), que padroniza o formato JSON de tokens entre ferramentas

**Contras:**
- Requer disciplina para não criar tokens desnecessários (o risco é inflar `globals.css` com centenas de variáveis não usadas)
- Sem ferramenta de build (ex: Style Dictionary), sincronização manual entre `tokens/*.ts` e `globals.css` é frágil (o comentário no topo de `globals.css` já aponta esse risco)
- Curva de aprendizado para distinguir "token primitivo" de "token semântico" de "token de componente"

**Trade-off de manutenção:** baixo quando os tokens são bem nomeados, alto quando ficam proliferados sem critério.

---

#### Style Dictionary (Amazon, ferramenta de automação)

Uma ferramenta que lê um arquivo JSON/TS de tokens e gera automaticamente CSS variables, tokens para Figma, tokens para iOS, Android, etc. A sincronização manual entre `tokens/*.ts` e `globals.css` que existe hoje desapareceria.

**Prós:**
- Elimina drift entre tokens em código e CSS (o bug que o comentário em `globals.css` já avisa)
- Formato W3C-compatível com a nova especificação de design tokens
- Gera múltiplos outputs (CSS, JS, JSON para Figma) a partir de uma única fonte

**Contras:**
- Custo de setup não trivial em um monorepo Turborepo com Tailwind v4
- Adiciona uma dependência de build e uma etapa nova no pipeline
- Para um projeto com 22 tokens hoje, o ganho de automação é baixo — fica mais valioso quando o sistema crescer para 60+ tokens (light + dark + marca + semânticos)

**Recomendação para o Nave (agora):** não adotar Style Dictionary neste ciclo. Resolver o drift atual adicionando um script de validação simples que compara `tokens/colors.ts` com `globals.css`. Reavaliar quando o dark mode estiver implementado e o número de tokens dobrar.

---

### A.3 Recomendação de metodologia

**Adotar Token-First como paradigma central, com vocabulário Atomic Design como convenção de documentação** (não como hierarquia de implementação).

Na prática:
1. **Camada de tokens** (`packages/ui/src/tokens/`) — fonte de verdade. Qualquer decisão visual nova nasce como token aqui, com nome semântico.
2. **Camada de primitivos** (Button, Card, Input etc.) — consome apenas tokens. Variantes via CVA.
3. **Camada de compostos** (KpiCard, ChartWrapper, StatusBadge) — constroem em cima de primitivos. Têm semântica de produto.
4. **Camada de telas** (`apps/web/`) — compõem primitivos e compostos dentro de layouts de feature.

```
tokens/
  ├── colors.ts      ← valores OKLCH (light e dark)
  ├── spacing.ts     ← grid de 8px
  ├── radius.ts      ← 4/6/8/full
  └── motion.ts      ← easing, duration (a criar)

primitivos/
  Button, Card, Table, Alert, Toast, Input...

compostos/
  KpiCard, ChartWrapper, StatusBadge, NavBadge...

telas/
  DashboardPage, VehicleListPage, ExpensesPage...
```

**Critério para criar novo token:** se o valor vai ser usado em 3+ lugares com significado semântico. Cor de um fundo específico de uma única tela não vira token — usa-se o token mais próximo (`--muted`, `--card`) com modificador de opacidade (`/80`).

**Critério para criar novo componente:** se a composição visual se repete em 2+ telas com a mesma estrutura. Uma composição que aparece só uma vez é layout inline, não componente.

---

## B. Dark Mode + Light Mode com as Cores de Marca

### B.1 O princípio: tokens semânticos trocam de valor, componentes não mudam

O erro mais comum é criar variantes de componente para cada tema: `<Button variant="dark">`. Isso duplica a lógica e a manutenção. A abordagem correta (usada por Primer, Material Design 3, Radix Colors, Vercel Geist) é:

1. Componente sempre usa o mesmo token: `bg-primary text-primary-foreground`
2. Em light mode, `--primary` tem um valor. Em dark mode, tem outro valor.
3. A troca de tema é **zero código de componente** — é só trocar a classe `.dark` no elemento `<html>`.

**Para leigos:** É como um interruptor de luz. A tomada (componente) não muda — o que muda é o que sai dela. O design system é o painel elétrico que decide "quando é modo escuro, manda esta corrente; quando é modo claro, manda aquela."

**Para o Nave com Tailwind v4:** a estrutura correta é o `:root` com os valores do light mode, e um seletor `.dark` (aplicado via `next-themes` ou similar ao `<html>`) com os valores do dark mode:

```css
/* globals.css — estrutura de dois temas */
@layer base {
  :root {
    --background: 97% 0.005 260;
    --primary: 42% 0.24 258;
    /* ... todos os tokens em light */
  }

  .dark {
    --background: 14% 0.02 258;
    --primary: 62% 0.22 258;
    /* ... apenas os tokens que mudam em dark */
  }
}
```

Fonte sobre a implementação correta em Tailwind v4 + Next.js: o padrão recomendado é `:root` / `.dark` com CSS variables em canais (não inline @theme), confirmado por múltiplas referências de mercado de 2025.

---

### B.2 Por que não basta "inverter" as cores

Inverter um valor OKLCH ou HEX para dark mode produz resultados incorretos. Exemplo documentado: `#0070F3` (azul Vercel) invertido vira `#FF8F0C` (laranja) — obviamente inadequado.

O problema real é que **cores têm comportamentos perceptuais diferentes conforme o fundo**:

- **Saturação percebida:** uma cor de mesma saturação parece mais vívida em fundo escuro do que em fundo claro. Por isso, tokens para dark mode geralmente têm chroma (C) ligeiramente reduzido para evitar que a cor pareça "gritante".
- **Luminosidade relativa:** o que funciona como azul "formal e sério" em fundo claro (luminosidade ~42%) precisa ser mais luminoso em fundo escuro (~62%) para manter o mesmo peso visual — sem essa calibragem, fica escuro demais e se perde no fundo.
- **Cores quentes (dourado):** em fundo escuro, dourado tem naturalmente muito mais contraste e "brilha" mais. Reduzir ligeiramente o chroma (de 0.18 para 0.15) evita que pareça neon.

**Para leigos:** Imagine uma roupa amarela. À luz do dia ela parece normal. Num quarto escuro com luz de blacklight, parece fluorescente. O "dourado" no app precisa ser calibrado para não parecer neon no modo escuro — isso é feito reduzindo a saturação levemente.

---

### B.3 Paleta concreta proposta — "Azul Formal / Dourado Reluzente / Grafite Escuro"

#### Conceito

| Cor de marca | Papel no sistema | Analogia |
|---|---|---|
| Azul Formal | Primário — CTAs, foco, links, borda ativa | Uniforme corporativo: transmite confiança e profissionalismo |
| Dourado Reluzente | Acento destacado — badges de status premium, ícones de destaque, detalhe decorativo | Relógio de gestão: sofisticação discreta, não ostentação |
| Grafite Escuro | Estrutural — texto principal, superfícies em dark mode | Painel de instrumentos: neutro que organiza sem distrair |

#### Regra fundamental
Nunca usar preto puro (`oklch(0% 0 0)`) nem branco puro (`oklch(100% 0 0)`). O grafite tem sempre um toque de croma azulado que torna o sistema vivo e coerente em ambos os modos.

---

#### Tabela completa de tokens propostos

**Legenda das colunas:** `L` = Lightness (0-100%, quanto mais alto mais claro), `C` = Chroma (0-0.4, quanto mais alto mais saturado), `H` = Hue (ângulo na roda de cores: 0=vermelho, 85=dourado, 150=verde, 258=azul).

**Tokens de Base/Neutros**

| Token CSS | Light mode `L C H` | Dark mode `L C H` | Uso |
|---|---|---|---|
| `--background` | `97% 0.005 260` | `14% 0.02 258` | Fundo de página |
| `--foreground` | `18% 0.02 258` | `93% 0.005 260` | Texto principal |
| `--card` | `99% 0.002 260` | `19% 0.02 258` | Fundo de cartão/painel |
| `--card-foreground` | `18% 0.02 258` | `93% 0.005 260` | Texto dentro de cartão |
| `--border` | `88% 0.01 260` | `28% 0.02 258` | Bordas e divisores |
| `--muted` | `93% 0.008 260` | `24% 0.015 258` | Fundo de hover e zebra |
| `--muted-foreground` | `48% 0.01 260` | `62% 0.01 260` | Texto auxiliar, placeholders |

> Nota: todos os neutros têm um toque de croma azulado (C=0.005–0.02, H≈260) em vez de cinza puro (C=0). Isso cria coerência com o azul da marca e evita a frieza de um cinza morto.

**Tokens de Marca — Azul Formal**

| Token CSS | Light mode `L C H` | Dark mode `L C H` | Uso |
|---|---|---|---|
| `--primary` | `42% 0.24 258` | `62% 0.22 258` | CTAs, links, anel de foco, borda ativa |
| `--primary-foreground` | `97% 0 0` | `97% 0 0` | Texto sobre primary (quase branco) |

> `42% 0.24 258` é um azul royal profundo e formal — mais rico e escuro que o atual `55.6% 0.15 260`, comunicando autoridade em vez de leveza. Em dark mode, sobe para `62%` para manter peso visual sobre o fundo escuro.

**Tokens de Marca — Dourado Reluzente** `[ DECIDIR: confirmar uso do dourado no sistema ]`

| Token CSS | Light mode `L C H` | Dark mode `L C H` | Uso permitido | Uso proibido |
|---|---|---|---|---|
| `--gold` | `68% 0.18 82` | `74% 0.15 82` | Acento de destaque, ícone premium, badge de status especial, detalhe de borda | Texto sobre fundo claro (falha contraste), fundo de CTA principal |
| `--gold-foreground` | `15% 0 0` | `12% 0 0` | Texto sobre fundo dourado | — |

> **Contraste calculado — gold como texto:** `oklch(68% 0.18 82)` sobre background claro `oklch(97%)` tem razão de contraste aproximada de 2.1:1 — abaixo do mínimo WCAG AA (4.5:1). **Gold não é cor de texto sobre fundo claro.** É exclusivo como: fundo de elemento com texto escuro sobre ele, ou elemento decorativo/ícone em escala grande. Em dark mode sobre `oklch(14%)`, o contraste sobe para ~8:1 — pode ser texto.

**Tokens Semânticos — Ajustados para dark mode**

| Token | Light `L C H` | Dark `L C H` |
|---|---|---|
| `--success` | `60% 0.15 150` | `65% 0.14 150` |
| `--success-foreground` | `97% 0 0` | `97% 0 0` |
| `--success-pastel` | `92% 0.12 150` | `22% 0.07 150` |
| `--warning` | `75% 0.16 85` | `78% 0.15 85` |
| `--warning-foreground` | `18% 0 0` | `12% 0 0` |
| `--warning-pastel` | `92% 0.15 85` | `22% 0.09 85` |
| `--danger` | `57.7% 0.20 25` | `65% 0.18 25` |
| `--danger-foreground` | `97% 0 0` | `97% 0 0` |
| `--danger-pastel` | `92% 0.08 25` | `22% 0.06 25` |
| `--info` | `55.6% 0.15 240` | `65% 0.15 240` |
| `--info-foreground` | `97% 0 0` | `97% 0 0` |
| `--info-pastel` | `92% 0.08 240` | `22% 0.06 240` |

> Em dark mode, os pastéis mudam de L=92% (claro) para L=22% (escuro cromático) — eles continuam sendo "pastéis" no sentido de fundos com cor sutil, mas agora sobre fundo escuro. A cor sólida (success, warning etc.) sobe um pouco em L para manter legibilidade como texto/borda sobre o pastel escuro.

---

### B.4 Mockup de como o sistema muda entre os temas

```
LIGHT MODE — Dashboard
┌────────────────────────────────────────────────────────────┐
│ bg: oklch(97% 0.005 260) — cinza azulado muito claro       │
│                                                            │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ bg: oklch(99%)   │  │ bg: oklch(99%)   │  ← cards     │
│  │ Combustível      │  │ Multas           │               │
│  │ R$ 4.820         │  │ 3 pendentes      │               │
│  │ [azul 42%]██     │  │ [dourado 68%]██  │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                            │
│  [Botão CTA] ← bg: oklch(42% 0.24 258) = azul profundo    │
│  texto: oklch(97%) sobre azul — contraste ~8:1 ✓          │
└────────────────────────────────────────────────────────────┘

DARK MODE — mesmo Dashboard
┌────────────────────────────────────────────────────────────┐
│ bg: oklch(14% 0.02 258) — grafite azulado muito escuro     │
│                                                            │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ bg: oklch(19%)   │  │ bg: oklch(19%)   │  ← cards     │
│  │ Combustível      │  │ Multas           │               │
│  │ R$ 4.820         │  │ 3 pendentes      │               │
│  │ [azul 62%]██     │  │ [dourado 74%]██  │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                            │
│  [Botão CTA] ← bg: oklch(62% 0.22 258) = azul mais claro  │
│  texto: oklch(97%) sobre azul — contraste ~5.9:1 ✓        │
└────────────────────────────────────────────────────────────┘
```

---

### B.5 Implementação em Tailwind v4 + Next.js 15

**Mecanismo recomendado:** classe `.dark` no `<html>`, gerenciada por `next-themes`.

```css
/* globals.css — estrutura final proposta */
@layer base {
  :root {
    /* Neutros */
    --background: 97% 0.005 260;
    --foreground: 18% 0.02 258;
    /* ... */

    /* Marca */
    --primary: 42% 0.24 258;
    --primary-foreground: 97% 0 0;

    /* Gold [ DECIDIR ] */
    --gold: 68% 0.18 82;
    --gold-foreground: 15% 0 0;

    /* Semânticos light */
    --success: 60% 0.15 150;
    /* ... */
  }

  .dark {
    /* Só os tokens que mudam — os que não mudam herdam do :root */
    --background: 14% 0.02 258;
    --foreground: 93% 0.005 260;
    /* ... */

    --primary: 62% 0.22 258;

    /* Gold dark */
    --gold: 74% 0.15 82;
    --gold-foreground: 12% 0 0;

    /* Semânticos dark */
    --success: 65% 0.14 150;
    --success-pastel: 22% 0.07 150;
    /* ... */
  }
}
```

**Tokens que NÃO mudam entre temas** (herdam do `:root`):
- `--primary-foreground` (sempre quase branco)
- `--radius-sm/md/lg` (espaçamento não é tema)
- `--spacing-touch-target`

**Tokens que SEMPRE mudam entre temas:**
- Todos os neutros (background, foreground, card, border, muted)
- Todas as versões "pastel" dos semânticos (invertidas de claro para escuro)
- Primary e gold (precisam de luminosidade diferente por tema)

---

## C. Contraste e Acessibilidade (WCAG)

### C.1 As duas métricas que importam

#### WCAG 2.1/2.2 (atual obrigação legal)

**Para leigos:** WCAG é um conjunto de regras internacionais de acessibilidade visual. O padrão mínimo exigido por lei em vários países (incluindo Brasil pelo DECRETO Nº 5.296/2004) é o nível AA.

A métrica de contraste do WCAG mede a diferença de brilho entre dois elementos. O cálculo usa "luminância relativa" (um valor de 0 a 1 baseado em quanto de luz a cor emite ou reflete).

**Limites WCAG 2.2 AA:**

| Situação | Razão mínima | Exemplo prático |
|---|---|---|
| Texto normal (< 18px ou < 14px bold) | **4.5:1** | "Salvar" num botão de 14px |
| Texto grande (≥ 18px ou ≥ 14px bold) | **3:1** | Título de card em 20px |
| Componente de UI e estado de foco | **3:1** | Borda de botão, anel de foco |
| Decorativo (ícone sem função, sparkline) | Isento | SVG puramente visual |

**O que significa 4.5:1 na prática:** texto preto sobre fundo branco tem ~21:1 (máximo). Cinza médio sobre branco pode cair para 2:1 (reprovado). O nosso `--muted-foreground` (L=48%) sobre `--background` (L=97%) precisa ser verificado — estimativa: ~3.5:1, que passa para texto grande mas falha para texto pequeno. `[ DECIDIR: aceitar esse risco ou escurecer muted-foreground para L=42%? ]`

#### APCA (Accessible Perceptual Contrast Algorithm — candidato ao WCAG 3.0)

**Para leigos:** APCA é o método mais moderno, desenvolvido especificamente para telas digitais modernas. Ele leva em conta o tamanho e peso da fonte além da cor — por isso é mais preciso. Um texto fino em 12px precisa de mais contraste do que um texto bold em 18px para ser igualmente legível.

**Por que importa para o Nave:** APCA + OKLCH funcionam naturalmente juntos porque ambos são baseados em percepção humana real, não em física de luz. Verificar as cores em APCA dá uma segunda opinião mais precisa, especialmente para os valores de dourado que são problemáticos no WCAG clássico.

**Ferramenta recomendada:** [APCA Contrast Calculator](https://apcacontrast.com/) e [Atmos Contrast Checker](https://atmos.style/contrast-checker) — aceitam OKLCH diretamente.

**Posição recomendada para o Nave:** usar WCAG 2.2 AA como piso mínimo (porque é o requisito legal/formal), e APCA como ferramenta de diagnóstico para casos limítrofes. Nunca usar um que "passa" para compensar o outro que "falha".

---

### C.2 Validação das cores de marca propostas

```
PARES CRÍTICOS — estimativa de contraste (requer validação em ferramenta)

✓ PASSA AA (texto normal):
  --primary light (42% 0.24 258) sobre --background (97% 0.005 260)
  Estimativa: ~7.5:1 — passa AAA
  → Azul formal pode ser usado como texto de link sobre fundo de página

✓ PASSA AA (texto normal):
  --primary dark (62% 0.22 258) sobre --background dark (14% 0.02 258)
  Estimativa: ~5.9:1 — passa AA
  → Azul pode ser usado como texto em dark mode

✓ PASSA AA (texto normal):
  --foreground light (18% 0.02 258) sobre --background (97% 0.005 260)
  Estimativa: ~14:1 — passa AAA
  → Texto principal tem contraste excelente

✗ FALHA AA (texto normal):
  --gold light (68% 0.18 82) sobre --background (97% 0.005 260)
  Estimativa: ~2.1:1 — falha (abaixo de 3:1)
  → Gold NÃO pode ser texto pequeno sobre fundo claro

✓ PASSA AAA:
  --gold-foreground (15% 0 0) sobre --gold (68% 0.18 82)
  Estimativa: ~9:1 — passa AAA
  → Texto escuro sobre fundo dourado funciona perfeitamente

✓ PASSA AA (texto normal):
  --gold dark (74% 0.15 82) sobre --background dark (14% 0.02 258)
  Estimativa: ~8:1 — passa AAA
  → Em dark mode, dourado pode ser texto/ícone destacado

⚠ VERIFICAR:
  --muted-foreground (48% 0.01 260) sobre --background (97% 0.005 260)
  Estimativa: ~3.5:1 — passa AA só para texto grande (18px+)
  → Labels auxiliares em 12px podem reprovar. Solução: escurecer para L=42%.
```

**Regra prática resultante:** o dourado é uma cor de "elemento sobre fundo dourado" ou "detalhe em dark mode" — nunca texto pequeno em light mode. Documente isso na especificação do token `--gold`.

---

### C.3 Fluxo de validação de contraste no workflow

**Para cada novo par de cores adicionado ao sistema, validar em:**

1. [oklch.evilmartians.io](https://oklch.evilmartians.io/) — visualizar o valor em OKLCH e converter para hex/P3
2. [atmos.style/contrast-checker](https://atmos.style/contrast-checker) — verificar WCAG 2.2 e APCA
3. Testar em dispositivo real (OLED vs LCD — dourado em especial tem comportamento diferente)

**Automatização no CI:** ferramentas como `axe-core` (já possível via `vitest-axe` que o projeto tem configurado em `TESTS_SPEC.md`) verificam contraste em runtime durante testes — configurar pelo menos para as páginas de listagem e dashboard onde a densidade de informação é maior.

---

## D. Componentes Específicos Pendentes

### D.1 Status Badge / Status Pill

#### O problema que resolve

Tabelas de veículos, despesas e multas precisam comunicar estado de forma rápida, sem precisar ler o texto completo. Um gestor de frota precisa identificar em 1 segundo: "este veículo está ativo, em manutenção, ou inativo?"

**Para leigos:** É aquela etiquetinha colorida que você vê em planilhas ou apps de gestão — "Em andamento" em azul, "Concluído" em verde, "Atrasado" em vermelho. Esse componente é a versão formal e consistente dessas etiquetas no Nave.

#### Padrões de mercado consultados

Linear, Stripe e Notion usam um padrão consistente: **fundo com opacidade reduzida da cor semântica + texto e/ou borda na mesma cor sólida**. A Salesforce Lightning Design System e o GitHub Primer confirmam o mesmo padrão.

A distinção técnica importante (Smashing Magazine, 2024):
- **Badge (status):** estático, não clicável, comunica informação
- **Tag/Chip:** pode ser interativo (filtros)
- Para o Nave, o StatusBadge é **sempre estático** — nunca confundir com filtros clicáveis

#### Proposta formal do componente

```
## Componente: StatusBadge

API TypeScript:
interface StatusBadgeProps {
  status: 'active' | 'maintenance' | 'inactive' | 'pending' | 'overdue';
  label?: string;            // texto custom; senão usa o label padrão do status
  size?: 'sm' | 'md';       // sm = text-xs (tabelas densas), md = text-sm (padrão)
  className?: string;
}

Mapeamento de status → tokens:
| status      | label padrão   | bg token       | text token | border token |
|-------------|----------------|----------------|------------|--------------|
| active      | Ativo          | success-pastel | success    | success      |
| maintenance | Em manutenção  | warning-pastel | warning    | warning      |
| inactive    | Inativo        | muted/30       | muted-fore | border       |
| pending     | Pendente       | info-pastel    | info       | info         |
| overdue     | Em atraso      | danger-pastel  | danger     | danger       |

Visual: rounded-full, fundo pastel, borda 1px sólida da cor semântica, texto da cor semântica
```

#### Mockup ASCII

```
Light mode:
┌─────────────────────────────────────────────────────┐
│  Placa    Modelo      Status              Km         │
│  ABC-1234 Gol 2019   ●  Ativo            48.230 km  │
│  DEF-5678 HB20 2021  ⚙  Em manutenção   32.100 km  │
│  GHI-9012 Strada 22  ○  Inativo          15.400 km  │
│  JKL-3456 Clio 2020  ⏳  Pendente         8.900 km  │
└─────────────────────────────────────────────────────┘

Anatomia do badge "Ativo":
╔══════════════════╗
║  fundo success-  ║  ← oklch(92% 0.12 150) no light / oklch(22% 0.07 150) no dark
║  pastel          ║
║  ● Ativo         ║  ← texto: --success | borda: 1px --success
╚══════════════════╝
   └─ rounded-full, px-2 py-0.5, text-xs font-medium

Dark mode — o badge usa os valores dark dos mesmos tokens → automático, zero código novo
```

#### Regras de uso (permitido / proibido)

**Permitido:**
- Em colunas de tabela (`TableCell`)
- Em cards de detalhe de veículo (cabeçalho)
- Em listas de multas e despesas com status

**Proibido:**
- Como filtro clicável (usar `<Tag>` ou `<Button variant="outline">` no lugar)
- Mais de 2 badges por célula de tabela (causa poluição visual)
- Com fundo de cor totalmente sólida (perda de suavidade — manter sempre o padrão pastel)
- Criar cores novas para status não mapeados — se o status não cabe nos 5 definidos, estender o tipo e mapear para token existente

#### Acessibilidade

- `role="status"` não — o componente é estático, não um anunciador ao vivo
- Não comunicar estado exclusivamente por cor — o texto é obrigatório (o ponto `●` é decorativo, não substitui o texto)
- Em tabelas, o `<TableHead>` da coluna já descreve o contexto ("Status") — o badge não precisa de `aria-label` adicional

---

### D.2 Badges de Contagem em Navegação

#### Quando usar (e quando não usar)

**Para leigos:** o contador vermelho no ícone de notificação do celular. No Nave, seria o número de multas pendentes sobre o ícone de multas na navegação. Parece simples, mas feito errado causa "ansiedade de notificação" — o usuário fica compelido a resolver os badges constantemente, mesmo sem urgência real.

**Regra de ouro (IxDF — Interaction Design Foundation):** badges devem ser acionáveis. Se o usuário não pode resolver o badge abrindo aquela seção, ele não deve existir. Um badge que some só depois de 3 interações frustra.

#### Framework de decisão para o Nave

| Condição | Badge? | Justificativa |
|---|---|---|
| Multas com status `overdue` | Sim | Requer ação urgente, financeiramente crítico |
| Documentos vencidos/a vencer | Sim | Bloqueante operacional |
| Manutenções com data ultrapassada | Sim | Impacto na frota ativa |
| Despesas para aprovação | Sim, se papel de aprovador | Workqueue do usuário |
| Lembretes futuros sem urgência | Não | Gera ansiedade sem benefício |
| Atualizações genéricas do sistema | Não | Use changelogs/releases, não badges |

**Threshold sugerido:** mostrar badge apenas quando `count > 0`. Não mostrar "0" — remover o badge completamente. Não mostrar badge acima de 99 sem sinal de "+" (ex: "99+" em vez de "127").

#### Visual do NavBadge

```
Ícone com badge:

  🔔
  ┌──┐
  │ 3│  ← badge: oklch(57.7% 0.2 25) = --danger
  └──┘     text: oklch(97% 0 0) = --danger-foreground
           rounded-full, min-w-[18px] h-[18px], text-[10px] font-bold
           posição: absolute top-[-4px] right-[-4px]

Regra de limite de caracteres:
1-9  → mostra o número
10-99 → mostra "9+" ou o número (decidir por consistência)
100+ → sempre "99+"
```

**Acessibilidade do NavBadge:** o elemento pai (link/botão de navegação) precisa incluir o número no `aria-label`:
```tsx
<a href="/fines" aria-label={`Multas${count > 0 ? `, ${count} pendente${count > 1 ? 's' : ''}` : ''}`}>
  <BellIcon />
  {count > 0 && <NavBadge count={count} />}
</a>
```

---

### D.3 Sparklines em KPI Cards

#### O que é e para que serve

Edward Tufte cunhou o termo em 2006: "uma representação gráfica pequena, intensa e simples, com resolução tipográfica" — pensada para ser lida em contexto, como uma palavra num texto. Não é um gráfico completo com eixos e legendas; é a *forma* do dado (tendência de alta, queda, volatilidade).

**Para leigos:** o sparkline é aquela linhazinha num KPI card que mostra se o gasto subiu ou desceu nos últimos meses, sem dar valores exatos. É como ver a silhueta de uma montanha — você não sabe a altitude exata, mas sabe que há um pico.

#### Boas práticas formalizadas para o Nave

**Dados mínimos:**
- Mínimo 5 pontos de dado para a linha ter significado visual
- Com 2-4 pontos, a linha é uma reta ou quase — não comunica nada útil
- **Regra implementada:** `sparkline?: number[]` — prop opcional, renderizar só se `sparkline.length >= 5`. Abaixo disso, omitir o SVG completamente.

**Escala:**
- A escala deve ser local ao sparkline (min e max do próprio array, não global da série)
- Isso faz a forma ser visível mesmo quando a variação é pequena em termos absolutos
- **Exceção:** KPI cards da mesma grade podem compartilhar escala se forem comparáveis (ex: despesas por categoria numa mesma grade)

**Quando omitir o sparkline:**
- Dados insuficientes (< 5 pontos)
- Metadado não temporal (ex: quantidade de veículos por modelo — não há série temporal)
- Dados muito irregulares onde a linha enganaria (ex: 0, 0, 0, 15000, 0 — o pico é outlier, não tendência)

**Acessibilidade — regra crítica:**

O sparkline no Nave é **decorativo** — a informação de tendência já está comunicada pelo `trend.value` (texto "↑ 12%"). Portanto:

```tsx
// Correto: aria-hidden porque a informação está no texto
<svg aria-hidden="true" focusable="false">
  <polyline points="..." />
</svg>

// Errado: não adicionar aria-label no SVG se o texto já diz o mesmo
// Isso causaria duplicação para screen readers
```

Se o sparkline for o **único** indicador de tendência (sem texto `trend`), aí precisa de alternativa:
```tsx
<svg aria-label={`Tendência: ${trendDescription}`} role="img">
```

**Para KPI cards com `loading=true`:** o skeleton atual (`animate-pulse` em 3 blocos) já está correto. Não usar o SVG do sparkline durante loading.

---

### D.4 Header Shell (Busca / Notificação / Avatar)

#### O que é o "header shell"

Shell é o conjunto de elementos persistentes do app que aparecem em todas as telas: cabeçalho, navegação lateral e rodapé. O header shell especificamente é a barra superior com os controles globais.

**Para leigos:** é a "moldura" do app — aquela faixa que fica sempre no topo, não muda de tela para tela, e tem coisas como "Buscar", o sino de notificação e a foto do usuário.

#### Análise de mercado para SaaS B2B (perfil do Nave)

Referências consultadas: Linear, Stripe Dashboard, Vercel, GitHub, Notion.

**O que todo SaaS B2B maduro tem no header:**
- Identidade do workspace/empresa ativo (logo + nome)
- Busca global (atalho de teclado `⌘K` ou `/`)
- Notificações (sino com badge)
- Avatar do usuário (acesso ao perfil e logout)

**O que SaaS B2B maduro NÃO tem no header (que apps consumer têm):**
- Stories, feeds, curtidas, onboarding tooltips
- Publicidade ou promoções
- Muitas CTAs concorrendo no mesmo espaço

**Para o Nave especificamente (gestor de frota, uso profissional):**

O usuário típico do Nave é um gestor de frotas que entra no app para resolver tarefas específicas (registrar despesa, consultar relatório de multas, aprovar manutenção). Ele não explora — ele executa. Isso implica:

- Busca global é alta prioridade: ele precisa encontrar "veículo ABC-1234" rápido, sem navegar por menu
- Notificação de multa/vencimento de documento é bloqueante operacionalmente — o sino deve chamar atenção
- Avatar/perfil é de baixa frequência — pode ficar discreto no canto

#### Proposta de estrutura do header shell

```
Layout desktop (≥ md):
┌──────────────────────────────────────────────────────────────┐
│ [Logo/Nave]  [Veículo ativo ▾]    [Busca ⌘K]  [🔔3] [👤▾] │
└──────────────────────────────────────────────────────────────┘
  └── fixo no topo (sticky), z-index acima do conteúdo

Layout mobile:
┌──────────────────────────────────────────────────────────────┐
│ [≡ Menu]  [Logo/Nave]                          [🔔3] [👤]   │
└──────────────────────────────────────────────────────────────┘
  (busca vira um ícone de lupa que expande em overlay)
```

**Componentes do shell:**

| Elemento | Essencial? | Notas |
|---|---|---|
| Logo / nome do app | Sim | Link para `/dashboard` |
| Seletor de veículo ativo | `[ DECIDIR ]` | Se o contexto de veículo é global, esse é o controle de contexto mais importante |
| Busca global | Sim | Atalho `⌘K` / `/`, CommandPalette abre como modal |
| Sino de notificação | Sim | Com NavBadge se `count > 0` |
| Avatar do usuário | Sim | Dropdown: Perfil, Configurações, Sair |
| Seletor de tema (dark/light) | Sim | Toggle simples, ícone sol/lua |

**O que não incluir no primeiro ciclo:**
- Breadcrumb no header (já existe como componente de tela, não pertence ao shell)
- Chat/suporte embutido no header
- Atalhos de criação rápida (avaliar depois)

---

## E. Framework de Criatividade com Guardrails

### E.1 O que é imutável (nunca mudar sem aprovação formal + atualizar spec)

Estas são as "paredes estruturais" do design system. Mexer nelas sem processo pode quebrar consistência em todas as telas, afetar acessibilidade e gerar retrabalho em múltiplos componentes.

| Elemento imutável | Por quê é fixo |
|---|---|
| Nomes dos tokens semânticos (`--primary`, `--success`, etc.) | Componentes referenciam por nome — renomear quebra tudo |
| Grid de 8px como unidade base | Todo espaçamento é múltiplo de 8 — valores fora do grid criam inconsistência visual sutil mas perceptível |
| Touch target mínimo de 44px em mobile | WCAG 2.5.5 AA — obrigação de acessibilidade |
| Contraste mínimo 4.5:1 para texto normal | WCAG 2.2 AA — obrigação legal |
| Família de componentes base (Button, Card, Table etc.) | São os primitivos — variantes novas devem ser adicionadas à API existente, não criar componentes paralelos |
| rounded-full para status badges | Define a linguagem visual de "status" — mudar para retangular mistura com cards |
| Ícones semânticos como SVG simples (não emoji) | Emojis têm renderização inconsistente entre sistemas operacionais |

### E.2 Onde há liberdade criativa total (sem aprovação, apenas julgamento)

Estas são as "áreas de jardim" do design system — decoração, personalidade, detalhes que não afetam estrutura nem acessibilidade.

| Área livre | Exemplos de experimentação válida |
|---|---|
| Ilustrações decorativas | EmptyState pode ter SVG personalizado por seção (caminhão para frota, recibo para despesas) |
| Microcopy | "Nenhum resultado" pode virar "Sua frota está limpa" com tom mais humano |
| Animações de transição | Entrada de cards, transição de tela, skeleton loading — pode ser mais dramático ou mais sutil |
| Ícones decorativos (não semânticos) | Os emojis no KpiCard (`⛽`, `🚗`) são deliberadamente livres — podem mudar por contexto |
| Layout interno de telas específicas | A ordem de KPI cards no dashboard, o layout de relatórios — não afeta o sistema, só a tela |
| Tipografia de display | Títulos de seção, onboarding, páginas de landing interna — pode ter peso/tamanho diferente do padrão funcional |
| Gradientes e camadas decorativas | Um gradiente sutil no header ou num gráfico vazio não quebra o sistema se usar os tokens de cor como base |
| Bento grid para dashboards | O layout de grade "bento" (cards de tamanhos variados) é uma tendência 2025-2026 válida para o dashboard e não requer alteração em nenhum token |

### E.3 Zona intermediária (liberdade com critério)

Estas mudanças são válidas mas precisam ser documentadas no inventário e verificadas contra tokens existentes antes de implementar.

| Elemento | Regra de ouro |
|---|---|
| Novo componente composto | Deve ser construído **sobre** primitivos existentes. Se não conseguir fazer com Button + Card + tokens, há algo errado com o componente ou falta um primitivo. |
| Nova variante de componente existente | Propor como PR. Variante nova no Button requer que a API TypeScript seja atualizada e documentada. |
| Novo token de cor | Somente se o token existente mais próximo não atende nem com modificador de opacidade. Justificar no PR. |
| Novos tokens de motion | Duração de animação, easing curve — criar em `tokens/motion.ts` seguindo o padrão dos outros tokens. Não usar valores ad hoc inline. |

### E.4 Propostas criativas para próximos ciclos (sugestões, aguardam aprovação)

**Proposta "Painel Noturno" (dashboard dark-first)**

O dark mode proposto com grafite azulado cria uma estética de "painel de controle" que remete ao painel de instrumentos de um veículo — adequado ao contexto de frota. Elementos dourados funcionariam como indicadores de alerta e destaque, visualmente similares à iluminação âmbar de painéis profissionais.

**Para leigos:** imagine o painel de um caminhão ou ônibus: fundo escuro, números e indicadores iluminados, luzes de alerta âmbar. Essa referência visual alinharia o look do app com o universo do usuário.

**Implicação técnica:** zero mudança em tokens semânticos — o dark mode já cobre isso. Apenas a escolha de dark mode como padrão inicial (ao invés de light).

```
Mockup "Painel Noturno" — KPI strip do dashboard:
┌──────────────────────────────────────────────────────────────────┐
│ bg: oklch(14% 0.02 258)                                          │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ ⛽            │ │ ⚙            │ │ 🔴            │             │
│  │ Combustível  │ │ Manutenção   │ │ Multas       │             │
│  │ R$ 4.820     │ │ 2 agendadas  │ │ 3 pendentes  │             │
│  │ ↑ 12%        │ │ ← esta sem.  │ │ R$ 1.200     │             │
│  │ ___/‾\___    │ │ _____/‾‾     │ │ ‾‾\_____     │             │
│  │ (sparkline)  │ │ (sparkline)  │ │ (sparkline)  │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│         azul: oklch(62%)   dourado: oklch(74%)  danger:oklch(65%)│
└──────────────────────────────────────────────────────────────────┘
```

**Proposta "Bento Grid" para o Dashboard**

Em vez de grade uniforme 2×2 de KPI cards, usar cards de tamanhos variados: 1 card largo com a métrica mais importante do dia, outros menores. Referência: dashboards do Linear e Vercel (2025).

**Para leigos:** como um mural de recados onde algumas anotações são maiores porque têm mais importância. Fica visualmente mais rico e hierarquizado do que uma grade de caixinhas idênticas.

**Implicação técnica:** zero mudança no componente KpiCard (ele já tem largura flexível) — apenas o layout CSS da página do dashboard.

---

## F. Pontos Que Precisavam de Decisão Explícita — DECIDIDO em 2026-07-21

Estas questões foram levadas ao usuário via AskUserQuestion em 2026-07-21 e resolvidas. A spec formal (`spec-writer`) usa estas decisões como vinculantes.

| # | Questão | Decisão | Detalhe |
|---|---|---|---|
| F-1 | Dourado como token oficial? | **(A) Criar `--gold` / `--gold-foreground` dedicado** | Token de marca próprio, separado de `--warning` — evita confundir "alerta" com "destaque premium". Precisa entrar no inventário de tokens e no Figma Variables. |
| F-2 | Tema padrão ao abrir o app? | **(C) Seguir `prefers-color-scheme` do sistema operacional**, com toggle manual disponível para sobrescrever | `next-themes` configurado com `defaultTheme="system"` e `enableSystem`. Preferência do usuário (se explicitada via toggle) persiste sobre a do SO. |
| F-3 | `--muted-foreground` L=48% → L=42%? | **(B) Escurecer para L=42%** | Todo texto — incluindo secundário/placeholder — passa AA (4.5:1) sempre. Aceita leve redução de hierarquia visual em troca de acessibilidade garantida sem exceção. |
| F-4 | Seletor de veículo ativo no header shell? | **(A) Sim — contexto global no header** | Componente novo de "contexto ativo de veículo" (ex: "ABC-1234 — Fiat Strada ▾") visível em todas as telas do shell; Despesas/Manutenções/Multas filtram automaticamente por ele. Requer estado global (provavelmente Zustand, já em uso no `ui-store`) e propagação para as telas dependentes. |
| F-5 | Busca global Command Palette? | **(A) Sim — Command Palette (estilo Linear/Vercel)** | Atalho (ex: `Ctrl+K` / `⌘K`) abre busca global cruzando veículos, despesas, multas etc. Componente novo `CommandPalette` + suporte de busca cross-entidade no backend (API). Maior escopo entre as decisões — deve ser tratado como feature própria dentro da spec, não só um componente de UI. |
| F-6 | Limiar do NavBadge (10 vs 99)? | **"9+" acima de 9** | Badge de contagem nunca exibe mais que "9+", independente do valor real — simplifica layout (nunca precisa de 2+ dígitos variáveis). |

---

## Referências

- [Atomic Design in 2025: From Rigid Theory to Flexible Practice — Maya Gomoniuk, Medium/Bootcamp](https://medium.com/design-bootcamp/atomic-design-in-2025-from-rigid-theory-to-flexible-practice-91f7113b9274)
- [Design Tokens specification reaches first stable version — W3C Design Tokens Community Group, 2025](https://lists.w3.org/Archives/Public/public-design-tokens/2025Oct/0003.html)
- [Dark Mode Design Systems: A Complete Guide to Patterns, Tokens, and Hierarchy — Muzli Blog](https://muz.li/blog/dark-mode-design-systems-a-complete-guide-to-patterns-tokens-and-hierarchy/)
- [Design Tokens — Material Design 3, Google](https://m3.material.io/foundations/design-tokens/overview)
- [UI Color System — GitHub Primer](https://primer.style/foundations/color/overview/)
- [Color System and Design Tokens — Radix UI Themes](https://deepwiki.com/radix-ui/themes/3.1-color-system-and-design-tokens)
- [Badges vs. Pills vs. Chips vs. Tags — Smart Interface Design Patterns (Vitaly Friedman)](https://smart-interface-design-patterns.com/articles/badges-chips-tags-pills/)
- [Sparkline theory and practice — Edward Tufte](https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/)
- [Best Practices for Scaling Sparklines in Dashboards — Perceptual Edge (Stephen Few)](https://www.perceptualedge.com/articles/visual_business_intelligence/best_practices_for_scaling_sparklines.pdf)
- [How Accessibility Standards Can Empower Better Chart Visual Design — Smashing Magazine, 2024](https://www.smashingmagazine.com/2024/02/accessibility-standards-empower-better-chart-visual-design/)
- [The Easy Intro to the APCA Contrast Method](https://git.apcacontrast.com/documentation/APCAeasyIntro.html)
- [APCA Contrast vs WCAG 2: The 2026 Guide — 66 Colorful](https://66colorful.com/blog/apca-contrast/)
- [Implementing Dark Mode and Theme Switching using Tailwind v4 and Next.js — DEV Community](https://dev.to/finfin/implementing-dark-mode-and-theme-switching-using-tailwind-v4-and-nextjs-30f2)
- [Design Tokens That Scale in 2026 (Tailwind v4 + CSS Variables) — Mavik Labs](https://www.maviklabs.com/blog/design-tokens-tailwind-v4-2026/)
- [Better Notification UX for Phones and Tablets — IxDF (Interaction Design Foundation)](https://www.interaction-design.org/literature/article/better-notification-ux-for-phones-and-tablets)
- [Dashboard Design Patterns for Modern Web Apps 2026 — Art of Style Frame](https://artofstyleframe.com/blog/dashboard-design-patterns-web-apps/)
- [SaaS Dashboard Design: Complete B2B Interface Optimization Guide 2025 — Orbix Studio](https://www.orbix.studio/blogs/saas-dashboard-design-b2b-optimization-guide)
- [Unlocking inclusive design: how Primer's color system is making GitHub.com more inclusive — GitHub Blog](https://github.blog/engineering/user-experience/unlocking-inclusive-design-how-primers-color-system-is-making-github-com-more-inclusive/)
