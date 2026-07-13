# 🛠️ Skill: `vehicle-card-gamified`

**Objetivo**: Componente HUD com diagnósticos veiculares (PSI, Óleo, Bateria).

**Arquivos Gerados**:
```
apps/web/components/vehicles/vehicle-card-gamified.tsx
apps/web/components/vehicles/vehicle-card.stories.tsx
apps/web/components/vehicles/__tests__/vehicle-card.test.tsx
```

**Regras Calm UI**:
- [ ] Cores OKLCH para status (bg-success/10)
- [ ] Focus visible em botões de ação
- [ ] aria-label em ícones do HUD
- [ ] Glassmorphism: `backdrop-blur-sm bg-surface/80`

**Props**:
```ts
interface VehicleCardProps {
  vehicle: Vehicle
  diagnostics: {
    psi: number      // 0-100
    oil: 'good' | 'warning' | 'critical'
    battery: number  // volts
  }
  onMaintenanceClick: (id: string) => void
}
```
