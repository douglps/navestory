# 🛠️ Skill: `maintenance-alert-edge`

**Objetivo**: Edge Function para alertas de manutenção preventiva.

**Trigger**: Cron diário 06:00 UTC

**Arquivos Gerados**:
```
supabase/functions/maintenance-alert/index.ts
supabase/migrations/xxxx_create_maintenance_policies.sql
packages/telemetry/src/alerts.ts
```

**Regras**:
- [ ] Service Role Key apenas na Edge Function
- [ ] Notificação: Email (Resend) + Realtime broadcast
- [ ] Idempotência: `ON CONFLICT DO NOTHING`
- [ ] LGPD: anonimizar placa em logs

**Exemplo de Payload**:
```json
{
  "vehicle_id": "uuid",
  "plate": "ABC-****",
  "alert_type": "maintenance_due",
  "km_threshold": 500,
  "user_email": "masked@domain.com"
}
```
