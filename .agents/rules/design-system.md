---
trigger: always_on
---

# 🎨 Design System Rules - Nave SaaS (v3.1 - Calm UI)

Projeto: Nave-SaaS | Stack: Next.js 15, Tailwind, Monorepo
Foco: Dashboards de Monitoramento Contínuo (Anti-Fadiga Visual)
Score Alvo: 90+/100 (Lighthouse + A11y WCAG 2.2 AA)

---

### 🚫 PROIBIDO - Hardcoded Values & Anti-Patterns

| Tipo               | Exemplo Proibido               | Substituição Obrigatória                    | Justificativa              |
| :----------------- | :----------------------------- | :------------------------------------------ | :------------------------- |
| **Cores Hex/RGB**  | `#FF0000`, `rgb(0,0,0)`        | `var(--primary)`, `var(--surface)`          | Manutenção e Dark Mode     |
| **Cores Tailwind** | `bg-slate-900`, `text-red-500` | `bg-surface`, `text-danger`                 | Consistência Semântica     |
| **Fontes**         | `font-family: 'Inter'`         | `var(--font-family-base)`                   | Performance (next/font)    |
| **Tamanhos Fixos** | `h-[600px]`, `font-size: 14px` | `h-map-container`, `text-body`              | Responsividade e Tokens    |
| **Ícones SVG**     | `<svg>...</svg>` inline        | `<Icon icon={LucideIcon} />`                | Tree-shaking e A11y        |
| **Status Full**    | `bg-danger`, `bg-success`      | `bg-danger-pastel`, `bg-success-pastel`     | **Prevenção de Ansiedade** |
| **Blur Arbitrário**| `blur-[12px]`                  | `var(--blur-overlay)`, `var(--blur-surface)`| Consistência de profundidade |

---

### ✅ OBRIGATÓRIO

#### 1. Tokens CSS & OKLCH (Espaço de Cor Perceptual)

- **Definição:** Todas as cores em `apps/web/app/globals.css` usando formato **OKLCH**.
- **Consumo:** Componentes usam apenas variáveis semânticas (`var(--on-surface)`).
- **Fontes:** Injetadas via `next/font` e expostas como `--font-family-base` e `--font-family-mono`.

#### 2. Estrutura de Pastas (Monorepo)

```text
packages/ui/src/
├── components/     # UI Agnóstica (Button, Icon, Typography, Card, Badge)
├── hooks/          # Hooks de UI (useTheme, useMediaQuery)
└── utils/          # Utilitários (cn(), mergeProps)

apps/web/
├── components/     # Domínio Específico (VehicleMap, FleetTimeline, FleetStatsCard)
├── app/            # Rotas e Layouts
└── globals.css     # Definição de Tokens (Cores, Fontes, Espaçamento)
```

> **Regra de Ouro:** Se o componente não tem lógica de negócio específica de "Frota/Veículos", ele **DEVE** residir em `packages/ui`.

#### 3. Tipografia Semântica & Dados Numéricos

Nunca use tamanhos arbitrários. Use a escala baseada em propósito.

| Token       | Tamanho          | Peso | Uso                    | Classe Tailwind |
| :---------- | :--------------- | :--- | :--------------------- | :-------------- |
| **Caption** | 0.7rem (~11px)   | 600  | Metadados, timestamps  | `text-caption`  |
| **Label**   | 0.75rem (~12px)  | 600  | Labels, badges         | `text-label`    |
| **Body**    | 0.875rem (~14px) | 400  | Texto corrido, tabelas | `text-body`     |
| **Lead**    | 1rem (~16px)     | 400  | Destaques              | `text-lead`     |
| **Title**   | 1.5rem (~24px)   | 700  | Títulos de seção       | `text-title`    |
| **KPI**     | 2rem (~32px)     | 800  | Números grandes        | `text-kpi`      |

- **Dados Numéricos:** KPIs e colunas numéricas **DEVEM** usar `font-mono` e `tabular-nums` para alinhamento vertical perfeito.
- **Acessibilidade:** Contraste mínimo AA (4.5:1). Texto legível mín. 12px.

#### 4. Iconografia Unificada

- **Lib:** Exclusivamente `lucide-react`.
- **Implementação:** Sempre via `<Icon />` em `packages/ui`.
- **A11y:** Decorativos = `aria-hidden="true"`. Funcionais = `aria-label`.

---

### 🧠 Psicologia das Cores & Aplicação (Calm UI)

Para dashboards de monitoramento contínuo, cores vibrantes em grandes áreas geram ansiedade. Aplique a **Regra de Intensidade**:

| Contexto               | Intensidade                  | Implementação Tailwind                      | Exemplo de Uso                        |
| :--------------------- | :--------------------------- | :------------------------------------------ | :------------------------------------ |
| **Ação Imediata**      | **Alta (100%)**              | `bg-danger`, `text-danger-foreground`       | Botão "Emergência", Modal Bloqueante. |
| **Status Persistente** | **Pastel (Fundo + Texto)**   | `bg-danger-pastel`, `text-danger-pastel-fg` | Badges, Alertas, Cards Financeiros.   |
| **Gráficos/Histórico** | **Média/Baixa**              | `opacity-70` ou tokens `--muted`            | Barras históricas, rotas passadas.    |
| **Alerta Ativo**       | **Alta (Ícone)**             | `text-danger` + Animação                    | Ícone de alerta em tempo real.        |

> **Regra de Ouro (Pastel-First):** Para qualquer indicador de status (Alerta, Aviso, Finanças), prefira sempre a variante **Pastel**. Cores vibrantes sólidas são reservadas para interações críticas momentâneas.

---

### 🎨 Sistema de Cores (OKLCH) - Definição Base

```css
:root {
  /* Fontes */
  --font-family-base: 'Inter', system-ui, sans-serif;
  --font-family-mono: 'JetBrains Mono', monospace;

  /* Surface & Text */
  --surface: oklch(0.98 0.01 250);
  --on-surface: oklch(0.2 0.02 250); /* Texto Principal */
  --on-surface-muted: oklch(0.45 0.02 250); /* Texto Secundário */

  /* Brand */
  --primary: oklch(0.65 0.2 250); /* Azul Vibrante */
  --primary-foreground: oklch(0.97 0.02 250);

  /* Status Pastéis (Calm UI - Padrão para Sistema) */
  --success-pastel: 0.98 0.05 150;
  --success-pastel-foreground: 0.45 0.15 150;
  --warning-pastel: 0.98 0.05 85;
  --warning-pastel-foreground: 0.45 0.15 85;
  --destructive-pastel: 0.98 0.05 25;
  --destructive-pastel-foreground: 0.45 0.15 25;
  --info-pastel: 0.98 0.05 240;
  --info-pastel-foreground: 0.45 0.15 240;

  /* Status Vibrantes (Uso Restrito/Ícones) */
  --danger: 0.55 0.2 25;
  --success: 0.65 0.15 145;
  --warning: 0.75 0.15 85;

  /* Dimensões Semânticas */
  --height-map-container: 600px;

  /* Blur Semântico (v3.1) */
  --blur-overlay: 4px;   /* Popovers, tooltips */
  --blur-surface: 24px;  /* Cards, sidebar */
  --blur-modal: 40px;    /* Dialogs, fullscreen */
}

.dark {
  --surface: oklch(0.15 0.02 250);
  --on-surface: oklch(0.95 0.01 250);
  /* Ajuste de contraste para dark mode */
  --on-surface-muted: oklch(0.7 0.02 250);
}
```

### Glassmorphism

Implementado via `.glass-card` e `.glass-sidebar`:
- **Opacidade:** `40-60%`.
- **Blur:** Mapeado para os tokens semânticos (`var(--blur-surface)` em cards, `var(--blur-modal)` em dialogs).
- **Borda:** Borda sutil de `1px` para definição de volume.

---

### 🏎️ Fleet Management Custom Tokens

```css
:root {
  --fleet-cerulean: oklch(0.65 0.18 220);  /* Azul principal de frota */
  --fleet-emerald:  oklch(0.65 0.15 145);  /* Sucesso operacional */
  --fleet-tangerine: oklch(0.75 0.15 55);  /* Atenção necessária */
}
```

---

### 📱 Mobile-First Strategy

- Gestores de frota acessam via mobile em aproximadamente 67% dos casos.
- **Widgets:** Devem colapsar em stack vertical no mobile.
- **Interações:** Touch targets mínimos de `44x44px` (ver `.agents/rules/accessibility.md`).

---

### 🔄 Fluxo de Trabalho & Auditoria

#### Checklist de Criação

1. [ ] **Cores:** Usa `var(--token)` ou classes mapeadas? Fundos de status usam `/10`?
2. [ ] **Fontes:** Usa `font-sans` ou `font-mono` (sem hardcode)?
3. [ ] **Tamanho:** Usa tokens semânticos (`text-body`, `h-map-container`)?
4. [ ] **Ícones:** Usa `<Icon />` wrapper?
5. [ ] **Local:** Está no pacote correto (`ui` vs `web`)?
6. [ ] **A11y:** Contraste validado? Aria-labels presentes?
7. [ ] **Blur:** Usa tokens `--blur-*` (não valores arbitrários)?

#### Script de Auditoria (Detecção de Dívida)

```bash
# Detectar cores hex
rg '#[0-9a-fA-F]{3,8}' --type ts --type tsx -n

# Detectar tamanhos fixos (exceção para tokens customizados)
rg "h-\[[0-9]+px\]" --type tsx -n | grep -v "map-container"

# Detectar svg inline
rg "<svg" --type tsx -n | grep -v "Icon"

# Detectar blur arbitrário
rg "blur-\[[0-9]+px\]" --type tsx -n
```

---

### 📚 Documentação & Qualidade

- **JSDoc:** Obrigatório em componentes exportados.
- **Storybook:** Mínimo 3 stories (Default, Dark, Estado Crítico).
- **Performance:** `next/font` (CLS zero), lazy load estratégico.

---

Última atualização: 2026-07-13 (reconciliação de documentação dispersa; incorporação de blur tokens, fleet tokens, Glassmorphism e mobile-first stat de docs/ui-design/design-system.md)
Owner: @design-system-team
Status: Ativo (v3.1 - Calm UI)
