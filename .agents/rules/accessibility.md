---
trigger: always_on
---

# ♿ Accessibility Rules - Nave SaaS

**Versão:** 1.0 | **Standard:** WCAG 2.2+ AA | **Compliance:** European Accessibility Act 2025

---

## 📊 Status Atual (Auditoria 13/03/2026)

| Métrica                     | Status                        | Meta         |
| --------------------------- | ----------------------------- | ------------ |
| ARIA labels em botões ícone | ❌ Faltante (btn-plus-action) | 100%         |
| Navegação por teclado       | ⚠️ Não testado                | 100%         |
| Contraste de cores          | ⚠️ OKLCH ajuda                | 4.5:1 mínimo |
| Screen reader test          | ❌ Não avaliado               | Pass         |
| Focus visible               | ⚠️ Parcial                    | 100%         |

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
/* Focus State */
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

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

## 🎨 Contraste de Cores

### Requisitos WCAG 2.2+

| Tipo de Texto        | Ratio Mínimo | Token                 |
| -------------------- | ------------ | --------------------- |
| Texto normal (<18px) | 4.5:1        | `--on-surface`        |
| Texto grande (≥18px) | 3:1          | `--on-surface-muted`  |
| Texto decorativo     | N/A          | `--on-surface-subtle` |

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

<main id="main-content">...</main>
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

## ✅ Checklist de Review

Antes de merge, verificar:

- [ ] ARIA labels em todos botões com ícone
- [ ] Focus visible em todos interativos
- [ ] Contraste 4.5:1 mínimo (texto normal)
- [ ] Navegação por teclado testada
- [ ] Screen reader compatibility verificada
- [ ] Touch targets 44x44px (mobile)

---

**Última atualização:** 13/03/2026  
**Próxima review:** 13/06/2026  
**Owner:** @a11y-team

```

```
