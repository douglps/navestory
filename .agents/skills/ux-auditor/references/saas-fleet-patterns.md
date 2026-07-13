# Padrões UX para SaaS de Gestão de Frota

Referência de padrões UX específicos para o contexto do Nave SaaS. Baseia-se em best practices de SaaS B2B e no perfil operacional de gestores de frota.

---

## Contexto do Usuário

- **Quem:** Gestores de frota com 40-120 veículos, equipe enxuta (2-3 pessoas)
- **Onde:** 70% mobile, frequentemente em pátio ou trânsito, conectividade 3G/4G instável
- **Quando:** Manhã (check de status), durante o dia (registros e alertas), fim do dia (relatórios)
- **Pressão:** Redução de custos, conformidade de manutenção, evitar multas e paradas
- **Tolerância a complexidade:** Baixa — se é difícil, volta para a planilha ou WhatsApp

Para perfis detalhados, consultar `.agents/skills/gestor-frota/references/personas.md`.

---

## Dashboard — Padrões Recomendados

### KPI Strip (acima do fold)

- Máximo **4 KPIs** em linha horizontal
- Prioridade: veículos ativos, alertas abertos, custo do mês, km rodado
- Cada KPI com delta comparativo (mês anterior) — cor verde/vermelho
- KPI cards devem ser clicáveis — abrindo drill-down da métrica

**Anti-patterns:**
- 6+ KPIs no topo — carga cognitiva, gestor não processa tudo
- KPIs sem delta — números absolutos sem contexto não informam
- KPIs não-clicáveis — oportunidade perdida de navegação

### Alertas Críticos

- Logo abaixo dos KPIs, **sem collapse** — visíveis imediatamente
- Ordenados por urgência (não cronológico)
- Cada alerta: ícone de severidade + placa/motorista + descrição curta + botão de ação
- Ações: "Resolver" e "Adiar" (8h/24h) acessíveis em 1 toque

**Anti-patterns:**
- Alertas escondidos atrás de badge no sino — gestor não clica
- Alertas ordenados por data — o mais recente não é o mais urgente
- Alertas sem ação direta — "OK" não resolve nada

### Ações Rápidas

- FAB (Floating Action Button) para ação primária de criação
- Ou command palette (⌘K) para navegação rápida
- Ações mais frequentes: registrar despesa, adicionar manutenção, ver veículo

### Período Padrão

- Últimos 30 dias como default (período mais consultado)
- Comparativo com período anterior sempre visível
- Seletor de período acessível mas não dominante

---

## Listagens e Tabelas

### Ordenação

- Default por **relevância/urgência**, não alfabético
- Veículos: ordenar por status (problema > ativo > inativo)
- Despesas: ordenar por data (mais recente primeiro)
- Manutenção: ordenar por urgência (atrasada > pendente > concluída)

### Filtros

- Filtros rápidos visíveis (chips para status, tipo, período)
- Filtros avançados em drawer/modal (não inline — poluem a tela)
- Busca por texto (placa, nome) sempre visível
- Reset de filtros em 1 toque

### Ações em Lista

- Ações primárias inline (editar, ver) — não esconder em menu "⋯" para ações frequentes
- Ações secundárias em dropdown menu
- Batch operations para seleção múltipla quando relevante (ex: exportar, mudar status)

### Empty States

- Mensagem que explica o que é a seção
- CTA para criar o primeiro item
- Ilustração ou ícone para aliviar a frieza
- Exemplo: "Nenhuma manutenção registrada. Adicione a primeira manutenção do veículo."

### Performance

- Tabelas com 50+ itens devem usar virtualização
- Paginação com indicação clara de total
- Skeleton rows durante carregamento
- Sticky header para scroll vertical

---

## Formulários — Contexto de Frota

### Registros em Campo (motorista/gestor no pátio)

**Risco:** Muitos campos → abandono antes de completar
**Padrão:** Máximo 4-5 campos visíveis, opcionais em seção colapsável

- Data/hora: sempre pré-preenchido com "agora"
- Veículo: busca por placa (não dropdown com 100+ itens)
- Odômetro: mostrar último registro como referência
- Valores: teclado numérico automático, atalhos de valor

### Templates e Recorrência

- Despesas frequentes (abastecimento mensal) devem ter template
- "Repetir último registro" como ação rápida
- Valores recentes sugeridos (último preço, último fornecedor)

### Confirmação e Feedback

- Submit → toast de sucesso → redirect para listagem (SPEC-20260619-001)
- Erro de validação: scroll para primeiro campo, mensagem inline em pt-BR
- Erro de servidor: Alert banner no topo com descrição acionável
- Draft automático para formulários complexos (> 5 campos)

---

## Notificações

### Prioridade sobre Cronologia

- Ordenar por urgência: crítico > importante > informativo
- Máximo 3 notificações por dia por padrão (evitar notification fatigue)
- Cada notificação com ação direta (não apenas "OK")

### Canais

- In-app badge no sidebar (contagem de não-lidas)
- Push notification para alertas críticos (veículo parado, multa)
- Email digest semanal para relatórios e resumos

### Anti-patterns

- Notificações demais — gestor desativa todas
- Notificação sem ação — "Manutenção pendente" sem botão para ver detalhes
- Som/vibração para tudo — reservar para críticos

---

## Multi-veículo — Troca de Contexto

### Padrão Recomendado

- Seletor global de veículo (context chip no header/subheader)
- Persistir seleção via `sessionStorage` entre páginas
- Limpar seleção ao voltar para visão de frota
- Mostrar claramente qual veículo está selecionado em todas as telas

### Anti-patterns

- Trocar de veículo perde dados do formulário em andamento
- Não fica claro qual veículo está selecionado
- Dados de veículo diferente misturados na mesma tela
- Voltar do detalhe não retorna à posição na lista

---

## Relatórios e Analytics

### Padrões

- Export CSV/PDF como ação primária (não escondida em menu)
- Gráficos simples: barras e linhas — gestores não precisam de radar/heatmap
- Números exatos mais importantes que gráficos (gestor precisa do valor, gráfico é complemento)
- Comparativo com período anterior sempre visível

### Anti-patterns

- Dashboard "bonito" com 8 gráficos que ninguém lê
- Relatório que só funciona online (gestor precisa compartilhar PDF)
- Dados sem contexto temporal (total sem saber de qual período)
- Gráficos sem eixo Y rotulado ou sem tooltip nos pontos

---

## Offline e Conectividade

### Padrões para 3G/4G instável

- Skeleton screens para perceived performance
- Optimistic updates para feedback imediato
- Service Worker para cache de dados estáticos
- Queue de operações para envio quando reconectar
- Banner de status de conexão (online/offline)
- Dados recentes disponíveis offline (cache local)

### Anti-patterns

- Tela em branco com spinner infinito em conexão lenta
- Perda de dados ao perder conexão durante submit
- Nenhum feedback sobre estado de conexão
- Imagens não otimizadas carregando em 3G
