---
id: SPEC-20260603-003
title: "Preferências de Exibição do Veículo no Chip de Contexto"
status: approved
date: 2026-06-03
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-DISP-01, R-DISP-02, R-DISP-03, R-CTX-07]
security: [S2]
camadas: [frontend, backend, database]
---

# Preferências de Exibição do Veículo no Chip de Contexto

## Contexto

O chip de contexto (`VehicleContextChip`) exibe a identidade do veículo selecionado no subheader global. Atualmente exibe Marca + Modelo + Placa de forma fixa. Diferentes usuários têm necessidades diferentes: frotas com modelos idênticos precisam da placa como diferenciador primário; usuários com apelidos memoráveis preferem vê-los em destaque.

## Objetivo

Permitir que o usuário configure quais campos de identidade do veículo aparecem no chip, dentro de um conjunto limitado e com a placa sempre presente.

---

## Campos Disponíveis

| Campo | Código | Fonte | Obrigatório |
|-------|--------|-------|-------------|
| Placa | `plate` | `vehicles.plate` | **Sim** |
| Marca | `make` | `vehicles.make` | Não |
| Modelo | `model` | `vehicles.model` | Não |
| Apelido | `nickname` | `vehicles.nickname` | Não |

---

## Requisitos Funcionais

### RF-01 — Placa sempre obrigatória
A placa está sempre presente na configuração. O usuário não pode removê-la. Toda combinação válida contém `plate`.

### RF-02 — Mínimo 1, máximo 3 campos
O usuário escolhe de 1 a 3 campos no total. Como `plate` é fixo, o usuário escolhe 0 a 2 campos adicionais opcionais entre Marca, Modelo e Apelido.

Combinações válidas (exemplos):
- `[plate]` — apenas placa
- `[make, plate]` — marca + placa
- `[model, plate]` — modelo + placa
- `[nickname, plate]` — apelido + placa
- `[make, model, plate]` — marca + modelo + placa (padrão)
- `[make, nickname, plate]` — marca + apelido + placa
- `[model, nickname, plate]` — modelo + apelido + placa

### RF-03 — Sem repetição de campos
Nenhum campo pode aparecer mais de uma vez na configuração. `plate` nunca duplica.

### RF-04 — Apelido com fallback para Modelo
Se o usuário escolheu `nickname` mas o veículo não tem apelido cadastrado, o chip exibe o `model` no lugar. Se `model` também estiver ausente, exibe vazio sem quebrar o layout. (valida R-DISP-02)

### RF-05 — Ordem de exibição no chip
A ordem dos campos no chip segue a configuração do usuário. O campo `plate` pode ser posicionado em qualquer slot (início, meio ou fim) conforme preferência do usuário.

Ordem padrão ao criar conta: `[make, plate, model]` (logo da marca → placa → nome/modelo).

> **Atualização 2026-06-15:** ordem padrão alterada de `[make, model, plate]` para `[make, plate, model]` — `DEFAULT_CHIP_FIELDS` em `packages/validators/src/display-preferences.schema.ts`. Mudança puramente de configuração padrão; o usuário continua podendo reordenar livremente em Perfil → Preferências.

### RF-06 — Persistência da preferência
A preferência é salva em `user_preferences.vehicle_chip_fields` (coluna JSONB no Supabase, array de strings). Em caso de falha de leitura, usar fallback em `localStorage` com chave `nave_chip_fields`. (valida R-DISP-03)

### RF-07 — Interface de configuração
A configuração é acessada em **Perfil → Preferências → Exibição do veículo**. Exibe uma prévia do chip em tempo real conforme o usuário ajusta os campos.

### RF-08 — Validação no frontend e backend
O array `vehicle_chip_fields` é validado por Zod:
```typescript
z.array(z.enum(['plate', 'make', 'model', 'nickname']))
  .min(1).max(3)
  .refine(fields => fields.includes('plate'), {
    message: 'A placa é obrigatória',
  })
  .refine(fields => new Set(fields).size === fields.length, {
    message: 'Campos não podem repetir',
  })
```

### RF-09 — Campo Apelido no veículo
O modelo `vehicles` ganha o campo `nickname` (text, nullable, max 50 caracteres). O formulário de criação/edição de veículo expõe esse campo opcionalmente.

> **Atualização 2026-07-14:** já implementado desde SPEC-20260602-002 (T2.1) com `max_length = 50`, não 30 como originalmente escrito nesta spec — o limite de 30 nunca chegou a ser aplicado no banco. Ver changelog no rodapé.

---

## Requisitos Não-Funcionais

### RNF-01 — Leitura da preferência sem delay perceptível
A preferência é lida do store Zustand (rehidratado do sessionStorage junto com `activeVehicleData`) para evitar flash de layout no carregamento.

### RNF-02 — Chip não ultrapassa `max-w-[260px]`
Com mais campos, o texto trunca via `truncate` CSS. A placa nunca trunca (é o menor elemento e tem prioridade `flex-shrink: 0`).

### RNF-03 — Prévia em tempo real sem salvar
A tela de configuração usa estado local para mostrar a prévia antes de confirmar. O save é explícito (botão "Salvar preferência").

---

## Modelo de Dados

### Alteração na tabela `vehicles`
```sql
ALTER TABLE vehicles ADD COLUMN nickname text CHECK (char_length(nickname) <= 50);
```

> Já aplicado via `supabase/migrations/20260712171830_core_tables.sql` (T2.1), com `<= 50` em vez do `<= 30` originalmente especificado.

### Alteração na tabela `user_preferences`
```sql
-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_chip_fields text[] DEFAULT ARRAY['make','plate','model'],
  updated_at timestamptz DEFAULT now()
);

-- RLS: usuário acessa apenas suas preferências
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON user_preferences
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Comportamento do Chip por Configuração

| Configuração | Veículo exemplo | Chip exibe |
|-------------|-----------------|-----------|
| `[make, model, plate]` | Toyota Corolla ABC1D23 | `[logo] Toyota Corolla [ABC1D23]` |
| `[plate]` | qualquer | `[ABC1D23]` |
| `[model, plate]` | Toyota Corolla ABC1D23 | `Corolla [ABC1D23]` |
| `[nickname, plate]` | apelido "Branquinho" | `Branquinho [ABC1D23]` |
| `[nickname, plate]` | sem apelido | `Corolla [ABC1D23]` (fallback) |
| `[make, plate]` | Toyota ABC1D23 | `[logo] Toyota [ABC1D23]` |

---

## Casos de Teste

| CT | Descrição | Regra |
|----|-----------|-------|
| CT-01 | Salvar configuração sem `plate` retorna erro de validação | R-DISP-01 |
| CT-02 | Salvar 4 campos retorna erro de validação | R-DISP-01 |
| CT-03 | Chip exibe `model` quando `nickname` está selecionado mas ausente no veículo | R-DISP-02 |
| CT-04 | Configuração persiste entre recarregamentos de página (sessionStorage + Supabase) | R-DISP-03 |
| CT-05 | Prévia atualiza em tempo real sem salvar | RNF-03 |
| CT-06 | Chip com apenas `[plate]` não exibe logo nem texto de marca/modelo | RF-02 |
| CT-07 | Ordem `[plate, make]` exibe placa antes da marca | RF-05 |

---

## Relacionamentos

- Implementa regras `R-DISP-01`, `R-DISP-02`, `R-DISP-03`
- Depende de `SPEC-20260603-001` (chip de contexto no subheader)
- Afeta `SPEC-20260602-002` (CRUD de veículos — adiciona campo `nickname`)
- Afeta o store `use-dashboard-store` (adiciona `chipFields` ao `activeVehicleData`)

---

## Changelog

- **2026-07-14**: Spec promovida de `draft` para `approved` (T2.7). Implementados nesta rodada: `chipFieldsSchema`
  (`packages/validators/src/preferences.schemas.ts`), `PreferencesModule` REST estendido com `vehicle_chip_fields`
  (GET/PATCH `/preferences`, mesmo padrão de `SPEC-20260612-003`), e UI de configuração em `/settings/preferences`
  (seção "Exibição do veículo": seleção de campos, reordenação e prévia em tempo real via
  `apps/web/src/lib/vehicle-chip.ts`). RF-09 (`nickname`) já estava concluído desde T2.1 (com divergência de
  tamanho corrigida acima). RF-01/RF-04/RF-05 — a renderização do `VehicleContextChip` real no subheader —
  permanecem ⏳ até `SPEC-20260603-001` (Fase 5) ser implementada; `resolveChipValue`/`formatChipPreview` já
  ficam prontos para reuso nessa fase. Padrão seguido: NestJS REST + React Query (não server actions Next.js,
  como já decidido em `SPEC-20260612-003`).
