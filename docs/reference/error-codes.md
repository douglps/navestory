# Códigos de Erro — Nave SaaS API

> Fonte primária: `specs/API-SPEC.md`. Este documento expande a tabela de códigos com detalhe por domínio e exemplos de payloads de resposta.

**Última atualização:** 2026-07-13

---

## Convenção de resposta de erro

Toda resposta de erro retorna JSON no formato:

```json
{
  "statusCode": 422,
  "message": "Limite de templates atingido (max 20)",
  "error": "Unprocessable Entity"
}
```

Em caso de erro de validação de schema (400), `fieldErrors` pode estar presente:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "fieldErrors": {
    "amount": ["must be a positive number"],
    "vehicle_id": ["invalid UUID"]
  }
}
```

**Importante:** Stack trace nunca é exposto ao cliente em `NODE_ENV=production` (regra S5). Em produção, a resposta contém apenas `statusCode` e `message`.

---

## Tabela geral de códigos HTTP

| Código | Nome | Quando ocorre | Distinção importante |
|--------|------|---------------|----------------------|
| **400** | Bad Request | Falha de schema Zod; payload inválido; tipo MIME inválido em upload | Erro de *forma* — dado não passou na validação de schema |
| **401** | Unauthorized | JWT ausente, expirado ou malformado; `aud` diferente de `authenticated` (S1, ADR-003) | Sem autenticação — não confundir com 403 (sem permissão) |
| **403** | Forbidden | Acesso a recurso de outro usuário (RLS — S2); tentativa de PATCH/DELETE em expense `is_readonly = true` (R-LED-01) | Com autenticação, sem permissão |
| **404** | Not Found | ID inexistente ou registro com `deleted_at IS NOT NULL` — do ponto de vista do usuário, "não existe" | Soft-deleted é tratado como não existente |
| **409** | Conflict | Transição de manutenção inválida (R7); transição de multa inválida; violação de unique constraint | Conflito de *estado* — operação semanticamente inválida dado o estado atual |
| **422** | Unprocessable Entity | Regra de negócio violada após validação de schema | Falha de *negócio* — dado válido em forma, inválido em regra |
| **429** | Too Many Requests | Acima do rate limit configurado (S4) | Sem corpo adicional; cabeçalho `Retry-After` quando disponível |
| **500** | Internal Server Error | Erro interno não tratado; stack oculta em produção (S5) | Ver logs no Supabase Dashboard para rastreamento |

**Distinção 400 vs 422:** intencional e deve ser tratada de forma diferente no cliente. 400 = schema inválido (Zod reject, antes de chegar ao service). 422 = schema válido, mas regra de negócio violada no service (ex: limite de templates, categoria duplicada).

---

## Códigos de aviso não-bloqueantes (warnings)

Algumas operações são bem-sucedidas (HTTP 201) mas retornam avisos no campo `warnings`. O cliente deve exibi-los ao usuário sem bloquear o fluxo.

```json
{
  "data": { "id": "...", "amount": 150.00, "...": "..." },
  "warnings": [
    { "code": "ODOMETER_REGRESSION", "message": "Odômetro atual: 52.000 km. Odômetro digitado: 48.000 km. Deseja manter o valor retroativo?" }
  ]
}
```

| Código de warning | Situação | Regra |
|-------------------|----------|-------|
| `ODOMETER_REGRESSION` | `odometer_km` informado é menor que o máximo histórico do veículo no ciclo ativo | ADR-001 D2, R1 (soft-warning no `apps/api`) |
| `DUPLICATE_EXPENSE` | Despesa criada com mesmos `vehicle_id`, `category`, `amount` e `date` de uma despesa existente | ADR-001 D1, R2 |

**Nota:** no fluxo web (`apps/web` via Server Actions), `odometer_km` retroativo é um hard-block com HTTP 400, não um warning (R-ODO-01). O soft-warning se aplica ao `apps/api` REST.

---

## Detalhamento por domínio

### Auth (`/auth`)

| Situação | Código | Mensagem esperada |
|----------|--------|-------------------|
| E-mail já cadastrado | 409 | Conta com este e-mail já existe |
| Senha muito curta ou fraca | 400 | Validação de schema (Zod) |
| Rate limit de registro excedido (5 req/15min por IP) | 429 | Too many requests (S4) |
| Rate limit de login excedido (10 req/15min por IP) | 429 | Too many requests (S4) |
| Token de reset inválido ou expirado | 401 | Token inválido ou expirado |
| E-mail descartável ou conta banida | 400 | Cadastro não permitido (R-BIZ-07) |

---

### Veículos (`/vehicles`)

| Situação | Código | Regra |
|----------|--------|-------|
| Placa em formato inválido | 400 | R-VEH-02 |
| Veículo não encontrado ou soft-deleted | 404 | R5 |
| Acesso a veículo de outro usuário | 403 | S2 |

---

### Despesas (`/expenses`)

| Situação | Código | Regra |
|----------|--------|-------|
| `amount` fora do intervalo (0,01–100.000.000,00) | 400 | R-EXP-01 |
| `odometer_km` acima de 9.999.999 | 400 | R-ODO-02 |
| `odometer_km` ausente em despesa de combustível | 400 | R4 |
| `fuel_type` inválido (não está no enum `FuelType`) | 400 | R-FUEL-01 |
| `supplier` acima de 100 caracteres | 400 | R-FUEL-04 |
| PATCH/DELETE em expense `is_readonly = true` | 403 | R-LED-01 |
| `odometer_km` retroativo (soft-warning no REST) | 201 + warning `ODOMETER_REGRESSION` | ADR-001 D2 |
| Possível duplicata detectada | 201 + warning `DUPLICATE_EXPENSE` | ADR-001 D1, R2 |

---

### Templates de despesa (`/expense-templates`)

| Situação | Código | Regra |
|----------|--------|-------|
| Limite de 20 templates atingido | 422 | R3 |
| Template não encontrado | 404 | — |

---

### Manutenção (`/maintenance`)

| Situação | Código | Regra |
|----------|--------|-------|
| Transição de status inválida (ex: `completed → pending`) | 409 | R7 |
| `odometer_km` ausente ao concluir manutenção | 400 | R-ODO-03 |
| Manutenção não encontrada | 404 | R5 |

---

### Multas (`/fines`)

| Situação | Código | Regra |
|----------|--------|-------|
| Transição de status inválida | 409 | Grafo de transições de `fine_status` |
| Multa não encontrada | 404 | R5 |
| Veículo não pertence ao usuário | 404 | S2 |

---

### Categorias personalizadas (`/categories`)

| Situação | Código | Regra |
|----------|--------|-------|
| Limite de 20 categorias atingido | 422 | R-CAT-01 |
| `value` com formato inválido | 400 | R-CAT-02 |
| `value` duplica categoria padrão | 409 | R-CAT-03 |

---

### Admin (`/admin`)

| Situação | Código | Descrição |
|----------|--------|-----------|
| Chamada por usuário não-admin | 403 | `AdminGuard` rejeita |
| Operação LGPD de exclusão de conta | 200 | Cascata em todas as tabelas do usuário (C1) |

---

## Cabeçalhos relevantes

| Cabeçalho | Direção | Uso |
|-----------|---------|-----|
| `Authorization: Bearer <token>` | Request | Auth em rotas privadas (S1, ADR-003) |
| `Content-Type: application/json` | Request | Obrigatório em POST/PATCH |
| `X-Request-Id` | Response | ID de correlação para suporte |
| `Retry-After` | Response | Presente em 429; indica segundos até próxima tentativa |

---

## Sanitização de entradas (prevenção de erros)

Para evitar rejeições desnecessárias, o cliente deve aplicar antes de enviar:

| Campo | Sanitização esperada | Regra |
|-------|---------------------|-------|
| Todo campo de texto livre | `.trim()` + `.normalize('NFC')` | R-SAN-01, R-SAN-02 |
| Placa, RENAVAM, chassi | `.toUpperCase()` + strip de não-alfanuméricos | R-SAN-03 |
| IDs em parâmetros de rota | Validar como UUID v4 antes de enviar | R-SAN-04 |
| Upload de arquivo | Validar tipo MIME e tamanho no cliente (dupla checagem — servidor também valida) | R-SAN-05 |

Mensagens de erro do banco de dados nunca são expostas ao cliente — o backend retorna apenas mensagens genéricas (R-SAN-06).
