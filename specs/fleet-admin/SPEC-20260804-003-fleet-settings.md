---
id: SPEC-20260804-003
title: "Configurações da Frota — Campos Obrigatórios, Checklist de Onboarding e Conformidade Documental"
status: approved
date: 2026-08-04
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-FLEET-01, R-FLEET-02, R-FLEET-03, R-FLEET-04, R-WS-04, R-TZ-01, C2]
security: [S1, S2, S12]
camadas: [frontend, backend, database]
---

# Configurações da Frota — Campos Obrigatórios, Checklist de Onboarding e Conformidade Documental

## Contexto

O plano Frota do navestory prevê dois papéis distintos: `workspace_owner` (gestor) e `workspace_member` (motorista convidado). O workspace_owner já pode convidar membros e atribuir veículos (BS-ACL-06, BS-ACL-07 — cf. SPEC-20260620-001, status: draft, não implementado). O que não existe hoje é qualquer mecanismo que garanta a qualidade e completude do cadastro dos motoristas da equipe.

Sem essa feature, o gestor não tem como exigir que motoristas preencham dados mínimos (CNH, validade, categoria, telefone) antes de começar a usar o sistema, nem visibilidade sobre quais motoristas estão com documentação em dia. O resultado é dado inconsistente na frota, cobrança manual fora do produto e risco operacional real (motorista com CNH vencida usando veículo da empresa sem que o gestor saiba).

O PRD registra dois JTBDs diretamente relacionados a este problema:

- **JTBD-6** (P-002 Ana / P-003 Roberto no papel de workspace_owner): ter visão consolidada e atualizada da situação documental de cada motorista do workspace — CNH vigente, cadastro mínimo preenchido — sem depender de planilha ou cobrança manual fora do produto.
- **JTBD-7** (P-002 Ana / P-003 Roberto): configurar quais campos são obrigatórios e o que cada motorista convidado deve preencher antes do primeiro uso, garantindo padrão de dados em toda a equipe sem precisar cobrar individualmente.

Esta spec define o MVP dessas duas jobs: campos obrigatórios com defaults do sistema, checklist de onboarding para o motorista, alertas de vencimento de CNH in-app e painel de conformidade consolidado.

## Objetivo

Permitir que o `workspace_owner` defina (ou simplesmente use os defaults do sistema) quais dados de motorista são obrigatórios antes do primeiro uso, garanta que o motorista saiba exatamente o que preencher ao aceitar o convite, receba alertas antecipados de vencimento de CNH no próprio painel e visualize a situação documental de toda a equipe em uma única tela — sem planilha, sem cobrança manual, sem sair do navestory.

## Histórias de Usuário e Critérios de Aceitação

### US-01 — Campos obrigatórios de motorista com defaults do sistema

**Como** workspace_owner, **quero** que o sistema já exija CNH, validade da CNH, categoria da habilitação e telefone de todo motorista convidado por padrão, **para** garantir dados mínimos de conformidade na equipe sem precisar configurar nada manualmente.

- **Dado que** sou workspace_owner e acabei de criar um workspace no plano Frota, **quando** acesso as Configurações da Frota pela primeira vez, **então** já encontro CNH, validade da CNH, categoria da habilitação e telefone marcados como obrigatórios pelo sistema, sem ter feito nenhuma configuração.
- **Dado que** sou workspace_owner, **quando** desativo um campo antes obrigatório (ex: categoria da habilitação), **então** o sistema salva minha preferência e o campo deixa de bloquear o onboarding dos próximos motoristas convidados, enquanto motoristas já cadastrados sem esse campo não são retroativamente afetados.
- **Dado que** sou workspace_owner, **quando** reativo um campo como obrigatório, **então** motoristas com esse campo ausente passam a aparecer como "incompleto" no painel de conformidade.

### US-02 — Checklist de onboarding para o motorista convidado

**Como** workspace_member (motorista convidado), **quero** ver claramente o que preciso preencher antes do meu primeiro uso do sistema, **para** não ser bloqueado por falta de dados e entender exatamente o que a empresa exige de mim.

- **Dado que** recebi e aceitei um convite de workspace, **quando** acesso o sistema pela primeira vez após aceitar, **então** vejo uma tela de boas-vindas com checklist dos campos obrigatórios pendentes de preenchimento, com link direto para o meu perfil em cada item.
- **Dado que** meu cadastro ainda está incompleto, **quando** navego para qualquer outra tela do workspace, **então** um banner ou indicador persistente informa que meu cadastro está incompleto e me oferece acesso rápido ao checklist.
- **Dado que** completei todos os campos obrigatórios, **quando** salvo o último campo, **então** o checklist é marcado como concluído, o indicador de pendência some e o sistema confirma que estou pronto para usar a frota.

### US-03 — Alerta de vencimento de CNH dos motoristas

**Como** workspace_owner, **quero** ser alertado quando a CNH de um motorista do meu workspace está vencendo (30 dias e 7 dias antes), **para** agir com antecedência e evitar que um motorista com CNH vencida use veículos da equipe.

- **Dado que** sou workspace_owner e um motorista do workspace tem CNH com vencimento em 30 dias, **quando** acesso o painel da frota, **então** vejo um alerta in-app (badge na navegação e/ou notificação no painel de conformidade) identificando o motorista e a data de vencimento.
- **Dado que** sou workspace_owner e um motorista do workspace tem CNH com vencimento em 7 dias, **quando** acesso o painel da frota, **então** o alerta é exibido com urgência visual diferenciada (nível superior ao alerta de 30 dias), conforme a escala de R-DS-08.
- **Dado que** a CNH de um motorista já está vencida, **quando** acesso o painel de conformidade, **então** aquele motorista aparece com status "Vencida" em destaque `danger` e o alerta de vencimento não é mais exibido no lugar do alerta de CNH ativa.

### US-04 — Painel de conformidade consolidado da equipe

**Como** workspace_owner, **quero** ver em uma única tela o status de cadastro e documentação de todos os motoristas do meu workspace, **para** identificar rapidamente quem está em dia, quem está com dados incompletos e quem tem CNH vencendo ou vencida — sem consultar cada perfil individualmente.

- **Dado que** sou workspace_owner, **quando** acesso a tela "Configurações da Frota", **então** vejo uma tabela/lista com todos os motoristas do workspace exibindo: nome, status de cadastro (Completo / Incompleto), status da CNH (Em dia / Vencendo em N dias / Vencida) e data de validade da CNH.
- **Dado que** sou workspace_owner e filtro por status "Incompleto" ou "Vencendo", **quando** o filtro é aplicado, **então** a lista exibe apenas os motoristas no estado selecionado, com os campos faltantes ou a data de vencimento em evidência.
- **Dado que** sou workspace_owner e clico em um motorista na lista de conformidade, **quando** o detalhe abre, **então** consigo ver quais campos obrigatórios estão preenchidos e quais estão ausentes, sem precisar acessar o perfil completo do motorista em outra tela.

## Requisitos Funcionais

| ID | Requisito | Prioridade | História relacionada |
|----|-----------|------------|----------------------|
| RF-01 | O sistema aplica, por default e sem configuração manual do owner, os campos obrigatórios: número da CNH, validade da CNH, categoria da habilitação e telefone de contato | Alta | US-01 |
| RF-02 | A tela "Configurações da Frota" exibe a lista de campos obrigatórios com toggles de ativação/desativação por campo; o owner pode alterar qualquer campo; a mudança persiste imediatamente no workspace | Alta | US-01 |
| RF-03 | A configuração de campos obrigatórios é por workspace, não por veículo ou por motorista individual; todos os workspace_members ficam sujeitos à mesma configuração | Alta | US-01 |
| RF-04 | Ao aceitar um convite de workspace, o workspace_member é redirecionado para uma tela de checklist de onboarding listando todos os campos obrigatórios pendentes de preenchimento, com link direto para cada campo no perfil | Alta | US-02 |
| RF-05 | Enquanto o cadastro do workspace_member estiver incompleto, um indicador persistente (banner no topo da página ou badge na sidebar) informa a pendência com acesso rápido ao checklist | Média | US-02 |
| RF-06 | Ao completar todos os campos obrigatórios, o checklist é marcado como concluído, o indicador persistente desaparece e o sistema exibe confirmação visual de conclusão | Alta | US-02 |
| RF-07 | O sistema calcula diariamente (ou no carregamento do painel) a diferença entre a data atual (no fuso do owner, aplicando R-TZ-01) e a validade da CNH de cada motorista do workspace | Alta | US-03 |
| RF-08 | Quando a validade da CNH de um motorista está entre 8 e 30 dias da data atual, o sistema exibe um alerta in-app de nível `warning` no painel de conformidade, identificando o motorista e os dias restantes | Alta | US-03 |
| RF-09 | Quando a validade da CNH de um motorista está entre 0 e 7 dias da data atual, o sistema exibe um alerta in-app de nível `urgency-hot` (conforme R-DS-08) no painel de conformidade | Alta | US-03 |
| RF-10 | Quando a validade da CNH de um motorista é anterior à data atual, o status daquele motorista é "Vencida" com nível `danger`; o alerta de "vencendo" não é mais exibido para esse motorista | Alta | US-03 |
| RF-11 | A tela "Configurações da Frota" inclui uma seção de painel de conformidade com lista de todos os workspace_members exibindo: nome, status de cadastro (Completo / Incompleto) e status da CNH (Em dia / Vencendo em N dias / Vencida) | Alta | US-04 |
| RF-12 | O painel de conformidade oferece filtro por status de cadastro (Todos / Completo / Incompleto) e por status de CNH (Todos / Em dia / Vencendo / Vencida) | Média | US-04 |
| RF-13 | Ao selecionar um motorista no painel de conformidade, o sistema exibe os campos obrigatórios preenchidos e ausentes daquele motorista sem navegar para fora da tela | Média | US-04 |
| RF-14 | Toda alteração de configuração de campo obrigatório pelo owner é registrada em `audit_logs` (aplicando C2) com action `fleet_settings_updated`, `table_name: workspace_driver_settings` e `record_id` do workspace | Alta | US-01 |

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Autenticação e autorização | Apenas usuários com role `workspace_owner` acessam RF-02, RF-11, RF-12, RF-13 e RF-14; workspace_members acessam apenas RF-04, RF-05 e RF-06 relativos ao próprio perfil (S1, S12) |
| RNF-02 | Isolamento de workspace | Policies RLS garantem que dados de `workspace_driver_settings` e status de conformidade de um workspace nunca são visíveis para owners ou members de outro workspace (S2) |
| RNF-03 | Dado sensível (CNH) | Número e validade da CNH são PII; logs nunca expõem esses campos em texto plano (S10, C1); a estratégia de anonimização de PII ao soft-delete de conta segue spec futura dedicada |
| RNF-04 | Performance do painel de conformidade | A query de conformidade consolida todos os motoristas com status de cadastro e CNH em uma única chamada ao banco; p95 < 500ms para workspaces com até 50 motoristas |
| RNF-05 | Cálculo de vencimento no fuso do owner | "Hoje" para cálculo de dias restantes de CNH usa o fuso do workspace_owner autenticado (R-TZ-01), nunca UTC cru do servidor |

## Fora de Escopo

Esta spec cobre exclusivamente o MVP de conformidade documental de motoristas. Não estão incluídos:

- Controle financeiro, orçamento por motorista ou por veículo
- Geofencing e locais autorizados de operação
- Configuração granular de campos por categoria de veículo (ex: campos diferentes para caminhão vs. automóvel) — reservado para fase 2
- Notificações de vencimento de CNH por e-mail — bloqueadas até a Fase 9, que depende de domínio próprio vinculado ao lançamento da monetização (ver decisão registrada em memory: "Alertas de manutenção por email adiados p/ Fase 9")
- Upload de imagem da CNH ou outros documentos
- Integração com Detran ou consulta externa de validade de CNH

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260620-001 | Define roles `workspace_owner`/`workspace_member`, BS-ACL-06 e BS-ACL-07 — pré-requisito: convite de membro e atribuição de veículo precisam existir para o onboarding ter contexto |
| Regra | R-TZ-01 | Cálculo de dias até vencimento de CNH usa fuso do owner, não UTC |
| Regra | R-DS-08 | Escala de urgência por cor (4 níveis com label textual) — alertas de vencimento usam essa escala |
| Regra | S1, S2, S12 | Autenticação, RLS e leitura de role via `app_metadata` (não `user_metadata`) |
| Regra | C2 | Audit log obrigatório em toda alteração de configuração de campo |
| Infra | Supabase RLS | Novas tabelas (`workspace_driver_settings`, extensão de perfil para campos de motorista) exigem policies isoladas por workspace |

## Notas Técnicas

### Decisão de design: alertas in-app em vez de e-mail

Os alertas de vencimento de CNH (RF-08, RF-09) são implementados exclusivamente como notificações in-app neste MVP. Alertas por e-mail dependem de domínio próprio configurado, que está vinculado ao lançamento da monetização (Fase 9). Esta decisão está registrada na memória do projeto ("Alertas de manutenção por email adiados p/ Fase 9") e é explicitamente mantida aqui: esta spec não propõe nenhuma infraestrutura de e-mail. Quando a Fase 9 for implementada, uma spec nova endereçará os alertas de CNH por e-mail como extensão desta feature.

O canal in-app concreto (badge na sidebar, banner no painel, toast no login) deve ser decidido durante o design da implementação, guiado pelo agente `ui-layout-reviewer` — esta spec define apenas o requisito de exibição e os níveis de urgência (RF-08, RF-09, R-DS-08), não o componente específico.

### Experiência mínima para Ana (frota pequena)

O achado do `ux-researcher` indica que Ana (P-002, gestora de frota pequena) precisa do mínimo de fricção possível: ela não deve precisar abrir uma tela de configuração para que o sistema funcione. Por isso RF-01 define defaults ativos imediatamente sem ação do owner. A tela de configuração existe e é acessível (RF-02), mas é opcional — o sistema já funciona sem ela. Configuração granular por categoria de veículo (pedido implícito de Roberto, P-003, para grandes frotas) fica para fase 2 fora desta spec.

### Novos campos de perfil de motorista

Os campos CNH, validade da CNH, categoria da habilitação e telefone precisam existir no perfil do `workspace_member`. O DBA deve avaliar se esses campos ficam em `profiles` (tabela existente) ou em uma extensão `workspace_member_profiles` vinculada ao workspace. A segunda opção permite valores diferentes se um mesmo usuário for membro de múltiplos workspaces — que é o comportamento correto se a multi-membership for suportada futuramente. Recomendação: tabela separada, decisão final fica com o DBA ao implementar.

### Schema novo proposto

- `workspace_driver_settings`: configuração de campos obrigatórios por workspace (workspace_id, campo por campo como booleano, `updated_at`, `updated_by`)
- `workspace_member_profiles`: dados de perfil de motorista por workspace_member por workspace (CNH, validade, categoria, telefone, `completed_at`)
- Nenhuma FK para `auth.users` que force CASCADE delete de dados de conformidade histórica — preservar para fins de audit quando um membro é removido do workspace (sem deletar o dado, apenas revogar o acesso)

### Cálculo de conformidade

O status de conformidade de cada motorista é derivado em runtime (não persistido como coluna calculada), combinando:
1. Quais campos estão obrigatórios (leitura de `workspace_driver_settings`)
2. Quais campos estão preenchidos em `workspace_member_profiles`
3. Se a validade da CNH está no futuro, em janela de alerta (≤30d, ≤7d) ou no passado

O cálculo aplica R-TZ-01 para "hoje". Uma RPC ou view materializada pode ser necessária para workspaces grandes — a decisão de otimização fica com o DBA ao implementar.

## Regras Novas Propostas para `RULES.md`

> Estas regras ainda não existem em `RULES.md`. Precisam ser adicionadas antes da aprovação desta spec.

**R-FLEET-01** — Campos obrigatórios do cadastro de motorista têm defaults do sistema ativos imediatamente para todo workspace novo no plano Frota; o workspace_owner pode customizar, mas o sistema funciona sem configuração manual. Defaults: número da CNH obrigatório, validade da CNH obrigatória, categoria da habilitação obrigatória, telefone de contato obrigatório.

**R-FLEET-02** — A configuração de campos obrigatórios de motorista é por workspace, não por veículo individual nem por motorista individual; todos os workspace_members do mesmo workspace ficam sujeitos à mesma configuração. Mudanças na configuração não têm efeito retroativo sobre registros já preenchidos — apenas sobre status futuro de "completo/incompleto".

**R-FLEET-03** — Alertas de vencimento de CNH de motorista são exclusivamente in-app (badge/notificação no painel) nesta fase; notificações por e-mail estão bloqueadas até a Fase 9 por dependerem de domínio próprio vinculado à monetização. Esta regra deve ser revisada quando a Fase 9 for implementada.

**R-FLEET-04** — Um workspace_member só pode acessar o workspace após aceitar o convite; ao aceitar, o checklist de onboarding é exibido e permanece acessível (com indicador persistente) até que todos os campos obrigatórios definidos em `workspace_driver_settings` estejam preenchidos. O acesso às funcionalidades de frota não é bloqueado por cadastro incompleto — apenas sinalizado.

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`. Mudança estrutural (reverte/substitui requisito) não edita aqui — cria spec nova com `superseded_by`.

| Data | O que mudou | Por quê |
|------|-------------|---------|
| 2026-08-04 | Status `draft` → `approved`; adicionada dependência `R-WS-04` ao frontmatter | Douglas aprovou a implementação; a dependência bloqueante de workspace (roles, convite, membership) foi resolvida com a criação de [SPEC-20260804-004](../workspace/SPEC-20260804-004-workspace-foundation.md), que esta spec passa a referenciar |
