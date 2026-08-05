# PRD Oficial v1.0 - navestory SaaS

## 1. Metadados

```yaml
Produto: navestory - Gestão Inteligente de Veículos
Versão: 1.0 (MVP)
Status: Aprovado
Data: Março 2026
Licença: Proprietária/Comercial
```

## 2. Visão do Produto

> "Permitir que proprietários de veículos gerenciem manutenções e despesas em um único lugar, reduzindo custos operacionais e evitando esquecimentos críticos."

## 3. Personas

| ID    | Nome                         | Perfil                         | Prioridade |
| ----- | ---------------------------- | ------------------------------ | ---------- |
| P-001 | Carlos, Motorista Autônomo   | 35-50 anos, controle de custos | Critical   |
| P-002 | Ana, Gestora Frota Pequena   | 28-45 anos, decisões com dados | High       |
| P-003 | Roberto, Gestor Grande Frota | 40-55 anos, 50-500 veículos    | Phase 2    |

## 4. Jobs to Be Done

### Usuário individual (P-001 Carlos / P-002 Ana / P-003 Roberto)

1. Registrar despesa logo após abastecimento (< 30 segundos, mobile)
2. Verificar quais manutenções estão vencidas ou próximas do vencimento
3. Controlar o gasto mensal total e por categoria de um veículo
4. Exportar despesas do período para Excel/Google Sheets
5. Saber o custo por km de cada veículo

### Gestor de workspace (P-002 Ana / P-003 Roberto no papel de workspace_owner — plano Frota)

6. Ter visão consolidada e atualizada da situação documental de cada motorista do workspace (CNH vigente, cadastro mínimo preenchido) sem depender de planilha ou cobrança manual fora do produto
7. Configurar quais campos são obrigatórios e o que cada motorista convidado deve preencher antes do primeiro uso, garantindo padrão de dados em toda a equipe sem precisar cobrar individualmente

## 5. Escopo MVP

### IN:

- Auth (email/senha, JWT, recuperação)
- Perfil (editar dados, preferências)
- Veículos (CRUD, placa Mercosul, upload)
- Despesas (lançar, filtrar, vincular veículo)
- Manutenção (agendar, concluir, alerta 7 dias)
- Dashboard (KPIs, gráficos, export CSV)
- PWA básico (manifest + service worker)
- CSS mobile-first em todos componentes
- Testes em dispositivos reais (iOS + Android)

### OUT:

- OAuth, MFA, App nativo (React Native/Flutter), API pública, Multi-usuário, Push notifications nativas, Offline avançado

## 6. Estratégia Mobile-First e PWA

### Abordagem

- **Modelo:** Mobile-First Web + PWA
- **Justificativa:** 80%+ usuários mobile, mesmo código para todos dispositivos, deploy imediato, offline básico habilitado.
- **Breakpoints Tailwind:**
  - `mobile`: < 640px (base)
  - `tablet`: 640px - 1024px (`md:`)
  - `desktop`: > 1024px (`lg:`)

### PWA Features (MVP)

- **Manifest.json:** ✅ IN (Nome, ícones, start_url)
- **Service Worker:** ✅ IN (Cache Supabase + assets)
- **Offline Page:** ✅ IN (Página customizada)
- **Add to Homescreen:** ✅ IN (Prompt automático)
- **Push Notifications:** ❌ OUT (Fase 2)

### Mobile UX Requirements

- **Touch Friendly:** Botões 44px mínimo, inputs 16px (evita zoom iOS), espaçamento 8px, áreas de toque 48x48px mínimo.
- **Performance Mobile:** Lighthouse Mobile > 90, FCP < 1.8s, TTI < 3.5s, Bundle JS < 150KB gzipped.
- **UX Geral:** Keyboard optimization (inputmode), loading states para redes lentas, skeleton screens, swipe gestures em listas, bottom navigation (mobile).

### Critérios de Aceite Mobile

- Layout otimizado para touch em dispositivos < 640px (Dashboard, botões com 44px minimo, Lighthouse > 90).
- Prompt "Adicionar à tela inicial" e ícone do app instalável exibidos corretamente após 2+ visitas.
- Acesso offline exibe página customizada ou conteúdo do cache com mensagem de offline.

## 7. Requisitos Funcionais

| ID     | Título         | Critério de Aceite                                   |
| ------ | -------------- | ---------------------------------------------------- |
| RF-001 | Registro       | Email verificação, senha 8+ chars, audit log sem PII |
| RF-002 | Login          | JWT access 15min + refresh 7d, redirect /dashboard   |
| RF-003 | Isolamento RLS | auth.uid() = user_id, erro 403 para acesso cruzado   |
| RF-004 | CRUD Veículos  | Validação Mercosul, upload Supabase Storage          |
| RF-005 | Despesas       | Categoria, valor, data, filtro por período           |
| RF-006 | Manutenção     | Agendamento, status, alerta email 7 dias antes       |
| RF-007 | Dashboard      | Total gasto/mês, próximas manutenções, export CSV    |

## 8. Requisitos Não-Funcionais

**Segurança:**

- RLS em todas as tabelas
- Hashing de senha delegado ao Supabase Auth/GoTrue (bcrypt gerenciado pelo provedor — ver ADR 003)
- Logs sem PII
- Rate limiting 10 req/min
- Headers: helmet, CORS, HSTS

**Performance:**

- TTFB < 200ms
- LCP < 2.5s
- Bundle < 200KB gzipped

**LGPD:**

- Direito ao esquecimento (soft-delete + anonymization)
- Audit log obrigatório
- Dados criptografados em repouso

## 9. KPIs de Sucesso

```yaml
product_health:
  activation_rate: "> 60% completam cadastro + 1 veículo"
  retention_d7: "> 40% retornam semana 1"
  core_action_weekly: "> 3 ações/usuario/semana"

technical_health:
  error_rate: "< 1% requests 5xx"
  p95_latency: "< 500ms endpoints críticos"
  security_incidents: "0 vazamentos PII"

business:
  nps_early_adopters: "≥ 40"
  support_tickets_out_of_scope: "< 5%"
```

## 10. Roadmap (35 Dias)

| Fase     | Duração | Entregas                      |
| -------- | ------- | ----------------------------- |
| Fundação | 9 dias  | Setup, Auth + RLS             |
| Core     | 11 dias | Veículos, Despesas            |
| Polish   | 8 dias  | Dashboard, Testes, LGPD Audit |
| Launch   | 7 dias  | Beta 50 usuários, Feedback    |
