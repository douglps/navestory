# Prompt-base para Figma Make — navestory

**Propósito:** prompt reutilizável para o Figma Make gerar telas consistentes com o design system já implementado em `packages/ui`.
**Fonte:** `specs/design-system/INVENTARIO-DESIGN-SYSTEM.md`
**Como usar:** cole o bloco da seção 1 como primeira mensagem em um novo projeto do Figma Make (ele fixa o "sistema" de referência). Nas mensagens seguintes, peça telas específicas usando o vocabulário estabelecido — exemplos na seção 2.

---

## 1. Prompt-base (colar primeiro, uma vez por projeto)

```
Você vai me ajudar a desenhar as telas do navestory, um app de gestão de frota (veículos, despesas, manutenções, multas) mobile-first. Já existe um design system implementado em código que você deve seguir rigorosamente — não invente cores, espaçamentos ou estilos de componente fora do que está descrito abaixo.

## Identidade visual

Paleta "Steel & Sapphire" em OKLCH, tom sóbrio e utilitário (não é um app consumer/lifestyle, é uma ferramenta de gestão).

Cores (converta para sRGB/hex ao aplicar, mantendo a percepção de luminosidade):
- Fundo da página: cinza quase branco (L 98.5%)
- Texto principal: quase preto (L 15%)
- Cartões: cinza muito claro (L 97%), levemente destacado do fundo
- Bordas/divisores: cinza claro (L 90%)
- Texto secundário/placeholder: cinza médio (L 45%)
- Primary (CTAs, links, foco): azul royal
- Secondary: azul-petróleo (mesma luminosidade/saturação do primary, matiz mais verde-azulado)
- Accent: verde (mesma luminosidade/saturação do primary, matiz verde)
- Success: verde; Warning: âmbar; Danger: vermelho; Info: azul claro — cada um com uma versão "pastel" (fundo claro) para Alert/Toast e uma versão "sólida" (ícone/borda/texto)

Regra importante: primary, secondary e accent têm exatamente a mesma luminosidade e saturação entre si — só o matiz muda. Preserve essa regularidade ao gerar variações.

## Tipografia

Escala compacta e funcional: 12px (labels/legendas), 14px (corpo padrão, botões, tabelas), 16px (títulos de card), 18px (títulos de destaque/modal). Pesos: normal para corpo, medium para labels e botões, semibold para títulos.

## Grid e espaçamento

Grid de 8px — todo espaçamento é múltiplo de 8 (8, 12, 16, 24, 32px). Raio de borda: 4px (elementos pequenos como badges), 6px (padrão — botões, inputs, alerts), 8px (cards, modais, popovers), full/pill (tags, presets de filtro).

## Mobile-first e acessibilidade

- Todo elemento clicável/tocável tem altura mínima de 44px em mobile (WCAG touch target).
- Layouts empilham em coluna no mobile e viram grade/linha a partir do breakpoint sm/md.
- Tabelas fazem scroll horizontal em vez de quebrar em mobile.
- Estados de foco sempre visíveis (anel de 2px na cor primary).
- Ícones semânticos (sucesso/aviso/erro/info) são formas simples (círculo, triângulo) com símbolo interno — não usar emoji nem biblioteca de ícones estilizada fora desse padrão para estados semânticos.

## Vocabulário de componentes já existentes (reutilize, não recrie do zero)

- **Button**: variantes default (azul sólido), outline, ghost, destructive (vermelho). Tamanhos sm/md/lg. Estado loading com spinner.
- **Card**: container base com borda sutil, fundo levemente destacado, sombra leve. Paddings sm/md/lg.
- **Table**: cabeçalho com texto secundário, linhas com opção zebra, hover sutil, scroll horizontal em mobile.
- **KpiCard**: cartão compacto (150–220px de largura) com título, ícone decorativo, valor grande, indicador de tendência (seta + % colorido) e mini-gráfico sparkline. Tem estado de loading com skeleton.
- **ChartWrapper**: card com título, subtítulo opcional, slot de ação no canto superior direito, área de gráfico de altura fixa (~256px), com estados de loading e vazio.
- **Tabs**: três estilos — sublinhado, sublinhado com espaçamento diferente, ou "pills" (fundo cinza com aba ativa destacada em branco). Suporta ícone e badge numérico por aba.
- **Breadcrumb**: separador "/", item atual em negrito sem link, colapsa itens do meio em "…" quando há muitos níveis.
- **Steps**: indicador de progresso horizontal com círculos conectados — estados completo (verde, check), atual (contorno azul), futuro (contorno cinza), erro (vermelho, X).
- **Combobox**: campo de seleção com busca interna, popover com lista de opções (pode ter ícone e descrição por item), estados de loading e erro.
- **DateRangePicker**: dois campos de data lado a lado (empilhados em mobile), com botões de atalho tipo pill acima ("Últimos 7 dias", "Este mês").
- **FileUpload**: zona de arraste com borda tracejada, ícone de clipe, muda de cor ao arrastar arquivo, lista os arquivos selecionados abaixo com opção de remover.
- **Alert**: faixa colorida na borda esquerda + fundo pastel da mesma cor, ícone semântico, título opcional em negrito, texto, ação opcional e botão de fechar opcional. Variantes info/success/warning/error.
- **Toast**: mesmo padrão visual do Alert, mas flutuante — centralizado no topo em mobile, canto inferior direito em desktop, some sozinho após alguns segundos (a menos que marcado como persistente).
- **EmptyState**: ícone decorativo grande, título, descrição opcional, botão de ação primário e opcional ação secundária. Três tamanhos, do inline (dentro de uma tabela vazia) ao tela-cheia.
- **Dialog**: modal centralizado, overlay escurecido com leve desfoque, título e descrição no topo, botões de ação no rodapé (empilhados em mobile, lado a lado em desktop), botão de fechar opcional no canto.
- **CurrencyInput / OdometerInput**: campos de texto numéricos com máscara — moeda (R$ 1.234,56) e odômetro (123.456 km), sem estilo de container próprio, herdam o padrão de input da tela.

## Tom geral

Interface densa em informação mas organizada, prioriza clareza e leitura rápida de números (KPIs, tabelas). Evite decoração gratuita — cada cor tem significado semântico (sucesso/alerta/erro/info), não é usada por estética.
```

---

## 2. Como pedir telas específicas (depois do prompt-base)

Peça telas reaproveitando os nomes de componentes do prompt-base, para o Figma Make manter consistência entre gerações. Exemplos:

- _"Crie a tela de Dashboard: header com nome do usuário e veículo ativo, uma grade 2×2 de KpiCard (combustível, manutenção, multas, quilometragem do mês), um ChartWrapper com gráfico de gastos mensais, e uma Table com as últimas 5 despesas."_
- _"Crie a tela de listagem de Despesas: Breadcrumb no topo (Frota / Veículo / Despesas), filtros com DateRangePicker e Combobox de categoria, Table com padrão two-row (data, detalhes em 2 linhas, valor, ações), EmptyState quando não há resultados."_
- _"Crie o fluxo de cadastro de veículo em 3 passos usando o componente Steps (Dados do veículo, Documentos, Confirmação), cada passo em um Card, com FileUpload no passo de documentos."_
- _"Crie o modal de confirmação de exclusão usando Dialog: título 'Excluir despesa?', descrição de aviso, botão destructive 'Excluir' e botão outline 'Cancelar'."_

Ao revisar o resultado, confira sempre contra a seção 3.6 (Pontos de Atenção) do `INVENTARIO-DESIGN-SYSTEM.md` — são os detalhes que o Figma Make mais tende a errar (largura do KpiCard, posição do Toast, ícones semânticos como SVG simples, Tabs sem painel de conteúdo embutido).

---

## 3. Depois de gerar no Figma Make

1. Exporte/anote os valores finais de cor em hex (o Figma Make converte OKLCH internamente) e confira se batem com `packages/ui/src/tokens/colors.ts` — se divergiu, ajuste manualmente para não quebrar a rastreabilidade com o código.
2. Use o `design-system` agent para revisar telas geradas contra este inventário antes de considerar aprovado.
3. Novos padrões de tela que não existiam em `packages/ui` (ex: um layout de dashboard específico) devem virar componente novo no código depois — o Figma Make é ponto de partida visual, não substitui a implementação real.
