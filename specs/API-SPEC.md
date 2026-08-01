# API Spec — navestory SaaS

> Referência completa: [`docs/api/`](../docs/api/) · [`docs/reference/api-reference.md`](../docs/reference/api-reference.md)

---

## Convenções

| Aspecto            | Convenção                                                         |
| ------------------ | ----------------------------------------------------------------- |
| Base URL (dev)     | `http://localhost:3001`                                           |
| Base URL (prod)    | `https://api.navestory.app`                                       |
| Versionamento      | Sem prefixo na URL — v0/MVP                                       |
| Formato            | JSON em todas as requisições e respostas                          |
| Auth               | `Authorization: Bearer <access_token>` em todas as rotas privadas |
| Refresh            | `POST /auth/refresh` com `{ refreshToken }` no body               |
| Schemas de entrada | Definidos em `@navestory/validators` (`packages/validators/src/`) |

---

## Formato de Resposta

**Item único:**

```json
{ "data": { ... } }
```

**Listagem paginada:**

```json
{
  "data": [ ... ],
  "meta": { "total": 120, "page": 1, "limit": 20 }
}
```

**Warning não-bloqueante (ex: odômetro retroativo — R1):**

```json
{
  "data": { ... },
  "warnings": [{ "code": "ODOMETER_REGRESSION", "message": "..." }]
}
```

---

## Endpoints por Domínio

| Domínio     | Verbo  | Rota                     | Propósito                                                                                              |
| ----------- | ------ | ------------------------ | ------------------------------------------------------------------------------------------------------ |
| Auth        | POST   | `/auth/register`         | Registro com email/senha                                                                               |
| Auth        | POST   | `/auth/login`            | Login, retorna JWT                                                                                     |
| Auth        | POST   | `/auth/logout`           | Invalida sessão                                                                                        |
| Auth        | POST   | `/auth/refresh`          | Renova access token                                                                                    |
| Auth        | POST   | `/auth/recover-password` | Envia email de recuperação                                                                             |
| Auth        | POST   | `/auth/reset-password`   | Aplica novo password via token                                                                         |
| Vehicles    | GET    | `/vehicles`              | Lista veículos do usuário                                                                              |
| Vehicles    | POST   | `/vehicles`              | Cria veículo                                                                                           |
| Vehicles    | GET    | `/vehicles/:id`          | Detalhe do veículo                                                                                     |
| Vehicles    | PATCH  | `/vehicles/:id`          | Atualiza veículo                                                                                       |
| Vehicles    | DELETE | `/vehicles/:id`          | Soft-delete (R5)                                                                                       |
| Expenses    | GET    | `/expenses`              | Lista despesas (com filtros)                                                                           |
| Expenses    | POST   | `/expenses`              | Cria despesa (valida R1, R2, R4)                                                                       |
| Expenses    | GET    | `/expenses/:id`          | Detalhe da despesa                                                                                     |
| Expenses    | PATCH  | `/expenses/:id`          | Atualiza despesa (valida R1, R2)                                                                       |
| Expenses    | DELETE | `/expenses/:id`          | Soft-delete (R5)                                                                                       |
| Templates   | GET    | `/expense-templates`     | Lista templates do usuário                                                                             |
| Templates   | POST   | `/expense-templates`     | Cria template (valida R3, R6)                                                                          |
| Templates   | PATCH  | `/expense-templates/:id` | Atualiza template                                                                                      |
| Templates   | DELETE | `/expense-templates/:id` | Hard-delete                                                                                            |
| Maintenance | GET    | `/maintenance`           | Lista agendamentos                                                                                     |
| Maintenance | POST   | `/maintenance`           | Cria agendamento                                                                                       |
| Maintenance | PATCH  | `/maintenance/:id`       | Atualiza / transiciona estado (R7)                                                                     |
| Maintenance | DELETE | `/maintenance/:id`       | Soft-delete (R5)                                                                                       |
| Dashboard   | GET    | `/dashboard/stats`       | KPIs e agregações                                                                                      |
| Dashboard   | GET    | `/dashboard/export`      | Export CSV de despesas                                                                                 |
| Users       | GET    | `/users/me`              | Perfil do usuário autenticado                                                                          |
| Users       | PATCH  | `/users/me`              | Atualiza perfil                                                                                        |
| Users       | DELETE | `/users/me`              | Exclusão física de conta via cascata FK (C1) — exige `{ confirm: true }`                               |
| Admin       | GET    | `/admin/users`           | Lista todos os usuários — somente `admin` (`SupabaseAuthGuard + RolesGuard/@Roles('admin')`)           |
| Admin       | DELETE | `/admin/users/:id`       | Exclui qualquer conta (LGPD) — somente `admin`; registra em `audit_logs`                               |
| Admin       | GET    | `/admin/audit-logs`      | Lista audit logs com filtros `user_id`, `period` — somente `admin`                                     |
| Docs        | GET    | `/api/docs`              | Swagger UI — disponível apenas em `NODE_ENV=development` ou `SWAGGER_ENABLED=true` (SPEC-20260521-005) |

---

## Códigos de Erro

| Código | Significado                     | Quando ocorre                                          |
| ------ | ------------------------------- | ------------------------------------------------------ |
| 400    | Validação de entrada ou warning | Zod reject; payload inválido                           |
| 401    | Sem autenticação                | JWT ausente, expirado ou malformado                    |
| 403    | Sem permissão                   | Acesso a recurso de outro usuário (RLS — S2)           |
| 404    | Não encontrado                  | ID inexistente ou registro com `deleted_at` preenchido |
| 409    | Conflito de estado              | Transição de manutenção inválida (R7)                  |
| 422    | Regra de negócio violada        | Limite de templates atingido (R3)                      |
| 429    | Rate limit                      | Acima do limite de S4                                  |
| 500    | Erro interno                    | Stack oculta em produção (S5); ver logs no Supabase    |

**Ponto de atenção em integrações:** a distinção entre 400 e 422 é intencional — 400 é falha de schema (Zod), 422 é falha de regra de negócio pós-validação (service). Tratar os dois de forma diferente no cliente.

---

## Headers Relevantes

| Header                           | Direção  | Uso                           |
| -------------------------------- | -------- | ----------------------------- |
| `Authorization: Bearer <token>`  | Request  | Auth em rotas privadas        |
| `Content-Type: application/json` | Request  | Obrigatório em POST/PATCH     |
| `X-Request-Id`                   | Response | ID de correlação para suporte |
