---
name: data-integrity
version: 1.0-mvp
description: Guardião da consistência de dados, Schema V3 e isolamento via Supabase RLS.
---

# 🗄️ Data Integrity - NAVE (Greenfield)

Você é responsável por garantir que o banco de dados do Nave seja íntegro, seguro e performático desde o primeiro `CREATE TABLE`.

## 1. 🎯 Padronização Schema V3 (Nativo)

Como este é um projeto novo, não aceite nomenclaturas genéricas. Siga o contrato:

- **Financeiro:** Use `amount` (para valores), nunca `price` ou `valor`.
- **Temporal:** Use `occurred_at` (timestamp com timezone) para a data do evento e `created_at` para registro no banco.
- **Relacional:** Toda tabela de dados do usuário DEVE ter uma FK `vehicle_id` e `user_id` (UUID).
- **Tipagem:** Use `Decimal` para valores monetários e `JSONB` para metadados flexíveis de OCR.

## 🛡️ 2. Supabase RLS (Row Level Security)

Segurança não é opcional. Toda vez que criar um Schema ou Query:

- **Políticas:** Gere as declarações SQL de RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
- **Isolamento:** A política padrão deve ser `auth.uid() = user_id`.
- **Prevenção:** Se o código não incluir o filtro `.eq('user_id', auth.uid())` em Selects/Updates, emita um erro e corrija.

## 3. 🔍 Validação com Zod (Single Source of Truth)

- Todo modelo de banco deve ter um Schema Zod correspondente no frontend/backend.
- **Coerção:** Use `.coerce.date()` para campos `occurred_at` para garantir compatibilidade entre o JSON do Supabase e objetos JS.

## 4. 🔏 Proteção de Dados (PII)

- Campos sensíveis (como Placa ou documentos de motoristas) devem ser tratados com cuidado.
- Proiba a inserção de dados pessoais em logs de erro ou tabelas de auditoria pública.

## 5. 🛡️ Persistência e Auditoria

- **Soft Delete:** Toda tabela de negócio (Vehicles/Expenses) deve ter `deleted_at` (timestamp, nullable).
- **Concurrency:** Inclua `updated_at` com trigger de auto-update para evitar conflitos de escrita (Lost Updates).

## 6. 💰 Precisão Financeira

- **Cents Pattern:** Recomendado armazenar `amount` como Inteiro (em centavos/cents) para evitar imprecisões de ponto flutuante em cálculos de dashboard. Se usar Decimal, force 2 casas decimais no Zod.

## 7. 🆔 Identidade Única (SaaS)

- Certifique-se de que índices únicos incluam o `user_id` (ex: `UNIQUE(vin, user_id)`), permitindo que diferentes usuários operem sem colisões de dados globais.

---

## 🚦 Checklist de Integridade (Executar antes de entregar)

Antes de fornecer qualquer código SQL ou de API, valide:

1. [ ] A tabela possui `user_id` vinculado ao `auth.users`?
2. [ ] O RLS foi explicitamente habilitado no script SQL?
3. [ ] Os nomes das colunas seguem o Schema V3 (`amount`, `occurred_at`)?
4. [ ] Existe um Schema Zod para validar a entrada desses dados?

"Se o usuário pedir para ignorar o user_id, alerte sobre o risco de vazamento de dados (Cross-tenant data leak)."
