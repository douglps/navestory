---
trigger: always_on
---

# 🧪 Testing Rules - Nave SaaS

**Versão:** 1.1 | **Stack:** Vitest (web/ui/validators) + Jest (api) + Playwright + axe-core | **Meta:** 88% cobertura unitário (fonte única: `specs/TESTS_SPEC.md`)

> A tabela de "Status Atual" e a auditoria datada 13/03/2026 foram removidas nesta reconciliação (Tarefa T0.6 de `docs/IMPLEMENTATION_STRATEGY.md`): eram resíduo de um ciclo anterior/diferente deste greenfield e não refletiam o estado real do projeto (0% de código implementado até 2026-07-13). O gate de cobertura real está ativo em CI desde a Tarefa T0.5 (`.github/workflows/ci.yml`, job "Test").

---

## 🛠️ Testing Stack Aprovado

| Tipo      | Ferramenta | Versão | Context7 ID               |
| --------- | ---------- | ------ | ------------------------- |
| Unit      | Vitest     | 2.0+   | `/vitest-dev/vitest`      |
| E2E       | Playwright | 1.40+  | `/microsoft/playwright`   |
| A11y      | axe-core   | 4.8+   | `/dequelabs/axe-core`     |
| Visual    | Chromatic  | 8.0+   | `/chromaui/chromatic-cli` |
| Storybook | Storybook  | 8.0+   | `/storybookjs/storybook`  |
| Coverage  | v8 (Node)  | nativo | provider nativo do V8/Node — sem Istanbul |

---

## 📦 Componentes UI

### Requisitos Mínimos

- [ ] `.test.tsx` com Vitest + Testing Library
- [ ] `.stories.tsx` para Storybook
- [ ] Cobertura mínima 88% (gate global de CI)
- [ ] axe-core sem violações críticas

### Estrutura de Arquivos

```
packages/ui/src/components/button/
├── button.tsx          # Componente
├── button.test.tsx     # Testes unitários
├── button.stories.tsx  # Storybook stories
├── button.types.ts     # TypeScript types
└── index.ts            # Exports
```

### Exemplo de Teste Unit

```typescript
// packages/ui/src/components/button/button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { Button } from './button'

describe('Button', () => {
  it('should render correctly', () => {
    render(<Button>Click</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click')
  })

  it('should have no accessibility violations', async () => {
    const { container } = render(<Button>Click</Button>)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should be keyboard accessible', async () => {
    render(<Button>Click</Button>)
    const button = screen.getByRole('button')
    button.focus()
    expect(document.activeElement).toBe(button)
    fireEvent.keyDown(button, { key: 'Enter' })
  })
})
```

---

## 📱 Responsive Tests

### Breakpoints Obrigatórios

| Breakpoint | Width  | Teste          |
| ---------- | ------ | -------------- |
| Mobile     | 344px  | ✅ Obrigatório |
| Tablet     | 768px  | ✅ Obrigatório |
| Desktop    | 1280px | ✅ Obrigatório |
| Large      | 1920px | ⚠️ Opcional    |

### Exemplo de Teste Responsivo

```typescript
// components/ui/stats-card.test.tsx
import { render, screen } from '@testing-library/react'
import { StatsCard } from './stats-card'

describe('StatsCard - Responsive', () => {
  it('should render 4 columns on desktop', () => {
    render(<StatsCard value="24" label="Veículos" />)
    expect(screen.getByLabelText('Veículos')).toHaveClass('grid-cols-4')
  })

  it('should render 2 columns on mobile', () => {
    render(<StatsCard value="24" label="Veículos" />, {
      viewport: { width: 375, height: 667 }
    })
    expect(screen.getByLabelText('Veículos')).toHaveClass('grid-cols-2')
  })
})
```

---

## ♿ Accessibility Tests

### axe-core Integration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
    environment: 'jsdom',
  },
});

// tests/setup.ts
import { setConfig } from 'vitest-axe';

setConfig({
  rules: {
    'color-contrast': { enabled: true },
    'aria-label': { enabled: true },
    'keyboard-nav': { enabled: true },
  },
});
```

### Checklist de Teste A11y

- [ ] Contraste 4.5:1 mínimo (texto normal)
- [ ] Navegação por teclado em todos interativos
- [ ] ARIA labels em botões com ícone
- [ ] Focus visible em todos elementos
- [ ] Screen reader compatibility (NVDA/VoiceOver)
- [ ] Touch targets 44x44px (mobile)

---

## 🚀 E2E Tests (Playwright)

### Fluxos Críticos para E2E

| Fluxo           | Prioridade | Status |
| --------------- | ---------- | ------ |
| Login/Logout    | 🔴 Alta    | ❌     |
| Dashboard Load  | 🔴 Alta    | ❌     |
| Vehicle Filter  | 🟡 Média   | ❌     |
| Alert Dismiss   | 🟡 Média   | ❌     |
| Map Interaction | 🟢 Baixa   | ❌     |

### Exemplo de Teste E2E

```typescript
// e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should load dashboard with KPI cards', async ({ page }) => {
    await expect(page.getByLabelText('Veículos Ativos')).toBeVisible();
    await expect(page.getByLabelText('Veículos Offline')).toBeVisible();
  });

  test('should filter vehicles by status', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Status' }).selectOption('online');
    await expect(page.getByText('24 veículos online')).toBeVisible();
  });

  test('should be keyboard accessible', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
  });
});
```

---

## 📊 Coverage Requirements

### Meta única: 88% global por workspace

O breakdown anterior por tipo de código (UI 80%/Hooks 90%/Utils 95%/Pages 60%/E2E 40%) foi **removido** nesta reconciliação: o gate real implementado em CI (`jest.config.js` em `apps/api`, `vitest.config.ts` em `apps/web`, `packages/ui`, `packages/validators`) aplica um único threshold global de **88%** (statements/branches/functions/lines) por workspace — não há mecanismo de enforcement diferenciado por camada hoje. Se um refinamento por camada for reintroduzido no futuro, deve nascer como mudança de ferramenta/config real (não como tabela aspiracional desacompanhada de gate), e citada aqui só depois de implementada.

Arquivos de wiring/composição sem lógica de negócio (`layout.tsx`, `page.tsx` do App Router, barrels `index.ts`, guards/strategies stub de 1 linha) são excluídos da coleta de cobertura — consistente com "código trivial sem lógica" em `specs/TESTS_SPEC.md` § O que NÃO Testar.

### Configuração real (provider v8, não Istanbul)

O provider efetivamente usado é **v8** (nativo do V8/Node, mais rápido que Istanbul e sem necessidade de instrumentação via Babel). Ver `apps/web/vitest.config.ts` como referência canônica:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'lcov'],
      exclude: ['src/app/layout.tsx', 'src/app/page.tsx', 'next-env.d.ts', '**/*.spec.tsx', '**/*.config.*'],
      thresholds: {
        lines: 88,
        statements: 88,
        functions: 88,
        branches: 88,
      },
    },
  },
});
```

Para `apps/api` (Jest), o equivalente é `coverageThreshold.global` em `jest.config.js`, com `coveragePathIgnorePatterns` cobrindo `main.ts`, `*.module.ts` e stubs de auth sem lógica.

---

## 📚 Storybook Requirements

### Stories Obrigatórias

- [ ] 1 story por variante (size, color, state)
- [ ] Dark mode story para todos componentes
- [ ] Interactive controls (args)
- [ ] A11y addon configurado
- [ ] Docs page com JSDoc

### Exemplo de Story

```typescript
// packages/ui/src/components/button/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: true }],
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: 'Click me',
    variant: 'primary',
    size: 'md',
  },
};

export const DarkMode: Story = {
  args: {
    children: 'Click me',
    variant: 'primary',
  },
  parameters: {
    themes: { theme: 'dark' },
  },
};
```

---

## ✅ Checklist de Review

Antes de merge, verificar:

- [ ] Testes unitários criados para componentes novos
- [ ] Storybook story criada
- [ ] axe-core sem violações críticas
- [ ] Cobertura >=88% (gate global de CI)
- [ ] Testes responsivos (375px, 768px, 1280px)
- [ ] E2E para fluxos críticos (se aplicável)

---

**Última atualização:** 13/07/2026 (reconciliação T0.6)  
**Próxima review:** 13/10/2026  
**Owner:** @qa-team
