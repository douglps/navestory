---
id: SPEC-20260620-001
title: "Business Strategy Stories — Regras de Negócio e Crescimento"
status: draft
date: 2026-06-20
author: douglps
rules: [R-BIZ-01, R-BIZ-02, R-BIZ-03, R-BIZ-04, R-BIZ-05, R-BIZ-06, R-BIZ-07, R-BIZ-08, R-BIZ-09, R-BIZ-10, R-BIZ-11, R-BIZ-12, R-BIZ-13, R-BIZ-14, R-BIZ-15, S1, S2, S4, C1, C2]
security: [S1, S2, S4]
camadas: [frontend, backend, database, security]
---

# Business Strategy Stories

> Define quem pode usar o Nave, como entra, como cresce, o que é restrito por plano, e as estratégias de retenção e monetização. Cada story tem critérios de aceite mensuráveis.

---

## 1. Cadastro e Elegibilidade

### 1.1 Quem Pode se Cadastrar

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| BS-REG-01 | Qualquer pessoa com email válido pode criar uma conta gratuita no Nave | Cadastro via `/register` com nome, email e senha; conta ativa imediatamente |
| BS-REG-02 | O cadastro é individual — cada conta pertence a um único CPF/pessoa | Não há campo de CNPJ ou razão social no MVP; 1 conta = 1 pessoa |
| BS-REG-03 | O usuário deve selecionar seu perfil no cadastro: Autônomo, Pequena Frota ou Grande Frota | Campo `profile_type` obrigatório: `autonomous \| small_fleet \| large_fleet`; influencia onboarding e limites futuros |
| BS-REG-04 | O email é o identificador único — não é possível ter duas contas com o mesmo email | Tentativa de cadastro com email existente retorna 409 com link para login/recuperação |
| BS-REG-05 | Não há lista de espera, convite ou aprovação manual — o acesso é self-service | Conta criada → acesso imediato ao dashboard; nenhum fluxo de aprovação |

### 1.2 Quem NÃO Pode se Cadastrar (Restrições)

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| BS-BLK-01 | Usuário que teve conta deletada por admin (violação de termos) não pode recriar com o mesmo email | Email em blacklist retorna erro genérico; não revela motivo do bloqueio (anti-enumeração) |
| BS-BLK-02 | IPs com mais de 5 tentativas de registro em 15 minutos são bloqueados temporariamente | Rate limit S4 aplicado; retorna 429 com `Retry-After` header |
| BS-BLK-03 | Bots e scripts automatizados devem ser barrados no cadastro | Honeypot field invisível + tempo mínimo de preenchimento (< 2s = rejeição silenciosa) |
| BS-BLK-04 | Emails temporários/descartáveis (guerrillamail, tempmail, etc.) são recusados | Validação contra lista de domínios descartáveis; erro: "Use um email permanente" |
| BS-BLK-05 | Menores de 18 anos não podem criar conta (compliance veicular) | Campo data de nascimento ou checkbox "Declaro ter 18+ anos" com validação; dado não armazenado além da flag |

### 1.3 Como é o Cadastro (Fluxo)

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| BS-FLW-01 | O cadastro tem no máximo 1 tela com 4 campos: nome, email, senha, confirmar senha | Formulário único; sem wizard multi-step no MVP |
| BS-FLW-02 | Após cadastro, o usuário é direcionado ao onboarding wizard (primeiro veículo) | Redirect para `/onboarding` se `vehicles.count === 0`; wizard guia cadastro do 1º veículo |
| BS-FLW-03 | O usuário pode pular o onboarding e cadastrar o veículo depois | Botão "Pular por agora" → redirect para dashboard vazio com CTA proeminente |
| BS-FLW-04 | O sistema envia email de boas-vindas com dicas de primeiro uso | Email transacional via Supabase/Resend; conteúdo: 3 passos iniciais + link para app |
| BS-FLW-05 | O cadastro funciona 100% em dispositivo móvel (PWA) | Formulário responsivo; campos com teclado adequado (email → `inputMode: email`, senha → toggle visibilidade) |

---

## 2. Modelo de Assinatura e Monetização

### 2.1 Planos

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| BS-PLN-01 | Existe um plano **Grátis** que permite uso ilimitado durante o MVP/beta | Sem restrição de veículos, despesas ou histórico no plano gratuito; sem data de expiração |
| BS-PLN-02 | Após o beta, o plano Grátis será limitado a **3 veículos** e **janela de 2 meses** (corrente + anterior) | Despesas ilimitadas; meses fora da janela são consolidados em **dados gerais** (resumo); export bloqueado |
| BS-PLN-03 | O plano **Pro Mensal** (R$ 29,90/mês) desbloqueia histórico detalhado completo e veículos ilimitados | Tabela `subscriptions` com `plan_type`, `status`, `expires_at`; gateway Stripe ou Mercado Pago |
| BS-PLN-04 | O plano **Pro Anual** (R$ 199/ano = R$ 16,58/mês) tem os mesmos benefícios do Pro Mensal com export ilimitado | Desconto de ~43% incentiva compromisso longo; export sem rate limit |
| BS-PLN-05 | O plano **Frota** (R$ 49,90/mês) adiciona multi-usuário e relatórios consolidados | Tudo do Pro + workspace com membros convidados; API pública planejada para Fase 3 (requer simulação de custos de infra) |
| BS-PLN-06 | Trial de 14 dias do plano Pro ao criar conta nova | `trial_ends_at` preenchido no perfil; banner countdown no dashboard; expirado → downgrade automático para Grátis |

### 2.2 Limites por Plano

| Recurso | Grátis (beta) | Grátis (pós-beta) | Pro Mensal | Pro Anual | Frota |
|---------|--------------|-------------------|-----------|----------|-------|
| Veículos | Ilimitado | 3 | Ilimitado | Ilimitado | Ilimitado |
| Despesas/mês | Ilimitadas | Ilimitadas | Ilimitadas | Ilimitadas | Ilimitadas |
| Histórico detalhado | Tudo | Mês corrente + 1 anterior | Tudo | Tudo | Tudo |
| Meses antigos | — | Dados gerais (resumo consolidado) | Tudo detalhado | Tudo detalhado | Tudo detalhado |
| Exportação CSV | Ilimitada | **Bloqueado** | Rate limited (⚠️ limites em revisão) | Ilimitada | Ilimitada |
| Templates | 20 | 5 | 20 | 20 | 50 |
| Categorias customizadas | 20 | 5 | 20 | 20 | 50 |
| Grupos de veículos | 10 | 1 | 10 | 10 | Ilimitados |
| Membros do workspace | — | — | — | — | 10 (expandível) |
| API access | — | — | — | — | Fase 3 |
| Grace no downgrade | — | — | 30-180 dias (proporcional) | 30-365 dias (proporcional) | 30-365 dias (proporcional) |
| Suporte | Comunidade | Comunidade | Email (48h) | Email (48h) | Prioritário (24h) |

### 2.3 Monetização — Stories

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| BS-MON-01 | O usuário no plano Grátis vê banners contextuais de upgrade ao tentar acessar meses consolidados | Banner no mês trancado: "Desbloqueie seus detalhes com Pro"; nunca popup intrusivo |
| BS-MON-02 | O upgrade é feito em 1 clique no checkout integrado (Stripe/Mercado Pago) | Página `/settings/billing` com planos, preço e botão de checkout; sem redirect externo |
| BS-MON-03 | O downgrade para Grátis consolida dados fora da janela em **dados gerais** após o grace period | Dados gerais (resumo) sempre acessíveis; detalhes consolidados são irreversíveis; criação de novos registros nunca é bloqueada |
| BS-MON-04 | O cancelamento é self-service, sem retenção agressiva | `/settings/billing` → "Cancelar assinatura" → confirmação com resumo do que perde → grace period inicia no fim do período pago |
| BS-MON-05 | Cobrança falha → 3 tentativas em 7 dias → suspensão → 30 dias → downgrade automático | Status do plano reflete `active → past_due → suspended → cancelled`; emails em cada transição |
| BS-MON-06 | Grace period proporcional ao tempo como assinante: 50% do período, limitado a 1 ano, mínimo 30/60/90 dias por faixa | 1-3m → min 30d; 4-11m → min 60d; 12m+ → min 90d; fórmula: `max(min_faixa, min(365, tempo_assinante * 0.5))` |
| BS-MON-07 | Durante o grace, o sistema envia ofertas de win-back por email e banner in-app | Desconto proporcional: 20% (1-3m), 30% (4-11m), 40% + 1 mês grátis (12m+) |
| BS-MON-08 | Banner countdown durante o grace period: "Seus dados detalhados serão consolidados em X dias" | Banner `variant="warning"` no dashboard e na listagem de despesas; countdown atualizado diariamente |

### 2.4 Consolidação e Dados Gerais

> O sistema opera com 3 camadas de dados. **Dados detalhados** são registros individuais com todos os campos. **Dados gerais** são resumos mensais consolidados. A consolidação é o processo irreversível de transformar detalhes em resumo quando o usuário não tem mais direito de acesso detalhado.

#### Conteúdo dos Dados Gerais (resumo mensal)

| Dado | Exemplo |
|------|---------|
| Total de despesas | 12 registros |
| Valor total | R$ 2.340,00 |
| Valor por categoria | Combustível: R$ 1.200, Manutenção: R$ 800, Outros: R$ 340 |
| km/L médio (se aplicável) | 11,2 km/L |
| Veículos ativos no mês | 1 |
| Total de manutenções | 2 (1 concluída, 1 agendada) |
| Total de multas | 0 |

#### Quando ocorre a consolidação

| Cenário | Gatilho | Reversível? |
|---------|---------|------------|
| Grátis puro: mês sai da janela | Todo dia 1º, mês M-2 é consolidado (ex: em junho, abril consolida) | Não — nunca houve direito ao detalhe |
| Ex-Pro: grace expira | Data de expiração do grace → batch job consolida meses fora da janela | Não — consolidação permanente |
| Ex-Pro: reassina DENTRO do grace | Não consolida — dados detalhados restaurados integralmente | Sim (dentro do grace) |
| Ex-Pro: reassina DEPOIS do grace | Meses já consolidados permanecem como resumo; novos meses são detalhados | Parcial — só futuro |

#### Stories de Consolidação

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| BS-VLT-01 | Meses consolidados aparecem na timeline com ícone de resumo e totais visíveis | UI: ícone 📊, mês colapsado mostrando total gasto e quantidade de registros; sem drill-down |
| BS-VLT-02 | Ao clicar em um mês consolidado, o usuário vê CTA de upgrade contextual | "Estes dados estão consolidados. Assine o Pro para manter seus detalhes." |
| BS-VLT-03 | O sistema garante ao usuário que dados gerais nunca são deletados | Texto na UI: "Seus resumos estão seguros e disponíveis para sempre." |
| BS-VLT-04 | O dashboard no Grátis mostra KPIs dos meses visíveis + tendência baseada nos dados gerais | Gráfico de tendência usa dados gerais para meses antigos (totais, sem drill-down) |
| BS-VLT-05 | O processo de consolidação roda como batch job (cron ou on-demand) | Job diário ou semanal que identifica meses elegíveis e gera `monthly_summaries`; registros originais podem ser arquivados |
| BS-VLT-06 | Busca/filtro no Grátis mostra "X registros em meses consolidados" sem detalhes | Resultado: "3 registros encontrados em meses consolidados. Assine Pro para ver detalhes." |

#### Grace Period — Tabela de Referência

| Tempo como assinante | Grace calculado (50%) | Mínimo por faixa | Grace efetivo | Oferta win-back |
|---------------------|----------------------|------------------|--------------|-----------------|
| 1 mês | 15 dias | 30 dias | **30 dias** | 20% OFF |
| 3 meses | 45 dias | 30 dias | **45 dias** | 20% OFF |
| 6 meses | 90 dias | 60 dias | **90 dias** | 30% OFF |
| 12 meses | 180 dias | 90 dias | **180 dias** | 40% OFF + 1 mês grátis |
| 24 meses | 365 dias (cap) | 90 dias | **365 dias** | 40% OFF + 1 mês grátis |

---

## 3. Controle de Acesso e Roles

### 3.1 Roles do Sistema

| Role | Quem é | Como obtém |
|------|--------|-----------|
| `anonymous` | Visitante não autenticado | Sem JWT |
| `user` | Pessoa com conta ativa | Cadastro self-service |
| `admin` | Operador do sistema Nave | Atribuição manual via Supabase Dashboard (MVP) |
| `workspace_owner` | Dono de um workspace (plano Frota) | Cria workspace ao assinar plano Frota |
| `workspace_member` | Convidado de um workspace | Aceita convite do owner |

### 3.2 Permissões por Role — Stories

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| BS-ACL-01 | Um `anonymous` só pode acessar: landing page, login, cadastro, recuperação de senha | Qualquer outra rota redireciona para `/login`; API retorna 401 |
| BS-ACL-02 | Um `user` tem CRUD completo sobre seus próprios dados (veículos, despesas, manutenção, multas, custos recorrentes) | RLS `auth.uid() = user_id` enforced em toda operação |
| BS-ACL-03 | Um `user` nunca pode ver, editar ou deletar dados de outro `user` | Tentativa via API retorna 404 (não 403) — anti-enumeração |
| BS-ACL-04 | Um `admin` pode listar usuários, visualizar audit logs globais e deletar contas | Rotas `/admin/*` protegidas por `AdminGuard`; ações logadas em `audit_logs` |
| BS-ACL-05 | Um `admin` NÃO pode editar dados de negócio de um usuário (veículos, despesas) | Sem endpoint admin para CRUD de dados de usuário; separação clara admin ≠ suporte |
| BS-ACL-06 | Um `workspace_member` vê apenas veículos aos quais foi atribuído pelo owner | Filtro adicional `workspace_vehicle_assignments.member_id` em queries |
| BS-ACL-07 | Um `workspace_owner` pode convidar/remover membros e atribuir veículos | CRUD em `workspace_members` e `workspace_vehicle_assignments` |

### 3.3 Segurança de Conta — Stories

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| BS-SEC-01 | Após 5 tentativas de login falhas consecutivas, a conta é bloqueada por 15 minutos | Contador por email; exibe countdown; reset ao sucesso |
| BS-SEC-02 | O usuário pode solicitar exclusão total da conta (LGPD) | `DELETE /users/me` com `confirm: true` → soft-delete + anonimização de PII; 30 dias para cancelar |
| BS-SEC-03 | Sessão sem "Lembrar-me" expira após 30 minutos de inatividade | Activity tracker monitora interações; logout automático com toast |
| BS-SEC-04 | Troca de senha invalida todas as sessões ativas | Reset de senha via Supabase revoga refresh tokens; re-login obrigatório |
| BS-SEC-05 | (Fase 2) MFA via TOTP disponível como opção no perfil | `settings/security` → habilitar autenticador; QR code + recovery codes |
| BS-SEC-06 | (Fase 2) Login social via Google e Apple | Botões OAuth na tela de login; merge com conta existente se email coincide |

### 3.4 Overrides Administrativos de Feature (3 camadas)

> Os limites por plano (seção 2.2) definem o comportamento **padrão**. Este mecanismo permite ao `admin` sobrepor esse padrão em 3 camadas de escopo, sem mudar o plano do usuário nem esperar um novo ciclo de desenvolvimento — útil para casos de suporte, exceções comerciais ou rollout controlado de features novas.

**Modelo de dados (conceitual):**

- `feature_flags`: registro de features controláveis — `key`, `label`, `description`, `category`, `default_enabled`.
- `feature_overrides`: `id`, `feature_key`, `scope` (`system \| plan \| user`), `scope_ref` (`NULL` para `system`; `plan_type` para `plan`; `user_id` para `user`), `enabled`, `force` (só em `scope = 'system'` — kill-switch), `reason` (obrigatório, mín. 10 caracteres), `granted_by`, `expires_at` (opcional), `revoked_at` (opcional), `created_at`.

**Precedência de resolução** (da mais alta para a mais baixa):

1. Override `system` com `force = true` → vence sobre tudo (kill-switch).
2. Override `user` ativo (não expirado, não revogado) → vence.
3. Override `plan` ativo para o `plan_type` do usuário → vence.
4. Override `system` sem `force` → vence.
5. Senão, `feature_flags.default_enabled`.

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| BS-ADM-01 | Admin define o default de uma feature para todo o sistema (ativado/desativado) | `PUT /admin/features/:key/system` com `enabled`, `reason` |
| BS-ADM-02 | Admin sobrescreve uma feature para todos os assinantes de um plano específico (Grátis/Pro Mensal/Pro Anual/Frota) | `PUT /admin/features/:key/plans/:planType` com `enabled`, `reason` |
| BS-ADM-03 | Admin concede override pontual de uma feature para um usuário individual, com motivo obrigatório | `POST /admin/features/:key/users/:userId` com `enabled`, `reason`, `expires_at` opcional |
| BS-ADM-04 | Resolução segue `Usuário > Plano > Sistema`, exceto quando o admin ativa "forçar globalmente" no override de sistema — esse modo (kill-switch) ignora overrides de plano e de usuário | Campo `force` em `scope = 'system'`; validado e documentado na UI com aviso de impacto |
| BS-ADM-05 | Toda criação, alteração ou revogação de override é registrada em audit log com escopo, motivo e admin responsável | Aplica C2; `action = 'FEATURE_OVERRIDE_GRANTED' \| 'REVOKED' \| 'FORCED'` |
| BS-ADM-06 | Override com `expires_at` vencido é ignorado automaticamente na leitura — sem job/cron necessário | Regra de leitura: `expires_at IS NULL OR expires_at > NOW()` |
| BS-ADM-07 | Admin visualiza, por feature, todos os overrides ativos organizados por escopo (sistema/plano/usuário) e pode revogar qualquer um | `GET /admin/features/:key/overrides` agrupado por `scope` |
| BS-ADM-08 | A tela de gestão de features permite buscar um usuário específico e ver/gerenciar diretamente os overrides dele | Busca por nome/email dentro da aba "Usuários" da tela de gestão |

---

## 4. Onboarding e Ativação

### 4.1 Definição de Ativação

> Um usuário é considerado **ativado** quando completa: cadastro + 1 veículo + 1 despesa. Meta: > 60% dos cadastros ativados em 7 dias.

### 4.2 Stories de Onboarding

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| BS-ONB-01 | Usuário novo sem veículos vê wizard de 3 passos: perfil → 1º veículo → 1ª despesa | Wizard modal; progresso salvo entre passos; pode sair e retomar |
| BS-ONB-02 | O wizard pré-preenche dados via placa (consulta FIPE/denatran) para reduzir fricção | Input da placa → auto-preenche marca, modelo, ano, tipo; usuário confirma |
| BS-ONB-03 | Após completar o wizard, o dashboard exibe checklist de "primeiros passos" | Checklist: ☑ Cadastrar veículo, ☐ Registrar despesa, ☐ Configurar preferências, ☐ Instalar PWA |
| BS-ONB-04 | Usuários que pulam o onboarding recebem email de nudge após 48h sem veículo | Email: "Falta pouco! Cadastre seu primeiro veículo em 30 segundos" |
| BS-ONB-05 | O onboarding para perfil "Pequena Frota" sugere importação em lote de veículos | Passo extra: upload CSV com placa, marca, modelo, ano → bulk create |
| BS-ONB-06 | O dashboard vazio (zero veículos) nunca mostra gráficos vazios — exibe CTA contextual | Empty state com ilustração + "Cadastre seu primeiro veículo para começar a acompanhar seus custos" |

---

## 5. Retenção e Engajamento

### 5.1 Métricas de Engajamento

| Métrica | Meta | Medição |
|---------|------|---------|
| DAU/MAU | > 30% | Logins únicos/mês |
| Ações/semana | > 3 | Despesas + manutenções criadas |
| Retenção D7 | > 40% | Retorno dentro de 7 dias do cadastro |
| Retenção D30 | > 25% | Retorno dentro de 30 dias |
| Churn mensal | < 8% | Contas sem login em 30 dias |

### 5.2 Stories de Retenção

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| BS-RET-01 | O sistema envia lembrete semanal de "Registre seus gastos da semana" se o usuário ficou 5+ dias sem registrar | Push notification (PWA) ou email; opt-out em `/settings/notifications` |
| BS-RET-02 | O dashboard exibe "streak" de dias consecutivos com registro | Badge visual: 🔥 3 dias → 7 dias → 30 dias; gamification leve |
| BS-RET-03 | Alerta proativo quando vencimento de IPVA/CRLV/seguro está a 60 dias | Banner no dashboard + notificação; CTA para registrar custo recorrente (R-REC-02) |
| BS-RET-04 | Resumo mensal automático enviado por email no dia 1º de cada mês | Email com: total gasto, km/L médio, top 3 categorias, comparação com mês anterior |
| BS-RET-05 | O usuário recebe insight contextual quando há anomalia nos gastos | Ex: "Seu gasto com combustível subiu 35% este mês. Ver detalhes?" |
| BS-RET-06 | Usuário inativo há 14 dias recebe email de reengajamento com resumo | "Você tem 3 despesas pendentes e 1 manutenção agendada. Volte para atualizar." |
| BS-RET-07 | Usuário inativo há 60 dias: email de "sentimos sua falta" com oferta de ajuda | "Encontrou algum problema? Responda este email e vamos ajudar." |

---

## 6. Crescimento e Aquisição

### 6.1 Canais de Aquisição — Stories

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| BS-GRW-01 | O usuário pode convidar amigos via link de referral com benefício mútuo | `/settings/referral` → link único; convidado ganha 30 dias Pro; quem convidou ganha 15 dias Pro por convite aceito |
| BS-GRW-02 | O link de referral rastreia origem e converte em atribuição | Tabela `referrals` com `referrer_id`, `referred_id`, `status`, `rewarded_at` |
| BS-GRW-03 | O sistema gera relatório compartilhável (imagem) de resumo mensal | Botão "Compartilhar" no resumo → gera card PNG com dados anonimizados para redes sociais |
| BS-GRW-04 | Landing page com calculadora de "quanto você gasta por km" para captar leads | Formulário simples (km/mês, consumo, preço) → resultado + CTA para cadastro |
| BS-GRW-05 | SEO: blog integrado com conteúdo sobre gestão veicular, economia de combustível, manutenção preventiva | Blog em `/blog` com SSR; conteúdo indexável; CTA para cadastro em cada post |

### 6.2 Expansão de Conta — Stories

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| BS-EXP-01 | Autônomo que adiciona 4º veículo recebe sugestão de upgrade para Pro | Modal: "Você cresceu! Com o Pro, gerencie veículos ilimitados." |
| BS-EXP-02 | Usuário Pro que tenta convidar membro recebe sugestão de upgrade para Frota | "Precisa de ajuda para gerenciar? O plano Frota permite membros na equipe." |
| BS-EXP-03 | Usuário Frota com 10+ veículos recebe oferta de onboarding assistido | Email do time: "Quer ajuda para configurar sua frota? Agende uma call gratuita." |
| BS-EXP-04 | (Fase 3) API pública permite integração com ERP, contabilidade e seguradoras — **requer simulação de custos de infra aprovada antes do desenvolvimento** | API REST documentada; API key por workspace; rate limit por plano; pré-requisito: BS-INFRA-01 |
| BS-INFRA-01 | Antes de lançar a API pública, realizar simulação de custos de infraestrutura Supabase por tier de uso | Documento com projeção de custos: requests/dia por frotista típico × número estimado de clientes API × custo Supabase Pro/Team |
| BS-INFRA-02 | Definir rate limits da API pública por plano, baseado na simulação de custos | Tabela: Frota → X req/min, Y req/dia; burst limit; custo estimado por cliente |

---

## 7. Compliance e Dados

### 7.1 LGPD e Privacidade — Stories

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| BS-LGP-01 | O usuário pode exportar seus dados conforme o plano: Grátis = bloqueado; Pro mensal = rate limited; Pro anual/Frota = ilimitado. Export LGPD (portabilidade) sempre disponível em formato resumido | `/settings/data` → "Exportar meus dados": Pro/Frota = ZIP completo; Grátis = dados gerais consolidados (satisfaz LGPD sem dar bypass ao paywall) |
| BS-LGP-02 | O usuário pode solicitar exclusão completa da conta em self-service | Fluxo: confirmar senha → checkbox "Entendo que é irreversível" → soft-delete imediato → hard-delete em 30 dias |
| BS-LGP-03 | Dados anonimizados após exclusão: nome → "Usuário removido", email → hash | `profiles.full_name = 'Usuário removido'`, `email = sha256(email)@deleted.nave.app` |
| BS-LGP-04 | Audit logs do usuário deletado preservam `record_id` mas anonimizam `user_id` | `audit_logs.user_id = NULL` (ON DELETE SET NULL); log preservado para compliance |
| BS-LGP-05 | Cookies de analytics (se houver) requerem consentimento explícito | Banner de cookies na 1ª visita; sem tracking antes do aceite; opt-out a qualquer momento |

### 7.2 Termos e Políticas

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| BS-TRM-01 | O cadastro exige aceite dos Termos de Uso e Política de Privacidade | Checkbox obrigatório com links; `accepted_terms_at` persistido no perfil |
| BS-TRM-02 | Ao atualizar os termos, o sistema solicita re-aceite no próximo login | Banner persistente até aceitar; bloqueia operações de escrita (não de leitura) |
| BS-TRM-03 | A Política de Privacidade detalha quais dados são coletados e por quê | Página `/privacy` com linguagem simples; tabela dado → finalidade → base legal |

---

## 8. Suporte e Comunicação

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| BS-SUP-01 | O plano Grátis tem acesso a FAQ e comunidade (fórum/Discord) | Link no footer e em `/settings/help`; sem canal direto de suporte |
| BS-SUP-02 | O plano Pro tem suporte por email com SLA de 48h | Formulário em `/settings/help` → ticket por email; resposta em até 48h úteis |
| BS-SUP-03 | O plano Frota tem suporte prioritário com SLA de 24h + chat | Widget de chat in-app (Intercom/Crisp); escalação automática se não resolvido em 24h |
| BS-SUP-04 | O sistema coleta NPS a cada 30 dias de uso ativo | Modal discreto (1 pergunta, 0-10) no 30º dia; resultado salvo em `user_feedback` |
| BS-SUP-05 | O feedback negativo (NPS < 7) dispara alerta para o time de produto | Webhook para Slack com dados do usuário e comentário; follow-up manual obrigatório |

---

## 9. Regras de Negócio Propostas (candidatas para RULES.md)

| ID proposto | Regra | Justificativa |
|-------------|-------|---------------|
| R-BIZ-01 | Cadastro é self-service, sem aprovação, para qualquer email válido não-descartável | Reduzir fricção de aquisição |
| R-BIZ-02 | Limites de plano nunca bloqueiam criação de registros — apenas restringem visibilidade do histórico e export | Evitar hostage de dados; confiança do usuário |
| R-BIZ-03 | Trial Pro de 14 dias para toda conta nova; downgrade automático ao expirar | Mostrar valor antes de cobrar |
| R-BIZ-04 | Referral: 30 dias Pro para convidado, 15 dias Pro para quem convidou; máximo 10 referrals ativos por conta | Crescimento orgânico com cap anti-abuso |
| R-BIZ-05 | Exclusão de conta é self-service com período de graça de 30 dias (LGPD) | Compliance + retenção de última instância |
| R-BIZ-06 | Re-aceite de termos atualizados bloqueia escrita mas não leitura | Compliance sem punir o usuário |
| R-BIZ-07 | Emails descartáveis e contas banidas por admin não podem re-registrar | Integridade da base de usuários |
| R-BIZ-08 | NPS coletado a cada 30 dias ativos; feedback negativo gera alerta automático | Feedback loop contínuo |
| R-BIZ-09 | Dados gerais (resumos mensais consolidados) são retidos indefinidamente enquanto a conta existir, independente do plano | Confiança e portabilidade; LGPD exige acesso aos dados |
| R-BIZ-10 | Downgrade consolida dados fora da janela visível em resumo mensal; nunca deleta registros durante o grace period | Anti-hostage; consolidação é sobre granularidade, não exclusão |
| R-BIZ-11 | Grace period = 50% do tempo como assinante, cap 1 ano, mínimo 30d (1-3m) / 60d (4-11m) / 90d (12m+) | Fidelidade recompensada proporcionalmente |
| R-BIZ-12 | Export bloqueado no plano Grátis; Pro mensal com rate limit (a definir); Pro anual e Frota ilimitados | Anti-gaming: impede dump de dados sem compromisso |
| R-BIZ-13 | API pública requer simulação de custos de infraestrutura aprovada antes do lançamento | Evitar que custo de infra ultrapasse receita do plano |
| R-BIZ-14 | Consolidação é irreversível — após expirar o grace, dados gerais são permanentes e não podem ser reexpandidos em detalhes | Simplicidade operacional; incentivo a não deixar o grace expirar |
| R-BIZ-15 | Resolução de features segue precedência Usuário > Plano > Sistema, exceto quando o admin ativa "forçar globalmente" (kill-switch) no escopo Sistema, que sobrepõe todos os overrides; toda alteração é auditada e exige motivo obrigatório | Suporte a casos individuais e rollouts/kill-switches em massa sem comprometer a integridade do modelo de monetização |

---

## 10. Roadmap de Implementação Sugerido

| Fase | Stories | Dependência |
|------|---------|-------------|
| **MVP (atual)** | BS-REG-01 a 05, BS-BLK-01 a 02, BS-FLW-01 a 03, BS-ACL-01 a 05, BS-SEC-01 a 04, BS-LGP-02 a 04 | Já implementado ou parcialmente |
| **Pós-beta (Fase 2)** | BS-PLN-01 a 06, BS-MON-01 a 08, BS-VLT-01 a 06, BS-BLK-03 a 05, BS-FLW-04, BS-ONB-01 a 06, BS-TRM-01 a 03, BS-ADM-01 a 08 | Gateway de pagamento, email transacional, tabela `monthly_summaries`, cron de consolidação, tabelas `feature_flags`/`feature_overrides`, tela `/admin/features` |
| **Crescimento (Fase 3)** | BS-RET-01 a 07, BS-GRW-01 a 05, BS-EXP-01 a 03, BS-SUP-01 a 05, BS-SEC-05 a 06, BS-INFRA-01 a 02 | Analytics, push notifications, OAuth, simulação de custos |
| **Enterprise (Fase 4)** | BS-ACL-06 a 07, BS-EXP-04, BS-PLN-05 (Frota expandido com API) | Multi-tenant workspace, API pública (pós simulação BS-INFRA-01) |
