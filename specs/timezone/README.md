# Specs — Domínio: Suporte a Fuso Horário

> Feature transversal que torna o produto consciente do fuso horário do usuário, corrigindo
> off-by-one em cálculos de "hoje" e migrando campos de data para `timestamptz`.

## Specs neste domínio

| ID | Título | Status |
|----|--------|--------|
| [SPEC-20260715-002](SPEC-20260715-002-timezone-aware-datetime.md) | Suporte a Fuso Horário por Usuário (Timezone-Aware) | draft |

## Regras aplicáveis

| ID | Regra |
|----|-------|
| R-TZ-01 | "Hoje" calculado no fuso do usuário, não em UTC do servidor |
| R-TZ-02 | Fuso armazenado como nome IANA, nunca offset fixo |
| R-TZ-03 | Persistência como `timestamptz`; hora preenchida automaticamente |
| R-TZ-04 | Despesa com data futura: aviso não-bloqueante; manutenção `completion_date` futura > 24h: bloqueado (422) |
| R-PREF-01 | Toda preferência tem default seguro; ausência nunca causa erro |

## Dependências

- `specs/preferences/SPEC-20260603-004` — `user_preferences` é a tabela estendida por esta feature
- `specs/expenses/SPEC-20260601-002` — detecção de duplicatas (R2) impactada pela mudança de `DATE` para `timestamptz`
- `specs/dashboard/SPEC-20260531-001` — `dashboard.service.ts` é o principal ponto corrigido
