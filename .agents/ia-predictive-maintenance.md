# 🛠️ Skill: `ia-predictive-maintenance`

**Objetivo**: IA Preditiva para alertas de manutenção (Roadmap Q2 2026).

**Arquivos Gerados**:
```
packages/telemetry/src/predictive-model.ts
supabase/functions/predict-maintenance/index.ts
apps/web/actions/predict-maintenance.ts
```

**Regras**:
- [ ] Modelo: histórico de telemetria + manutenções passadas
- [ ] Threshold: alerta 30 dias ou 500km antes do previsto
- [ ] Explicabilidade: mostrar fatores que geraram alerta
- [ ] Consentimento: usuário opt-in para IA preditiva

**Input do Modelo**:
```ts
interface TelemetryHistory {
  vehicleId: string
  kmHistory: number[]
  maintenanceRecords: MaintenanceRecord[]
  usagePattern: 'light' | 'moderate' | 'heavy'
}
```
