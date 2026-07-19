---
name: nave-ui-pwa
description: Especialista em UX Mobile-First e PWA para o projeto Nave.
---

# 📱 Requisitos de Interface Nave

## 📏 Touch-Friendly (Obrigatório)

- **Botões:** Mínimo 44px de altura.
- **Áreas de Toque:** Mínimo 48x48px.
- **Inputs:** Fonte mínima 16px (para evitar zoom automático no iOS).
- **Espaçamento:** Múltiplos de 8px.

## ⚡ Performance Lighthouse

- **FCP:** < 1.8s | **LCP:** < 2.5s.
- Gere sempre componentes com `React.lazy` ou imports dinâmicos para manter o bundle < 200KB.

## 🛠️ PWA Assets

- Sempre que criar uma nova rota, lembre o usuário de registrar no `service-worker`.
- Garanta que o `manifest.json` tenha as cores da marca Nave.

## 🎨 Paleta de Cores Nave

> **Fonte de verdade (desde SPEC-20260525-001, T8.1 rodada 1, 2026-07-19):**
> `packages/ui/src/tokens/colors.ts`, aplicada em `apps/web/tailwind.config.ts`/`globals.css`
> como classes Tailwind reais (`bg-primary`, `text-success`, `bg-danger/10` etc. — com
> modificador de opacidade funcionando). Os valores abaixo já eram esta paleta antes de
> existir token; agora são consumíveis via classe, não só via variável solta.

### Cores Primárias

- **Primary (Ação):** `oklch(0.556 0.15 260)` (Azul Nave) — classe `bg-primary`/`text-primary`
- **Secondary (Secundário):** `oklch(0.556 0.15 200)` (Azul-Cinza) — classe `bg-secondary`
- **Accent (Destaque):** `oklch(0.556 0.15 140)` (Ciano) — classe `bg-accent`

### Cores de Status

Cada status tem um tom **solid** (ícone/borda/texto, contraste suficiente sobre fundo claro) e um tom **pastel** (fundo de alerta/badge), mesmo matiz nos dois. Nome do token é **`danger`**, não `error` (`error` só aparece como valor da prop `variant` do componente `Alert`, que internamente usa o token `danger`).

- **Success:** `bg-success`/`text-success` (solid) · `bg-success-pastel` (fundo)
- **Warning:** `bg-warning`/`text-warning` (solid) · `bg-warning-pastel` (fundo)
- **Danger:** `bg-danger`/`text-danger` (solid) · `bg-danger-pastel` (fundo)
- **Info:** `bg-info`/`text-info` (solid) · `bg-info-pastel` (fundo)

### Cores Neutras

- **Background:** `oklch(0.985 0 0)` (Branco Suave) — classe `bg-background`
- **Foreground:** `oklch(0.15 0 0)` (Cinza Escuro) — classe `text-foreground`
- **Card:** `oklch(0.97 0 0)` (Branco Gelo) — classe `bg-card`

### Regras de Uso

1. **Botões de Ação:** Use sempre `primary` (componente `Button` de `packages/ui`, variant `default`).
2. **Alertas e Pendências:** Use `warning` ou `danger` (nunca vermelho puro tipo `red-600`).
3. **Valores Negativos:** Use `text-danger`.
4. **Fundo:** Evite branco puro (`#fff`). Use `bg-background`/`bg-card` para conforto visual.
5. **branco/preto:** Não use branco puro (`#fff`) nem preto puro (`#000`). Use `background`/`foreground`/`muted` para garantir contraste e legibilidade.

## Ícones

> **Decisão vigente (SPEC-20260525-001 §4.3, revisada 2026-07-19 após pesquisa de acessibilidade — WCAG SC 1.1.1/H86):** `lucide-react` **não é usado neste projeto** — nunca foi instalado e a spec `approved` descartou-o explicitamente. Abordagem híbrida:

- **Ícone decorativo** (reforço visual, informação já carregada pelo texto ao lado — ex: ícone de `KpiCard`, `Tabs`, `EmptyState`, `Combobox`): prop `icon?: React.ReactNode`, tipicamente emoji.
- **Ícone semântico** (estado que precisa ser inequívoco entre plataformas — ex: variante do `Alert`, indicador de conclusão/erro do `Steps`): SVG fixo embutido no próprio componente (`aria-hidden="true"`, ~1KB), não trocável via prop; o significado real é carregado pelo texto (`role="status"`/`title`), não pelo ícone isolado.
- Mantenha consistência de tamanho/estilo dentro de cada categoria; use ícones/fundos alinhados à paleta de cores Nave.

## Componentes

> **Decisão vigente (SPEC-20260525-001 §1, revisada 2026-07-19):** `shadcn/ui` **não é uma dependência instalada** neste projeto — é usado só como **referência visual** ao desenhar os componentes. A implementação real é 100% primitivos headless `@radix-ui/react-*` (+ `cmdk` para `Combobox`), construídos em `packages/ui/src/components/` com `class-variance-authority` (CVA) para variantes, evitando uma 2ª árvore de dependências de composição junto de `@radix-ui/react-dialog`/`vaul` já em produção.

- Componentes-base já disponíveis em `packages/ui`: `Button`, `Card`, `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell` (ver `matrices/rastreabilidade.md`, entrada `SPEC-20260525-001`, para o que já existe vs. o que ainda está `⏳`).
- Mantenha consistência de tamanho/estilo/contraste; use os tokens de cor acima, nunca valor solto (`className="text-[#f00]"` ou equivalente).
- Antes de duplicar um padrão visual novo (botão, card, tabela, badge, alerta), verifique se já existe em `packages/ui` — a spec §10 lista a ordem de implementação dos componentes restantes.
