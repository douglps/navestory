# Conformidade com a LGPD — Nave SaaS

> Este documento consolida as obrigações legais e técnicas do projeto Nave em relação à Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018). As fontes são `docs/legal/privacy-policy.md` (documento voltado ao usuário final) e as regras C1, C2 e R-BIZ-05 de `specs/RULES.md`.

**Última atualização:** 2026-07-13  
**Controlador de dados:** Nave Tecnologia Ltda.  
**Encarregado (DPO):** privacidade@nave.app  

---

## 1. Papel da Nave no tratamento de dados

A **Nave Tecnologia Ltda.** é o **controlador** dos dados pessoais dos usuários da plataforma, conforme definido pelo art. 5º, VI da LGPD. O Supabase Inc. atua como **operador** (subprocessador), processando dados por instrução da Nave.

---

## 2. Bases legais de tratamento

Toda operação de tratamento de dados pessoais na Nave possui base legal identificada:

| Operação de tratamento | Base legal (LGPD) | Artigo |
|------------------------|-------------------|--------|
| Criar e gerenciar conta de usuário | Execução de contrato | Art. 7º, V |
| Exibir veículos, despesas e manutenções | Execução de contrato | Art. 7º, V |
| Enviar alertas de manutenção por e-mail | Execução de contrato | Art. 7º, V |
| Proteger a plataforma contra acessos indevidos | Legítimo interesse | Art. 7º, IX |
| Gerar logs de auditoria de segurança | Legítimo interesse | Art. 7º, IX |
| Enviar comunicados sobre mudanças no serviço | Legítimo interesse | Art. 7º, IX |
| Melhorar a plataforma com dados de uso agregados e anônimos | Legítimo interesse | Art. 7º, IX |
| Cumprir obrigações legais (ex: ordem judicial) | Cumprimento de obrigação legal | Art. 7º, II |

A Nave **não usa dados pessoais para publicidade de terceiros**.

---

## 3. Categorias de dados tratados

### 3.1 Dados fornecidos pelo usuário

- Identificação: nome completo, e-mail, senha (armazenada como hash bcrypt pelo Supabase GoTrue — a Nave nunca vê o hash)
- Dados de veículo: placa, marca, modelo, ano, cor, fotos, odômetro
- Dados financeiros: despesas por categoria, valores, datas, fornecedores de combustível
- Dados de manutenção: tipo de serviço, data agendada, custo realizado
- Dados de multas: descrição da infração, valor, datas, código da infração

### 3.2 Dados coletados automaticamente

- Endereço IP (rate limiting e prevenção de fraudes)
- Tipo e versão do navegador
- Tokens de sessão JWT (access: 15min; refresh: 7 dias — ADR-003)
- Logs de acesso sem dados pessoais identificáveis (regra R-MON-02 de `specs/RULES.md`)

### 3.3 Dados que não são coletados

- Localização GPS
- Contatos do dispositivo
- Dados de outros aplicativos
- Dados financeiros bancários ou de cartão de crédito
- Dados biométricos
- Dados de menores de 18 anos (a plataforma não é destinada a menores)

---

## 4. Medidas técnicas de proteção

| Medida | Implementação |
|--------|--------------|
| Isolamento por usuário | Row Level Security (RLS) no PostgreSQL — `auth.uid() = user_id` em todas as tabelas (regra S2) |
| Criptografia em repouso | Gerenciada pela infraestrutura Supabase/AWS |
| Criptografia em trânsito | HTTPS/TLS obrigatório em todos os endpoints |
| Autenticação stateless | JWT com access token de 15min; refresh token de 7 dias (ADR-003) |
| Rate limiting | 100 req/60s global; 5 req/15min para registro; 10 req/15min para login (regra S4) |
| Logs sem PII | `audit_logs.changes` omite campos sensíveis: `user_id`, `photo_url`, tokens (regra R-MON-02) |
| Stack trace oculto | `HttpExceptionFilter` não expõe stack em `NODE_ENV=production` (regra S5) |
| Chave de serviço isolada | `SUPABASE_SERVICE_ROLE_KEY` apenas no backend; nunca exposta como `NEXT_PUBLIC_*` (regra S3) |
| Limpeza de cache offline | Cache do Service Worker limpo no evento `SIGNED_OUT` do Supabase Auth (regra S6) |
| Auditoria completa | Toda mutação registrada em `audit_logs` com `action`, `table_name`, `record_id`, `changes` (regra C2) |

---

## 5. Direitos do titular de dados

Os usuários podem exercer os seguintes direitos via **privacidade@nave.app** (prazo de resposta: 5 dias úteis):

| Direito | Como é atendido |
|---------|----------------|
| Acesso (art. 18, I) | Solicitação por e-mail; dados exibidos na própria plataforma |
| Correção (art. 18, III) | Direto nas configurações do perfil ou por e-mail |
| Exclusão (art. 18, VI) | Self-service: Configurações da conta → "Excluir conta" (ver Seção 6) |
| Portabilidade (art. 18, V) | Export CSV disponível no Dashboard (SPEC-20260521-003); também por e-mail |
| Revogação de consentimento (art. 18, IX) | Por e-mail; pode limitar funcionalidades |
| Informação sobre compartilhamento (art. 18, VII) | Por e-mail; ver lista de subprocessadores em `docs/legal/data-processing-agreement.md` |
| Oposição (art. 18, XI) | Por e-mail para tratamento baseado em legítimo interesse |
| Revisão de decisão automatizada | Por e-mail; aplicável quando relevante |

Reclamações podem ser encaminhadas à **ANPD** em gov.br/anpd.

---

## 6. Processo de exclusão de conta em cascata (C1)

**Regra C1 de `specs/RULES.md`:** dados pessoais processados sob LGPD; exclusão completa acionada via `DELETE /users/me` com cascata em todas as tabelas do usuário.

**Implementação:** ao solicitar exclusão de conta (self-service ou via admin — SPEC-20260521-004):

1. O serviço inicia um período de graça de **30 dias** (R-BIZ-05)
2. Durante o período de graça, a conta é desativada mas os dados são mantidos (possibilidade de reversão)
3. Após os 30 dias: exclusão definitiva ou anonimização irreversível de todos os registros vinculados ao `user_id` em:
   - `profiles`
   - `vehicles` (e em cascata: `expenses`, `maintenances`, `fines`, `vehicle_recurring_costs`, `vehicle_odometer_cycles`, `vehicle_group_members`)
   - `expense_templates`
   - `user_categories`
   - `user_preferences`
   - `vehicle_groups`
   - Arquivos no Supabase Storage (fotos de veículos)
4. `audit_logs`: o `user_id` é setado para `NULL` via `ON DELETE SET NULL` — os registros são preservados para fins de compliance, sem mais identificar o usuário (R-MON-03)
5. Dados exigidos por obrigação legal são retidos conforme o prazo da legislação aplicável

**Endpoint:** `DELETE /users/me` (autenticado) ou `DELETE /admin/users/:id` (admin).

**Nota técnica:** o processador de exclusão deve ser idempotente — reexecutar a operação não deve causar erro.

---

## 7. Retenção de dados

| Situação | Prazo |
|----------|-------|
| Conta ativa | Enquanto o usuário usar o serviço |
| Após solicitação de exclusão | 30 dias de graça (R-BIZ-05) |
| Após o período de graça | Exclusão definitiva ou anonimização |
| Logs de segurança (sem PII) | Até 12 meses |
| Dados exigidos por obrigação legal | Conforme a legislação aplicável |
| Resumos mensais consolidados (plano Gratuito pós-downgrade) | Retidos indefinidamente enquanto a conta existir (R-BIZ-09); detalhes fora da janela do plano são consolidados, nunca deletados durante grace period (R-BIZ-10) |

---

## 8. Incidente de segurança

Em caso de incidente que coloque dados pessoais em risco:

1. Avaliar o escopo e a gravidade do incidente
2. Se houver risco real aos direitos dos titulares: notificar os usuários afetados dentro do prazo legal
3. Comunicar à ANPD quando aplicável (art. 48 da LGPD)
4. Registrar o incidente internamente com data, descrição, dados afetados e medidas tomadas

Contato: **seguranca@nave.app**

---

## 9. Cookies e armazenamento local

| Recurso | Conteúdo | Finalidade |
|---------|----------|------------|
| Cookie de sessão (httpOnly) | JWT de autenticação | Manter sessão segura |
| Service Worker cache | Assets do app e respostas da API (dados removidos no logout — S6) | Funcionamento offline e performance |
| localStorage | Preferências de interface; contexto de veículo "Em Foco" (R-CTX-02) | Experiência personalizada |
| sessionStorage | Rascunho automático de formulários quando `auto_draft_enabled = true` (R-PREF-02) | Recuperação de dados em caso de fechamento acidental |

Não são usados cookies de rastreamento publicitário nem ferramentas de analytics que identifiquem o usuário individualmente.

---

## 10. Atualizações desta política

Alterações significativas nos termos são comunicadas por e-mail com pelo menos 15 dias de antecedência. Mudanças que exijam novo aceite bloqueiam operações de escrita (mas não de leitura) até o usuário confirmar (R-BIZ-06). A data de "última atualização" no topo deste documento é alterada a cada revisão.
