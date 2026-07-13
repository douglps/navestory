# Specs — Manutenção

Domínio responsável pelo agendamento, status e alertas de manutenções de veículos.

Regras aplicáveis: R5, R7, S3, C2

| Spec | Título | Status |
|------|--------|--------|
| [SPEC-20260521-002](SPEC-20260521-002.md) | Alertas de Manutenção por Email | Aprovada |
| [SPEC-20260603-002](SPEC-20260603-002-maintenance-status-transitions.md) | Transições de Status de Manutenção | Rascunho |

Implementação em `apps/api/src/modules/maintenances/` e `supabase/functions/send-maintenance-alerts/`.
