# 🏛️ Regras de UX & Interface - Nave SaaS

**Versão:** 1.0 (Audit-Based)
**Escopo:** Estabilidade visual, Acessibilidade e Estética "Calm UI".

---

## 1. Estabilidade Visual & Camadas

### 1.1 Hierarquia de Z-Index (Escala Semântica)
Evite valores arbitrários (hardcoded). Siga a escala base:
- **Base:** `z-0`
- **Sidebar (Desktop):** `z-30`
- **Sub-Header/Fluid:** `z-40`
- **Header Global/Sticky:** `z-[100]` (Deve sempre sobrepor o conteúdo da página).
- **Popovers/Tooltips:** `z-[150]`
- **Modais/Dialogs:** `z-[200]`
- **Menus Mobile Fullscreen:** `z-[250]`

### 1.2 Tratamento de Camadas (Backdrops)
Todo elemento que "flutua" sobre o conteúdo principal (Dropdowns, Popovers, Buscas expandidas) **DEVE** possuir:
- **Overlay:** `bg-black/10` ou similar para escurecer levemente o fundo.
- **Blur:** `backdrop-blur-[1px]` até `backdrop-blur-sm`.
- **Objetivo:** Isolar o contexto de ação atual e prevenir cliques acidentais em elementos de fundo.

---

## 2. Acessibilidade (WCAG 2.2 AA)

### 2.1 Tooltips vs. Native Titles
- **Regra:** É terminantemente **PROIBIDO** o uso do atributo `title` nativo do HTML para informações críticas ou recorrentes.
- **Implementação:** Use sempre o componente `<Tooltip />` do pacote `@nave/ui`.
- **Justificativa:** Tooltips nativos ignoram o design system, não são estilizados por tema (dark mode) e têm comportamento inconsistente entre navegadores e leitores de tela.

### 2.2 Navegação Mobile context-aware
- **Regra:** Ações globais no mobile (como o menu "Mais") devem abrir **Drawers/Sheets** na mesma tela em vez de navegar para páginas de menu isoladas.
- **Justificativa:** Reduz a carga cognitiva e mantém o estado visual do dashboard ao fundo.

---

## 3. Psicologia das Cores (Anti-Fadiga Visual)

### 3.1 Intensidade em Gráficos
Para dashboards de monitoramento contínuo, a vibração das cores deve ser controlada:
- **Áreas Grandes:** Use opacidade (60% a 80%) ou tokens `-pastel`.
- **Linhas/Strokes:** Podem usar cores 100% sólidas para legibilidade.
- **Status:** Vermelho e Verde puros (`#FF0000`, `#00FF00`) são proibidos em áreas de preenchimento. Use `var(--destructive-pastel)` e `var(--success-pastel)`.

---

## 4. Layout & Grid

### 4.1 Header Solidiness
- O Header principal deve ter fundo sólido ou semitransparente (`bg-background/80`) com blur.
- **Proibido:** Fundo totalmente transparente (`bg-transparent`) que permita leitura de conteúdo passando por trás de fontes/ícones do header.

---
*Última atualização: 15/03/2026*
*Responsável: UX/AI Team*
