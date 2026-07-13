# Specs — Domínio: Preferências de Usuário

> Preferências persistidas por usuário que controlam comportamento e aparência do produto.
> A tabela canônica é `public.user_preferences` (Supabase/PostgreSQL).

## Specs neste domínio

| ID | Título | Status |
|----|--------|--------|
| [SPEC-20260603-004](SPEC-20260603-004-user-preferences-migration.md) | Migration: Tabela Consolidada `user_preferences` | approved |
| [SPEC-20260612-003](SPEC-20260612-003-auto-draft-preference.md) | Preferência de Rascunho Automático em Formulários | draft |

## Regras aplicáveis

| ID | Regra |
|----|-------|
| R-PREF-01 | Toda preferência tem default seguro; ausência nunca causa erro |
| R-PREF-02 | `auto_draft_enabled` controla rascunho automático em formulários; default `false` |
| R-DISP-03 | Preferência de exibição do chip é global por usuário; persiste em `vehicle_chip_fields` |
| S1 | Toda rota privada exige `SupabaseAuthGuard` |
| S2 | RLS ativo em todas as tabelas; policy padrão: `auth.uid() = user_id` |

## Dependências futuras

Esta pasta é pré-requisito para as seguintes stories do backlog:

- **STORY-03** — Seleção de tema (light / dark / system)
- **STORY-04** — Configuração de campos do chip de contexto via UI
- **STORY-05** — Configuração de notificações
