---
trigger: always_on
---

# ♿ Accessibility Rules - Nave SaaS

**Versão:** 1.1 | **Standard:** WCAG 2.2+ AA | **Compliance:** European Accessibility Act 2025

---

## 📊 Status de Implementação (Checklist — a implementar)

> Estado real do projeto: 0% implementado em 2026-07-13. Tabela mantida como checklist de progresso.

| Métrica                     | Status              | Meta         |
| --------------------------- | ------------------- | ------------ |
| ARIA labels em botões ícone | pendente            | 100%         |
| Navegação por teclado       | pendente            | 100%         |
| Contraste de cores          | pendente            | 4.5:1 mínimo |
| Screen reader test          | pendente            | Pass         |
| Focus visible               | pendente            | 100%         |
| High Contrast Mode          | pendente            | Pass         |
| Suporte P3 (telas modernas) | pendente            | Pass         |

---

## 🎯 Botões e Interações

### Botões com Ícone

```tsx
/* ✅ CORRETO */
<Button aria-label="Adicionar veículo">
  <PlusIcon />
</Button>

/* ❌ ERRADO */
<Button>
  <PlusIcon />
</Button>
```

### Todos os Elementos Interativos

- [ ] `aria-label` ou `aria-labelledby` descritivo
- [ ] Focus ring visível (`:focus-visible`)
- [ ] Touch target mínimo 44x44px (mobile)
- [ ] Cursor pointer em hover

### Estados de Interação

```css
/* Focus State — globals.css (CSS puro) */
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Equivalente Tailwind em componente: focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 */

/* Hover State */
:hover {
  background-color: var(--surface-hover);
}

/* Disabled State */
:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## 📊 Dados e Tabelas

### Tabelas Acessíveis

```tsx
/* ✅ CORRETO */
<table aria-label="Frota de veículos">
  <caption>Veículos por status</caption>
  <thead>
    <tr>
      <th scope="col">Veículo</th>
      <th scope="col">Status</th>
      <th scope="col">Última Atualização</th>
    </tr>
  </thead>
  <tbody>...</tbody>
</table>

/* ❌ ERRADO */
<table>
  <tr>
    <td>Veículo</td>
    <td>Status</td>
  </tr>
</table>
```

### Status Colors

```tsx
/* ✅ CORRETO - Texto + Cor */
<Badge variant={status === 'online' ? 'success' : 'danger'}>
  {status === 'online' ? '✓ Online' : '✕ Offline'}
</Badge>

/* ❌ ERRADO - Apenas cor */
<Badge variant={status === 'online' ? 'green' : 'red'} />
```

---

## 🎨 Contraste e Modos

### Requisitos WCAG 2.2+

| Tipo de Texto        | Ratio Mínimo | Token                 |
| -------------------- | ------------ | --------------------- |
| Texto normal (<18px) | 4.5:1        | `--on-surface`        |
| Texto grande (≥18px) | 3:1          | `--on-surface-muted`  |
| Texto decorativo     | N/A          | `--on-surface-subtle` |

### Tokens de Contraste Aprovados

```css
:root {
  --on-surface: oklch(0.2 0.02 250); /* 12.5:1 em --surface */
  --on-surface-muted: oklch(0.4 0.02 250); /* 6.2:1 em --surface */
  --on-surface-subtle: oklch(0.6 0.02 250); /* 3.1:1 em --surface */
}

.dark {
  --on-surface: oklch(0.95 0.01 250); /* 14.1:1 em --surface */
  --on-surface-muted: oklch(0.7 0.01 250); /* 7.8:1 em --surface */
}
```

### High Contrast Mode

Suporte obrigatório via media query `@media (prefers-contrast: high)`.
- Primary Contrast: aumentado para 7:1+ em modo de alto contraste.
- Borders: reforçadas para definição clara de componentes.

### Suporte P3 (Telas Modernas)

Cores otimizadas para gamut P3, garantindo que o brilho perceptual permaneça constante mesmo em telas de alta performance sem comprometer a acessibilidade. Os tokens OKLCH já garantem isso nativamente — nenhuma regra extra necessária além de usar os tokens canônicos.

### Validação Automática

```bash
# Instalar axe-core
npm install -D axe-core @axe-core/react

# Configurar em testes
import { axe } from 'vitest-axe'

it('should have no accessibility violations', async () => {
  const { container } = render(<Component />)
  expect(await axe(container)).toHaveNoViolations()
})
```

---

## ⌨️ Navegação por Teclado

### Requisitos

- [ ] Tab navega todos elementos interativos
- [ ] Shift+Tab navega reverso
- [ ] Enter/Space ativa botões
- [ ] Escape fecha modais/dropdowns
- [ ] Setas navegam em listas/menus

### Focus Trap em Modais

```tsx
/* ✅ CORRETO */
<Modal>
  <FocusTrap>
    <ModalContent>
      <ModalClose /> {/* Escape fecha */}
    </ModalContent>
  </FocusTrap>
</Modal>
```

### Skip Links

```tsx
/* ✅ CORRETO - No início do body */
<a href="#main-content" className="skip-link">
  Pular para conteúdo principal
</a>

<main id="main-content" tabIndex={-1}>...</main>
```

---

## 📱 Mobile Accessibility

### Touch Targets

```css
/* Mínimo 44x44px para touch */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

### Gestos

- [ ] Swipe actions com alternativa em botão
- [ ] Pinch-to-zoom não bloqueado
- [ ] Long-press com feedback visual

---

## 🧪 Testes de Acessibilidade

### Vitest + axe-core

```typescript
// components/ui/button.test.tsx
import { render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { Button } from './button'

describe('Button', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<Button>Click</Button>)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('should be keyboard accessible', async () => {
    render(<Button>Click</Button>)
    const button = screen.getByRole('button')
    button.focus()
    expect(document.activeElement).toBe(button)
  })
})
```

### Checklist de Teste Manual

- [ ] Navegar apenas com teclado (Tab, Enter, Escape)
- [ ] Testar com screen reader (NVDA/VoiceOver)
- [ ] Verificar contraste com ferramenta (axe DevTools)
- [ ] Testar zoom 200%
- [ ] Testar em mobile (touch targets)

---

## ✅ Checklist de Review (antes de merge)

- [ ] ARIA labels em todos botões com ícone
- [ ] Focus visible em todos interativos
- [ ] Contraste 4.5:1 mínimo (texto normal)
- [ ] Navegação por teclado testada
- [ ] Screen reader compatibility verificada
- [ ] Touch targets 44x44px (mobile)
- [ ] Skip Link aparece no primeiro Tab

---

**Última atualização:** 2026-07-13 (reconciliação de documentação dispersa)
**Owner:** @a11y-team
