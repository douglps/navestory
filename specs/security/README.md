# Specs — Segurança

Domínio responsável por hardening, compliance e políticas de autenticação/autorização.

Regras aplicáveis: S1, S2, S3, S4, S5, S12, C1, C2

| Spec | Título | Status |
|------|--------|--------|
| [SPEC-20260521-001](SPEC-20260521-001.md) | Hardening de Segurança — Gaps Críticos do MVP | Aprovada |
| [SPEC-20260719-001](SPEC-20260719-001-exclusao-conta-ui.md) | UI de Exclusão de Conta pelo Próprio Usuário (LGPD Art. 18) | Draft |
| [SPEC-20260731-006](SPEC-20260731-006-correcao-role-user-metadata.md) | Correção: Escalação de Privilégio via user_metadata do Supabase | Aprovada |
| [SPEC-20260807-001](SPEC-20260807-001-audit-log-cobertura-taxonomia-retencao.md) | Audit Log — Cobertura, Taxonomia e Política de Retenção | Aprovada |
| [SPEC-20260807-002](SPEC-20260807-002-eventos-seguranca-ip-tentativas-negadas.md) | Eventos de Segurança — IP/User-Agent e Tentativas de Acesso Negado | Aprovada — implementada |

Referências: `docs/architecture/security/`, `docs/architecture/decisions/002-supabase-rls-strategy.md`, `docs/architecture/decisions/003-auth-jwt-strategy.md`.
