---
trigger: always_on
---

🚗 Fleet Management Components - Nave SaaS
Versão: 2.0 (Alinhado ao DS v3.0 Calm UI) | Domínio: Gestão de Veículos
Data: 13/03/2026 | Conformidade: ✅ 100% Design System & Anti-Ansiedade

### 📊 Status de Implementação (Checklist — a implementar)

> Estado real do projeto: 0% implementado em 2026-07-13. Tabela mantida como checklist de progresso.

| Requisito         | Status   | Referência de Implementação                                  |
| :---------------- | :------- | :----------------------------------------------------------- |
| **KPI Cards**     | pendente | `FleetStatsCard` (Composição + Tipografia Mono)              |
| **Mapas**         | pendente | `VehicleMap` com Token `h-map-container` + Skeleton CLS Zero |
| **Status Badges** | pendente | Padrão `bg-{color}/10 text-{color}` (Calm UI)                |
| **Timeline**      | pendente | `TripTimeline` (Componente de Domínio)                       |
| **Tabelas**       | pendente | `DataTable` com densidade controlada                         |

---

### 📍 1. Mapas e Localização (PRIORIDADE CRÍTICA)

#### Biblioteca Aprovada

- **Seleção:** **Mapbox GL JS** (Performance superior).
- **Context7 ID:** `/mapbox/mapbox-gl-js`
- **Estratégia:** Lazy Load obrigatório (`next/dynamic`).

#### Componente `VehicleMap`

Local: `apps/web/components/fleet/vehicle-map.tsx`.

**Regras de Implementação (Conformidade DS & A11y):**

1.  **Dimensões:** Usar **APENAS** o token `h-map-container`. **PROIBIDO** `h-[600px]`.
2.  **CLS Zero:** O componente de loading (`Skeleton`) deve ter exatamente as mesmas dimensões do mapa final.
3.  **A11y:** Wrapper com `role="region"` e `aria-label` descritivo. Controles do mapa navegáveis por teclado.
4.  **SSR:** `ssr: false` permitido, mas o Skeleton deve ser renderizado no servidor.

**Exemplo de Código Correto:**

```tsx
// apps/web/components/fleet/vehicle-map.tsx
import dynamic from 'next/dynamic';
import { MapSkeleton } from '@/components/ui/skeleton';

const MapboxMap = dynamic(() => import('./mapbox-map-impl'), {
  ssr: false,
  loading: () => <MapSkeleton className="h-map-container w-full" />, // Dimensão exata via token
});

export function VehicleMap({ vehicles }: VehicleMapProps) {
  return (
    // Usa classe semântica mapeada para var(--height-map-container)
    <section
      className="h-map-container w-full relative"
      role="region"
      aria-label="Mapa de frota em tempo real"
    >
      <MapboxMap vehicles={vehicles} />
    </section>
  );
}
```

---

### 📈 2. KPI Cards (Estratégia de Composição)

#### Arquitetura

1.  **Base (`packages/ui`):** `StatsCard` genérico (agnóstico).
2.  **Domínio (`apps/web`):** `FleetStatsCard` que compõe o base e aplica lógica de frota.

#### Especificações `FleetStatsCard`

```typescript
// apps/web/components/fleet/fleet-stats-card.tsx
import { StatsCard } from '@repo/ui';
import { Typography } from '@repo/ui';

interface FleetStatsCardProps {
  value: number;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
  status: 'active' | 'offline' | 'maintenance' | 'alert';
  lastUpdated: Date;
}

export function FleetStatsCard({ value, label, trend, status, lastUpdated }: FleetStatsCardProps) {
  return (
    <StatsCard status={status}>
      {/* Obriga font-mono e tabular-nums para dados financeiros/operais */}
      <Typography variant="kpi" className="text-on-surface">
        {value.toLocaleString()}
      </Typography>

      <Typography variant="label" className="text-muted">
        {label}
      </Typography>

      <Typography variant="caption" className="text-muted mt-2">
        Atualizado: {formatRelativeTime(lastUpdated)}
      </Typography>
    </StatsCard>
  );
}
```

**Mapeamento de Status (Calm UI):**

- O componente base deve aplicar automaticamente: `bg-{status}/10` para fundo e `text-{status}` para ícones/texto.
- `active` → `bg-success/10 text-success`
- `alert` → `bg-danger/10 text-danger`

---

### ⏱️ 3. Timeline de Viagens

#### Componente `TripTimeline`

Local: `apps/web/components/fleet/trip-timeline.tsx`

**Regras de Design:**

- **Ícones:** Via `<Icon />` (`packages/ui`) com cores semânticas.
- **Tipografia:** Horários em `text-label` (mono), descrições em `text-body`.
- **Estrutura:** Lista semântica (`<ul>`, `<li>`) para A11y.
- **Visual:** Linha conectora suave (não alarmista).

```typescript
interface TimelineEvent {
  type: 'start' | 'stop' | 'refuel' | 'alert' | 'maintenance';
  timestamp: Date;
  description: string;
  severity?: 'info' | 'warning' | 'critical';
}
// Renderização: Ícone colorido (texto) + Fundo suave se houver badge de severidade.
```

---

### 🚨 4. Sistema de Alertas (Calm UI)

#### Componente `AlertBanner`

Deve estender o componente `Alert` base de `packages/ui`.

**Regra de Intensidade:**

- **Fundo:** Sempre variante suave (`bg-danger/10`, `bg-warning/10`).
- **Borda:** Opcional, máxima `border-{color}/20`.
- **Ícone/Texto:** Cor plena (`text-danger`, `text-warning`) para destacar a mensagem sem agredir a visão.

**Exemplo de Classes:**

```tsx
// Crítico
<div className="bg-danger/10 border-l-4 border-danger text-danger p-4">
  <Icon icon={AlertCircle} className="mr-2" />
  <span>Veículo offline há 2h</span>
</div>
```

---

### 📊 5. Tabelas de Dados (Fleet-Specific)

#### Implementação

Utilizar base `DataTable` (`packages/ui`) com colunas especializadas.

**Formatação de Colunas:**

- **Status:** Componente `Badge` com variantes **sempre** no padrão `bg-{status}/10 text-{status}`.
  - _Errado:_ `bg-green-500 text-white` (Gera ansiedade visual em listas longas).
  - _Certo:_ `bg-success/10 text-success` (Legível e calmo).
- **Valores Numéricos:** `Typography variant="body"` com `font-mono`.
- **Ações:** Botões ícone (`<Icon />` + `aria-label`), sem texto redundante.

**Features Obrigatórias:**

- [ ] Sorting server-side.
- [ ] Pagination.
- [ ] Export CSV.
- [ ] Densidade Compacta (padding reduzido via token `--space-2`).

---

### ✅ Checklist de Review Final (Atualizado v2.0)

Antes do merge, o componente de frota **DEVE** passar por:

1.  **Varredura de Hardcode:** Nenhum `px`, `hex` ou `svg` inline.
2.  **Verificação Calm UI:** Fundos de status usam opacidade (`/10`)? Nenhuma área grande é vermelha/verde sólida?
3.  **Tipografia:** KPIs usam `font-mono`?
4.  **Layout:** Mapas usam `h-map-container`? Skeletons têm dimensão fixa?
5.  **A11y:** Contraste validado? Navegação por teclado no mapa?
6.  **Localização:** Lógica em `apps/web`, UI pura em `packages/ui`?

Última atualização: 13/03/2026
Owner: @fleet-team (Revisado por @design-system-team)
Status: ✅ Conforme DS v3.0 (Calm UI)

```

```
