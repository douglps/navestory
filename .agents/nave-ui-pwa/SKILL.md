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

### Cores Primárias

- **Primary (Ação):** `oklch(0.556 0.15 260)` (Azul Nave)
- **Secondary (Secundário):** `oklch(0.556 0.15 200)` (Azul-Cinza)
- **Accent (Destaque):** `oklch(0.556 0.15 140)` (Ciano)

### Cores de Status (Pastéis)

- **Success (Sucesso):** `oklch(0.92 0.12 150)` (Verde Pastel)
- **Warning (Atenção):** `oklch(0.92 0.15 85)` (Amarelo Pastel)
- **Error (Erro):** `oklch(0.92 0.08 25)` (Vermelho Pastel)
- **Info (Informação):** `oklch(0.92 0.08 240)` (Azul Pastel)

### Cores Neutras

- **Background:** `oklch(0.985 0 0)` (Branco Suave)
- **Foreground:** `oklch(0.15 0 0)` (Cinza Escuro)
- **Card/Sidebar:** `oklch(0.97 0 0)` (Branco Gelo)

### Regras de Uso

1. **Botões de Ação:** Use sempre `primary`.
2. **Alertas e Pendências:** Use `warning` ou `error` (nunca vermelho puro).
3. **Valores Negativos:** Use `text-error` ou `text-negative`.
4. **Fundo:** Evite branco puro (`#fff`). Use `oklch(0.985 0 0)` para conforto visual.
5. **branco/preto:** Não use branco puro (`#fff`) nem preto puro (`#000`). Use variações de cinza para garantir o contraste e a legibilidade.

## Ícones

- Use sempre ícones do pacote `lucide-react`.
- Mantenha a consistência no tamanho e estilo dos ícones.
- Use ícones com bom contraste e legibilidade.
- Utilize ícones que representem bem a ação que será realizada.
- Utilize fundos de ícones que sigam a paleta de cores Nave.

## Componentes

- Utilize componentes do pacote `shadcn/ui`.
- Mantenha a consistência no tamanho e estilo dos componentes.
- Utilize componentes com bom contraste e legibilidade.
- Utilize componentes que representem bem a ação que será realizada.
- Utilize componentes que sigam a paleta de cores Nave.
