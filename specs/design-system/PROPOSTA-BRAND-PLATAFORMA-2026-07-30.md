# Plataforma de Marca — Nave (Brand Platform, Parte I)

> **Complemento aprovado ao documento irmão.** Este documento COMPLEMENTA, e não substitui, a
> [`PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md`](./PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md), que registra
> as decisões de cores, tipografia, tokens, componentes e voz básica já aprovadas por Douglas em 2026-07-30.
> Toda decisão daquele documento é tratada aqui como ponto de partida fixo — não está em discussão novamente.
>
> **Escopo deste documento:** estratégia e narrativa de marca (Parte I — Brand System), cobrindo os itens
> que o documento irmão NÃO cobre: plataforma de marca, arquétipo formal, guia de estilo editorial completo,
> direção de logotipo, especificação de cores para todas as mídias, direção de fotografia/ilustração
> institucional e governança de assets.
>
> **Status:** proposta para aprovação por Douglas. Nenhuma implementação (código, arquivo vetorial, token)
> deve ser iniciada antes da aprovação explícita.

---

## Fontes e pesquisa consultada

- Ramp brand strategy: Bakken & Baeck (bakkenbaeck.com/case/ramp), WeAreInk (weareink.co.uk/work/ramp)
- Mercury banking brand: Blake Crosley (blakecrosley.com/guides/design/mercury)
- Linear visual design: análise direta de linear.app (2026)
- Nubank brand positioning: riffon.com (strategy summary)
- Brand archetypes B2B: Focus Lab (focuslab.agency/blog/b2b-brand-archetypes), Ainoa Agency (ainoa.agency/blog/brand-archetypes-practical-guide), deSantis Breindel (desantisbreindel.com)
- SaaS dark-mode photography: Pravin Kumar (pravinkumar.co, 2026), GridRebels (gridrebels.studio, 2026)
- Fintech Branding Trends 2025-2026: fintechbranding.studio
- DAM e estrutura de assets: Marq (marq.com/blog/brand-asset-management), CoSchedule (coschedule.com)
- Notion brand platform model: notion.com/blog/mission-vision-and-values
- Pesquisa de mercado de frotas (Samsara, Motive): carregada do documento irmão (já citada)

---

## Sumário

1. [Plataforma de Marca](#1-plataforma-de-marca)
   - 1.1 Propósito
   - 1.2 Visão de Marca
   - 1.3 Missão
   - 1.4 Valores
   - 1.5 Proposta Única de Valor (UVP)
   - 1.6 Posicionamento de Mercado
   - 1.7 Arquitetura de Marca
2. [Identidade Verbal](#2-identidade-verbal)
   - 2.1 Arquétipo de Marca (Jung)
   - 2.2 Guia de Estilo Editorial Completo
3. [Identidade Visual](#3-identidade-visual)
   - 3.1 Direção de Logotipo
   - 3.2 Versões e Área de Proteção
   - 3.3 Regras de Uso Incorreto (Don'ts)
   - 3.4 Cores Institucionais — Especificação Completa
   - 3.5 Tipografia Institucional
   - 3.6 Direção de Fotografia e Ilustração Institucional
4. [Governança](#4-governança)
   - 4.1 Estrutura de Repositório de Assets
   - 4.2 Regras de Co-branding

---

## 1. Plataforma de Marca

A distinção entre "visão de produto" e "visão de marca" é técnica e importa: a visão de produto descreve
**o que o software faz e para quem**; a visão de marca descreve **que lugar na vida do usuário e na cultura
do mercado a marca quer ocupar a longo prazo**. O PRD do Nave já tem visão de produto definida. Este capítulo
constrói a camada de marca sobre essa base.

### 1.1 Propósito

> **Por que o Nave existe, além de gerar receita.**

Proprietários de veículos e gestores de frota tomam decisões importantes — trocar de carro, renovar frota,
cortar custos operacionais — com informação fragmentada, espalhada em recibos físicos, planilhas paralelas
e memória. O resultado é invisibilidade financeira sobre um dos bens que mais consome e mais depende de
atenção contínua.

**O Nave existe para encerrar essa invisibilidade — devolvendo a quem cuida de um veículo a tranquilidade
de saber, com exatidão, o que está acontecendo e o que precisa de atenção.**

*Nota de aplicação:* o propósito não é tagline (não vai para um anúncio), é o filtro interno de
decisão — qualquer feature nova, qualquer texto de UI, qualquer material de marketing pode ser
avaliado pela pergunta "isso contribui para encerrar a invisibilidade financeira do veículo do usuário?".

### 1.2 Visão de Marca

> **Que lugar o Nave quer ocupar no mercado brasileiro daqui a 5-10 anos.**

Ser a referência de clareza e cuidado na gestão de veículos no Brasil — o primeiro app que vem à mente
quando alguém precisa entender o custo real do seu carro ou da sua frota, da mesma forma que o Nubank
redefiniu o que um banco pode ser para o brasileiro.

*Diferença em relação à visão de produto do PRD:* a visão de produto fala em "reduzir custos operacionais
e evitar esquecimentos críticos" — é o que o software entrega. A visão de marca fala em ocupar um
**espaço de referência cultural** no mercado brasileiro — é o que a empresa constrói ao longo do tempo.

### 1.3 Missão

> **O que o Nave faz no dia a dia para chegar à visão.**

Transformar registros fragmentados de despesas, manutenções e quilômetros rodados em uma visão limpa
e acionável do estado real de cada veículo — para que qualquer pessoa saiba, em segundos, se seu carro
ou frota está saudável hoje.

*A missão ancora o princípio "Calm UI" já estabelecido:* "segundos" não é figura de linguagem, é
critério de design.

### 1.4 Valores

Valores de marca são comportamentos não negociáveis, não slogans. Cada valor do Nave vem com uma
manifestação concreta e um anti-padrão — o que a marca *não* faz e que outras fazem.

---

**V1 — Clareza antes de completude**

A informação útil e legível vale mais que a informação total e confusa. O Nave prefere mostrar
um KPI confiável a exibir dez métricas duvidosas.

*Anti-padrão evitado:* apps de gestão que sobrecarregam a tela para "parecer completos".

---

**V2 — Cuidado sem paternalismo**

O Nave cuida do veículo do usuário, não do usuário. Avisa sobre manutenção vencida sem dramatizar,
registra despesa inesperada sem julgar, responde erros sem culpar. A autonomia do usuário é preservada.

*Anti-padrão evitado:* apps que "educam" o usuário a todo momento sobre como usá-los.

---

**V3 — Compostura nos momentos difíceis**

Despesa inesperada, revisão cara, alerta de atraso — esses são momentos emocionalmente carregados.
A marca responde com precisão e próximo passo claro, nunca com drama nem com fórmula de reasseguramento.

*Anti-padrão evitado:* "Não se preocupe, nossa equipe está cuidando disso."

---

**V4 — Brasileiro de verdade**

A sofisticação que o Nave busca é a do Barroco Mineiro — produzida aqui, com referências daqui,
para um mercado que entende e valoriza qualidade quando a vê. Não é "design brasileiro com jeitinho",
é artesanato de alta qualidade com identidade cultural genuína.

*Anti-padrão evitado:* copiar a estética de apps americanos sem questionar se faz sentido no Brasil.

---

**V5 — Precisão que liberta**

O detalhe técnico existe para que o usuário tome uma decisão melhor, não para que o produto pareça
mais complexo do que é. Quando a complexidade não serve ao usuário, ela é removida.

*Anti-padrão evitado:* features que existem para impressionar, não para resolver.

---

### 1.5 Proposta Única de Valor (UVP)

A UVP responde "por que o Nave, e não outra coisa?" — deve funcionar em uma frase, dirigida à persona
principal (Carlos, motorista autônomo, e Ana, gestora de frota pequena).

> **"O Nave transforma cada quilômetro rodado em clareza — não em mais uma planilha."**

*Versão expandida (landing page, onboarding):*
"Chega de anotar no papel, de perder recibo, de estimar quanto o carro está custando. O Nave reúne
despesas, manutenções e odômetro num único lugar e transforma isso em respostas — para você saber
exatamente o que seu veículo precisa, antes de precisar descobrir da pior forma."

*Critérios que a UVP satisfaz:*
- **Diferenciação real de Samsara/Motive:** eles são enterprise + IoT + hardware; o Nave é leve, mobile-first, sem hardware.
- **Diferenciação de apps genéricos de finanças (Mobills, GuiaBolso):** eles não entendem veículo; o Nave é especializado.
- **Conectado ao propósito:** a "clareza" da UVP é a mesma que aparece no propósito ("encerrar a invisibilidade").
- **Evita feature-speak:** não lista funcionalidades ("agenda de manutenção, registro de despesa, odômetro") — aponta para o benefício emocional real (saber, antes de ser surpreendido).

### 1.6 Posicionamento de Mercado

#### Mapa de posicionamento

Dois eixos que melhor capturam a diferença real entre os players do mercado:

- **Eixo horizontal:** Complexidade de adoção — `Leve / Acessível` ←→ `Pesado / Enterprise`
- **Eixo vertical:** Orientação do produto — `Individual / Humano` ←→ `Corporativo / Operacional`

```
                   INDIVIDUAL / HUMANO
                          ▲
                          │
           Apps de        │        ★ Nave
           finanças       │        (especializado + humano)
           pessoais       │
           (genérico) ●   │
                          │
──────────────────────────┼─────────────────────────────→
LEVE / ACESSÍVEL          │                    PESADO / ENTERPRISE
                          │
                          │   ● Motive
                          │
                          │              ● Samsara
                          │
                   CORPORATIVO / OPERACIONAL
```

**Conclusão do mapa:** o quadrante "Especializado em veículo + Individual/Humano" está vazio no Brasil.
Samsara e Motive dominam o quadrante enterprise/operacional; apps de finanças pessoais são genéricos.
O Nave entra sem concorrente direto nesse quadrante — é um posicionamento de nicho com potencial de
expansão para o quadrante enterprise à medida que o produto Roberto (grande frota) for desenvolvido.

#### Comparativo de posicionamento vs. concorrentes

| Dimensão | Samsara | Motive | Apps de finanças pessoais | **Nave** |
|---|---|---|---|---|
| Público-alvo primário | Grandes frotas (50+ veículos) | Médias/grandes frotas | Pessoa física geral | Motorista individual + gestora de frota pequena (3-10 veículos) |
| Tecnologia | IoT + hardware (rastreador) | IoT + hardware | Mobile/web, contabilidade pessoal | Web/mobile, sem hardware |
| Especialização em veículo | Alta (operacional) | Alta (operacional) | Nenhuma | Alta (financeira + manutenção) |
| Tom de marca | Técnico/enterprise | Operacional/neutro | Amigável/genérico | Especializado + acolhedor |
| Acesso/custo inicial | Alto (contrato enterprise) | Alto | Gratuito/freemium | Freemium (pré-definido como acessível) |
| Presença no Brasil | Limitada/distribuidor | Limitada | Alta (Mobills, GuiaBolso) | Nascido no Brasil |

### 1.7 Arquitetura de Marca

**Decisão: Branded House (marca monolítica).**

Tudo é Nave — não há submarcas, variantes de produto com identidade visual própria nem marcas de funcionalidade.

*Justificativa:*
1. O produto é único hoje — não há portfólio que justifique casa de marcas.
2. Pré-lançamento é o momento de construir reconhecimento em torno de um nome, não de fragmentá-lo.
3. O benchmark mais próximo no quadrante desejado (Linear, Ramp, Mercury) também opera como Branded House — o produto é a marca.
4. Custo de manutenção de identidade é mínimo com marca única — crítico para um time pequeno.

*Decisão consciente para o futuro:* se o produto Roberto (grande frota, 50-500 veículos) for lançado
com proposta de valor suficientemente distinta da do Carlos/Ana, a decisão de criar uma extensão de marca
("Nave Frotas" ou similar) deve ser reavaliada naquele momento — não antes. Registrada aqui para que
não seja tomada por inércia quando chegar a hora.

*Naming de features:* features do produto ganham nome descritivo funcional ("Relatório de custos",
"Agenda de manutenção"), nunca nome de sub-produto com identidade própria (não "Nave Insights",
"Nave Care"). O produto é o Nave; as features são partes do Nave.

---

## 2. Identidade Verbal

Esta seção expande a seção 11 do documento irmão (que definiu os cinco adjetivos, o tom por contexto
e os exemplos de microcopy). Nenhuma decisão anterior é repetida — apenas acrescida.

### 2.1 Arquétipo de Marca (Jung)

#### Por que usar arquétipos

A framework de 12 arquétipos de Jung, popularizada em branding por Mark e Pearson (2001) e aplicada
consistentemente por agências B2B como Focus Lab e deSantis Breindel, resolve um problema prático:
a inconsistência de tom entre textos escritos por pessoas diferentes ao longo do tempo. O arquétipo
funciona como filtro — "um Sábio faria isso?", "um Cuidador diria assim?" — mais instintivo que uma
lista de regras.

#### Arquétipo primário: O Sábio (Sage)

**Desejo central:** verdade e compreensão.
**Promessa ao usuário:** clareza, insight e o próximo passo certo.
**Voz:** preciso, confiante, baseado em evidências — sem jargão desnecessário.
**Medo do arquétipo:** ser enganoso, superficial, ou fazer o usuário se sentir ignorante.

*Por que o Sábio e não o Governante (Ruler) ou o Herói (Hero):*
- O Governante projeta autoridade e controle institucional — adequado para bancos tradicionais e
  enterprise como a Salesforce. Não combina com o registro caloroso e acessível do Nave (pequeno gestor, motorista autônomo).
- O Herói conquista, supera, vence — tom de energia intensa que contradiz o "Calm UI" e o "caloroso
  com compostura". Mercury e Linear exploram o Herói sutilmente; o Nave lida com momentos de estresse
  financeiro do usuário, onde o Herói seria invasivo.
- O Sábio domina em produtos cujo valor central é **fazer o usuário entender algo que antes era opaco**
  — que é exatamente o que o Nave entrega: a visão clara de custo/saúde do veículo. Exemplos bem-sucedidos
  de Sage em B2B: Notion ("ferramentas para entender e organizar"), Airtable, IBM Watson.

*Conexão com os cinco adjetivos aprovados:*

| Adjetivo aprovado | Manifestação no arquétipo Sábio |
|---|---|
| Competente | O Sábio conhece o assunto — usa termo técnico quando ajuda, não para performar |
| Direto | O Sábio não usa rodeios — fala o que sabe, claramente |
| Confiável | O Sábio demonstra confiança com fatos, não com frases de efeito |
| Acolhedor | Onde o Sábio puro seria frio, o secundário Cuidador aquece (ver abaixo) |
| Caloroso com compostura | O Sábio é rigoroso; o Cuidador é humano — juntos, chegam ao tom certo |

#### Arquétipo secundário: O Cuidador (Caregiver)

**Desejo central:** cuidar e proteger.
**Contribuição:** impede que o Sábio seja frio, professoral ou condescendente.
**Limite de uso:** o Cuidador aparece no tom e na atenção ao usuário em momentos difíceis (manutenção
vencida, despesa inesperada, erro) — nunca como paternalismo ou proteção excessiva.

*Por que secundário e não primário:* o Cuidador como primário levaria a um tom de "app de bem-estar"
ou saúde — maternal, emocional, gentil em excesso. O Nave resolve um problema técnico/financeiro real;
o Cuidador existe para que o Sábio não abandone o usuário no momento errado.

*A dupla Sábio + Cuidador no mercado:* é o perfil de "Consultor de Confiança" — o contador que realmente
explica o imposto, o mecânico honesto que mostra o problema sem inventar. É exatamente o que o Carlos
(motorista autônomo) e a Ana (gestora de frota pequena) precisam: alguém que sabe mais do que eles
sobre o veículo e que não vai usar esse conhecimento para intimidar.

### 2.2 Guia de Estilo Editorial Completo

Esta seção expande a seção 11 do documento irmão. Os exemplos antes/depois e o tom por contexto
já definidos ali não são repetidos — esta seção acrescenta as regras que faltavam.

#### Vocabulário recomendado e palavras banidas

**Fazer — vocabulário alinhado ao Sábio + Cuidador:**

| Contexto | Prefira | Em vez de |
|---|---|---|
| Descrever o produto | "ver claramente", "acompanhar", "entender o que está acontecendo" | "monitorar", "rastrear", "supervisionar" (remete a vigilância, não cuidado) |
| Ação do usuário | "registre", "adicione", "revise", "agende" | "monitore", "gerencie", "controle" |
| Saúde do veículo | "está em dia", "precisa de atenção", "está em atraso" | "OK", "NOK", "fora do prazo", "atrasado" (frio demais) |
| Custo/gasto | "quanto está custando", "valor registrado", "gasto do mês" | "débito", "encargo", "saída financeira" (linguagem bancária fora de contexto) |
| Onboarding | "vamos ver de verdade", "comece por aqui", "em alguns minutos" | "configure seu perfil", "preencha os campos", "complete o cadastro" |
| Sucesso de ação | "registrado", "agendado", "atualizado" | "operação concluída", "processado com sucesso", "dados salvos" |

**Banir — vocabulário proibido em qualquer texto de produto ou marca:**

- **Jargão técnico exposto:** "erro 422", "timeout", "payload", "null pointer", "500 internal server error"
- **Fórmulas de reasseguramento:** "seus dados estão seguros", "pedimos desculpas pelo transtorno",
  "nossa equipe está ciente", "agradecemos sua compreensão"
- **Linguagem de app de finança pessoal genérico:** "organize suas finanças", "controle seus gastos",
  "economize mais" — o Nave é sobre veículo, não sobre finanças em geral
- **Linguagem enterprise de frota:** "gerenciar ativos", "frotas de ativos", "gestão de compliance" —
  é o tom de Samsara; o Nave é mais próximo que isso
- **Coloquialismo de fala solta:** "tá", "bora", "né", "pra" (em texto de produto — na fala de marketing
  casual pode ter exceção, mas nunca no produto)
- **Superlativos gratuitos:** "incrível", "poderoso", "revolucionário", "transformador" — o Sábio
  não precisa de hipérbole; mostra com dados

#### Gramática e pontuação

**Pessoa verbal:** segunda pessoa do singular ("você"), voz ativa, tom imperativo afirmativo em CTAs.
Usar "você" sempre — nunca "o usuário", "o proprietário", "o gestor" no texto de interface.

**Caixa:**
- Títulos de seção e página: primeira palavra em maiúsculo, restante em minúsculo (estilo sentença)
  — "Despesas do mês", não "Despesas Do Mês" nem "DESPESAS DO MÊS"
- Nomes próprios e da marca: Nave (sempre com inicial maiúscula, nunca NAVE)
- Labels de formulário: caixa sentença ("Valor da despesa", não "Valor Da Despesa")
- CTAs: caixa sentença ("Salvar despesa", não "SALVAR DESPESA" nem "Salvar Despesa")
- Status/badges: caixa baixa preferencial ("em dia", "em atraso", "pendente") — só maiúsculo se
  o tamanho da fonte exigir legibilidade (≤11px, onde caixa baixa pode ficar difícil)

**Pontuação:**
- Pontos finais em frases completas de corpo; sem ponto em labels, placeholders e CTAs curtos
- Reticências apenas para indicar loading ou texto truncado — nunca como device de suspense ("Carregando...")
- Ponto de exclamação: reservado a momentos de conquista genuína (primeiro login, primeira despesa
  registrada, meta de custo batida) — no máximo uma vez por sessão; nunca em erros ou avisos
- Aspas: curvas ("assim"), não retas ("assim") — quando necessário citar um valor ou exemplo
- Em-dash (—): uso autorizado para inserção e pausa forte, mas com moderação; não usar travessão duplo (--)
- Vírgula antes de "e" em lista: não usar serial comma (vírgula de Oxford) em português correto —
  "despesas, manutenções e odômetro" (sem vírgula antes do "e")

**Números e valores:**
- Moeda: R$ 150,00 (espaço não quebrável entre símbolo e número, vírgula decimal, ponto milhar)
  — "R$ 150,00", nunca "R$ 150.00" nem "BRL 150"
- Quilômetros: 12.345 km (ponto milhar, espaço antes da unidade)
- Datas: dia/mês/ano por extenso em texto ("12 de julho de 2026") e DD/MM/AAAA em campos de dado
- Porcentagens: 12% (sem espaço entre número e símbolo, ao contrário da regra tipográfica clássica
  — exceção pragmática para legibilidade em dashboards)

**Língua inclusiva:**
- Preferir construções neutras sempre que possível: "proprietário do veículo" pode ser neutralizado
  para "quem cuida do veículo" ou "você, que cuida do veículo"
- Não usar o masculino genérico em onboarding e textos principais — redirecionar para segunda pessoa
  ("você registrou", não "o usuário registrou")
- Evitar generalizações de gênero nos exemplos de UI ("Ana tem 3 veículos e registra as despesas
  dela" — já usa persona feminina, manter)
- Não há política de linguagem neutra com "x" ou "@" (ex: "usuárix") — o produto usa o "você"
  e construções que dispensam essa marcação

**Emoji:**
- Proibido em textos de produto, labels, mensagens de erro, confirmações e alertas
- Autorizado com critério em comunicações de marketing externo (redes sociais, e-mail marketing)
  onde o tom de canal justifica — nunca como substituto de palavra, sempre como complemento
- Nunca no logotipo, taglines ou textos institucionais formais

#### Regras de comprimento de texto por contexto

| Contexto | Comprimento máximo orientativo |
|---|---|
| Título de página / header | 4-6 palavras |
| Subtítulo de seção | 6-10 palavras |
| Label de campo | 3-5 palavras |
| Placeholder de campo | Máximo 1 frase curta (exemplo do que preencher) |
| Mensagem de erro inline | 1 frase, máximo 12 palavras |
| Toast de confirmação | 1 frase, máximo 8 palavras |
| Toast de erro (com próximo passo) | 2 frases, máximo 20 palavras |
| Empty state (título + descrição) | Título ≤6 palavras + descrição ≤20 palavras |
| Onboarding step | Máximo 3 frases de corpo — mais que isso, é UX research, não copywriting |

### 2.3 — Validação e Extensão de Copywriting

> **Quem escreveu esta seção:** agente `ad-creative`, revisando o trabalho do `brand-designer` nas
> seções 2.1 e 2.2. A revisão foi solicitada em 2026-07-30 e cobre: consistência de arquétipo,
> lacunas operacionais do guia, novos exemplos de microcopy, opções de tagline e glossário expandido.

#### O que está correto e não precisa mudar

Os itens abaixo foram revisados e estão bem calibrados — não há reescrita necessária, apenas
confirmação para que não sejam alterados em iterações futuras sem motivo específico:

- O mapeamento dos cinco adjetivos aprovados para o Sábio+Cuidador (tabela da seção 2.1) está
  preciso. Competente, Direto e Confiável mapeiam para o Sábio sem forçar; Acolhedor e Caloroso
  com compostura são a camada Cuidador que impede o Sábio de soar frio — a tensão está correta.
- A distinção Sábio (primário) / Cuidador (secundário) está bem justificada e impede o produto de
  escorregar para o tom de app de bem-estar. Manter essa hierarquia.
- As regras de gramática e pontuação (sentence case, ausência de serial comma em português, moeda
  com vírgula decimal, km com ponto milhar, reticências apenas para loading/truncamento) estão
  operacionais e não ambíguas.
- A solução de língua inclusiva via segunda pessoa ("você") é a abordagem correta para o português
  BR — dispensa o recurso artificial de "x" ou "@" sem excluir ninguém.
- A proibição de emoji no produto e a autorização criteriosa no marketing externo está calibrada
  corretamente para o arquétipo: o Sábio não usa emoji como substituto de argumento.
- As regras de comprimento por contexto são acionáveis. Os tetos de 12 palavras para erro inline e
  8 palavras para toast de confirmação resolvem o vício de redatores que transformam microcopy em
  parágrafo.
- A decisão de banir "monitorar", "rastrear" e "supervisionar" está correta: esses verbos carregam
  semântica de vigilância que contradiz o valor V2 (Cuidado sem paternalismo). A substituição por
  "acompanhar", "ver" e "entender" está alinhada ao Cuidador.

#### Análise do arquétipo — o que está sustentado e o que precisa de nota de limite

**Arquétipo sustentado:** nenhum dos exemplos de microcopy aprovados na seção 11 do documento
irmão soa como Herói (conquista intensa, superação) nem como Criador (experimentação, inventividade
lúdica). Os exemplos percorrem Sábio puro (fato concreto, próximo passo) e Sábio com Cuidador
(atenção ao momento emocional, ausência de julgamento). A dupla está de fato sustentada.

**Um exemplo exige nota de limite:**

O copy aprovado "O ABC-1234 está aguardando uma revisão. Vale reservar um horário — ele agradece."
usa personificação do veículo ("ele agradece"). Esse recurso é válido como manifestação do Cuidador
— cria proximidade sem dramatizar. O problema não é o exemplo em si, é o risco de generalização:
se personificação se tornar padrão do produto em vez de recurso pontual, o tom desliza para
o arquétipo Criador (antropomorfismo como traço central da voz). A regra que falta no guia:

> **Personificação do veículo:** recurso autorizado — máximo uma vez por sessão de notificação
> ou alerta. Nunca em erros de sistema, formulários ou dashboards. Nunca combinada com emoji.
> O veículo pode "precisar de atenção", "agradecer" ou "estar aguardando" — nunca "sentir",
> "querer" ou "pedir" (escala que cruza para Criador).

#### Lacunas operacionais do guia — correções necessárias

**1. Inconsistência interna: "performar" como verbo no próprio guia**

A seção 2.1 usa a frase "nunca para performar autoridade" ao descrever o Sábio. O verbo "performar"
(de "to perform") é anglicismo de jargão de comunicação/estratégia — consolidado no vocabulário
interno de agências, mas não é linguagem de produto nem de marketing externo. O guia não clarifica
isso, o que cria ambiguidade: um redator pode interpretar que "performar" está liberado por aparecer
no próprio documento de marca.

Clarificação necessária: **"performar" é palavra de uso interno em documentos de estratégia de
marca. Nunca deve aparecer em texto de produto, anúncio, email de marketing ou qualquer material
que o usuário final leia.** Em contexto externo, substituir por "demonstrar", "exibir" ou
reformular a frase para evitar o verbo.

**2. Anglicismos estruturais sem política clara**

O guia proíbe anglicismos no produto mas usa extensamente "onboarding", "features", "enterprise",
"dashboard" e "insights" sem distinguir o que é aceitável por falta de tradução estabelecida e
o que deve ser substituído. Isso cria ambiguidade para qualquer redator.

Política proposta (inserir no guia como regra):

| Termo | Status no produto | Substituto preferido | Notas |
|---|---|---|---|
| dashboard | Aceitável — sem tradução natural estabelecida | "painel" apenas em texto explicativo | Nunca forçar "painel de controle" — soa burocrático |
| onboarding | Aceitável internamente; evitar exposto ao usuário | "primeiros passos", "início", "boas-vindas" | O usuário deve ver "Vamos começar", não "Onboarding" |
| features | Proibido no produto e no marketing externo | "recursos", ou simplesmente descreva a função | Ex: não "esta feature" → "esta opção" ou nomeie diretamente |
| insights | Evitar no produto — prefira a conclusão direta | "o que isso significa" → mostre o número + a conclusão | "Veja seus insights" é vago; "Seu custo por km subiu 12%" é Sábio |
| upgrade | Aceitável em contexto de paywall, onde o conceito é compreendido | "mudar de plano" em contexto editorial | Em CTA de paywall, "Escolher um plano" é mais neutro |
| trial | Evitar — prefira descrição | "período gratuito", "experimente por X dias" | "Seu trial acabou" → "Seu período gratuito acabou" |
| setup | Evitar | "configuração", "início" | |
| update | Evitar no produto | "atualização", "atualizar" | |
| default | Evitar no produto | "padrão" | |
| report | Aceitável como termo técnico interno; evitar no nome de tela | "Relatório de custos", não "Cost Report" | O produto em pt-BR não deve misturar idiomas em labels |

**3. Lacuna: "carro" vs. "veículo" — regra de uso ausente**

O produto atende ao motorista individual (que chama de "carro") e ao gestor de frota (que chama
de "veículo"). O guia não orienta qual usar em qual contexto. Sem isso, o produto oscila entre
os dois termos sem critério, e o usuário percebe inconsistência.

Regra proposta:

- **"veículo"** em contexto de dado e interface: labels, títulos de seção, dashboards, badges,
  mensagens de erro, confirmações de formulário. É neutro e abrange carro, moto, van, caminhão.
- **"carro"** em copy de marketing e onboarding dirigido à persona Carlos (motorista autônomo):
  onboarding step 1, landing page, anúncios. Cria proximidade com a persona e reconhecimento
  imediato do problema ("quanto meu carro está custando").
- Em uma mesma tela, não misturar: se o título usa "veículo", o corpo também usa "veículo".
- Excepcionalmente, o microcopy de notificação pode usar "carro" para tom mais próximo: "Seu
  carro está aguardando revisão" — desde que o modelo/placa apareça junto para especificidade.

**4. Lacuna: "insight" é palavra do arquétipo, não do produto**

A descrição do Sábio na seção 2.1 usa "clareza, insight e o próximo passo certo" como promessa
do arquétipo. Isso está correto para descrever o arquétipo internamente. O problema é que
"insight" não entra no produto — o produto entrega a conclusão direta, não rotula a conclusão
como "insight". Um redator sem essa distinção pode escrever "Veja os insights do seu veículo"
no produto.

Regra: "insight" é palavra de estratégia, não de produto. No produto, nunca diga "insights" —
mostre o dado e a conclusão. Exemplo: não "Novos insights disponíveis" → "Seu custo subiu 18%
este mês. Quer ver o detalhamento?"

#### Novos exemplos de microcopy — contextos não cobertos

Os contextos abaixo não constam nos exemplos aprovados na seção 11 do documento irmão. Cada
par mostra versão genérica (a evitar) e versão Nave, com nota do mecanismo de voz usado.

---

**Notificação push — veículo acima do limite de km** *(Fase 2, fora do MVP)*

| | Texto |
|---|---|
| Evitar | "Lembrete: veículo ABC-1234 com manutenção pendente." |
| Nave | "O Gol 2020 já passou 500 km da última revisão. Uma olhada rápida resolve." |

*Mecanismo:* Sábio (dado específico: 500 km, não "em atraso genérico") + Cuidador ("uma olhada
rápida resolve" — remove ansiedade sem minimizar). Nenhuma fórmula de reasseguramento.

---

**Erro de validação — valor zerado ou em branco em campo monetário**

| | Texto |
|---|---|
| Evitar | "O campo Valor é obrigatório e não pode ser zero." |
| Nave | "Informe o valor da despesa. Quanto custou, de fato?" |

*Mecanismo:* Sábio direto (fato: precisa informar o valor) sem tom acusatório. A segunda frase
não é obrigatória — usar quando o campo estiver em contexto de despesa significativa onde a
pergunta faz sentido. Não usar para campos técnicos de formulário.

---

**Tooltip explicativo — custo por km**

| | Texto |
|---|---|
| Evitar | "Custo por quilômetro rodado." |
| Nave | "Total de despesas do período dividido pelos quilômetros rodados — quanto cada km saiu do bolso." |

*Mecanismo:* Sábio explica o cálculo (não só nomeia a métrica). "saiu do bolso" é linguagem
concreta que ancora o conceito no mundo real do usuário — não é financês, não é jargão técnico.

---

**Paywall/upgrade — limite de veículos atingido** *(funcionalidade futura de monetização)*

| | Texto |
|---|---|
| Evitar | "Você atingiu o limite do plano gratuito. Faça upgrade para continuar." |
| Nave | "Você já acompanha 2 veículos — o plano atual chega até aí. Para incluir mais, escolha o plano que faz sentido para você." |

*Mecanismo:* Sábio (fato concreto: "o plano atual chega até aí", não "limite atingido") +
autonomia do Cuidador ("que faz sentido para você" — sem urgência falsa, sem pressão de Herói).
O CTA do botão deve ser "Ver planos", nunca "Fazer upgrade agora".

---

**Exportação concluída — relatório gerado**

| | Texto |
|---|---|
| Evitar | "Exportação concluída com sucesso. O arquivo foi gerado." |
| Nave | "Relatório gerado. Você encontra o PDF na pasta de downloads." |

*Mecanismo:* Sábio com fato concreto e instrução do próximo passo ("na pasta de downloads" —
não "foi enviado para seu e-mail" de forma vaga). Nenhuma fórmula de confirmação burocrática.

---

**Convite de compartilhamento de acesso**

| | Texto |
|---|---|
| Evitar | "Convite enviado ao usuário com sucesso." |
| Nave | "Convite enviado para [email]. Assim que confirmar, verá os veículos que você compartilhar." |

*Mecanismo:* Sábio explica o que vai acontecer a seguir ("assim que confirmar") — não deixa o
usuário no escuro sobre o próximo passo. O [email] deve ser o endereço real, não um placeholder
genérico como "o destinatário".

---

**Loading de cálculo demorado (>2 segundos)**

| | Texto |
|---|---|
| Evitar | "Carregando dados..." |
| Nave | "Calculando o custo total — pode levar alguns segundos." |

*Mecanismo:* Sábio define expectativa com tempo real ("alguns segundos", não "aguarde"). A
reticências em "Carregando..." é o único uso autorizado de reticências no produto (ver §2.2),
mas a versão Nave substitui a frase vaga por contexto do que está acontecendo.

---

**Erro de conexão — sem internet**

| | Texto |
|---|---|
| Evitar | "Sem conexão com a internet. Verifique sua rede e tente novamente." |
| Nave | "Você está sem conexão agora. Assim que voltar, o Nave retoma de onde parou." |

*Mecanismo:* Cuidador (assegura com fato concreto — "retoma de onde parou" — sem a fórmula
de reasseguramento proibida "seus dados estão seguros"). Sábio (não culpa o usuário, não
drama, apenas estado + o que acontece a seguir).

---

#### Opções de tagline pública

A UVP interna ("O Nave transforma cada quilômetro rodado em clareza — não em mais uma planilha")
é precisa como filtro de decisão interno, mas tem 14 palavras e uma negação — formato que funciona
em landing page como texto de apoio, não como tagline de memória em site, app store ou anúncio.

As opções abaixo têm no máximo 8 palavras, são coerentes com Sábio+Cuidador e com o propósito
("encerrar a invisibilidade financeira do veículo"):

---

**Opção 1 — Recomendada principal**

> **"Seu carro tem custo. Agora você sabe."**

8 palavras. A primeira frase nomeia o problema que o usuário tende a negar ou subestimar; a
segunda entrega a promessa do Sábio com precisão: não "entenda melhor", não "gerencie" — "você
sabe". O "agora" marca a transformação que o produto entrega. Funciona em anúncio de aquisição,
app store e header de landing page.

*Por que é a recomendada:* ativa o insight (core do arquétipo Sábio), tem ritmo de duas frases
curtas que retém, e o "agora você sabe" é a formulação mais honesta da promessa do produto —
antes do Nave, você estimava; depois, você sabe.

---

**Opção 2 — Compacta (app store, meta description, favicon badge)**

> **"Veículo cuidado. Dinheiro entendido."**

4 palavras. Paralela, forte, sem verbo de ação — formula o estado desejável, não a jornada.
Combina Sábio ("entendido") com Cuidador ("cuidado"). Funciona onde o espaço é mínimo.

---

**Opção 3 — Versão com tensão direta (anúncio de performance)**

> **"O que seu carro custa. Sem chute."**

7 palavras. "Sem chute" é coloquial mas não é gíria regional — é linguagem corrida aceita em
marketing sem ser gíria de produto. A tensão ("sem chute") define o problema que o produto
resolve sem precisar de negação explícita ("não é mais uma planilha"). Mais adequada para
campanhas de aquisição por awareness de problema do que para o produto em si.

---

**Opção 4 — Versão mais formal (slide de pitch, press kit)**

> **"Clareza sobre o que seu veículo realmente custa."**

8 palavras. Sem coloquialismo, adequada para contexto de investidor ou imprensa. Usa "veículo"
(mais abrangente que "carro"), mantém "clareza" do propósito. Perde um pouco de impacto
emocional em troca de precisão de posicionamento.

---

**Opção 5 — Variante para persona de frota pequena (Ana)**

> **"Gestão de frota sem hardware. Só clareza."**

7 palavras. Diferencia diretamente de Samsara/Motive (hardware) e ancora o benefício. Menos
adequada como tagline universal, mais adequada como headline de segmento em landing page ou
campanha B2B direcionada.

---

**Recomendação de uso por contexto:**

| Contexto | Tagline recomendada |
|---|---|
| Header de landing page (hero) | Opção 1 — "Seu carro tem custo. Agora você sabe." |
| App Store / Play Store (subtítulo) | Opção 2 — "Veículo cuidado. Dinheiro entendido." |
| Anúncio Meta Ads / Google (headline) | Opção 3 — "O que seu carro custa. Sem chute." |
| Slide de pitch / press kit | Opção 4 — "Clareza sobre o que seu veículo realmente custa." |
| Campanha segmentada para frota | Opção 5 — "Gestão de frota sem hardware. Só clareza." |

As opções 1 e 2 devem ser **aprovadas antes de qualquer uso público** — são as que mais
provavelmente se tornarão canônicas e precisam de validação de Douglas antes de aparecer
em qualquer material.

#### Glossário de marca expandido — vocabulário banido

A lista da seção 2.2 cobre bem o jargão técnico exposto e as fórmulas de reasseguramento.
As lacunas abaixo são específicas do SaaS financeiro em português BR — armadilhas que
surgem quando o redator traduz mentalmente do inglês sem questionar.

**Adições ao vocabulário banido no produto e marketing externo:**

- **"performar"** (verbo) — anglicismo de estratégia de comunicação, aceitável apenas em
  documentos internos de marca. No produto e no marketing externo, substituir por
  "demonstrar", "mostrar", "exibir" ou reformular a frase.

- **"features"** — no produto, nunca; use "recursos", "opções" ou nomeie diretamente a
  funcionalidade. Em documentação interna e no CLAUDE.md, o termo é aceitável como jargão
  de produto — a proibição é para o texto que o usuário lê.

- **"insights"** como substantivo genérico — não use "acesse seus insights", "novos insights
  disponíveis". O Sábio não rotula a conclusão: ele mostra o dado e a conclusão juntos.
  "Seu custo por km subiu 18% este mês" é melhor que "Novo insight de custo".

- **"onboarding"** em texto de produto — use "primeiros passos", "vamos começar", "início".
  Onboarding é termo interno de produto que não deve vazar para a interface.

- **"trial"** — substituir por "período gratuito", "experimente por X dias". "Seu trial
  acabou" → "Seu período gratuito acabou".

- **"upgrade"** em CTAs de paywall — prefira "Ver planos", "Escolher um plano", "Expandir
  acesso". "Upgrade" é aceitável como jargão de suporte, nunca como CTA público.

- **"lifetime"** em contexto de preço — substituir por "acesso permanente", "para sempre"
  (dependendo do tom do momento) ou simplesmente descreva o que o plano inclui.

- **"default"** — substituir por "padrão". "Configuração default" → "Configuração padrão".

- **"update"** como verbo — substituir por "atualizar". "Atualize seu plano" em vez de
  "Update seu plano".

- **"setup"** — substituir por "configuração", "início", "preparação". "Setup da conta" →
  "Configuração da conta" ou "Como começar".

- **"report"** em nome de tela — o produto usa "Relatório de custos", não "Cost Report" nem
  "Report". Nunca misturar idiomas em labels da interface.

- **"cashback", "split"** — o Nave não é app de pagamento; esses termos não têm contexto
  no produto hoje, mas podem surgir ao descrever integrações. Usar apenas se o conceito
  for diretamente aplicável e não houver substituto em português.

- **"organizar suas finanças"** ou **"controlar seus gastos"** como benefício principal —
  esses são os benefícios de Mobills e GuiaBolso (concorrentes genéricos). O Nave é sobre
  veículo. O benefício é "saber o que seu carro está custando", nunca "organizar finanças".

- **"solução"** como substantivo para o produto — "nossa solução de gestão de frotas" é
  linguagem enterprise que o Nave explicitamente evita. O produto é o Nave, não "a solução".

- **"plataforma"** como descrição do produto em texto de usuário — aceitável em press kit
  e documentação interna; evitar em onboarding e produto ("bem-vindo à plataforma" →
  "bem-vindo ao Nave").

- **"usuário"** em qualquer texto voltado para o usuário — o guia já cobre isso, mas
  vale reforçar: "o usuário pode configurar" nunca aparece em tela; é sempre "você".

---

*Seção adicionada pelo agente `ad-creative` em 2026-07-30, revisando e validando o trabalho
do `brand-designer` nas seções 2.1 e 2.2. As decisões de posicionamento, arquétipo, paleta e
logotipo das demais seções não foram alteradas.*

---

## 3. Identidade Visual

### 3.1 Direção de Logotipo

> **Nota de escopo:** este capítulo define o conceito, o tipo de marca e as regras de aplicação.
> Não inclui o arquivo vetorial final (SVG/AI/PDF) — isso é etapa de execução gráfica, posterior
> à aprovação desta direção.

#### Tipo de marca recomendado: Combination mark (símbolo + wordmark)

**Racional:**
- Marcas 100% wordmark (Ramp, Linear) funcionam quando o nome é simples e rítmico o suficiente para
  ser memorável por si só — o que é o caso do Nave também, mas...
- O Nave em português tem um significado semântico rico ("nave" = embarcação, invólucro, interior de
  uma catedral) que pode ser comunicado visualmente via símbolo, ampliando a narrativa de marca sem
  precisar de texto
- Em um estágio inicial sem reconhecimento de marca, a combination mark permite que símbolo e wordmark
  trabalhem juntos para construir associação — o símbolo torna-se usável sozinho (favicon, app icon,
  bordado em uniforme) apenas quando o reconhecimento já existe
- Mercury e Vercel mostram que "dark + combination mark geométrico + wordmark cuidadoso" é a fórmula
  que comunica sofisticação e precisão em B2B sem parecer genérico

#### Conceito do símbolo

> **Revisão 2026-07-31:** o conceito original desta seção ("O Arco Aberto") foi substituído após
> Douglas apontar que um arco parcial é uma forma disputada demais no mercado (spinners de
> carregamento, gauges de fitness tracker, o próprio arco de VW/Mercedes que a versão anterior já
> tentava evitar). O processo completo de exploração de alternativas está em
> `PROPOSTA-SIMBOLO-ALTERNATIVAS-2026-07-30.md` (conceitos A/B/C, pesquisa de mercado e referências
> ao Barroco Mineiro). O conceito abaixo é o resultado final, refinado em rodadas subsequentes e
> **aprovado por Douglas em 2026-07-31** como referência visual — ver
> `HANDOFF-SIMBOLO-EQUIPE-DESIGN-2026-07-31.md` §0 e `assets/estudo-logo-simbolo-2026-07-31.png`.

**A Estrela-Rosácea — "O centro que orienta e sustenta"**

Uma estrela de quatro pontas alongadas (formato "sparkle"/bússola, não uma estrela convencional de
cinco pontas), com quatro anéis orbitais finos e concêntricos ao redor do núcleo, tangentes ao
centro — inspirados na geometria de rosetas e volutas de talha dourada barroca, tratados de forma
geométrica e contemporânea, nunca ornamental ou florida. Traço/preenchimento com a mesma gramática
visual dos ícones Lucide já adotados no produto (precisão geométrica, sem serrilhado).

*O que a estrela-rosácea comunica:*
- **Bússola / orientação / centro de decisão:** a estrela de quatro pontas é a metáfora visual de
  um ponto cardeal de referência — o painel que orienta a gestão da frota, sem ser um velocímetro
  literal (não é um carro, não é uma roda, não é um painel de instrumentos)
- **Convergência:** os anéis orbitais ao redor do núcleo comunicam dados/veículos distintos
  convergindo para um centro único de decisão — a mesma leitura de "painel central" da metáfora
  anterior, agora com uma forma sem paralelo direto na categoria de frotas
- **Barroco Mineiro sem ilustração:** a fusão bússola + roseta é geometria estrutural, não
  decoração — ecoa as rosetas e volutas de pedra-sabão dos portais de Ouro Preto sem citar
  literalmente nenhum elemento arquitetônico ou religioso
- **Escala e precisão:** geometria simétrica e traço único comunicam exatidão — consistente com V5
  (Precisão que liberta)

*O que a estrela-rosácea NÃO é:*
- Não é anel de loading nem progress ring — o núcleo sólido de quatro pontas rompe a leitura
  circular pura
- Não é âncora, volante, roda ou qualquer elemento náutico/automotivo literal
- Não é o arco de "outros" (Volkswagen, Mercedes) — não há mais elemento de arco no conceito atual
- Não é uma estrela decorativa genérica — a presença dos anéis orbitais e a proporção das pontas
  são o que distingue a forma de um ícone de "favorito"/"destaque" comum em UI

*Sistema em duas camadas — completo vs. reduzido (definido no handoff de execução):*
- **Símbolo completo** (`symbol-full`, ≥64px: dashboard, marketing, apresentações) — estrela +
  anéis orbitais, com leve gradiente/chanfro metálico entre `oklch(67.4% 0.122 86)` e
  `oklch(48% 0.10 82)`
- **Marca reduzida** (`symbol-small`, 16–32px: favicon, app icon, avatar) — apenas o núcleo da
  estrela, preenchimento sólido de uma cor, sem anéis, sem gradiente — testado em grade de 24px e
  validado em 16/32/64px (ver `PROMPTS-SIMBOLO-VERSOES-2026-07-31.md` e o kit de favicon do estudo
  aprovado)

Os detalhes completos de geometria, paleta corrigida e regras de execução (o que não fazer) estão
consolidados em `HANDOFF-SIMBOLO-EQUIPE-DESIGN-2026-07-31.md` — este documento permanece a fonte
narrativa/estratégica do conceito, aquele é a fonte de execução técnica.

*Tratamento cromático do símbolo:*
- Versão principal: símbolo em ouro-acento (`oklch(67.4% 0.122 86)`) sobre fundo escuro; wordmark em branco
- Versão sobre fundo claro: símbolo em ouro-bronze estrutural (`oklch(48% 0.10 82)`); wordmark em azul-índigo principal
- Versão monocromática (preto): símbolo e wordmark em preto sólido
- Versão monocromática (branco): símbolo e wordmark em branco

*Proporção símbolo/wordmark:*
- O símbolo ocupa altura equivalente ao cap-height do wordmark
- O espaçamento entre símbolo e wordmark é igual a 1× a largura do elemento central do símbolo (a estrela)
- A leitura natural é símbolo à esquerda, wordmark à direita — a versão empilhada (símbolo acima,
  wordmark abaixo) é autorizada para contextos quadrados (avatar de app, perfil social)

#### Wordmark

"Nave" em Inter Variable, peso 600 (SemiBold), caixa baixa.

*Por que caixa baixa:*
- "NAVE" em maiúsculas leria como sigla ou nome de empresa estatal ("NAVE", "CAPES", "BNDES")
- "Nave" com inicial maiúscula leria como nome próprio de pessoa ou lugar — é o padrão de mercado,
  mas perde a oportunidade de reforçar a personalidade "Direto" e "Caloroso" que a caixa baixa entrega
- "nave" em caixa baixa tem precedentes fortes em marcas do espaço tech: "linear", "vercel", "notion",
  "stripe" — o registros informal sem perder sofisticação

*Letterspacing:* -0.02em (levemente condensado) — aumenta a coesão visual da palavra curta e
confere confiança sem rigidez.

*Uso de variantes OpenType:* ativar `cv03` (zero cortado) e `cv04` (l/1 distintos) na tipografia
da marca — não que apareçam no wordmark "nave", mas como regra de consistência: quando a fonte Inter
aparece em contexto institucional, essas variantes estão ativas.

### 3.2 Versões e Área de Proteção

#### Versões autorizadas

| Versão | Quando usar |
|---|---|
| **Principal** — símbolo ouro + wordmark branco, sobre fundo grafite ou azul-índigo | Uso padrão em materiais digitais, dark mode, apresentações |
| **Sobre fundo claro** — símbolo ouro-bronze + wordmark azul-índigo, sobre fundo branco/grafite-light | Documentos impressos, slides de apresentação em fundo branco, e-mail |
| **Monocromática preta** — símbolo + wordmark em preto sólido | Contratos, papelaria monocromática, bordado, gravação |
| **Monocromática branca** — símbolo + wordmark em branco | Sobreposição em fotografia escura, merchandising escuro |
| **Símbolo isolado** — apenas o núcleo da estrela (marca reduzida, sem anéis), sem wordmark | Favicon (16×16px, 32×32px, SVG), ícone de app, avatar de perfil social — SOMENTE após reconhecimento de marca estabelecido |
| **Empilhada** — símbolo acima, wordmark abaixo | Avatar de app stores, perfil social quadrado |

#### Tamanho mínimo

| Mídia | Tamanho mínimo (wordmark) |
|---|---|
| Digital (px) | 80px de largura total (combination mark) |
| Impresso (mm) | 25mm de largura total |
| Símbolo isolado | 16×16px (digital); 8mm (impresso) — abaixo disso, usar só wordmark |

#### Área de proteção (clear space)

A área de proteção mínima ao redor do logotipo (combination mark) é igual à altura do "a" minúsculo
do wordmark em cada aplicação — convenção referenciada como "n-space" (altura do x-height).

Nenhum elemento visual (texto, ícone, foto, borda, outro logotipo) pode entrar nessa área.

### 3.3 Regras de Uso Incorreto (Don'ts)

```
DON'T 1 — Não deformar proporções
[nave] ← assim não; [ n a v e ] ← assim também não
Manter proporção original sempre — nunca esticar nem comprimir.

DON'T 2 — Não recolorir arbitrariamente
O símbolo e o wordmark têm apenas as versões autorizadas em 3.2.
Não usar primário azul-índigo no símbolo em versão de cor — o ouro é o símbolo, o azul é o texto.

DON'T 3 — Não adicionar efeitos fora do autorizado
Sem sombra, sem glow, sem contorno extra, sem transparência, em qualquer versão.
O único gradiente autorizado é o chanfro metálico do símbolo completo (`symbol-full`, ≥64px),
entre os dois tons de ouro já definidos — nunca na marca reduzida (`symbol-small`, 16-32px,
favicon/app icon), que é sempre preenchimento sólido de uma cor só, e nunca no wordmark.

DON'T 4 — Não colocar sobre fundos ocupados
Sobre fotografia com alto contraste interno, padrões gráficos ou degradês de outra cor —
usar versão monocromática branca com caixa de proteção se necessário.

DON'T 5 — Não usar apenas símbolo antes do reconhecimento de marca
O símbolo isolado não é autorizado como logo principal até que pesquisa de reconhecimento
indique que o usuário identifica a marca sem o wordmark.

DON'T 6 — Não usar o wordmark em maiúsculas
"NAVE" não é a marca. "nave" é.

DON'T 7 — Não sobrepor símbolo de outra marca ao Nave
Em co-branding, os logotipos ficam separados por espaçamento mínimo definido em §4.2.

DON'T 8 — Não recriar o logo tipograficamente
Usar a fonte Inter com "nave" escrito pelo usuário não é o logotipo — o logotipo tem
letterspacing, peso e configurações OpenType específicos, fixados nos arquivos de brand.
```

### 3.4 Cores Institucionais — Especificação Completa

O documento irmão definiu os tokens OKLCH para o produto digital. Esta seção acrescenta as conversões
para HEX/RGB (digital alternativo, handoff de desenvolvimento), CMYK e Pantone (preparação para
eventual uso impresso/institucional).

> **Nota de precisão:** os valores HEX, RGB, CMYK e Pantone abaixo são conversões aproximadas a
> partir dos valores OKLCH definidos no documento irmão. **O valor autoritativo é sempre o OKLCH.**
> Conversões OKLCH → sRGB têm precisão alta; conversões sRGB → CMYK têm perdas de gamut (especialmente
> em cores de alta saturação como o azul-índigo); conversões para Pantone exigem comparação física
> de amostra (swatch) — os números aqui são o ponto de partida mais próximo, não o match definitivo.
>
> O CMYK/Pantone são especificados aqui como **preparação para quando o Nave precisar de impressão**
> (press kit, cartão de visita, patrocínio de evento) — hoje o produto é 100% digital e esses valores
> não têm uso imediato. Não inventar caso de uso de impressão onde não existe.

#### Paleta principal — cores de marca

| Papel | OKLCH (autoritativo) | HEX (aprox.) | RGB (aprox.) | CMYK processo (aprox.) | Pantone Solid Coated (aprox.) |
|---|---|---|---|---|---|
| **Primary — luz** (botão primário, link, ação principal, light mode) | `oklch(44% 0.19 250)` | `#3B30AF` | 59, 48, 175 | C84 M80 Y0 K10 | 2736 C |
| **Primary — escuro** (idem, dark mode) | `oklch(66% 0.16 250)` | `#6B62D9` | 107, 98, 217 | C63 M57 Y0 K0 | 2716 C |
| **Secondary / Bronze** (ouro estrutural, botão secundário, divisor, composição de marca) | `oklch(48% 0.10 82)` | `#7B6420` | 123, 100, 32 | C0 M18 Y75 K52 | 110 C |
| **Gold accent** (brilho pontual, badge, conquista, detalhe — ≤10% da superfície) | `oklch(67.4% 0.122 86)` | `#B89A2A` | 184, 154, 42 | C0 M15 Y78 K28 | 124 C |

#### Paleta de fundo e superfície

| Papel | HEX (aprox.) | RGB (aprox.) | CMYK | Nota |
|---|---|---|---|---|
| **Background light** (fundo de página, light mode) | `#F4F5F7` | 244, 245, 247 | C2 M1 Y0 K3 | grafite-99 |
| **Background dark** (fundo de página, dark mode) | `#13131A` | 19, 19, 26 | C30 M27 Y0 K90 | grafite-10 — **não é preto puro** |
| **Card light** | `#EAEBEE` | 234, 235, 238 | C2 M1 Y0 K7 | grafite-95 |
| **Card dark** | `#1B1B22` | 27, 27, 34 | C21 M19 Y0 K87 | grafite-20 |

#### Paleta semântica (estados)

| Papel | HEX (aprox.) | OKLCH | Nota |
|---|---|---|---|
| Danger / Erro | `#C94A20` | `oklch(56.3% 0.14 32)` | Terracota — inalterado do irmão |
| Success / Sucesso | verde H=150 | `oklch(58% 0.13 150)` (aprox.) | Verde floresta — inalterado |
| Warning / Aviso | âmbar | `oklch(72% 0.14 85)` (aprox.) | — |

> **Aviso de gamut para impressão:** o azul-índigo `primary` (`oklch(44% 0.19 250)`) está fora do
> gamut CMYK em algumas impressoras. A conversão C84 M80 Y0 K10 é o mais próximo possível, mas
> resultará num índigo perceptivelmente menos saturado no papel. Para aplicações impressas de
> alta fidelidade (crachá, brochura institucional), **recomendar Pantone 2736 C como tinta spot**
> em vez de processo CMYK — custo adicional justificado somente quando fidelidade cromática for
> crítica. Para impressão de baixo custo (ofício, impressora de escritório), aceitar a perda e
> usar CMYK processo.

#### Hierarquia de uso (regra 60-30-10 aplicada ao Nave)

| Proporção | Cor | Papel |
|---|---|---|
| ~60% | Grafite (superfície, fundo) | Sustentação neutra — deixa conteúdo e cores de marca respirar |
| ~30% | Azul-índigo (primary) | Identidade, ação, navegação, hierarquia |
| ~10% | Ouro (secondary + accent) | Destaque, conquista, elemento de marca distintivo |

A proporção 60-30-10 é ponto de partida para qualquer composição — peças com muito espaço em branco
(poster, slide de abertura) podem ampliar o grafite para 70%+ e reduzir o azul; peças de ação
(email de campanha, banner CTA) podem ampliar o azul para 40%.

#### Contraste e acessibilidade (resumo por par)

Todos os pares abaixo foram avaliados com WCAG 2.2 AA como piso mínimo inegociável. APCA é indicado
como referência adicional para pares com peso de fonte leve ou tamanho reduzido.

| Texto | Fundo | Razão estimada | Passa AA? | Nota |
|---|---|---|---|---|
| Branco `#FFFFFF` | Primary light `#3B30AF` | ~7.1:1 | Sim (AAA) | CTA principal, botão primário |
| Branco `#FFFFFF` | Background dark `#13131A` | ~18:1 | Sim (AAA) | Corpo em dark mode |
| Primary light `#3B30AF` | Background light `#F4F5F7` | ~7.8:1 | Sim (AAA) | Links em light mode |
| Preto `#000000` | Gold accent `#B89A2A` | ~6.2:1 | Sim (AA) | Badge de destaque com texto |
| Branco `#FFFFFF` | Secondary/Bronze `#7B6420` | ~5.1:1 | Sim (AA) | Botão secundário — verificar com APCA |

> **Pendência C-DS-01 (herdada do documento irmão):** pares `warning`/`success` sobre canvas geral
> ainda precisam de validação formal — aguardando spec de recalibração. Esta tabela não resolve a
> pendência, apenas a referencia.

### 3.5 Tipografia Institucional

#### Família: Inter Variable

A decisão já está aprovada no documento irmão (seção 5). O que falta é o contexto institucional.

**Licenciamento:** Inter é publicada sob a SIL Open Font License 1.1 (OFL) — uso gratuito, inclusive
em produto comercial, sem royalties. Não exige atribuição em uso de produto; atribuição em documentos
tipográficos é cortesia de mercado. Fonte disponível em:
- Google Fonts (CDN, subsetagem automática, gratuito)
- `fontsource` npm package (recomendado para Next.js — sem dependência de CDN externo, controle de
  subsetagem, adequado ao projeto já usando bundler)
- Repositório oficial: github.com/rsms/inter (para download dos arquivos `.woff2` e self-hosting)

**Subsetagem recomendada:** Latin + Latin Extended para o produto. Não carregar o subset completo
(cyrillic, greek) — aumenta o peso sem benefício para o mercado brasileiro.

**Fallback de sistema (font stack):**
```css
font-family: 'Inter', ui-sans-serif, system-ui, -apple-system,
             BlinkMacSystemFont, 'Segoe UI', Roboto,
             'Helvetica Neue', Arial, sans-serif;
```
O fallback garante que, se a Inter não carregar (conexão lenta, falha de CDN), o sistema sirva
a fonte de UI nativa — que no macOS é SF Pro, no Windows é Segoe UI — ambas sem-serif de alta
legibilidade e proporções próximas à Inter.

**Não há fonte de display separada** — decisão tomada no documento irmão e reafirmada aqui:
o custo de manutenção de duas famílias não se paga no estágio atual. A Inter Variable em peso
700+ com letterspacing -0.02 a -0.04em já entrega leitura de display para materiais institucionais
(slides, banners, headers de landing page).

**Escala para materiais institucionais (fora do produto):**

| Contexto | Tamanho / Peso | Uso |
|---|---|---|
| Headline de landing page | 40-60px / 700 | H1 do site institucional |
| Subheadline | 24-32px / 600 | H2/H3 de seção |
| Body de landing page | 16-18px / 400 | Parágrafos explicativos |
| Caption / legal | 12-13px / 400 | Rodapé, atribuições, nota legal |
| Apresentações (slide título) | 48-64px / 700 | Fonte para apresentações de pitch/investidor |
| Apresentações (slide body) | 18-24px / 400 | Corpo de slide |

A escala do produto (definida no documento irmão, seção 5) é distinta desta — não misturar as duas
tabelas. O produto tem suas próprias restrições de densidade; materiais institucionais têm mais espaço
para respirar.

### 3.6 Direção de Fotografia e Ilustração Institucional

O documento irmão (seção 8) definiu a linguagem de ilustração **para o produto** (empty state,
onboarding, erro): geométrica, tonal, escala do azul-índigo + acento ouro, nunca "sticker colorido".

A pergunta aqui é: **essa mesma linguagem serve para o contexto institucional/marketing externo
(landing page, press kit, redes sociais)?** E a resposta é: sim, com uma distinção de proporção.

#### Materiais institucionais digitais (landing page, social, apresentação)

**Direção primária: screenshots do produto como "fotografia"**

O padrão estabelecido por Linear, Vercel, Mercury, Ramp e que representa o estado da arte em 2025-2026
em B2B SaaS: o produto em si é o visual principal dos materiais institucionais. Não há fotografia
de pessoas, não há ilustração abstrata de terceiros, não há stock photography de carros — há
**capturas de tela da UI real**, polidas, sobre fundo grafite escuro ou gradiente tonal do azul-índigo.

*Por que isso funciona para o Nave:*
- A UI do Nave já tem identidade visual própria (dark mode grafite, primário índigo, ouro de destaque)
  — ela já é bonita o suficiente para ser o herói visual
- Screenshots eliminam a desconfiança de "mas como é de verdade?" — o maior obstáculo de conversão
  em SaaS
- Custo zero de produção visual externa (não há fotógrafo, não há estúdio)
- Escala perfeitamente: cada feature nova gera novo visual de marketing automaticamente

*Tratamento de screenshots:*
- Fundo de apresentação: grafite escuro (`#13131A`) ou degradê azul-índigo tom 20→10 (da escala tonal)
- Screenshot em device frame opcional — se usar, frame minimalista sem marca de fabricante (frame genérico,
  preto ou cinza escuro) para não criar dependência visual de uma marca específica de hardware
- Propósito de uso de shadows na screenshot: apenas para separar a UI do fundo se for necessário —
  `box-shadow: 0 0 0 1px oklch(30% 0.05 250), 0 24px 48px oklch(10% 0.03 250 / 0.6)` — sombra
  sutil no azul-índigo escuro, não preto neutro

**Direção secundária: ilustração de marca tonal**

Quando screenshots não forem suficientes (conceito abstrato, empty state de marketing, animação
de hero), usar a mesma linguagem já definida no produto, com mais espaço negativo:
- Escala tonal do azul-índigo (tons 60-90 para figuras, 30-50 para detalhes)
- Ouro-acento pontualmente (≤10% da área da ilustração) em elementos de destaque
- Traço único (equivalente a 2px em 24×24px — escalar proporcionalmente)
- Composições abertas, com mais espaço negativo que as ilustrações de produto — o material
  institucional respira mais

**Fotografia humana: uso restrito e arte-dirigido**

Se/quando o Nave chegar ao estágio de produção fotográfica (press kit com foto do fundador,
campanha de awareness com persona real), a direção é:
- **Sujeito:** a pessoa + o veículo; nunca pessoa isolada de estúdio (remete a stock genérico)
- **Fundo:** ambiente real (oficina, garagem, estacionamento), nunca fundo infinito de estúdio
- **Paleta:** tratamento de cor na edição que preserve azuis e tons terrosos (consistente com a
  paleta de marca) — sem filtros de "cor dourada" instagramável nem dessaturação total
- **Emoção pretendida:** compostura, foco, não euforia — a mesma "caloroso com compostura" da voz
- **Evitar:** foto de pessoa sorrindo para tela de computador (clichê de SaaS); foto de grupo em
  escritório aberto (remete a campanha de RH); close de mão digitando (sem contexto real)

**Stock photography: proibida em materiais principais de marca**

Stock photography não é autorizada em materiais de marca — landing page, apresentação institucional,
deck de investidores, press kit. O risco de "ver o mesmo modelo sorrindo em 5 outros SaaS" é real
e destrói credibilidade. Se uma peça de marketing de baixo custo (post rápido de social) precisar
de imagem externa, usar sites de fotografia artística livre (Unsplash, Pexels) **somente** com
curadoria que corresponda à direção acima — nunca o primeiro resultado.

---

## 4. Governança

### 4.1 Estrutura de Repositório de Assets

O Nave não usa ferramenta DAM externa (Bynder, Brandfolder, Canto) — custo não justificado para
o estágio atual. A solução é um diretório `assets/brand/` no próprio repositório do projeto,
com estrutura padronizada que evolui conforme os assets forem produzidos.

> **Nota:** arquivos binários grandes (PNG acima de 500KB, PDF, fontes woff2 completas) devem ser
> gerenciados com Git LFS quando o repositório for compartilhado com time maior — hoje o repositório
> é de uso pessoal (Douglas + IA), sem essa necessidade imediata. Registrado aqui para quando
> o time crescer.

#### Estrutura de diretórios proposta

```
assets/
└── brand/
    ├── README.md                     ← índice desta pasta: o que há, como usar, o que não existe ainda
    ├── logo/
    │   ├── primary/                  ← combination mark principal (símbolo + wordmark)
    │   │   ├── nave-logo.svg         ← SVG vetorial (fonte de verdade)
    │   │   ├── nave-logo@2x.png      ← PNG 2x para e-mail e contextos sem SVG
    │   │   └── nave-logo@1x.png      ← PNG 1x
    │   ├── dark/                     ← versão sobre fundo escuro (branco/ouro)
    │   │   ├── nave-logo-dark.svg
    │   │   └── nave-logo-dark@2x.png
    │   ├── light/                    ← versão sobre fundo claro (índigo/bronze)
    │   │   ├── nave-logo-light.svg
    │   │   └── nave-logo-light@2x.png
    │   ├── mono/                     ← versões monocromáticas
    │   │   ├── nave-logo-black.svg
    │   │   └── nave-logo-white.svg
    │   ├── symbol/                   ← símbolo isolado (arco), uso restrito conforme §3.2
    │   │   ├── nave-symbol.svg
    │   │   └── nave-symbol-white.svg
    │   └── favicon/
    │       ├── favicon.svg           ← SVG universal (browsers modernos)
    │       ├── favicon-32x32.png
    │       ├── favicon-16x16.png
    │       └── apple-touch-icon.png  ← 180×180px
    ├── colors/
    │   ├── nave-swatches.ase         ← Adobe Swatch Exchange (Illustrator, Photoshop, InDesign)
    │   ├── nave-swatches.clr         ← Apple Color List (macOS, Sketch)
    │   └── nave-palette.json         ← referência de valores em JSON (OKLCH + HEX + RGB)
    ├── fonts/
    │   └── inter/
    │       ├── LICENSE.txt           ← cópia da OFL 1.1
    │       ├── Inter-Variable.woff2  ← arquivo de fonte self-hosted (subset latin)
    │       └── README.md             ← instruções de uso e link para fontsource
    ├── illustrations/
    │   ├── empty-states/             ← SVGs de empty state (produto e marketing)
    │   ├── onboarding/               ← SVGs de boas-vindas e steps
    │   └── marketing/                ← ilustrações para landing page e social
    ├── screenshots/
    │   ├── product/                  ← screenshots da UI do produto (para marketing)
    │   │   └── YYYY-MM/             ← subpastas por data — UI evolui, screenshots ficam datadas
    │   └── social/                   ← recortes tratados para post de social
    └── templates/
        ├── social/
        │   ├── linkedin-post.svg     ← template de post para LinkedIn (1200×628px)
        │   ├── instagram-post.svg    ← template de post (1080×1080px)
        │   └── instagram-story.svg   ← template de story (1080×1920px)
        ├── email/
        │   ├── signature.html        ← assinatura de e-mail (HTML inline)
        │   └── marketing-header.svg  ← header de e-mail marketing
        └── presentation/
            └── nave-slides-template.pptx   ← template de apresentação (PowerPoint-compatível)
```

#### Convenção de nomenclatura de arquivos

- Caixa baixa, hifenização, sem espaços: `nave-logo-dark@2x.png`
- Prefixo de marca sempre "nave-": `nave-logo`, `nave-symbol`, `nave-swatches`
- Sufixos de resolução: `@1x`, `@2x`, `@3x` — sem sufixo = arquivo vetorial ou single-res
- Sufixos de tema: `-dark` (fundo escuro), `-light` (fundo claro), `-black`, `-white` (mono)
- Versões de dimensão específica: `nave-logo-256.png`, `nave-logo-512.png`
- **Nunca:** `nave-logo-final.svg`, `nave-logo-novo.svg`, `nave-logo-v2-corrigido.svg` —
  o Git resolve versionamento; nome de arquivo é sempre o atual definitivo

#### assets/brand/README.md — conteúdo mínimo obrigatório

O README desta pasta deve conter:
1. Link para este documento (`PROPOSTA-BRAND-PLATAFORMA-2026-07-30.md`) e para o documento irmão
2. Tabela de "o que há × o que ainda não existe" — status de cada subpasta (produzido / pendente)
3. Como obter o logo nos formatos corretos (onde abrir o SVG, como gerar PNG de outras resoluções)
4. Quem aprovar uso fora do padrão (hoje: Douglas)

### 4.2 Regras de Co-branding

Co-branding ocorre quando o Nave aparece ao lado da marca de um parceiro — integrações de produto,
patrocínios, conteúdo conjunto, anúncio de parceria.

#### Regras gerais

**R-CB-01 — Separação obrigatória:** os logotipos do Nave e do parceiro nunca se tocam nem se
sobrepõem. O espaço mínimo entre eles é igual a 1× a largura do símbolo do Nave (o arco)
em qualquer aplicação.

**R-CB-02 — Separador visual:** o elemento separador entre os dois logotipos é um "×" (sinal
de multiplicação, não a letra x) ou uma linha vertical divisória de 1px na cor grafite-40 aproximado.
Formato preferido: `nave × parceiro`. O "×" comunica colaboração ativa, não subordinação.

**R-CB-03 — Hierarquia:** quando a parceria for de igual para igual, os dois logotipos têm a
mesma altura de cap-height. Quando o Nave for o produto (parceiro é integração/plugin dentro do Nave),
o logo do parceiro é 20% menor. Quando o Nave aparecer no contexto do parceiro (plataforma do parceiro
exibe o Nave como opção), o logo do parceiro pode ser maior — mas o Nave mantém área de proteção.

**R-CB-04 — Cor de fundo neutro:** em co-branding, usar sempre fundo branco ou grafite claro
(`#F4F5F7`) — nunca a cor de marca do parceiro como fundo para o Nave, e nunca o azul-índigo do
Nave como fundo para logo do parceiro. Isso garante que nenhum dos dois logotipos perca legibilidade
por causa da cor do outro.

**R-CB-05 — Aprovação prévia:** qualquer material de co-branding deve ser aprovado por Douglas
antes de publicação — sem exceção. Parceiro não tem autonomia para produzir material com o logo do
Nave sem aprovação.

**R-CB-06 — Sem combinação de efeitos:** o logo do Nave em co-branding segue as mesmas regras
de uso da seção 3.3 (don'ts) — não aceita sombra, distorção ou recoloração mesmo que o parceiro
tenha essa linguagem na própria identidade.

#### Hierarquia de distribuição de assets para parceiros

Quando um parceiro solicitar o logo do Nave para usar em material de comunicação:
1. Fornecer o SVG original da versão mais adequada ao fundo que o parceiro vai usar
2. Incluir link para este documento (seção 3.2 e 3.3) — brevemente, as regras de área de proteção e don'ts
3. Solicitar preview do material antes da publicação (R-CB-05)
4. Não fornecer arquivos editáveis (AI, PDF editável, PSD com camadas separadas) — o parceiro recebe
   arquivo fechado/plano, sem possibilidade de modificação

---

## Próximos passos após aprovação

Este documento é etapa de definição estratégica — não implementa nada. Após aprovação explícita por
Douglas, as ações são:

1. **Execução do logotipo:** contratar designer gráfico ou usar ferramenta vetorial (Figma, Illustrator)
   para vetorizar a estrela-rosácea conforme o conceito da seção 3.1 e a referência visual aprovada em
   `HANDOFF-SIMBOLO-EQUIPE-DESIGN-2026-07-31.md` — o arquivo final deve ser um SVG limpo com a
   geometria definida sobre grade de 24px (não path de IA generativa, que serve só de referência)

2. **Criar `assets/brand/README.md`** com status inicial de cada subpasta (tudo "pendente" até os
   arquivos forem produzidos)

3. **Produzir `assets/brand/colors/nave-palette.json`** com os valores OKLCH + HEX + RGB desta
   especificação — ponto de partida para o arquivo de swatches

4. **Spec formal de marca** (`SPEC-YYYYMMDD-NNN`) cobrindo os tokens e regras que precisam de
   rastreabilidade no código — a ser criada pelo `spec-writer` após aprovação deste documento

5. **Handoff para `design-system`:** os valores de OKLCH de §3.4 são os que o design-system
   consome para tokens técnicos — mas nenhum token deve ser alterado antes da aprovação da spec
   formal (plano de adoção já descrito no documento irmão)

6. **Revisitar pendência C-DS-01** (contraste warning/success) como parte do mesmo ciclo de tokens

---

## Changelog

- **2026-07-31** — Seção 3.1 revisada: conceito de símbolo "O Arco Aberto" substituído pela
  "Estrela-Rosácea" (estrela de quatro pontas + anéis orbitais), após avaliação de que um arco
  parcial era forma disputada demais no mercado (spinners, gauges de fitness tracker, arco
  automotivo VW/Mercedes). Processo de exploração em `PROPOSTA-SIMBOLO-ALTERNATIVAS-2026-07-30.md`;
  referência visual final aprovada por Douglas em `HANDOFF-SIMBOLO-EQUIPE-DESIGN-2026-07-31.md` §0.
  Ajustes de consistência: tabela de versões (§3.2), DON'T 3 (§3.3, agora permite gradiente/chanfro
  apenas no símbolo completo ≥64px, nunca na marca reduzida) e DON'T 5. Wordmark, paleta e demais
  seções não foram alteradas.

---

*Documento produzido por `brand-designer` em 2026-07-30. Complementa
`PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md`. Aguarda aprovação antes de qualquer implementação.*
