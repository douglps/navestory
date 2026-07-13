# 🛠️ Skill: `dashboard-metrics-rsc`

**Objetivo**: Dashboard com métricas agregadas (React Server Components).

**Arquivos Gerados**:
```
app/(dashboard)/fleet/metrics/page.tsx
packages/database/sql/fleet_metrics.sql
app/(dashboard)/fleet/metrics/loading.tsx
```

**Regras**:
- [ ] RSC: fetch direto no componente (sem useEffect)
- [ ] Cache: `revalidate: 3600` (1 hora)
- [ ] Skeleton: CLS zero com altura fixa
- [ ] RLS: view materializada com policy por user_id

**Exemplo de Query**:
```sql
CREATE MATERIALIZED VIEW fleet_metrics AS
SELECT 
  user_id,
  COUNT(*) FILTER (WHERE status = 'active') as active_count,
  AVG(EXTRACT(EPOCH FROM (NOW() - last_maintenance))/86400) as avg_days
FROM vehicles
GROUP BY user_id;
```
