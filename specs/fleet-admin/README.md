# specs/fleet-admin — Administração de Frota (workspace_owner)

> Specs de features destinadas ao papel `workspace_owner` no plano Frota: configuração de políticas operacionais da frota, onboarding de motoristas, conformidade documental e alertas de gestão.

## Índice

| Spec | Título | Status |
|------|--------|--------|
| [SPEC-20260804-003](SPEC-20260804-003-fleet-settings.md) | Configurações da Frota — Campos Obrigatórios, Checklist de Onboarding e Conformidade Documental | Aprovada |

## Dependências cruzadas

- `specs/business/SPEC-20260620-001-business-strategy-stories.md` — define os roles `workspace_owner`/`workspace_member` e as regras BS-ACL-06/BS-ACL-07
- `specs/workspace/SPEC-20260804-004-workspace-foundation.md` — implementação técnica dos roles/convite/atribuição de veículo, pré-requisito direto desta spec
