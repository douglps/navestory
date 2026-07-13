# Critérios de Avaliação UX — Contexto de Frota

Referência expandida para uso da skill `gestor-frota` ao avaliar features.

---

## 1. Relevância Operacional (peso 30%)

### O que medir
- **Frequência de uso esperada**: diário > semanal > mensal > sob demanda
- **Momento da jornada**: a feature encaixa em qual momento do fluxo de trabalho do gestor?
- **Problema resolvido**: existe um workaround atual? Se sim, o Nave é melhor que o workaround?

### Sinais de alta relevância
- O gestor faria isso todo dia ou toda semana mesmo sem ser lembrado
- Atualmente é feito por WhatsApp, planilha ou de cabeça — alto risco de erro
- Impacta diretamente custo ou conformidade (multa, acidente, parada de veículo)

### Sinais de baixa relevância
- Só seria usado "se alguém pedir"
- É uma funcionalidade de análise que exige tempo de interpretação — gestores não têm esse tempo
- Duplica algo que já existe no sistema de forma diferente

---

## 2. Facilidade de Uso (peso 25%)

### Regras práticas

**Regra dos 3 toques**: Qualquer ação crítica (registrar ocorrência, aprovar manutenção, ver veículo offline) deve ser executável em até 3 toques a partir do dashboard.

**Regra dos 30 segundos**: Registros rápidos (abastecimento, checklist pré-viagem) devem ser completáveis em 30 segundos. Se levar mais, será feito depois — e raramente será feito.

**Regra do campo único obrigatório**: Cada campo obrigatório que não tem valor padrão é uma barreira. Para cada campo, pergunte: pode ser inferido? Pode ser pré-preenchido? Pode ser opcional com valor padrão razoável?

### Checklist de usabilidade
- [ ] Funciona com conectividade ruim (3G, latência alta)?
- [ ] O estado de loading é claro e não bloqueia a interação?
- [ ] Erros de validação são descritos de forma acionável ("Placa deve ter formato ABC-1234", não "Campo inválido")?
- [ ] O teclado numérico é mostrado automaticamente em campos de número/km?
- [ ] Confirmações destrutivas (excluir, cancelar) têm ao menos um passo de confirmação?
- [ ] A tela volta ao estado anterior após ação bem-sucedida?

---

## 3. Hierarquia de Informação (peso 20%)

### Framework de prioridade visual

Divida o conteúdo de qualquer tela em três zonas:

**Zona Crítica** (acima do fold, sem scroll):
- Alertas abertos e não resolvidos
- Status de veículos com problema agora
- Ações que vencem hoje ou estão atrasadas

**Zona de Contexto** (acessível com 1 scroll):
- KPIs comparativos (mês atual vs. anterior)
- Lista de veículos com status geral
- Agenda dos próximos 7 dias

**Zona de Detalhe** (navegação explícita, tap em item):
- Histórico de manutenção de veículo específico
- Detalhes de custo por categoria
- Documentos e arquivos

### Anti-patterns comuns em sistemas de frota
- Mostrar TODOS os veículos em lista sem filtro padrão por status → o gestor perde os problemáticos no mar
- Esconder alertas atrás de badges — o gestor não clica no sino, ele quer ver o alerta na tela
- Gráficos antes de números — o gestor precisa do número exato, o gráfico é secundário
- Datas em formato técnico (ISO 8601) — usar sempre "Hoje", "Ontem", "há 3 dias", "dd/mm"

---

## 4. Valor Percebido (peso 15%)

### Indicadores de alta retenção
- A feature resolve uma tarefa que o gestor fazia por WhatsApp, planilha ou de memória
- O resultado é imediatamente utilizável (relatório pronto para mandar ao diretor, não dados brutos)
- Economiza mais de 15 minutos por semana de forma tangível
- Evita uma penalidade concreta (multa, acidente, quebra)

### Indicadores de baixa retenção
- Requer que o gestor mude um comportamento estabelecido sem benefício claro imediato
- Setup inicial demora mais de 5 minutos
- Funciona só se outros usuários também usarem (dependência de rede)
- O benefício é abstrato ("melhora a visibilidade da frota") sem métrica concreta

---

## 5. Alinhamento ao Design System (peso 10%)

### Verificações obrigatórias (Calm UI v3.0 + Nave)

**Mobile-first**:
- Tela principal funciona em 375px de largura sem scroll horizontal
- Botões com mínimo 44px de altura, áreas de toque mínimo 48×48px
- Inputs com font-size mínimo 16px (evita zoom no iOS)

**Calm UI (anti-ansiedade)**:
- Status de alerta usa `bg-danger/10`, não vermelho sólido em área grande
- Badge de contagem em notificações — sem som ou vibração padrão
- Transições suaves em mudança de estado (200ms ease-out)

**Acessibilidade (WCAG 2.2 AA)**:
- Contraste mínimo 4.5:1 para texto normal, 3:1 para texto grande e ícones UI
- Todos os inputs têm `label` associado (não apenas placeholder)
- Ações críticas acessíveis por teclado e leitores de tela
- Não depender apenas de cor para comunicar status (sempre acompanhar com ícone ou texto)

**Performance**:
- Telas com lista de veículos devem usar virtualização para listas > 50 itens
- Skeleton screens obrigatórios em qualquer dado que carregue de API
- Imagens lazy-loaded, nenhuma imagem acima de 100KB sem otimização

---

## Casos especiais: features de alto risco de UX ruim

### Registro em campo (motorista/gestor no pátio)
**Risco**: Campo com muitos inputs → abandono antes de completar
**Mitigation**: Wizard em steps de 1–2 campos, progresso visível, salvar rascunho automático

### Dashboard com muitos dados
**Risco**: Paralisia por análise — o gestor vê muita coisa e não sabe o que fazer
**Mitigation**: Sempre ter uma "ação recomendada" destacada baseada nos dados

### Notificações
**Risco**: Ruído → o gestor desativa as notificações
**Mitigation**: Máx 3 notificações por dia por padrão, configurável, sempre com ação clara

### Fluxo de aprovação mobile
**Risco**: Gestor aprova sem revisar porque está com pressa
**Mitigation**: Resumo do que está sendo aprovado + valor estimado antes do botão de confirmação
