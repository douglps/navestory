# Apresentação do Sistema Nave — Referência para Design e Produto

> **Propósito deste documento:** dar ao time de design e produto um retrato completo e honesto do que o Nave já faz hoje — backend, dados, telas e regras de negócio que moldam a experiência — como ponto de partida para desenhar uma solução mais graciosa (visual e de fluxo) sobre a base funcional existente.
>
> Este documento **não substitui** as fontes canônicas — ele sintetiza e aponta para elas. Sempre que precisar do detalhe técnico completo de algo citado aqui, siga os links.
>
> **Última atualização:** 2026-07-23
> **Fontes primárias:** `specs/PRD.md` + `docs/PRD/PRD-v1.0.md`, `specs/RULES.md`, `docs/architecture/entities.md`, `docs/architecture/overview.md`, `specs/business/SPEC-20260620-001-business-strategy-stories.md`, `specs/design-system/`, código de `apps/api/src/modules/*` e `apps/web/src/app/(app)|(auth)/*`.

---

## 1. O que é o Nave

**Visão de produto (declarada em `specs/PRD.md`):**

> "Permitir que proprietários de veículos gerenciem manutenções e despesas em um único lugar, reduzindo custos operacionais e evitando esquecimentos críticos."

É um **SaaS PWA mobile-first** para gestão de veículos e frotas pequenas — não é rastreamento de frota (sem GPS), é controle financeiro e de manutenção.

### Personas alvo

| ID | Persona | Perfil | Prioridade |
|----|---------|--------|-----------|
| P-001 | Carlos, Motorista Autônomo | 35–50 anos, usa o veículo para trabalho, controla custo individual pelo celular | MVP |
| P-002 | Ana, Gestora de Frota Pequena | 28–45 anos, gerencia 3–10 veículos, decide com dados, usa desktop e mobile | MVP |
| P-003 | Roberto, Gestor de Grande Frota | 40–55 anos, 50–500 veículos, precisa de dashboards consolidados | Fase 2 |

### Jobs to be done (o que o usuário está tentando resolver)

1. Registrar uma despesa logo após abastecer — em menos de 30 segundos, no celular.
2. Saber quais manutenções estão vencidas ou perto do vencimento.
3. Controlar o gasto mensal total e por categoria de um veículo.
4. Exportar despesas do período para Excel/Google Sheets.
5. Saber o custo por km de cada veículo.

### Fora de escopo declarado (não tentar resolver isso agora)

GPS/rastreamento em tempo real, integração com seguradoras/financeiras, app nativo (React Native/Flutter), OAuth/MFA/login social, push notifications nativas, veículo compartilhado por múltiplos usuários da mesma conta, API pública.

---

## 2. Modelo de negócio (o que muda a UI por plano)

O Nave tem um modelo de assinatura em camadas. Isso é relevante para design porque **vários pontos da UI precisam comunicar limite de plano sem bloquear a ação do usuário** — a regra de produto é clara: *"limites de plano nunca bloqueiam criação de registros — apenas restringem visibilidade do histórico e export"* (R-BIZ-02).

| Recurso | Grátis (pós-beta) | Pro Mensal | Pro Anual | Frota |
|---|---|---|---|---|
| Veículos | 3 | Ilimitado | Ilimitado | Ilimitado |
| Histórico detalhado | Mês corrente + 1 anterior | Tudo | Tudo | Tudo |
| Meses antigos | Consolidados em resumo | Detalhado | Detalhado | Detalhado |
| Export CSV | Bloqueado | Rate limited | Ilimitado | Ilimitado |
| Templates / categorias | 5 | 20 | 20 | 50 |
| Grupos de veículos | 1 | 10 | 10 | Ilimitados |
| Multi-usuário (workspace) | — | — | — | Sim |

Pontos que a UI precisa cobrir (hoje ainda em construção):
- **Trial Pro de 14 dias** em toda conta nova, com downgrade automático ao expirar.
- **Banner de upgrade contextual** (nunca popup intrusivo) quando o usuário esbarra num limite — ex. tenta ver um mês consolidado.
- **Grace period visual** no downgrade: countdown "seus dados detalhados serão consolidados em X dias", com ofertas de win-back.
- **Referral**: convidado ganha 30 dias Pro, quem convida ganha 15 dias (máx. 10 referrals ativos).
- **Exclusão de conta self-service** com aviso de 30 dias de graça e opção de restauração.

Detalhe completo: `specs/business/SPEC-20260620-001-business-strategy-stories.md`.

---

## 3. Arquitetura em 1 minuto

Monorepo (Turborepo + pnpm): `apps/api` (NestJS, REST) + `apps/web` (Next.js 16 App Router, PWA) + `packages/ui` (design system compartilhado) + `packages/validators` (Zod compartilhado front/back). Banco: Supabase/PostgreSQL com RLS ativo em toda tabela (cada usuário só enxerga seus próprios dados). Auth: Supabase Auth + JWT.

Detalhe completo: `docs/architecture/overview.md`.

---

## 4. O domínio: as "coisas" que o sistema gerencia

Este é o mapa mental necessário antes de desenhar qualquer tela — quase toda funcionalidade do produto gira em torno de um **veículo** e dos eventos financeiros/operacionais ligados a ele.

```
Usuário (perfil)
   │
   ├── Veículos ──────────────┬── Despesas ◄──────────┐ (ledger unificado,
   │     │                    ├── Manutenções ─────────┤  ver seção 6.4)
   │     │                    ├── Multas ───────────────┤
   │     │                    ├── Custos recorrentes ───┘  (IPVA, seguro, CRLV)
   │     │                    └── Ciclos de odômetro
   │     └── (N:M) Grupos de veículos
   │
   ├── Templates de despesa (atalhos de lançamento)
   ├── Categorias personalizadas
   ├── Preferências (chip de veículo, fuso horário, rascunho automático)
   └── Log de auditoria (histórico de tudo que o usuário fez)
```

### Entidades principais (resumo — detalhe campo a campo em `docs/architecture/entities.md`)

| Entidade | O que representa | Observação de produto |
|---|---|---|
| **Veículo** | Carro/moto/caminhão do usuário: placa, marca, modelo, foto, odômetro, combustível, documentos (IPVA/seguro/CRLV), `health_score` (0–100) | Entidade central — praticamente tudo pendura nela |
| **Despesa** | Qualquer gasto vinculado a um veículo (combustível, manutenção, pedágio, seguro, etc.) | Pode nascer manual ou ser **gerada automaticamente** por manutenção/multa/custo recorrente (ver 6.4) |
| **Manutenção** | Serviço agendado ou realizado, com máquina de estados (agendado → em andamento → concluído/cancelado) | Concluir com custo gera despesa automaticamente |
| **Multa** | Infração de trânsito: valor, desconto, prazo de recurso, status | Criar multa gera despesa automaticamente |
| **Custo recorrente** | IPVA, CRLV, seguro — um registro por veículo/tipo/ano | Marcar como pago gera despesa automaticamente |
| **Ciclo de odômetro** | Marco de "reset" da contagem de km (troca de painel, revenda) | Existe porque o odômetro nunca pode retroceder — isso precisa de uma válvula de escape auditável |
| **Grupo de veículos** | Agrupamento arbitrário (até 200 veículos) para visão agregada | Usado no seletor de contexto global (seção 6.1) |
| **Template de despesa** | Atalho de lançamento rápido (máx. 20 por usuário) | Não guarda data nem odômetro — só o "molde" |
| **Categoria personalizada** | Categoria de despesa além das 9 padrão (máx. 20 por usuário) | Categorias padrão: combustível, manutenção, lavagem, pedágio, seguro, IPVA, estacionamento, multa, outros |
| **Preferências do usuário** | Campos do chip de veículo, fuso horário, rascunho automático | 1:1 por usuário, sempre tem default seguro |
| **Log de auditoria** | Toda mutação relevante, imutável, sem PII | Exibido ao usuário em `/atividades` |

**Um detalhe de histórico importante:** já existiu um modelo mais amplo de "motoristas" (`drivers`) e "documentos genéricos" (`documents`), que foi **removido do banco** por não ter spec aprovada. Ou seja, hoje o sistema **não** modela múltiplos motoristas por veículo nem upload de documentos — apenas campos de vencimento (data) direto na ficha do veículo (IPVA, seguro, CRLV). Se o time de design cogitar desenhar telas de "motorista" ou "central de documentos", é greenfield, não retrabalho.

---

## 5. Backend — o que cada módulo garante (e por que isso aparece na tela)

Cada módulo abaixo é uma API RESTful própria (`apps/api/src/modules/<nome>`). O que importa para design não é o endpoint, é **a regra de negócio que a tela precisa respeitar ou comunicar**. Regras completas, com ID citável, em `specs/RULES.md`.

### 5.1 Veículos, grupos e ciclos de odômetro

- Placa aceita padrão BR e Mercosul, sempre normalizada (maiúscula, sem hífen).
- Excluir um veículo é reversível na base de dados (soft-delete), mas em cascata: despesas e manutenções daquele veículo somem juntas da listagem.
- Grupo de veículos: no máx. 200 membros, editar membros é "substituir tudo" (não existe histórico de quem entrou/saiu do grupo).
- **Ciclo de odômetro** é uma funcionalidade pouco óbvia visualmente: serve para o caso "troquei o painel do carro e o odômetro voltou a zero" sem quebrar a regra de "km nunca retrocede". Exige motivo obrigatório e fica registrado como evento auditável — é uma ação sensível, deveria ter fricção proposital no design (confirmação, não um botão qualquer).

### 5.2 Despesas — o coração transacional do produto

- **Odômetro obrigatório em abastecimento**, e nunca pode ser menor que o já registrado para aquele veículo — essa é provavelmente a validação mais frequente que o usuário vai encontrar. Precisa de mensagem de erro clara, não só um "campo inválido".
- **Duplicata nunca bloqueia**: se o usuário lança duas vezes a "mesma" despesa (mesmo veículo/categoria/valor/dia), o sistema salva as duas e avisa (`duplicate_warning`) — o design deve tratar isso como aviso não-bloqueante (toast/banner), nunca como erro de formulário.
- **Combustível é um mini-formulário especializado**: tipo de combustível, "tanque cheio?" (sim/não/não informado), litros, fornecedor/posto — e o sistema calcula km/L e preço/litro automaticamente quando os dados permitem. Quando não dá pra calcular, o campo derivado deve aparecer vazio/oculto, nunca "0" ou "N/A" genérico.
- **Data futura é permitida** (pré-registro de despesa), com aviso não-bloqueante.
- Limite de valor: R$ 0,01 a R$ 100.000.000,00 (sim, o teto é alto de propósito — não é um limite de UX, é sanidade de dado).

### 5.3 Manutenções

- Status segue uma máquina de estados fixa: `agendado → em andamento → concluído/cancelado`; `em andamento → concluído/cancelado`. Uma vez concluída ou cancelada, não existe "voltar atrás" pela troca de status — isso deveria refletir na UI (ex.: esconder opções de transição inválidas em vez de deixar o usuário tentar e levar erro).
- Odômetro passa a ser **obrigatório** ao marcar como concluída.
- Concluir com custo preenchido gera uma despesa automaticamente (ver ledger, 6.4) — o design precisa deixar claro para o usuário que "essa manutenção virou uma despesa" sem que pareça duplicação.

### 5.4 Multas

- Ciclo de vida: pendente → paga / em recurso / cancelada.
- Criar uma multa já gera a despesa correspondente automaticamente (usando valor com desconto se houver).
- "Vencida" é calculado (pendente + data de vencimento no passado) — mas uma multa em recurso vencida **não** conta como vencida (o recurso suspende o prazo). Isso é sutil e fácil de errar visualmente se o badge de status não diferenciar os dois casos.

### 5.5 Custos recorrentes (IPVA, CRLV, seguro)

- Um registro por veículo/tipo/ano — não é uma tabela livre, é literalmente "IPVA 2026 do Corolla" como uma linha única.
- Marcar como pago gera a despesa automaticamente.
- Existe um banner de aviso quando o vencimento de um documento do veículo está a ≤60 dias e ainda não há custo recorrente cadastrado para aquele ano — é um gap de dado que o produto tenta prevenir proativamente.

### 5.6 Preferências

- O "chip de veículo" (usado em várias telas para identificar rapidamente qual veículo está em foco) é configurável: o usuário escolhe entre 1 e 3 campos para exibir (placa é sempre um deles, obrigatório). Vale a pena o design ter uma prévia ao vivo dessa configuração (já existe em `/settings/preferences`).
- Fuso horário do usuário é uma preferência real (lista IANA, ex. `America/Sao_Paulo`) — usada para calcular "hoje" em alertas e KPIs. Isso importa porque datas/horas cruas do banco são sempre UTC.

### 5.7 Dashboard

- KPIs vêm de um **catálogo fixo e curado** (não é um construtor livre de métricas) — o usuário ativa entre 1 e 6 KPIs simultâneos, 4 por padrão. Essa é uma decisão deliberada de carga cognitiva (Miller's Law/Hick's Law), documentada como regra (R-KPI-01) — vale respeitar esse teto em qualquer redesenho.
- Delta percentual mês a mês de um KPI é **ocultado** (sem seta, sem cor) quando a amostra do mês anterior é pequena (&lt;3 registros) — para não fingir "tendência" onde só há ruído estatístico.
- Health score (0–100) por veículo e agregado da frota, com faixas de cor: 0–49 crítico, 50–74 atenção, 75–100 saudável.
- Barra de alertas de frota no topo (documentos vencendo, manutenções pendentes).
- Widget "Próximos 7 dias" — no máximo 10 itens, com indicador de urgência por faixa de dias.
- Subheader financeiro — até 3 chips com as categorias de maior gasto no mês + indicador de multas pendentes/vencidas.

### 5.8 Analytics / BI (Fase 1 implementada)

Módulo de inteligência sobre os dados já lançados — TCO por veículo, tendência de consumo de combustível, detecção de anomalias de gasto (Z-Score), benchmark entre veículos da frota, forecast de custo, sazonalidade (heatmap mensal), insights em linguagem natural. Todos com **guarda de amostra mínima** — se não há dado suficiente (ex. menos de 5 abastecimentos, menos de 6 meses de histórico), o sistema devolve "sem dado" em vez de forçar um gráfico enganoso. Design deve ter um estado visual claro para "ainda não há dado suficiente para essa análise" — não é o mesmo estado vazio de "zero registros".

### 5.9 Auditoria (Histórico de Atividades)

Toda mutação relevante vira uma entrada de log, visível ao próprio usuário em `/atividades` — com KPIs (total de ações, por domínio), badges de tipo de ação (criação/atualização/exclusão) e tempo relativo. É uma tela de transparência/confiança, não uma tela técnica.

### 5.10 Conta, LGPD e admin

Exclusão de conta é self-service, com 30 dias de graça (o usuário pode se arrepender e restaurar fazendo login de novo). Isso precisa de uma tela de "conta marcada para exclusão" bem comunicada, e não apenas um modal de confirmação único.

---

## 6. Funcionalidades transversais (aparecem em várias telas ao mesmo tempo)

### 6.1 Contexto Global "Em Foco"

Um seletor persistente (chip fixo, hoje no subheader) que define "de qual veículo/grupo estou falando agora" em todo o app. Quatro modos, só um ativo por vez:

- **`single`** — um veículo específico.
- **`group`** — um grupo de veículos.
- **`multi`** — seleção manual avulsa de vários veículos (não salva).
- **`attribute`** — filtro por atributo (ex. todos os veículos "na oficina").

Formulários transacionais (despesa, manutenção) **sempre** exigem um veículo único — contextos coletivos nunca preenchem esse campo automaticamente. Esse é provavelmente o padrão de interação mais transversal do produto e merece atenção especial de design: é o mecanismo que evita que o usuário precise re-selecionar o veículo em toda tela.

### 6.2 Ledger financeiro unificado

Manutenção concluída com custo, multa criada, e custo recorrente pago **geram automaticamente** uma despesa vinculada e somente-leitura (não editável nem deletável diretamente — só via a origem). Isso significa que `/expenses` é, na prática, a "central financeira" de tudo — o usuário não lança a mesma coisa duas vezes, mas também precisa entender visualmente *por que* uma despesa não pode ser editada ali (ela "pertence" a outra tela).

### 6.3 PWA / Offline

Instalável no celular, com estratégias de cache diferentes por tipo de dado. Importante para design: **mutações (criar/editar/apagar) nunca funcionam offline** — são bloqueadas no cliente com mensagem explícita antes do envio, não existe fila de sincronização nesta fase. Isso precisa de um indicador de conectividade sempre visível e honesto (mostrando a idade do dado em cache, não um genérico "desatualizado").

### 6.4 Layout responsivo / shell

Abaixo de 768px a barra lateral vira um drawer overlay (nunca fica inline); toda área de toque tem no mínimo 44×44px (WCAG 2.5.8 AAA / Apple HIG). Isso já é regra de engenharia ativa — qualquer novo componente de navegação deve nascer respeitando esse piso.

---

## 7. Inventário de telas (estado atual)

### Público / não autenticado

| Rota | Função |
|---|---|
| `/login` | Login |
| `/register` | Cadastro self-service (nome, email, senha, tipo de perfil) |
| `/recover-password` | Solicitar recuperação de senha |
| `/reset-password` | Definir nova senha a partir do link recebido |
| `/restore-account` | Restaurar conta em soft-delete (dentro dos 30 dias) |
| `/privacidade`, `/termos` | Páginas estáticas |
| `/offline` | Fallback quando sem conexão (PWA) |

### Autenticado

| Área | Rotas | Função |
|---|---|---|
| **Dashboard** | `/dashboard` (+ `/dashboard/concept`, protótipo paralelo) | Visão geral: KPIs configuráveis, alertas de frota, grade de veículos com health score, painel de detalhe do veículo selecionado, próximos custos, gráficos, export CSV |
| **Veículos** | `/vehicles`, `/vehicles/new`, `/vehicles/[id]`, `/vehicles/[id]/odometer` | CRUD de veículo + tela dedicada de registro rápido de odômetro |
| **Grupos** | `/vehicle-groups`, `/vehicle-groups/new`, `/vehicle-groups/[id]` | CRUD de grupo + gestão de membros |
| **Despesas** | `/expenses`, `/expenses/new`, `/expenses/[id]` | Central financeira: listagem com abas, filtros por contexto, KPIs, export |
| **Manutenções** | `/maintenance`, `/maintenance/new`, `/maintenance/[id]` | Listagem por status + agendamento + atualização de status |
| **Multas** | `/fines`, `/fines/new`, `/fines/[id]` | Listagem com indicador de vencidas + registro + atualização de status |
| **Analytics** | `/analytics` | TCO, tendência de consumo, anomalias, benchmark, forecast, sazonalidade, insights |
| **Atividades** | `/atividades` | Histórico de auditoria do usuário |
| **Configurações** | `/settings/account`, `/settings/preferences`, `/settings/vehicles/[vehicleId]/odometer-cycles` | Dados da conta + exclusão de conta, preferências de exibição/fuso/rascunho, histórico de ciclos de odômetro |

**Total: ~30 rotas navegáveis**, cobrindo 8 domínios de negócio (veículos, grupos, despesas, manutenções, multas, custos recorrentes via despesas, analytics, conta/preferências) mais autenticação.

---

## 8. Estado atual do Design System

Já existe um design system em construção ativa (`packages/ui`) com fundamentos e direção criativa definidos em spec, não é ponto de partida em branco. Vale a pena o time de design ler antes de propor algo novo, para saber o que reaproveitar vs. o que evoluir:

- `Design.md` (raiz do repo) — tokens + racional qualitativo, documento voltado a quem (humano ou IA) vai construir sobre o sistema.
- `specs/design-system/INVENTARIO-DESIGN-SYSTEM.md` — estado atual de tokens e componentes implementados (fonte para recriar Figma Variables).
- `specs/design-system/PESQUISA-FUNDAMENTOS-DESIGN-SYSTEM.md` — racional das decisões (paleta OKLCH, dark/light, StatusBadge, NavBadge, Command Palette).

Princípios já fixados como regra (não são sugestão, já estão em produção):

| Regra | Resumo |
|---|---|
| R-DS-03 | Cor semântica (`success`/`warning`/`danger`/`info`) só comunica status real de dado; `gold` é o único elemento decorativo/destaque de marca — nada de paleta multicolor sem significado |
| R-DS-04 | `rounded-full` é exclusivo de badge/tag/filtro; qualquer botão de ação usa raio máximo `rounded-md` |
| R-DS-05 | Proporção cromática de referência: ~70% neutro / ~15% primary / ~10% semântico / ~5% gold — desvio relevante é sinalizado em revisão |
| C-DS-01 | Contraste mínimo WCAG AA (4.5:1 texto normal / 3:1 texto grande) em ambos os temas, sem exceção por hierarquia visual |
| R-DS-01 | Badge de contagem nunca mostra mais de 2 caracteres visuais ("9+" acima de 9, oculto em 0) |

14 componentes já implementados em `packages/ui` com testes de acessibilidade (`jest-axe`). O dashboard já passou por uma rodada de evolução visual recente (KPI cards com sparkline, anel de health score em SVG, tokens de superfície/chart, grid de veículos mais denso).

**Pendência conhecida:** ainda há telas antigas com duplicação de componente (versões inline paralelas aos componentes de `packages/ui`) aguardando migração — ver `specs/design-system/PLANO-MIGRACAO-CONSUMIDORES.md`.

---

## 9. Pontos de atenção conhecidos (não esconder do time de design)

Coisas que já estão documentadas como gap real, não achismo — relevantes porque afetam o que uma tela pode prometer ao usuário:

| Área | Situação |
|---|---|
| Sessão / login | O middleware SSR que renova o token automaticamente no lado web está ausente do repositório — sessão pode expirar sem aviso claro ao usuário (achado crítico registrado) |
| Alertas de manutenção por e-mail | Adiado para a Fase 9 do produto (depende de domínio de e-mail próprio, vinculado ao lançamento da monetização) |
| Motoristas / documentos genéricos | Removidos do banco por falta de spec aprovada — não existem hoje, apesar de aparecerem em versões antigas de documentação |
| Anonimização de PII na exclusão de conta | Estratégia definitiva ainda não definida — fica para spec dedicada futura, não decidir isso ad hoc numa tela |
| Offline / PWA | Sem fila de sincronização — usuário no posto sem sinal não consegue lançar despesa até recuperar conexão (bloqueio explícito, não silencioso) |

---

## 10. Onde ir a partir daqui

| Preciso de... | Ir para... |
|---|---|
| Campo a campo de cada entidade, enums, funções do banco | `docs/architecture/entities.md` |
| Toda regra de negócio com ID citável (R/S/P/C) | `specs/RULES.md` |
| Visão de produto completa, métricas de sucesso, riscos | `docs/PRD/PRD-v1.0.md` |
| Jornadas de usuário simuladas passo a passo (auth, veículos, despesas, manutenções, dashboard, export, LGPD etc.) | `docs/user-stories.md` — **atenção:** documento de 2026-06-17, anterior a multas, custos recorrentes, analytics, PWA e dashboard v2; use para entender jornada, não para confirmar o que existe hoje |
| Regras de monetização e planos | `specs/business/SPEC-20260620-001-business-strategy-stories.md` |
| Tokens, componentes e racional visual atual | `specs/design-system/` e `Design.md` (raiz) |
| Arquitetura técnica completa | `docs/architecture/overview.md` |
| Specs individuais por feature (histórias de usuário em BDD) | `specs/<feature>/` — índice geral em `specs/README.md` |
