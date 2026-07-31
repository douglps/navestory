# Plano Futuro — Marketing System & Publicidade/Mídia (Part II e Part III)

> **Este documento é um PLANO, não uma decisão executada.** Nenhuma estratégia aqui foi aprovada, nenhum número é real — são frameworks de mercado prontos para uso quando o gatilho certo acontecer. Não faça marketing ou compre mídia com base neste documento sem antes preencher os campos com dados reais do Nave naquele momento.
>
> **Como chamar este documento no futuro:** basta pedir *"retome o Plano de Marketing e Publicidade do Nave"* ou *"abra o PLANO-MARKETING-PUBLICIDADE-FUTURO"* — está indexado em `specs/business/README.md` e `specs/README.md`. Não precisa lembrar o caminho completo.
>
> **Contexto de origem:** este plano nasceu de uma sessão em 2026-07-30 que também produziu a Part I — Brand System (`specs/design-system/PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md` + `specs/design-system/PROPOSTA-BRAND-PLATAFORMA-2026-07-30.md`, ambos já com plataforma de marca, identidade verbal e identidade visual definidas). A decisão registrada naquela sessão foi: fazer só a Part I agora, com `brand-designer` e `ad-creative`, e represar Part II (Marketing) e Part III (Publicidade/Mídia) até haver um gatilho real — porque o Nave ainda não tem usuário, receita ou verba, e preencher métricas de CAC/LTV/orçamento de mídia hoje seria número inventado, não estratégia.

---

## 0. Gatilhos de Ativação — quando sair deste plano e virar trabalho real

Não ative Part II/III só porque "seria bom ter". Ative quando **pelo menos um** destes acontecer:

| Gatilho | Dispara | Por quê |
|---|---|---|
| Data de soft launch/beta definida | Part II (seção 1–3 abaixo) | ICP e conteúdo de ToFu precisam existir antes do primeiro usuário chegar, não depois |
| Primeiro usuário pagante real | Part II (seção 4 — métricas) | CAC/LTV só fazem sentido com pelo menos uma transação real para calibrar contra |
| Verba de mídia paga aprovada por Douglas | Part III inteira | Specs de formato de anúncio e plano de mídia só valem a pena com budget confirmado — sem verba, é documentação especulativa |
| Necessidade de material impresso/institucional (ex: apresentação a investidor, evento, parceria) | Part III seção 2 (specs de mídia off-line) | Hoje o Nave é 100% digital; CMYK/Pantone só importa nesse momento |

Até lá, este documento fica parado — não precisa ser revisitado por rotina, só quando um gatilho acima acontecer.

---

## 1. Part II — Marketing System

### 1.1 Pesquisa, Público e Mercado

**Já existe, reaproveitar — não recriar do zero:**
- Personas de *produto* (Carlos, Ana, Roberto) e Jobs to Be Done já estão em `specs/PRD.md`.
- Posicionamento vs. Samsara/Motive e UVP já estão em `specs/design-system/PROPOSTA-BRAND-PLATAFORMA-2026-07-30.md` (Parte I, seções de Posicionamento e UVP).

**O que falta construir quando o gatilho disparar:**

**Matriz de ICP (Ideal Customer Profile)** — expandir Carlos/Ana de persona de produto para persona de *aquisição*, adicionando:
- Onde essa pessoa está hoje (grupos de Facebook de motorista de app, WhatsApp de gestores de frota, fóruns de contabilidade PJ, etc. — pesquisar, não supor)
- Objeções de compra específicas (ex: "já uso planilha e funciona", "não confio em app com meus dados financeiros")
- Gatilho de busca real (o que essa pessoa digitaria no Google quando o problema aperta — ex: "app controle gasto carro", "quanto gasto com meu carro por mês")

**Análise SWOT/FOFA formal** — força (especialização em veículo, Calm UI), fraqueza (marca nova, zero prova social), oportunidade (nenhum concorrente brasileiro no quadrante "veículo + individual"), ameaça (app de finanças genérico adicionar categoria "veículo", Samsara descer para SMB). Fazer isso com dados de mercado atualizados no momento da ativação, não com a pesquisa de 2026-07-30 (ela envelhece).

**Agente responsável:** `growth-marketer`.

### 1.2 Estratégia de Funil (Inbound)

Framework padrão de mercado (HubSpot/Content Marketing Institute) — usar como esqueleto, preencher com temas reais do Nave:

| Estágio | Formato | Tema-tipo para o Nave (exemplos, não finais) |
|---|---|---|
| **ToFu** (Aprendizado) | Artigo de blog, post educativo, calculadora simples | "Quanto custa realmente manter um carro por mês no Brasil", "Como calcular custo por km" |
| **MoFu** (Consideração) | Comparativo, e-book, planilha vs. app | "Planilha vs. app: o que você perde controlando na mão", checklist de manutenção preventiva |
| **BoFu** (Decisão) | Teste grátis, case de uso, demo | Tela de "veja seu health score em 2 minutos", depoimento de usuário beta |

**Régua de nutrição** — só faz sentido com base de leads real. Estrutura de fluxos a montar (não construir agora):
1. Boas-vindas (trigger: cadastro)
2. Ativação (trigger: 3 dias sem primeira despesa registrada)
3. Reengajamento (trigger: 14 dias sem abrir o app)
4. Upsell Frota (trigger: usuário Carlos/Ana cadastra 3º veículo — sinal de crescer para plano Frota)

Cada fluxo, quando construído, precisa citar a voz de marca já aprovada (`PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md` §11) — nada de tom genérico de e-mail marketing.

**Agente responsável:** `growth-marketer` (estratégia) + `ad-creative` (copy dos e-mails/fluxos).

### 1.3 SEO e Conteúdo

**Topic clusters** (padrão pillar page + cluster, Ahrefs/HubSpot) — pilar central provável: "Gestão de custos veiculares" ou "Manutenção preventiva de veículo", com clusters satélite por intenção:
- Informacional: "o que é custo por km", "como calcular depreciação de carro"
- Navegacional: "Nave app avaliação", "alternativa a planilha de gastos com carro"
- Transacional: "app grátis controle gasto carro", "melhor app gestão de frota pequena"

**Não montar calendário editorial nem lista final de keywords agora** — palavra-chave e volume de busca mudam; pesquisar com ferramenta real (Ahrefs/Semrush/Google Keyword Planner) no momento da ativação, não usar números de hoje.

**Agente responsável:** `growth-marketer`.

### 1.4 Métricas e Analytics — plano de instrumentação, não metas

Isto é o único bloco de Part II que vale preparar **antes** do gatilho, porque é técnico (não estratégico) e barato de fazer cedo — evita reengenharia de tracking depois:

- **Convenção de UTM** a fixar desde o primeiro link publicado: `utm_source` / `utm_medium` / `utm_campaign` / `utm_content` em `snake_case`, minúsculo, sem espaço. Documentar a taxonomia (quais valores são válidos por campo) quando o primeiro canal for ativado.
- **Eventos GA4 mínimos a instrumentar no produto**, alinhados aos Jobs to Be Done do PRD: `signup_completed`, `first_expense_created`, `vehicle_added`, `maintenance_marked_done`, `plan_upgraded`. Isso é trabalho de engenharia (`data-engineer`/backend), não de marketing — mas o *marketing* define quais eventos importam.
- **Métricas primárias a rastrear assim que houver dado real:** CAC (por canal), LTV, taxa de ativação (D1/D7), taxa de conversão trial→pago. Não definir meta numérica agora — meta sem baseline é chute.

**Agente responsável:** `growth-marketer` (definição) + `data-engineer` (instrumentação).

---

## 2. Part III — Publicidade & Mídia

### 2.1 Briefing e Conceito de Campanha

Só ativar quando houver orçamento aprovado. Quando ativar:
- **Key Visual (KV)**: deve nascer da identidade visual já fechada (azul-índigo + ouro estrutural, arco-símbolo do logotipo) — `ad-creative` e `brand-designer` trabalham juntos, nunca criar direção visual nova só para campanha.
- **Copywriting publicitário**: usar a tagline já validada em `PROPOSTA-BRAND-PLATAFORMA-2026-07-30.md` §2.X ("Seu carro tem custo. Agora você sabe.") como ponto de partida, adaptando por canal — não inventar slogan novo por campanha.

**Agente responsável:** `ad-creative`.

### 2.2 Formatos de Mídia — checklist de especificação (preencher no momento, valores de referência abaixo mudam com a plataforma)

**Mídia digital paga** (specs mudam com frequência — sempre confirmar na doc oficial da plataforma antes de produzir arte):
- Meta Ads: Stories/Reels 9:16, Feed 1:1 ou 4:5, Carrossel
- Google Display: formatos IAB padrão (300×250, 728×90, 160×600, 320×50)
- Vídeo (YouTube/TikTok/CTV): bumper 6s, TrueView 15s/30s

**Mídia off-line/impressa** — só relevante se o gatilho for material institucional (apresentação a investidor, evento, parceria), não campanha de massa (Nave não tem esse porte hoje):
- Usar os códigos CMYK/Pantone já convertidos em `PROPOSTA-BRAND-PLATAFORMA-2026-07-30.md` Parte III (cores institucionais) — não reconverter.
- Sangria e margem de corte seguem o padrão gráfico do fornecedor de impressão escolhido no momento.

**Agente responsável:** `ad-creative` para conceito/copy; produção gráfica final (vetor/arte finalizada) é execução, não decisão de agente — geralmente terceirizada ou feita em ferramenta de design (Figma/Canva) fora do escopo destes agentes.

### 2.3 Testes A/B e Otimização

Framework padrão (não específico do Nave, aplicar quando houver campanha rodando):
- Matriz de variação: nunca testar mais de 2 variáveis por rodada (ex: 2 headlines × 1 CTA, não 3×2×2 simultâneo) — sinal fica ilegível com tráfego pequeno, que é o cenário mais provável do Nave no início.
- Hipóteses de landing page a testar primeiro (maior impacto, menor esforço): posição do formulário de cadastro, presença de prova social (quando existir), copy do CTA principal.

**Agente responsável:** `growth-marketer` (desenho do teste) + `ad-creative` (variações de copy).

### 2.4 Plano de Mídia — estrutura a preencher, não números

| Campo | Preencher quando ativar |
|---|---|
| Distribuição de verba por canal | Só com budget real aprovado por Douglas |
| Cronograma de veiculação (flighting) | Alinhado a sazonalidade real do produto (ex: início de ano = revisão de IPVA/seguro, gatilho natural de "custo de carro") |
| Canal prioritário de teste inicial | Recomendação de mercado para SaaS B2C early-stage: 1 canal pago só (geralmente Meta ou Google Search) até validar CAC, **antes** de diversificar — não espalhar verba pequena em muitos canais ao mesmo tempo |

---

## 3. Ordem de Execução Recomendada (quando o gatilho chegar)

Não é obrigatório seguir esta ordem à risca, mas evita retrabalho:

1. **Instrumentação de analytics** (§1.4) — pode e deve ser feito antes de qualquer campanha, é barato e evita perder dado histórico.
2. **ICP de aquisição + SWOT** (§1.1) — base para tudo que vem depois.
3. **Conteúdo ToFu/SEO** (§1.2–1.3) — mais barato que mídia paga, pode começar sem orçamento de anúncio.
4. **Régua de nutrição** (§1.2) — só depois de ter volume mínimo de leads para justificar automação.
5. **Publicidade paga** (Part III inteira) — último passo, só com verba aprovada e canal orgânico já validando a mensagem.

---

## 4. O que este documento deliberadamente NÃO inclui

- Números de CAC/LTV/meta de conversão — seriam inventados sem dado real.
- Lista final de palavras-chave e calendário editorial — perdem validade rápido, pesquisar no momento.
- Distribuição de orçamento entre canais — não existe orçamento aprovado hoje.
- Arte finalizada de campanha ou logotipo em vetor — é execução gráfica, não decisão estratégica de agente.

---

## Changelog

| Data | Mudança |
|---|---|
| 2026-07-30 | Criação do plano, a partir da decisão de represar Part II/III até gatilho real (ver §0) |
