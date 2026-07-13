# ♿ Accessibility Rules - Nave SaaS

**Versão:** 1.1 | **Standard:** WCAG 2.2+ AA | **Compliance:** European Accessibility Act 2025

---

## 📊 Status Atual (Atualizado 15/03/2026)

| Métrica                     | Status                        | Meta         |
| --------------------------- | ----------------------------- | ------------ |
| ARIA labels em botões ícone | ✅ Implementado               | 100%         |
| Navegação por teclado       | ✅ Implementado (SkipLink)    | 100%         |
| Contraste de cores          | ✅ OKLCH validado             | 4.5:1 mínimo |
| Focus ring visível          | ✅ Configurado (:focus-visible)| 100%         |
| High Contrast Mode          | ✅ Suporte em globals.css     | Pass         |

---

## ⌨️ Navegação por Teclado

### Skip Link
O sistema obriga o uso de um Skip Link no topo do `layout.tsx` para permitir que usuários de teclado saltem navegações repetitivas.
- **Target:** `<main id="main-content" tabIndex={-1}>`

### Focus State (WCAG 2.2)
Implementado globalmente via `:focus-visible` em `globals.css`:
```css
:focus-visible {
  outline: none;
  ring: 2px;
  ring-color: var(--primary);
  ring-offset: 2px;
  ring-offset-color: var(--background);
}
```

---

## 🎨 Contraste e Modos

### High Contrast Mode
Suporte obrigatório via media query `@media (prefers-contrast: high)`.
- **Primary Contrast:** Aumentado para 7:1+ em modo de alto contraste.
- **Borders:** Reforçadas para definição clara de componentes.

### Suporte P3 (Telas Modernas)
Cores otimizadas para gamut P3, garantindo que o brilho perceptual permaneça constante mesmo em telas de alta performance sem comprometer a acessibilidade.

---

## 🧪 Testes de Acessibilidade

### Checklist de Review
Antes de merge, verificar:
- [ ] `Tab` percorre todos os elementos interativos.
- [ ] `Enter` e `Space` ativam botões e links.
- [ ] `Escape` fecha modais e popovers.
- [ ] O anel de foco (Focus Ring) é visível e nítido em todos os elementos.
- [ ] O Skip Link aparece no primeiro `Tab`.

---
*Última atualização: 15/03/2026*
