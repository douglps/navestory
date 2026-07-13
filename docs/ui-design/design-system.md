# 🎨 Design System Rules - Nave SaaS (v3.1 - Calm UI)

**Versão:** 3.1 | **Foco:** Performance Visual e Anti-Ansiedade

---

## 🚫 PROIBIDO
- Cores Hex/RGB hardcoded.
- Tailwind colors (`bg-slate-900`) sem mapeamento semântico.
- Valores de blur arbitrários (use os tokens).

## 🛠️ Design Tokens (OKLCH)

### Cores de Superfície
- `--surface`: `oklch(0.98 0.01 250)` (Luz perceptual constante).
- `--on-surface`: `oklch(0.2 0.02 250)`.

### Blur Semântico (v3.1)
| Token | Valor | Uso |
| :--- | :--- | :--- |
| `--blur-overlay` | 4px | Popovers, tooltips |
| `--blur-surface` | 24px | Cards, sidebar |
| `--blur-modal` | 40px | Dialogs, fullscreen |

### Glassmorphism
Implementado via `.glass-card` e `.glass-sidebar`:
- **Opacidade:** `40-60%`.
- **Blur:** Mapeado para os tokens semânticos.
- **Borda:** Borda sutil de `1px` para definição de volume.

---

## 🏎️ Fleet Management Custom Tokens
- `--fleet-cerulean`: Azul principal de frota.
- `--fleet-emerald`: Sucesso operacional.
- `--fleet-tangerine`: Atenção necessária.

## 📱 Mobile-First Strategy
- Gestores de frota acessam via mobile em 67% dos casos.
- **Widgets:** Devem colapsar em stack vertical no mobile.
- **Interações:** Touch targets mínimos de `44x44px`.

---
*Última atualização: 15/03/2026*
