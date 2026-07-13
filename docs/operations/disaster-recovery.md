# Disaster Recovery — Nave SaaS

> Runbook mínimo de recuperação de desastres. Documentos operacionais mais detalhados (runbooks gerais) ficam em `docs/operations/runbooks.md` — arquivo ainda não criado (pendente).

**Última atualização:** 2026-07-13  
**Responsável:** a definir — nenhuma responsabilidade formal de DR foi atribuída a um papel específico ainda

---

## RTO e RPO

**RTO/RPO alvo: a definir — nenhuma decisão formal registrada ainda.**

Nenhum ADR ou spec define valores de RTO (Recovery Time Objective) ou RPO (Recovery Point Objective) para este projeto. Recomenda-se criar um ADR dedicado antes do primeiro deploy de produção com carga real de usuários.

Como referência para essa decisão futura:

- O Supabase (plano Pro ou superior) oferece **Point-in-Time Recovery (PITR)** com resolução de 1 segundo e retenção configurável de 7 a 90 dias, o que tecnicamente permitiria um RPO muito baixo.
- O RTO dependerá do processo de restore e de redeployar o backend/frontend — não apenas do banco.

---

## Estratégia de backup do banco de dados (Supabase)

### Backup automático pelo Supabase

O Supabase realiza backups automáticos do PostgreSQL gerenciado. O comportamento varia por plano:

| Plano Supabase | Tipo de backup | Frequência | Retenção |
|----------------|---------------|------------|---------|
| Free | Diário (snapshot) | 1x ao dia | 7 dias |
| Pro / Team | PITR (Point-in-Time Recovery) | Contínuo (WAL streaming) | 7 dias (configurável até 90) |

**Recomendação:** o projeto `Nave` deve usar plano Pro ou superior para ter PITR disponível antes do lançamento público. A decisão de plano não está formalmente registrada em ADR.

### O que é coberto pelo backup do Supabase

- Todas as tabelas PostgreSQL do schema `public`
- Dados de `auth.users` (gerenciados pelo GoTrue)
- Funções, triggers, policies RLS e tipos definidos no banco

### O que não é coberto automaticamente

- **Arquivos no Supabase Storage** (fotos de veículos): o Storage não é incluído no backup de banco de dados. Estratégia de backup de objetos de Storage: a definir — nenhuma decisão formal registrada. Opções: replicação manual para outro bucket/provedor, ou aceitar perda de arquivos em cenário de DR (decisão de negócio).
- **Secrets e variáveis de ambiente**: armazenados fora do banco — devem ser mantidos em gerenciador de segredos (ex: Vercel Environment Variables, Doppler, ou similar). Não há decisão formal sobre qual gerenciador usar.

---

## Processo de restore

### Restore via PITR (plano Pro)

1. Acessar o Dashboard do Supabase → projeto `Nave` (`sfkefpoanmoiagwxbwld`)
2. Navegar para **Database → Backups → Point in Time**
3. Selecionar o timestamp de restore desejado
4. Iniciar o restore — o Supabase cria um novo projeto com os dados do ponto selecionado
5. Atualizar `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no ambiente de produção para apontar para o novo projeto
6. Redeployar `apps/api` e `apps/web` com as novas variáveis

### Restore via snapshot diário (plano Free)

1. Dashboard Supabase → **Database → Backups → Scheduled Backups**
2. Selecionar o snapshot mais recente antes do incidente
3. Fazer download do `.dump` PostgreSQL
4. Criar novo projeto Supabase e restaurar via `pg_restore` ou SQL Editor
5. Atualizar variáveis de ambiente e redeployar

**Aviso:** restore via snapshot aceita perda de dados de até 24h (RPO = 24h no pior caso). Para produção com dados críticos, isso pode ser inaceitável — verificar com o time antes do lançamento.

---

## Rollback de migration de banco

As migrations ficam em `supabase/migrations/` (pasta a ser criada em T0.2). Convenções:

- Cada migration é um arquivo SQL numerado por timestamp (ex: `20260715000000_nome_da_migration.sql`)
- Migrations são aplicadas pelo pipeline de CI via `supabase db push` — nunca manualmente em produção sem registro
- Toda migration que altera schema deve ter um plano de rollback documentado como comentário no início do arquivo SQL:

```sql
-- Migration: 20260715000000_add_column_x_to_vehicles
-- Rollback: ALTER TABLE vehicles DROP COLUMN x;
-- Risco: baixo — coluna nova, sem dados migrados
```

### Procedimento de rollback manual (emergência)

Se uma migration causou regressão e precisa ser revertida fora do pipeline:

1. Identificar o SQL de rollback no cabeçalho do arquivo de migration
2. Executar o rollback via **Supabase SQL Editor** (ou via `psql` com credenciais de serviço)
3. Registrar o incidente em `matrices/impacto.md` com data, o que falhou e o que foi revertido
4. Abrir ADR se o rollback implicar mudança de decisão arquitetural

**Importante:** funções analíticas (`fuel_consumption_trend`, `get_vehicle_cost_per_km`, `calculate_vehicle_tco`) devem ser atualizadas antes de liberar a UI de ciclos de odômetro — conforme alerta do ADR-007. A ordem de deploy é: migration com filtro de ciclo → deploy da API → deploy da UI.

---

## Procedimento de rollback de versão da aplicação

### Backend (`apps/api`)

- O deploy é gerenciado pelo Supabase Edge ou provedor de hosting a definir (nenhuma decisão formal sobre provedor do backend está registrada em ADR)
- Rollback: fazer redeploy do commit anterior via CLI do provedor ou painel de controle
- Em Vercel (se usado para o backend): **Deployments → selecionar deploy anterior → Promote to Production**

### Frontend (`apps/web` — Vercel)

1. Acessar Vercel Dashboard → projeto `nave-web`
2. **Deployments** → localizar o último deploy estável
3. Clicar em **Promote to Production**
4. Verificar o endpoint `/health` da API após o rollback

---

## Incidentes de segurança

Em caso de vazamento de credenciais (ex: `SUPABASE_SERVICE_ROLE_KEY` exposta):

1. **Imediatamente:** revogar a chave comprometida no Dashboard do Supabase → **Settings → API → Rotate keys**
2. Atualizar todas as variáveis de ambiente nos ambientes afetados (produção, staging, CI)
3. Redeployar todos os serviços com as novas chaves
4. Auditar `audit_logs` para identificar acessos não autorizados no período de exposição
5. Notificar usuários afetados se dados pessoais foram potencialmente acessados (obrigação LGPD — C1, `docs/legal/lgpd-compliance.md`)
6. Registrar o incidente em `matrices/impacto.md`

Contato de segurança: **seguranca@nave.app** (conforme `docs/legal/privacy-policy.md`)

---

## Pendências formais

Os seguintes itens não têm decisão registrada e devem ser resolvidos com ADR antes do lançamento de produção:

- RTO e RPO alvo
- Plano Supabase e configuração de PITR (frequência de retenção)
- Estratégia de backup do Supabase Storage (fotos de veículos)
- Provedor de hosting do backend (`apps/api`) — apenas o frontend tem Vercel confirmado no README
- Gerenciador de segredos/variáveis de ambiente para produção
- Responsável formal pelo processo de DR (papel/pessoa)
