# User Stories — Nave SaaS

> **Propósito do documento:** Mapear cada feature do produto com user stories detalhadas, simulações de jornada do usuário e identificação de gaps, caminhos não pensados ou fluxos implementados incorretamente.
>
> **Produto:** Nave — SaaS PWA para gestão inteligente de veículos (motoristas autônomos e gestores de frotas pequenas)
>
> **Personas:** Carlos (motorista autônomo, 35-50 anos) · Ana (gestora de frota pequena, 28-45 anos) · Rafael (motorista de app, 29 anos)
>
> **Última atualização:** 2026-06-17

---

## Índice

1. [Auth — Registro, Login, Recuperação de Senha](#1-auth)
2. [Veículos — CRUD completo](#2-veículos)
3. [Despesas — Registro e consulta](#3-despesas)
4. [Manutenções — Agendamento e status](#4-manutenções)
5. [Dashboard — KPIs e visualizações](#5-dashboard)
6. [Export CSV](#6-export-csv)
7. [Perfil do Usuário](#7-perfil-do-usuário)
8. [Exclusão de Conta (LGPD)](#8-exclusão-de-conta-lgpd)
9. [Admin — Gestão de usuários e auditoria](#9-admin)
10. [Alertas de Manutenção por Email](#10-alertas-de-manutenção-por-email)
11. [PWA — Offline e instalação](#11-pwa--offline-e-instalação)
12. [Consulta IA](#12-consulta-ia)
13. [Onboarding do Primeiro Uso](#13-onboarding-do-primeiro-uso)
14. [Notificações Push (PWA)](#14-notificações-push-pwa)
15. [Histórico de Quilometragem / Odômetro](#15-histórico-de-quilometragem--odômetro)
16. [Compartilhamento de Veículo (Frota)](#16-compartilhamento-de-veículo-frota)
17. [Planos e Assinatura](#17-planos-e-assinatura)
18. [Relatórios Avançados](#18-relatórios-avançados)
- [Respostas Decisórias — Resolução de Gaps](#respostas-decisórias--resolução-de-gaps)
19. [Seletor de Contexto de Veículo — Chip + Dialog/Sheet](#19-seletor-de-contexto-de-veículo)
20. [Persona P-004 — Rafael Lima (Motorista de App)](#20-persona-p-004--rafael-lima-motorista-de-app--autônomo-individual)

---

## 1. Auth

### 1.1 Registro de nova conta

**Como** Carlos, motorista autônomo,  
**quero** criar uma conta com meu email e senha  
**para** começar a registrar meus veículos e despesas.

#### Jornada simulada

```
1. Carlos acessa /register no celular
2. Preenche: nome "Carlos Souza", email "carlos@email.com", senha "Abc@1234"
3. Seleciona tipo de perfil: "Motorista Autônomo"
4. Clica em "Criar conta"
5. Recebe confirmação e é redirecionado para /dashboard
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G1.1 | Usuário tenta registrar com email já cadastrado | API retorna `HTTP 409` com código `EMAIL_ALREADY_REGISTERED` ✅ Backend · Frontend ainda precisa tratar o 409 e exibir mensagem direcionada | ✅ Backend · 🔴 Frontend |
| G1.2 | Usuário não confirma email (Supabase exige verificação?) | Não há menção a `emailRedirectTo` ou fluxo de confirmação de email no `auth.service.ts` | 🟠 Fluxo pode deixar conta sem verificação |
| G1.3 | Usuário fecha a aba após preencher o form sem enviar | Estado do formulário perdido — sem rascunho | 🟢 Aceitável |
| G1.4 | Campo "tipo de perfil" não preenchido (obrigatório?) | `CreateUserDto` / schema Zod: `profile_type` é obrigatório? | 🟡 Verificar schema |
| G1.5 | Rate limit atingido (5 req/15min) | API retorna `429`, mas o frontend mostra o erro de forma amigável? | 🟠 UX de erro |
| G1.6 | Senha fraca (ex.: "123456") | Validação Zod no frontend e API: quais são as regras mínimas de senha? | 🟡 Verificar `@nave/validators` |
| G1.7 | Carlos usa celular com teclado virtual — campo de senha mostra texto? | Toggle show/hide de senha no form? | 🟡 Acessibilidade |
| G1.8 | Registro bem-sucedido: perfil criado automaticamente em `profiles`? | `auth.service.ts` cria profile na mesma transação Supabase; falha faz delete do auth user e retorna 500 ✅ | ✅ Implementado |

---

### 1.2 Login

**Como** Carlos,  
**quero** entrar na minha conta com email e senha  
**para** acessar meu histórico de veículos e despesas.

#### Jornada simulada

```
1. Carlos acessa /login
2. Digita email e senha
3. Clica em "Entrar"
4. É redirecionado para /dashboard com seus dados carregados
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G2.1 | Senha incorreta — mensagem de erro não revela se o email existe | `auth.service.ts` lança `UnauthorizedException('INVALID_CREDENTIALS')` para qualquer falha de login, sem distinguir email/senha ✅ | ✅ Implementado |
| G2.2 | Conta inexistente | Mesmo tratamento de G2.1 — mensagem `INVALID_CREDENTIALS` genérica em ambos os casos ✅ | ✅ Implementado |
| G2.3 | Sessão expirada (token 15min) durante uso ativo | Refresh token automático implementado no frontend? `use-auth.ts` está vazio | 🔴 Usuário é deslogado sem aviso |
| G2.4 | "Lembrar de mim" — existe essa opção? | Não encontrado na spec. Refresh token de 7 dias é implicitamente o "lembrar" | 🟡 UX expectativa |
| G2.5 | Login em múltiplos dispositivos simultâneos | JWT stateless: sem invalidação de sessão anterior. Logout em um device não derruba o outro | 🟡 Segurança |
| G2.6 | Carlos já está logado e acessa /login | Redirecionamento automático para /dashboard? | 🟡 UX |
| G2.7 | Rate limit login (10 req/15min) com IP diferente | Limite é por IP ou por usuário? | 🟡 Segurança |

---

### 1.3 Recuperação de senha

**Como** Carlos,  
**quero** recuperar acesso à minha conta caso esqueça a senha  
**para** não perder meu histórico de dados.

#### Jornada simulada

```
1. Carlos clica em "Esqueci minha senha" no /login
2. É redirecionado para /recover-password
3. Digita email
4. Recebe email com link de reset
5. Clica no link → /reset-password com token na URL
6. Define nova senha
7. É redirecionado para /login com mensagem de sucesso
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G3.1 | Email não cadastrado — exibe mensagem que "email não existe"? | `auth.service.ts` sempre retorna `{ message: 'Se este email existir, você receberá um link em breve' }` sem revelar se o email existe ✅ | ✅ Implementado |
| G3.2 | Token de reset expirado (Supabase default: 1 hora) | Frontend exibe mensagem clara com opção de reenviar? | 🟠 UX |
| G3.3 | Token de reset já usado | Supabase invalida automaticamente, mas o frontend trata o erro? | 🟠 |
| G3.4 | Nova senha igual à anterior | Supabase permite? Deveria ser bloqueado? | 🟢 Baixo risco |
| G3.5 | Carlos não recebe o email (cai no spam) | Há opção de reenviar na tela /recover-password? Cooldown de reenvio? | 🟡 UX |
| G3.6 | Link de reset aberto em dispositivo diferente do que solicitou | Deve funcionar normalmente (token-based), mas confirmar | 🟢 |

---

## 2. Veículos

### 2.1 Cadastrar veículo

**Como** Carlos,  
**quero** cadastrar meu carro com placa, marca, modelo e ano  
**para** vincular minhas despesas e manutenções a ele.

#### Jornada simulada

```
1. Carlos acessa /vehicles/new
2. Preenche placa "ABC1D23" (Mercosul), marca "Toyota", modelo "Corolla", ano "2020"
3. Opcionalmente faz upload de uma foto
4. Clica em "Salvar"
5. É redirecionado para /vehicles com o novo carro na lista
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G4.1 | Placa já cadastrada para o mesmo usuário | Deveria ser bloqueado? Ou um usuário pode ter dois registros da mesma placa? | 🟠 Regra de negócio não documentada |
| G4.2 | Placa no formato antigo (AAA-1234) | `license-plate.vo.ts` aceita Mercosul (`ABC1D23`) e formato antigo (`ABC1234`), normaliza para uppercase sem traço ✅ | ✅ Implementado |
| G4.3 | Upload de foto com arquivo muito grande (>10MB) | Supabase Storage tem limite — frontend valida antes do upload? Mensagem de erro? | 🟡 UX |
| G4.4 | Upload de formato inválido (PDF, HEIC de iPhone) | Quais formatos são aceitos? Validação no frontend? | 🟡 |
| G4.5 | Ano inválido (ex.: 1800 ou 2050) | Validação Zod tem range de anos? Min: 1900, Max: ano atual + 1? | 🟡 Verificar schema |
| G4.6 | Carlos cadastra veículo offline (PWA) | Fila de sync quando voltar online? Service worker trata POST offline? | 🔴 PWA gap |
| G4.7 | Limite de veículos por usuário | Existe plano/quota? Motorista autônomo tem máximo de X veículos? | 🟡 Regra de negócio não documentada |
| G4.8 | Campo "make" aceita qualquer texto livre? | Sem autocomplete ou lista fechada de marcas | 🟡 Qualidade de dados |

---

### 2.2 Visualizar detalhes do veículo

**Como** Carlos,  
**quero** ver os detalhes de um veículo específico  
**para** ter uma visão completa do histórico e custos.

#### Jornada simulada

```
1. Carlos acessa /vehicles
2. Clica no card do Toyota Corolla
3. Vê /vehicles/[id] com: dados do carro, últimas despesas, próximas manutenções
4. Clica em /vehicles/[id]/history para ver histórico completo
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G5.1 | Veículo sem nenhuma despesa ou manutenção | Página exibe estado vazio com CTA para adicionar? | 🟡 UX estado vazio |
| G5.2 | Acesso direto por URL a veículo de outro usuário | RLS no Supabase protege, mas API retorna 404 ou 403? Mensagem amigável? | 🟠 Segurança/UX |
| G5.3 | Foto do veículo com URL expirada (Supabase Storage signed URL?) | URL pública permanente ou temporária? Fallback de imagem? | 🟡 |
| G5.4 | Veículo deletado (soft delete) aparece na lista? | `supabase-vehicle.repository.ts` aplica `.is('deleted_at', null)` em `findAll` e `findById` ✅ — mesmo padrão nos repositórios de expenses e maintenances | ✅ Implementado |

---

### 2.3 Editar veículo

**Como** Carlos,  
**quero** atualizar os dados do meu veículo  
**para** corrigir informações ou adicionar foto depois.

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G6.1 | Alteração de placa para uma já existente de outro registro | Deveria ser validado como duplicata? | 🟡 |
| G6.2 | Remover foto existente sem adicionar nova | API aceita `photo_url: null` no PATCH? | 🟡 |
| G6.3 | Edição simultânea (mesmo veículo aberto em duas abas) | Last-write-wins. Sem controle de concorrência | 🟢 Aceitável no MVP |

---

### 2.4 Excluir veículo

**Como** Carlos,  
**quero** remover um veículo que não uso mais  
**para** manter minha lista organizada.

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G7.1 | Veículo tem despesas e manutenções associadas | `supabase-vehicle.repository.ts` faz soft-delete em cascata em paralelo: veículo + expenses + maintenances recebem `deleted_at` no mesmo `Promise.all` ✅ | ✅ Implementado |
| G7.2 | Confirmação antes de deletar | Modal de confirmação no frontend? | 🟠 UX segurança |
| G7.3 | Desfazer exclusão | Não implementado. Soft delete permite restaurar? Há endpoint de restore? | 🟡 |
| G7.4 | Carlos acessa /vehicles/[id] de veículo soft-deleted via URL direta | API retorna 404? Frontend redireciona? | 🟠 |

---

## 3. Despesas

### 3.1 Registrar despesa

**Como** Carlos,  
**quero** registrar uma despesa de combustível do meu carro  
**para** ter controle financeiro do meu veículo.

#### Jornada simulada

```
1. Carlos abastece o carro e paga R$ 180,00
2. Abre o app no celular ainda no posto
3. Acessa /expenses/new
4. Seleciona veículo: "Toyota Corolla"
5. Categoria: "Combustível"
6. Valor: 180.00
7. Data: hoje (preenchida automaticamente)
8. Descrição: "Gasolina — posto Shell Av. Paulista" (opcional)
9. Salva → redirecionado para /expenses
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G8.1 | Carlos não tem nenhum veículo cadastrado e tenta criar despesa | `expenses.service.create` chama `vehiclesService.findOne(dto.vehicle_id, userId)` que lança 404 se veículo não existe/não pertence ao usuário ✅ Backend · Frontend redirect com banner pendente | ✅ Backend · 🔴 Frontend |
| G8.2 | Categoria não selecionada | É campo obrigatório no Zod schema? | 🟡 |
| G8.3 | Valor negativo ou zero | Validação Zod: `amount > 0`? | 🟡 |
| G8.4 | Data futura (ex.: despesa agendada) | Sistema aceita? Faz sentido para despesas futuras? | 🟡 Regra de negócio |
| G8.5 | Data muito antiga (ex.: 1990) | Sem validação de range de data? | 🟢 |
| G8.6 | Carlos registra offline no posto sem internet | Service Worker faz fila de POST? Dados não são perdidos? | 🔴 PWA crítico |
| G8.7 | Categorias customizadas pelo usuário | `expense_categories` em profiles: como são gerenciadas? Há UI para criar categorias novas? | 🟠 Feature incompleta |
| G8.8 | Valor com vírgula (padrão pt-BR: "180,50") | Input numérico aceita vírgula? Ou só ponto? Carlos pode digitar errado | 🟠 Localização |
| G8.9 | Despesa com valor muito alto (ex.: R$ 50.000 — conserto major) | Sem limite máximo. Validação de sanidade? | 🟢 |

---

### 3.2 Listar e filtrar despesas

**Como** Carlos,  
**quero** ver todas as minhas despesas com filtros por categoria e período  
**para** entender onde estou gastando mais.

#### Jornada simulada

```
1. Carlos acessa /expenses
2. Vê lista paginada de todas as despesas
3. Filtra por: mês atual + categoria "Combustível"
4. Analisa gastos com combustível em maio
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G9.1 | Lista com muitas despesas (500+ itens) | Paginação implementada? Infinite scroll ou páginas? | 🟠 Performance |
| G9.2 | Filtro por veículo na tela /expenses | Endpoint `GET /expenses/vehicle/:vehicleId` existe, mas há filtro de veículo na UI de listagem geral? | 🟠 UX |
| G9.3 | Sem resultados para o filtro aplicado | Estado vazio com mensagem clara? CTA para limpar filtros? | 🟡 UX |
| G9.4 | Ordenação (mais recente, maior valor) | Há opção de ordenação na UI e na API? | 🟡 |
| G9.5 | Exportar despesas filtradas para CSV diretamente desta tela | Ou o export é apenas no dashboard com filtro de período? | 🟡 Descoberta da feature |

---

### 3.3 Editar despesa

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G10.1 | Trocar o veículo de uma despesa | `expenses.service.update` valida ownership do novo `vehicle_id` via `vehiclesService.findOne` quando `vehicle_id` muda ✅ | ✅ Implementado |
| G10.2 | Editar despesa de mês fechado (para fins contábeis) | Sem bloqueio de edição por período | 🟢 Aceitável MVP |

---

## 4. Manutenções

### 4.1 Agendar manutenção

**Como** Carlos,  
**quero** agendar a troca de óleo do meu carro para daqui a 30 dias  
**para** ser lembrado antes de esquecer.

#### Jornada simulada

```
1. Carlos acessa /maintenance/new
2. Seleciona veículo: "Toyota Corolla"
3. Descrição: "Troca de óleo e filtro"
4. Data agendada: 22/06/2026
5. Custo estimado: R$ 250,00 (opcional)
6. Status: "Agendado" (padrão)
7. Salva → aparece na lista com alerta configurado
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G11.1 | Data de manutenção no passado (ex.: registrando retro-ativamente) | Sistema aceita? Faz sentido para histórico | 🟡 |
| G11.2 | Carlos não recebe alerta de email 7 dias antes | SPEC-20260521-002 **não implementada** — Edge Function pendente | 🔴 Feature crítica quebrada |
| G11.3 | Tipo/categoria de manutenção (troca de óleo, revisão, pneu) | Campo `description` livre — sem categorização estruturada. Dificulta análises | 🟠 Qualidade de dados |
| G11.4 | Quilometragem para disparo do alerta (ex.: "trocar óleo a cada 10.000 km") | Sistema não tem campo de odômetro/quilometragem | 🔴 Gap funcional importante para motoristas |
| G11.5 | Recorrência automática (ex.: "revisão anual") | Sem recurso de recorrência — cada manutenção é manual | 🟡 Feature futura desejável |
| G11.6 | Múltiplas manutenções no mesmo dia | Permitido sem restrição — OK | 🟢 |
| G11.7 | Carlos sem veículo cadastrado tenta agendar manutenção | `maintenance.service.create` chama `vehiclesService.findOne(dto.vehicle_id, userId)` — 404 se não existe ✅ Backend · Frontend redirect com banner pendente | ✅ Backend · 🔴 Frontend |

---

### 4.2 Atualizar status da manutenção

**Como** Carlos,  
**quero** marcar uma manutenção como "em andamento" quando levar o carro à oficina  
**e** como "concluída" quando pegar o carro de volta  
**para** ter o histórico real do que foi feito.

#### Jornada simulada

```
1. Carlos leva o Corolla à oficina
2. Abre /maintenance, encontra "Troca de óleo"
3. Muda status: "Agendado" → "Em Andamento"
4. No dia seguinte, pega o carro
5. Muda status: "Em Andamento" → "Concluído"
6. Preenche data de conclusão: hoje
7. Atualiza custo real: R$ 280,00 (diferente do estimado)
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G12.1 | Transição de status inválida (ex.: "Cancelado" → "Concluído") | `maintenance.service.ts` tem `VALID_TRANSITIONS` map: `scheduled→[in_progress, completed, cancelled]`, `in_progress→[completed, cancelled]`, terminais sem saída. Transição inválida retorna `HTTP 400` ✅ | ✅ Implementado |
| G12.2 | Data de conclusão obrigatória ao marcar "Concluído"? | `completion_date` é opcional no schema, mas semanticamente deveria ser obrigatória | 🟡 |
| G12.3 | Custo real vs. custo estimado — diferença gera alerta ou notificação? | Não implementado | 🟡 Feature futura |
| G12.4 | Manutenção "Concluída" gera automaticamente uma despesa? | Fluxo desconectado — Carlos precisa registrar a despesa manualmente também | 🟠 Duplicidade de esforço |
| G12.5 | Histórico de mudanças de status (audit trail da manutenção) | `audit_logs` registra mudanças de `maintenances`? | 🟡 Rastreabilidade |

---

### 4.3 Listar manutenções

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G13.1 | Filtrar por status (ver apenas pendentes) | Endpoint `GET /maintenance` aceita query param de status? | 🟡 |
| G13.2 | Ordenação por data de agendamento (mais próximas primeiro) | Ordenação padrão definida na API? | 🟡 |
| G13.3 | Manutenções vencidas (data passada + status "Agendado") | `maintenance.service.ts` retorna campo `is_overdue: boolean` calculado em toda resposta (`scheduled_date < today AND status = 'scheduled'`) ✅ Backend · Destaque visual no frontend pendente | ✅ Backend · 🟡 Frontend |
| G13.4 | Manutenção cancelada aparece na lista? | Soft delete vs. status "Cancelled" — qual o comportamento esperado? | 🟡 Regra de negócio |

---

## 5. Dashboard

### 5.1 Visualizar KPIs

**Como** Ana, gestora de frota,  
**quero** ver os KPIs da minha frota ao abrir o app  
**para** ter uma visão rápida do estado geral sem precisar navegar.

#### Jornada simulada

```
1. Ana abre o app → cai em /dashboard
2. Vê: total de veículos (3), despesas do mês (R$ 1.240,00), manutenções pendentes (2)
3. Vê últimas 5 despesas na tabela resumida
4. Analisa gráficos de tendência de custo
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G14.1 | Dashboard sem nenhum dado (usuário novo) | Estado vazio com onboarding? CTA para adicionar primeiro veículo? | 🔴 First-time UX crítico |
| G14.2 | "Despesas do mês" — mês atual ou últimos 30 dias? | `dashboard.service.ts` tem `currentMonthStart()` que retorna `YYYY-MM-01` (1º dia do mês corrente) ✅ | ✅ Implementado |
| G14.3 | Manutenções "pendentes" inclui apenas "scheduled" ou "scheduled + in_progress"? | Definição de "pendente" não documentada claramente | 🟡 |
| G14.4 | Dashboard de Ana com 3 veículos — os KPIs são agregados de toda a frota? | `dashboard.service.getStats` aceita `vehicleId` param; `vehicleId === 'all'` retorna todos os veículos ✅ · Dropdown de veículo no frontend pendente | ✅ Backend · 🟡 Frontend |
| G14.5 | Gráfico de tendência sem dados históricos (usuário novo ou com poucos registros) | Gráficos vazios ou com mensagem? Qual o mínimo de dados para renderizar? | 🟡 |
| G14.6 | Performance do dashboard com muitos registros | `GET /dashboard/stats` faz múltiplas queries — tempo de resposta aceitável com 1000+ registros? | 🟡 Performance |
| G14.7 | `floating-ia-button.tsx` e `ia-consultation.tsx` no dashboard | Consulta IA está implementada? Com qual LLM? Ou é stub? | 🟠 Ver seção 12 |
| G14.8 | `quick-actions.tsx` — quais ações rápidas existem? | Atalhos para criação de despesa e manutenção? | 🟡 |

---

## 6. Export CSV

**Como** Ana,  
**quero** exportar os dados de despesas em CSV para inserir em planilha  
**para** fazer análises personalizadas fora do app.

#### Jornada simulada

```
1. Ana acessa /dashboard
2. Clica em "Exportar CSV"
3. Seleciona período: "Maio 2026" e veículo: "Todos"
4. Faz download do arquivo "relatorio-maio-2026.csv"
5. Abre no Excel (pt-BR) — separador correto, acentos OK
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G15.1 | Período obrigatório não preenchido | API valida `period` como obrigatório — frontend bloqueia envio? | 🟡 |
| G15.2 | Período com zero registros | API retorna CSV com apenas o cabeçalho? Ou mensagem de erro? | 🟡 UX |
| G15.3 | Limite de 5.000 linhas atingido | `dashboard.service.exportExpensesCsv` retorna `{ csv, truncated: boolean, filename }` — quando `truncated=true`, frontend deve exibir aviso ✅ Backend · Mensagem no frontend pendente | ✅ Backend · 🟡 Frontend |
| G15.4 | Rate limit de export (10 req/5min) | Ana faz múltiplos exports rápidos — feedback claro de "aguarde X segundos"? | 🟡 |
| G15.5 | CSV inclui manutenções ou apenas despesas? | `dashboard.service.exportExpensesCsv` aceita `include: string[]` — `include=['expenses','maintenances']` adiciona coluna `Tipo` e linhas de manutenção ✅ | ✅ Implementado |
| G15.6 | Nome do arquivo gerado | `dashboard.service.ts` gera `nave-{vehicleName|geral}-{YYYY-MM}.csv`, sanitizando o nome do veículo para URL-safe ✅ | ✅ Implementado |
| G15.7 | Export funciona no celular (mobile)? | Download de arquivo em Android/iOS via PWA pode ter comportamento diferente | 🟡 PWA compat |

---

## 7. Perfil do Usuário

**Como** Carlos,  
**quero** atualizar meu nome e tipo de perfil  
**para** manter meus dados corretos.

#### Jornada simulada

```
1. Carlos acessa /profile
2. Vê: nome "Carlos Souza", email (readonly), tipo "Motorista Autônomo"
3. Altera nome para "Carlos S. Junior"
4. Salva → feedback de sucesso
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G16.1 | Alterar email | Não está previsto no `UpdateProfileDto` — email é imutável? Ou via Supabase Auth? | 🟠 Expectativa do usuário |
| G16.2 | Alterar senha via perfil | Há opção de "alterar senha" no /profile? Ou apenas via forgot password? | 🟠 UX expectativa |
| G16.3 | `expense_categories` customizadas — há UI para gerenciar? | Campo existe na entidade, mas não há tela documentada para editar categorias | 🟠 Feature incompleta |
| G16.4 | `preferences` — quais preferências são suportadas? | Campo JSONB aberto — quais chaves são reconhecidas pelo frontend? | 🟡 Indefinido |
| G16.5 | Upload de foto de perfil / avatar | Não há campo `avatar_url` no perfil — funcionalidade ausente | 🟡 Expectativa comum |
| G16.6 | Migrar de "Motorista Autônomo" para "Gestor de Frota Pequena" | Mudança de `profile_type` tem impacto funcional? Desbloqueia features? | 🟡 Sem impacto documentado |

---

## 8. Exclusão de Conta (LGPD)

**Como** Carlos,  
**quero** excluir permanentemente minha conta e todos os meus dados  
**para** exercer meu direito de esquecimento conforme LGPD.

#### Jornada simulada

```
1. Carlos acessa /profile
2. Clica em "Excluir minha conta"
3. Modal de confirmação: "Isso é irreversível. Confirma?"
4. Digita "CONFIRMAR" ou checkbox
5. API recebe DELETE /users/me com { confirm: true }
6. Dados anonimizados, JWT revogado, sessão encerrada
7. Redirecionado para /login com mensagem "Sua conta foi removida"
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G17.1 | O que exatamente é "anonimizado"? | `users.service`: name → "DELETED_USER", email → uuid@deleted — quais campos? | 🟡 Conformidade LGPD |
| G17.2 | Veículos e despesas são deletados ou apenas anonimizados? | `users.service.deleteAccount` anonimiza nome → 'Anônimo (Deletado)', limpa preferences — dados transacionais (expenses, maintenances) mantidos com `user_id` desassociado ✅ | ✅ Implementado |
| G17.3 | `audit_logs` são mantidos após exclusão? | `users.service.deleteAccount` usa `SHA-256(email)` como `user_id` no log de `ACCOUNT_DELETED` — rastreabilidade sem PII ✅ · Logs anteriores com `user_id` original ficam (aceitável) | ✅ Implementado |
| G17.4 | Prazo para exclusão efetiva (LGPD permite até 15 dias) | Imediato ou tem fila de processamento? | 🟡 |
| G17.5 | Carlos cancela no meio do processo e volta | Estado da conta fica íntegro? Sem side effects parciais? | 🟢 |
| G17.6 | Confirmação via `{ confirm: true }` no body — seguro? | `users.service.verifyPassword` implementado — verifica senha atual via `adminSupabase.auth.signInWithPassword` antes de processar exclusão ✅ Backend · Controller/Frontend precisam passar a senha | ✅ Backend · 🟡 Frontend |

---

## 9. Admin

### 9.1 Listar e gerenciar usuários

**Como** administrador do sistema,  
**quero** listar todos os usuários e deletar contas problemáticas  
**para** garantir a conformidade com políticas da plataforma.

#### Jornada simulada

```
1. Admin acessa /admin/users (com JWT que tem role='admin')
2. Vê lista paginada (page=1, limit=20)
3. Busca pelo email de um usuário problemático
4. Deleta a conta → anonimização LGPD executada
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G18.1 | Como um usuário vira admin? | `app_metadata.role = 'admin'` é definido via Supabase Dashboard manualmente? Sem UI para promover admins | 🟠 Operacional |
| G18.2 | Painel Admin UI não existe (Phase 2) | Todos os endpoints existem na API, mas não há frontend — admin usa Swagger? | 🟠 Usabilidade |
| G18.3 | Admin pode ver dados de outros usuários (veículos, despesas)? | `admin.service.listUsers` retorna apenas `id, email, created_at, last_sign_in_at, profile_type` — sem dados financeiros. `SERVICE_ROLE_KEY` não exposto ao frontend ✅ | ✅ Implementado |
| G18.4 | Busca/filtro de usuários por email ou nome | `GET /admin/users` aceita query params de busca? | 🟡 |
| G18.5 | Ação de banir temporariamente (sem deletar) | Não implementado — só delete definitivo | 🟡 Feature futura |
| G18.6 | Admin deleta a própria conta? | `admin.service.deleteUser` verifica `targetUserId === adminUserId` → lança `ForbiddenException('Não é possível excluir a própria conta de administrador')` ✅ | ✅ Implementado |

---

### 9.2 Visualizar audit logs

**Como** administrador,  
**quero** ver o log de ações dos usuários  
**para** investigar comportamentos suspeitos.

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G19.1 | Volume de logs com muitos usuários | `admin.service.listAuditLogs` usa `.range((page-1)*limit, page*limit-1)` — paginado ✅ | ✅ Implementado |
| G19.2 | Filtro por ação específica (ex.: apenas LOGINs) | `listAuditLogs` filtra por `userId`, `from`, `to` — filtro por `action` ainda **não implementado** | 🟡 Pendente |
| G19.3 | Logs de usuário deletado (anonimizado) | Ao deletar conta, log de `ACCOUNT_DELETED` usa `SHA-256(email)` como `user_id` — logs anteriores mantêm `user_id` original ✅ (ver G17.3) | ✅ Implementado |
| G19.4 | Retenção de logs — por quanto tempo? | Sem política de expiração de audit_logs | 🟡 LGPD × Auditoria |

---

## 10. Alertas de Manutenção por Email

**Como** Carlos,  
**quero** receber um email 7 dias antes de uma manutenção agendada  
**para** ter tempo de agendar com a oficina.

#### Jornada simulada (esperada, não implementada)

```
1. Carlos agendou "Revisão anual" para 01/06/2026
2. Em 25/05/2026, às 08:00, o cron job pg_cron executa
3. Identifica manutenções com scheduled_date = hoje + 7 dias e alert_sent = false
4. Dispara Edge Function `send-maintenance-alerts`
5. Edge Function usa Resend para enviar email a Carlos
6. Atualiza alert_sent = true na manutenção
7. Carlos recebe email: "Lembrete: Revisão anual em 7 dias"
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G20.1 | **Edge Function não implementada** | SPEC-20260521-002 pendente. Migration do cron existe mas sem código de envio | 🔴 Feature completamente quebrada |
| G20.2 | Email do usuário disponível para a Edge Function? | `auth.users.email` acessível via SERVICE_ROLE_KEY? | 🟡 Técnico |
| G20.3 | Usuário sem email verificado recebe alerta? | Fluxo de verificação de email não documentado (G1.2) | 🟠 |
| G20.4 | Múltiplas manutenções no mesmo dia = múltiplos emails? | Deveria agrupar em um único email resumo | 🟠 UX email |
| G20.5 | Carlos quer desativar alertas de email | Não há `preferences.email_alerts` definido | 🟡 UX configuração |
| G20.6 | Manutenção cancelada após alerta enviado | Alerta de cancelamento? Email de "manutenção cancelada"? | 🟡 |
| G20.7 | Manutenção reagendada | `alert_sent = true` impede novo alerta — precisa ser resetado ao reagendar | 🟠 Lógica de negócio |
| G20.8 | Alerta com 7 dias é fixo ou configurável pelo usuário? | Fixo no cron — sem personalização | 🟡 |
| G20.9 | Email template — design e conteúdo definidos? | Nenhum template de email no repositório | 🟠 |
| G20.10 | Rate limit / bounce do Resend | Sem tratamento de falha de envio de email | 🟡 |

---

## 11. PWA — Offline e Instalação

**Como** Carlos,  
**quero** usar o app mesmo sem internet (posto de combustível com sinal ruim)  
**para** não perder meu registro de despesas.

#### Jornada simulada

```
1. Carlos instala o PWA no Android ("Adicionar à tela inicial")
2. Abre o app offline no posto
3. Registra despesa de R$ 150,00
4. App armazena localmente (service worker / IndexedDB?)
5. Quando a internet volta, dados são sincronizados automaticamente
6. Carlos vê a despesa na lista sem duplicatas
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G21.1 | Service Worker cacheia a API ou apenas o shell? | `sw.ts` com Serwist: estratégia de cache para chamadas POST? | 🔴 POST offline geralmente não é cacheado |
| G21.2 | Fila de sync offline (Background Sync API) | Implementado? `workbox-background-sync` configurado? | 🔴 Provável gap |
| G21.3 | Conflito de sync (dados offline + dados editados online) | Sem estratégia de resolução de conflito documentada | 🔴 Integridade de dados |
| G21.4 | Usuário offline tenta fazer login | Sessão JWT em cache? Ou app bloqueia com "sem internet"? | 🟠 |
| G21.5 | Página /offline existe — quando é exibida? | Quando todo o app falha ou para navegação específica? | 🟡 |
| G21.6 | Instalação PWA no iOS (Safari) | Limitações do iOS para PWA (sem push notifications, Background Sync limitado) | 🟠 Platform compat |
| G21.7 | Atualização do PWA — usuário é notificado? | Sem estratégia de `skipWaiting` + `clientsClaim` documentada | 🟡 |

---

## 12. Consulta IA

**Como** Carlos,  
**quero** perguntar ao assistente "Quanto gastei com combustível nos últimos 3 meses?"  
**para** obter insights rápidos sem precisar navegar pelos relatórios.

#### Jornada simulada

```
1. Carlos está no /dashboard
2. Clica no botão flutuante de IA (floating-ia-button)
3. Modal abre: chat com assistente
4. Digita: "Qual meu maior gasto com o Corolla?"
5. IA analisa dados e responde: "Combustível: R$ 1.200 (42% do total)"
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G22.1 | `ia-consultation.tsx` — está implementado ou é stub? | Componente existe mas lógica de integração com LLM desconhecida | 🔴 Verificar implementação |
| G22.2 | Qual LLM é usado? Claude API? OpenAI? | Nenhuma dependência de SDK de LLM encontrada no projeto | 🔴 Não implementado |
| G22.3 | A IA tem acesso aos dados reais do usuário? | Precisaria de endpoint que retorne contexto de dados para a IA | 🔴 Sem data pipeline para IA |
| G22.4 | Privacidade: dados do usuário enviados para API externa | Termos de uso e privacidade mencionam uso de IA? | 🟠 LGPD |
| G22.5 | Respostas incorretas ou alucinações da IA | Sem disclaimer de "resposta informativa, não financeira" | 🟡 |
| G22.6 | Custo da API de IA por usuário | Sem rate limit específico para chamadas de IA | 🟠 Custo operacional |

---

## 13. Onboarding do Primeiro Uso

### 13.1 Guia pós-registro para novo usuário

**Como** Carlos, que acabou de criar sua conta,
**quero** ser guiado pelos primeiros passos do app
**para** entender o que posso fazer e começar a usar sem frustração.

#### Jornada simulada

```
1. Carlos conclui o registro → redirecionado para /dashboard
2. App detecta: 0 veículos, 0 despesas → ativa fluxo de onboarding
3. Banner/modal: "Bem-vindo, Carlos! Cadastre seu primeiro veículo para começar"
4. Carlos clica em "Cadastrar veículo" → /vehicles/new
5. Após salvar, app sugere: "Quer registrar sua primeira despesa?"
6. Carlos adiciona despesa de combustível
7. Checklist de onboarding: ✅ Veículo · ✅ Despesa · ⬜ Manutenção
8. Checklist desaparece ao completar todos os passos
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G23.1 | Onboarding implementado no frontend? | Nenhum componente de onboarding/checklist encontrado na spec | 🔴 First-time UX crítico |
| G23.2 | Carlos ignora o onboarding e navega direto | Dashboard vazio sem guia = experiência confusa | 🔴 |
| G23.3 | Carlos retoma o onboarding depois de sair pela metade | Estado persiste? Campo `onboarding_completed` em `profiles`? | 🟠 |
| G23.4 | Onboarding diferente para Motorista vs. Gestor de Frota | Ana precisaria de steps diferentes (multi-veículos, convite de motoristas) | 🟡 |
| G23.5 | Carlos pula o onboarding e quer retomá-lo depois | Há opção "Retomar tour" nas configurações? | 🟡 |
| G23.6 | Tooltip interativo explicando cada seção do app | Sem menção a tour guiado com overlays | 🟢 Desejável |

---

## 14. Notificações Push (PWA)

**Como** Carlos,
**quero** receber uma notificação no celular quando uma manutenção estiver próxima
**para** ser avisado mesmo sem abrir o app.

#### Jornada simulada

```
1. Carlos instala o PWA e aceita receber notificações
2. 7 dias antes da revisão anual, notificação push chega no Android
3. Notificação: "Nave · Revisão anual do Corolla em 7 dias (01/06)"
4. Carlos toca na notificação → abre /maintenance/[id]
5. Vê detalhes e muda status para "Em Andamento"
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G24.1 | Push notifications implementadas no PWA? | Nenhuma referência a Web Push API ou VAPID keys no projeto | 🔴 Não implementado |
| G24.2 | Permissão de notificação solicitada quando? | Ideal: após primeiro agendamento de manutenção (contexto claro para o usuário aceitar) | 🟠 UX de permissão |
| G24.3 | iOS Safari 16.4+ suporta Web Push; versões anteriores não | Fallback para email em iOS antigo? Aviso na instalação? | 🟠 Compatibilidade |
| G24.4 | Carlos nega permissão de notificação | App informa que alertas serão apenas por email? | 🟡 |
| G24.5 | Notificação chega com app aberto em foreground | Suprimir ou exibir banner in-app? | 🟡 UX |
| G24.6 | VAPID keys e armazenamento de push subscriptions | Tabela `push_subscriptions(user_id, endpoint, keys)` não existe | 🔴 Infraestrutura ausente |
| G24.7 | Limpar notificação após manutenção ser concluída | Notificação obsoleta deve ser descartada da bandeja do sistema | 🟡 |

---

## 15. Histórico de Quilometragem / Odômetro

**Como** Carlos,
**quero** registrar a quilometragem atual do carro a cada abastecimento
**para** calcular o consumo médio (km/L) e o custo por quilômetro.

#### Jornada simulada

```
1. Carlos abastece 40 L a R$ 6,00/L = R$ 240,00
2. Odômetro atual: 85.420 km
3. Ao registrar despesa de combustível:
   - Valor: R$ 240,00
   - Litros: 40 (campo novo)
   - Quilometragem atual: 85.420 km
4. App calcula: último abastecimento em 85.100 km → 320 km rodados
5. Consumo: 320 / 40 = 8,0 km/L · Custo/km: R$ 0,75/km
6. Dashboard exibe: "Consumo médio do Corolla: 8,0 km/L"
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G25.1 | Campo de quilometragem não existe nas entidades atuais | `expenses` e `maintenances` não têm campo `odometer_km` | 🔴 Gap funcional core |
| G25.2 | Alerta de manutenção por quilometragem (G11.4) bloqueado | Sem odômetro, impossível alertar por KM rodado | 🔴 Dependência crítica |
| G25.3 | Quilometragem inserida menor que a anterior | Validação: `odometer_km >= last_odometer_km` do mesmo veículo? | 🟠 Integridade de dados |
| G25.4 | Carlos não preenche quilometragem (campo opcional?) | Se opcional, cálculo de consumo fica incompleto para aquele registro | 🟡 |
| G25.5 | Gráfico de evolução do odômetro por veículo | Permite estimar vida útil e planejamento de revisões por KM | 🟡 Feature de alto valor |
| G25.6 | Múltiplos motoristas registrando KM no mesmo veículo (frota) | Odômetro é cumulativo por veículo — como consolidar leituras divergentes? | 🟠 Multi-usuário |
| G25.7 | Litros abastecidos vs. tipo de combustível (gasolina, etanol, diesel) | Influencia cálculo de consumo e custo/km por tipo | 🟡 Granularidade |

---

## 16. Compartilhamento de Veículo (Frota)

**Como** Ana, gestora de frota,
**quero** compartilhar um veículo com um motorista da minha equipe
**para** que ele registre despesas sem ter acesso a toda a frota.

#### Jornada simulada

```
1. Ana acessa /vehicles/[id] do caminhão da empresa
2. Clica em "Compartilhar com motorista"
3. Informa email: "joao@empresa.com" e permissão: "Apenas despesas"
4. João recebe email com convite
5. João aceita → vê apenas o caminhão compartilhado na sua conta
6. João registra abastecimento → Ana vê o lançamento no dashboard da frota
7. Ana pode revogar acesso a qualquer momento
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G26.1 | Compartilhamento de veículo não existe | Cada veículo tem `user_id` exclusivo. Sem modelo de permissões compartilhadas | 🔴 Feature ausente |
| G26.2 | Modelo de dados para compartilhamento | Requer tabela `vehicle_permissions(vehicle_id, user_id, role)` + RLS revisada | 🔴 Arquitetura |
| G26.3 | Motorista convidado ainda não tem conta Nave | Fluxo de convite cria conta automática (com senha temporária) ou exige cadastro prévio? | 🟠 |
| G26.4 | Ana revoga acesso de um motorista | Despesas já registradas por ele ficam atribuídas ao veículo ou são deletadas? | 🟠 Regra de negócio |
| G26.5 | Motorista compartilhado vê despesas de outros motoristas do mesmo veículo | Isolamento de dados: cada motorista vê apenas os próprios lançamentos? | 🟡 Privacidade |
| G26.6 | Limite de motoristas por veículo compartilhado | Sem quota definida | 🟡 |
| G26.7 | Ana recebe alerta quando motorista lança despesa acima de R$ X | Controle gerencial por threshold | 🟢 Fase futura |

---

## 17. Planos e Assinatura

**Como** Carlos,
**quero** entender o que está incluído no plano gratuito e quando preciso fazer upgrade
**para** decidir se vale a pena assinar o plano pago.

#### Jornada simulada

```
1. Carlos tem 1 veículo e 95 despesas (plano Free: limite 100/mês)
2. Tenta adicionar a 96ª despesa → modal de upgrade
3. Modal: "Plano Free: 1 veículo, 100 despesas/mês · Pro: ilimitado por R$ 19,90/mês"
4. Carlos clica em "Assinar Pro" → /billing
5. Pagamento via cartão → Stripe processa
6. Upgrade ativo imediatamente → Carlos adiciona a despesa sem restrição
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G27.1 | Modelo de planos não existe no sistema | Sem tabela `subscriptions` ou campo `plan` em `profiles` | 🔴 Monetização ausente |
| G27.2 | Limites do plano Free não definidos | Quantos veículos e despesas são permitidos? Não documentado em nenhuma spec | 🔴 Regra de negócio |
| G27.3 | Integração com gateway de pagamento | Stripe, Pagar.me ou outro? Sem integração no código | 🔴 Infraestrutura |
| G27.4 | Usuário atinge limite sem aviso prévio | Deveria exibir "85% do limite usado" antes de bloquear | 🟠 UX degradada |
| G27.5 | Downgrade do Pro para Free com excedente de dados | Carlos cancela e tem 5 veículos — o que acontece com os 4 excedentes? | 🟠 Regra de negócio |
| G27.6 | Trial gratuito do Pro (período de avaliação) | Sem menção a trial no roadmap | 🟡 Conversão |
| G27.7 | Cobrança falha (cartão expirado) | Email de aviso + período de graça antes de rebaixar para Free? | 🟡 Churn |
| G27.8 | Nota fiscal / recibo para empresas (Ana) | Gestoras de frota precisam de NF para reembolso corporativo | 🟡 B2B |

---

## 18. Relatórios Avançados

**Como** Ana, gestora de frota,
**quero** visualizar o custo total por veículo no trimestre e comparar entre eles
**para** decidir qual veículo trocar ou vender.

#### Jornada simulada

```
1. Ana acessa /reports
2. Seleciona: Q1 2026, todos os veículos
3. Vê tabela: Veículo A (R$ 1.800) · Veículo B (R$ 3.200) · Veículo C (R$ 2.100)
4. Clica em Veículo B → drill-down: R$ 1.800 manutenções + R$ 1.400 combustível
5. Exporta em CSV ou PDF
```

#### Jornada simulada — Carlos (motorista de app)

```
1. Carlos acessa /reports → aba "Rentabilidade"
2. Informa receita do mês: R$ 5.200 (Uber/99)
3. App cruza com despesas do veículo: R$ 1.350
4. Exibe: Lucro líquido R$ 3.850 · Margem 74% · Custo/km R$ 0,82
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G28.1 | Tela de relatórios `/reports` não existe | Apenas dashboard com KPIs simples. Sem seção dedicada a relatórios | 🔴 Feature ausente |
| G28.2 | Comparação entre veículos | `GET /dashboard/stats` retorna agregado geral, não breakdown por veículo | 🟠 Limitação da API atual |
| G28.3 | Export em PDF | Apenas CSV disponível | 🟡 |
| G28.4 | Custo por quilômetro | Bloqueado pelo G25.1 (sem campo de odômetro) | 🔴 Dependência |
| G28.5 | Filtro cruzado: veículo × categoria no mesmo relatório | Drill-down combinado não suportado pelo endpoint atual | 🟡 |
| G28.6 | Relatório de rentabilidade (receita vs. custo do veículo) | Feature de alto valor para motoristas de aplicativo (Uber, 99, iFood) | 🟠 |
| G28.7 | Relatório mensal automático por email | Resumo mensal enviado no 1º dia do mês | 🟢 Fase futura |
| G28.8 | Benchmark: custo do meu veículo vs. média da plataforma | Requer dados anonimizados agregados de outros usuários | 🟢 Fase futura |

---

## 19. Seletor de Contexto de Veículo

> **Épico:** Migrar o seletor de veículo/grupo do `FocusSlot` no sidebar para um chip persistente no subheader (`FluidFleetHeader`) + Dialog centralizado (desktop) / Sheet bottom-up (mobile).
>
> **Personas:** Carlos (P-001 · mobile · troca frequente entre veículos) · Ana (P-002 · desktop · múltiplos grupos de frota)
>
> **Arquitetura decidida:** chip sempre visível no subheader → clique abre Dialog/Sheet → `VehicleSwitcherContent` reutilizado → sidebar sem FocusSlot

---

### 19.1 [FE] Exibir chip de contexto no subheader

> **Atualização 2026-06-15:** na implementação final, o chip foi posicionado no **header superior** (à esquerda, após logo/toggle de menu mobile), não no subheader (`FluidFleetHeader`). O racional de UX abaixo (persistência visual em todas as páginas/breakpoints) permanece válido — apenas o local exato do chip mudou. Ver SPEC-20260603-001 RF-01.

**Como** gestor de frota,
**quero** ver o veículo ou grupo que estou gerenciando exibido de forma persistente no subheader
**para** ter certeza de que estou operando no contexto correto em qualquer tela do sistema.

#### Jornada simulada

```
1. Carlos abre /dashboard sem veículo selecionado
2. Subheader: chip dashed muted "＋ Selecionar veículo"
3. Carlos seleciona "ABC-1234 · Ford Ranger"
4. Chip muda: fundo âmbar suave, ícone 🚗, "ABC-1234 · Ranger" truncado + X
5. Carlos navega /expenses → chip permanece no subheader da main column
6. Carlos recolhe o sidebar (w-16) → chip permanece visível, inalterado
7. Carlos abre o sidebar no mobile (overlay) → chip fica atrás do overlay, mas retorna ao fechar
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G-CTX-01 | Chip no modo `none` é clicável e abre o Dialog? | Trigger deve estar em todo o container do chip, não só no PopoverTrigger interno | 🟠 Comportamento indefinido |
| G-CTX-02 | Subheader de 44px tem espaço para o chip + chips de despesa em 375px? | Chip pode empurrar chips de despesa para fora do overflow-hidden → chip precisa de `flex-shrink-0` + `max-w-[140px]`; chips de despesa ficam com `overflow-x: auto` | 🔴 Layout quebrado mobile |
| G-CTX-03 | Texto "ABC-1234 · Ford Ranger GT Turbo Diesel 2022" cabe no chip? | `truncate` + `max-w` obrigatórios — sem eles estoura o subheader | 🟠 |
| G-CTX-04 | Dois modos ativos simultaneamente (ex: `group` selecionado e `single` também)? | `resolveMode` retorna o primeiro match — ordem de prioridade deve ser documentada: single > group > multi > attribute | 🟡 Regra de negócio |
| G-CTX-05 | Chip tem `aria-label` dinâmico para leitores de tela? | "Contexto ativo: ABC-1234 Ford Ranger. Ativar para trocar" vs apenas visual — usar `aria-label` no button | 🟠 Acessibilidade |
| G-CTX-06 | Área de toque do chip ≥ 44px de altura (WCAG 2.5.5)? | Subheader h-11 (44px) mas chip h-7 (28px) — o button deve ocupar a altura total do subheader via `h-full py-0` | 🔴 Acessibilidade crítica |
| G-CTX-07 | Contraste âmbar-50/amber-300 em dark mode atinge 4.5:1 para texto? | Paletas pastel em dark frequentemente falham — verificar com ferramenta de contraste | 🟠 Acessibilidade |
| G-CTX-08 | Chip aparece apenas em rotas do layout `(dashboard)`? | Subheader está em `(dashboard)/layout.tsx` — não renderiza em /login, /register ✅ | ✅ Estrutura correta |
| G-CTX-09 | Flash de conteúdo ao hidratar o store com `persist`? | Store com `sessionStorage` hidrata assincronamente → chip pisca de `none` para o veículo salvo | 🟡 |
| G-CTX-10 | Veículo com `make` ou `model` ausentes → chip exibe "ABC-1234 · " com bullet sem texto? | Fallback: exibir apenas a placa sem separador quando make/model são strings vazias | 🟡 Display quebrado |
| G-CTX-11 | Chip diferencia visualmente os estados hover e focus para teclado? | `focus-visible:ring-2` + cursor pointer indicam interatividade | 🟡 |
| G-CTX-12 | Chip modo `multi` exibe o count correto e atualiza ao adicionar/remover veículos? | `multiSelectedIds.length` do store deve ser reativo — verificar se o counter no chip faz subscription | 🟡 |

---

### 19.2 [FE] Abertura do Dialog de seleção (desktop ≥ 768px)

**Como** gestora de frota no desktop,
**quero** clicar no chip e ver um Dialog centralizado com busca e lista de veículos/grupos
**para** trocar o contexto sem depender do sidebar ou navegar para outra tela.

#### Jornada simulada — fluxo feliz

```
1. Ana (1440px) clica no chip "🚗 ABC-1234 · Ranger"
2. Dialog abre centralizado com backdrop blur (200ms ease-out)
3. Input de busca com autofocus; lista: 3 veículos + 2 grupos
4. Ana clica em "DEF-5678 · Fiat Ducato"
5. Dialog fecha (150ms fade-out), chip atualiza para DEF-5678
```

#### Jornada simulada — erro de rede

```
1. Ana clica no chip
2. Dialog abre, VehicleSwitcherContent dispara fetch
3. API retorna 500 após 8s de timeout
4. Skeleton é substituído por: "Não foi possível carregar os veículos. [Tentar novamente]"
5. Ana clica em "Tentar novamente" → nova requisição, desta vez bem-sucedida
```

#### Jornada simulada — sessão expirada

```
1. Ana abre o Dialog depois de 2h inativa
2. Fetch retorna 401 (JWT expirado)
3. Dialog exibe "Sessão encerrada"
4. Redirect para /login?session=expired
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G-CTX-13 | `autoFocus` do input dentro do Dialog funciona? (Radix Dialog pode interferir no foco inicial) | Testar — pode ser necessário `setTimeout(() => inputRef.current?.focus(), 50)` | 🟠 |
| G-CTX-14 | Dialog fecha ao clicar no backdrop? | Comportamento padrão Radix Dialog → `onOpenChange(false)` → `onClose()` ✅ | ✅ Padrão da lib |
| G-CTX-15 | Dialog capturando Esc conflita com o `handleGlobalEvents` do sidebar que também escuta Esc? | Dialog do Radix captura Esc com `e.stopPropagation()` por padrão — verificar se o sidebar ainda recebe o evento | 🔴 Conflito de eventos |
| G-CTX-16 | Lista com 100 veículos → Dialog excede a viewport sem max-height? | `max-h-60` no scroll container já existe; Dialog wrapper precisa de `max-h-[80vh] overflow-hidden` | 🟠 |
| G-CTX-17 | Dois cliques rápidos no chip abrem dois Dialogs? | Estado `open` booleano previne — verificar se handler tem debounce ou guarda de `isOpen` | 🟡 |
| G-CTX-18 | Skeleton por mais de 5s sem feedback de timeout? | Implementar timeout de 8s → substituir skeleton por mensagem de erro com retry | 🟠 |
| G-CTX-19 | Keyboard trap dentro do Dialog (Tab e Shift+Tab não escapam)? | Radix Dialog implementa focus trap por padrão ✅ | ✅ Padrão Radix |
| G-CTX-20 | Dialog anunciado por leitores de tela com role e label corretos? | `role="dialog"` + `aria-modal="true"` + `aria-label="Selecionar veículo"` via Radix ✅ | ✅ |
| G-CTX-21 | Largura 380px em tablets portrait (768px) ocupa 50% do viewport? | Testar em 768px — pode ser necessário `w-[calc(100%-2rem)] max-w-[380px]` | 🟡 |
| G-CTX-22 | Scroll da página principal "vaza" por trás do Dialog backdrop? | `overflow: hidden` no `body` via Radix Dialog ao abrir ✅ | ✅ Padrão Radix |

---

### 19.3 [FE] Abertura do Sheet de seleção (mobile < 768px)

**Como** gestor de frota no smartphone,
**quero** tocar no chip e ver um painel deslizando de baixo para cima
**para** ter uma experiência mobile-first natural sem precisar abrir o menu lateral.

#### Jornada simulada — fluxo feliz

```
1. Carlos (375px Android) toca no chip "+ Selecionar veículo"
2. Sheet sobe do rodapé (300ms ease-out), cobre 70% da tela
3. Handle de drag visível no topo
4. Carlos digita "Ford" → 1 resultado
5. Toca no resultado → Sheet fecha, chip atualiza
```

#### Jornada simulada — teclado virtual

```
1. Sheet abre
2. Carlos toca no input de busca → teclado virtual sobe 300px
3. Sheet precisa subir para manter o input visível acima do teclado
   → visualViewport.addEventListener necessário
4. Sem o listener: input fica oculto sob o teclado (usuário digita às cegas)
```

#### Jornada simulada — modo offline

```
1. Carlos toca no chip sem internet
2. Sheet abre com lista cacheada (TTL válido) ou skeleton
3. Exibe banner: "Sem conexão — mostrando última lista disponível"
4. Carlos pode selecionar da lista cacheada mesmo offline
```

#### Jornada simulada — swipe acidental

```
1. Carlos scrollava a lista de veículos dentro do Sheet
2. Dedo deslizou mais do que a lista — threshold de swipe-to-close atingido
3. Sheet fecha sem seleção — contexto anterior mantido (correto, mas frustrante)
4. Carlos toca de novo no chip e repete o processo
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G-CTX-23 | Sheet usa `vaul` (shadcn/ui) ou implementação customizada? | vaul tem suporte nativo a drag, iOS rubber-band e snap points — preferir vaul | 🟡 Decisão de biblioteca |
| G-CTX-24 | Swipe down para fechar conflita com scroll interno da lista? | Threshold de swipe-to-close alto (ex: 50% da altura do sheet) minimiza conflito; testar | 🟠 Frustração alta |
| G-CTX-25 | Teclado virtual Android (≤ Android 12) empurra o Sheet? | `window.visualViewport.addEventListener('resize', ...)` necessário para reposicionar | 🟠 |
| G-CTX-26 | `env(safe-area-inset-bottom)` aplicado no rodapé do Sheet em iPhone com notch? | Sem esse padding: botão "Gerenciar grupos" fica sobre o indicador home do iOS | 🟠 |
| G-CTX-27 | Sheet em landscape (mobile rotacionado) — viewport muito raso? | Sheet pode cobrir 100% da tela sem espaço para o handle de drag | 🟠 |
| G-CTX-28 | Carlos toca fora do Sheet (backdrop) → Sheet fecha e contexto anterior é mantido? | Fechar sem selecionar = cancelar — deve manter o contexto anterior | ✅ Comportamento correto |
| G-CTX-29 | Animation jank em devices de entrada (Moto G7, Redmi, Android 10)? | `transform: translateY()` com `will-change: transform` garante GPU compositing | 🟡 Performance |
| G-CTX-30 | `overscroll-behavior: contain` aplicado ao container interno do Sheet? | Sem isso o scroll do Sheet pode rolar a página principal em iOS Safari | 🟠 |
| G-CTX-31 | Sheet tem `aria-modal` e role corretos para VoiceOver? | `role="dialog"` + `aria-modal="true"` + label via vaul props | 🟡 |
| G-CTX-32 | `backdrop-filter: blur()` com animação tem custo de GPU aceitável em low-end? | Testar — considerar desativar blur no backdrop do Sheet e manter apenas opacidade | 🟡 |

---

### 19.4 [FE] Busca de veículo/grupo no switcher

**Como** gestor de frota com grande quantidade de veículos,
**quero** digitar parte da placa, marca ou modelo e ver resultados filtrados em tempo real
**para** encontrar o veículo certo rapidamente sem precisar scrollar a lista inteira.

#### Jornada simulada — fluxo feliz

```
1. Ana (60 veículos) abre o Dialog
2. Lista exibe os 20 primeiros por ordem alfabética de placa
3. Ana digita "ford" (minúsculas) → filtra para "Ford Ranger" e "Ford Transit"
4. Ana digita "abc" → "ABC-1234" e "ABC-5678" retornam
5. Ana clica em "ABC-1234" → selecionado
```

#### Jornada simulada — busca com acento

```
1. Carlos digita "caminhão"
2. Busca encontra "Caminhão Leve ABC" (nome do grupo)
3. Carlos digita "caminhao" (sem acento)
4. Sem normalização: nenhum resultado → Carlos pensa que o grupo sumiu
5. Com normalização: mesmo resultado que "caminhão" ✅
```

#### Jornada simulada — busca com placa colada

```
1. Carlos copia "ABC-1234" do sistema DETRAN (com hífen)
2. Cola no input do switcher
3. Sem normalização de hífen: busca por "ABC-1234" mas placa está normalizada como "ABC1234"
4. Resultado vazio → Carlos tenta digitar manualmente e encontra
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G-CTX-33 | Busca normaliza diacríticos? ("caminhao" encontra "caminhão"?) | `normalize('NFD').replace(/[̀-ͯ]/g, '')` aplicado em termo e item | 🟠 |
| G-CTX-34 | Busca normaliza hífens na placa? ("ABC-1234" encontra "ABC1234"?) | `plate.replace(/-/g, '')` antes de comparar — importante para paste de sistemas externos | 🟠 |
| G-CTX-35 | Busca é case-insensitive? | `toLowerCase()` em ambos os lados — provavelmente já implementado, verificar | 🟡 |
| G-CTX-36 | Resultado apenas em grupos (sem veículos) → seção de veículos some ou mostra vazia? | Suprimir seção com 0 resultados; exibir apenas a seção com matches | 🟡 UX |
| G-CTX-37 | Busca sem nenhum resultado (veículos + grupos = 0) | "Nenhum resultado para 'XYZ'. [Limpar busca]" com ação inline | 🟠 Estado vazio |
| G-CTX-38 | Paste com XSS payload (`<script>alert(1)</script>`) | Busca é client-side sobre array local — React escapa por padrão ✅; nenhum risco de injection | ✅ |
| G-CTX-39 | Input de busca reseta para `''` ao fechar e reabrir o Dialog/Sheet? | `search` state deve ser limpo no `useEffect` cleanup ou ao unmount do VehicleSwitcherContent | 🟠 |
| G-CTX-40 | Highlight do termo buscado no resultado (ex: **Ran**ger)? | Melhoria de UX — não crítico para MVP, fase 2 | 🟢 |
| G-CTX-41 | Busca client-side em 200 objetos é performática? | Filtro síncrono em array de 200 itens: < 1ms — sem necessidade de debounce ou virtualização | ✅ |
| G-CTX-42 | Busca em grupos pelo nome inclui busca nas placas dos membros? | Spec atual: apenas pelo nome do grupo — busca de membro por placa abre o Dialog de veículos individuais | 🟡 Decisão de produto |

---

### 19.5 [FE] Seleção de veículo individual

**Como** gestor de frota,
**quero** selecionar um veículo da lista para usá-lo como contexto de todas as operações subsequentes
**para** garantir que manutenções, despesas e relatórios se referem ao veículo correto.

#### Jornada simulada — fluxo feliz

```
1. Carlos abre Dialog (Ranger ✓ ativo, Corolla, Ducato)
2. Clica em "DEF-5678 · Fiat Ducato"
3. Dialog fecha, chip: "🚗 DEF-5678 · Ducato"
4. /maintenance: lista filtrada automaticamente para DEF-5678
5. /expenses/new: campo de veículo pré-selecionado como Ducato
```

#### Jornada simulada — veículo excluído (dado stale)

```
1. Carlos abre Dialog; lista mostra "Ranger" (dado carregado há 2h)
2. Nesse intervalo, o Ranger foi soft-deleted por outro admin
3. Carlos seleciona o Ranger (dado stale) → Dialog fecha
4. Chip mostra "Ranger", /dashboard?vehicleId=ranger-uuid retorna 404 ou array vazio
5. Dashboard exibe 0 dados sem nenhuma mensagem explicativa
6. Carlos fica confuso — reinicia o app — processo de debug frustrante
```

#### Jornada simulada — placas duplicadas

```
1. Carlos tem dois registros da placa "ABC-1234" (Corolla 2019 e Corolla 2023)
2. Abre o Dialog: vê "ABC-1234" duas vezes sem distinção visual
3. Clica no errado
4. Despesas do mes são atribuídas ao veículo errado
```

#### Jornada simulada — modo grupo ativo → selecionar veículo

```
1. Carlos tem "Frota SP (12)" ativo
2. Abre Dialog e seleciona "ABC-1234 · Ranger"
3. Modo muda de `group` para `single`
4. Chip atualiza, `activeGroupId` é limpo
5. Dashboard filtra apenas pelo Ranger, não mais pela frota
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G-CTX-43 | Selecionar o veículo já ativo → ação idempotente? | `setActiveVehicle` deve checar `activeVehicleId === newId` antes de atualizar o store | 🟡 Performance |
| G-CTX-44 | Veículo excluído permanece na lista do switcher por quanto tempo? | Sem polling: lista fica stale desde o mount do Dialog — pode mostrar veículo excluído por horas | 🟠 Dado stale |
| G-CTX-45 | API retorna 404 ao usar `vehicleId` stale → frontend limpa contexto automaticamente? | Interceptor de erro por vehicleId necessário: 404 → `clearAllSelection()` + toast explicativo | 🟠 |
| G-CTX-46 | Veículo com `make`/`model` ausentes → chip exibe "ABC-1234 · "? | Fallback: sem bullet e sem texto se make/model são vazios | 🟡 |
| G-CTX-47 | Duas placas "ABC-1234" na lista → como distinguir? | Exibir `make + model + year` como subtexto, ou data de criação "cadastrado em dd/mm/aa" | 🟠 Confusão crítica |
| G-CTX-48 | Seleção de veículo filtra /maintenance e /expenses sem recarregar a página? | Depende de as páginas lerem `activeVehicleId` do store via Zustand subscription | 🟠 |
| G-CTX-49 | Seleção de veículo pré-preenche o campo de veículo em /expenses/new e /maintenance/new? | `ExpenseForm` e `MaintenanceForm` devem ler `activeVehicleId` do store como valor inicial | 🟠 |
| G-CTX-50 | Seleção de veículo com grupo ativo limpa o grupo antes de definir o modo `single`? | `setActiveVehicle` deve chamar `clearAllSelection()` internamente antes de atualizar o estado | 🟡 |
| G-CTX-51 | Dialog fecha com animação suave ao selecionar (não corte abrupto de 0ms)? | `onClose()` imediato + animação de saída de 150ms via CSS — Dialog deve ter `data-state="closed"` transition | 🟡 |
| G-CTX-52 | Veículo de outro usuário com `vehicle_id` manipulado no localStorage → API retorna dados? | RLS bloqueia — nunca confiar em contexto do cliente sem validação do servidor ✅ | ✅ RLS protege |

---

### 19.6 [FE] Seleção de grupo de veículos

**Como** gestora de frota com veículos agrupados por região ou função,
**quero** selecionar um grupo para ver dados agregados de todos os seus membros
**para** ter uma visão consolidada sem precisar alternar veículo por veículo.

#### Jornada simulada — fluxo feliz

```
1. Ana clica no chip, Dialog abre
2. Seção "Grupos": "Frota SP (12)" e "Manutenção Programada (3)"
3. Ana clica em "Frota SP"
4. Chip: "⬡ Frota SP · 12"
5. Dashboard: KPIs agregados de 12 veículos
```

#### Jornada simulada — criar despesa com grupo ativo

```
1. Ana tem "Frota SP (12)" ativo
2. Acessa /expenses/new
3. Campo de veículo: sem pré-seleção (grupo ≠ veículo único)
4. Ana precisa escolher explicitamente qual veículo da frota teve a despesa
```

#### Jornada simulada — grupo esvaziado

```
1. Ana seleciona "Manutenção Programada (3)"
2. No dia seguinte, os 3 veículos têm manutenção concluída e são removidos do grupo
3. Grupo agora tem 0 membros, mas chip mostra "Manutenção Programada · 3" (stale)
4. Dashboard agrega dados de 0 veículos → exibe 0 em todos os KPIs
5. Ana acha que o sistema travou ou perdeu os dados
```

#### Jornada simulada — grupo com membros excluídos

```
1. "Frota SP" tinha 12 membros; 2 veículos foram soft-deleted
2. `memberIds` no store ainda lista 12 IDs (incluindo os 2 excluídos)
3. API `/dashboard/stats?groupId=X` filtra corretamente (deleted_at IS NULL) → retorna dados de 10
4. Chip mostra "Frota SP · 12" (count stale) mas dashboard mostra dados de 10
5. Discrepância confunde a gestora
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G-CTX-53 | Grupo com 0 membros pode ser selecionado? | Permitir — exibir aviso inline: "Nenhum veículo neste grupo" em vez de bloquear | 🟠 |
| G-CTX-54 | `memberCount` no chip sincroniza após exclusão de membros? | Count é stale — atualizar ao reabrir o Dialog, não em tempo real | 🟡 Aceitável |
| G-CTX-55 | Criar despesa com grupo ativo → qual veículo aparece no campo? | Nenhum — campo sem pré-seleção, usuário escolhe explicitamente; exibir hint: "Grupo ativo — selecione o veículo específico" | 🟠 Confusão esperada |
| G-CTX-56 | Export CSV com grupo ativo → exporta dados de todos os membros? | `exportExpensesCsv` atual aceita `vehicleId` único — adicionar suporte a `groupId` no backend (fase 2) | 🟠 Feature incompleta |
| G-CTX-57 | Nome de grupo muito longo → overflow no chip e na lista? | Chip: `max-w-[120px] truncate` + tooltip ao hover; lista: `truncate` com max-w | 🟡 |
| G-CTX-58 | Selecionar veículo individual com grupo ativo → modo muda de `group` para `single`? | `setActiveVehicle` chama `clearAllSelection()` antes → `activeGroupId` é limpo | 🟡 |
| G-CTX-59 | `vehicle_group_members` retorna membros com `vehicles.deleted_at IS NOT NULL` → count inflado? | Join com `WHERE vehicles.deleted_at IS NULL` necessário na query de grupos | 🔴 Dado incorreto |
| G-CTX-60 | Grupo recém-criado aparece no Dialog sem recarregar o app? | SWR `mutate()` deve ser chamado após criar grupo para invalidar o cache do switcher | 🟡 |
| G-CTX-61 | RLS em `vehicle_groups` isola grupos entre usuários diferentes? | `vehicle_groups.user_id = auth.uid()` na policy de SELECT — verificar | 🟡 |

---

### 19.7 [FE] Limpeza e reset do contexto ativo

**Como** gestor de frota,
**quero** limpar o veículo ou grupo ativo para retornar à visão completa da frota
**para** não ter dados filtrados quando preciso de uma perspectiva global.

#### Jornada simulada — fluxo feliz

```
1. Carlos tem "DEF-5678 · Ducato" ativo
2. Clica no X no chip
3. Chip: "+ Selecionar veículo" (modo none, dashed)
4. Dashboard: KPIs de toda a frota (vehicleId=all)
5. /expenses/new: campo de veículo sem pré-seleção
```

#### Jornada simulada — X difícil de acertar no mobile

```
1. Carlos no celular tenta clicar no X do chip
2. Área de toque de 12×12px — dedo erra e abre o Dialog
3. Carlos fecha o Dialog, tenta de novo
4. Na terceira tentativa consegue limpar
```

#### Jornada simulada — hold para logout com seleção ativa

```
1. Carlos tem "Frota SP (12)" ativo
2. Segura o botão de Logout por 1s
3. `clearAllSelection()` é chamado (já implementado no sidebar)
4. Formulário de logout é submetido
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G-CTX-62 | Botão X tem área de toque mínima de 44×44px no mobile? | Ícone X de 12px — envolver em `<button className="p-4 -m-4">` para ampliar área sem afetar visual | 🔴 Acessibilidade crítica |
| G-CTX-63 | Limpar contexto exige confirmação? | Não — ação reversível (re-selecionar é imediato). Sem modal de confirmação | ✅ Decisão de produto |
| G-CTX-64 | Atalho de teclado para limpar (ex: Alt+Backspace)? | Não previsto no MVP — feature de power user para backlog | 🟢 |
| G-CTX-65 | `clearAllSelection` no sidebar (hold logout 1s) e X no chip são a mesma função? | Ambos chamam `useDashboardStore().clearAllSelection()` → comportamento consistente | ✅ |
| G-CTX-66 | Dashboard reage à limpeza sem recarregar a página? | Zustand subscription dispara re-render de `DashboardVehicleSelect` → verificar | 🟡 |
| G-CTX-67 | X no chip é visível apenas quando `mode !== 'none'`? | Em modo `none` não há o que limpar — X deve estar condicional (`mode !== 'none' && <button X />`) | ✅ Lógica condicional |
| G-CTX-68 | Limpar contexto com grupo ativo limpa também `multiSelectedIds`? | `clearAllSelection` do store deve zerar todos os campos: `activeVehicleId`, `activeGroupId`, `multiSelectedIds`, `attributeFilter` | 🟡 Verificar implementação |

---

### 19.8 [FE] Persistência do contexto entre navegações e sessões

**Como** gestor de frota,
**quero** que o veículo selecionado permaneça ativo ao navegar entre páginas e ao retornar ao app
**para** não precisar re-selecionar o contexto a cada uso.

#### Jornada simulada — navegação in-app

```
1. Carlos seleciona "ABC-1234 · Ranger" em /dashboard
2. Navega: /vehicles → /maintenance → /expenses → /dashboard
3. Chip: "ABC-1234 · Ranger" em todas as páginas ✅ (Zustand in-memory)
```

#### Jornada simulada — reload

```
1. Carlos tem "ABC-1234 · Ranger" ativo
2. Pressiona F5 (reload)
3. Sem persist: contexto perdido → chip volta a "none" → Carlos precisa re-selecionar
4. Com persist (sessionStorage): contexto restaurado ✅
```

#### Jornada simulada — múltiplas abas (localStorage)

```
1. Aba A: Carlos seleciona "Ranger" (localStorage escrito)
2. Aba B (mesma sessão): Carlos seleciona "Ducato" (localStorage sobrescrito)
3. Aba A: qualquer ação que lê o storage → vê "Ducato" sem ter agido
4. Carlos pensa que o sistema trocou o veículo sozinho
```

#### Jornada simulada — veículo persistido excluído

```
1. Carlos selecionou "Ranger" ontem; sessionStorage: { activeVehicleId: "ranger-uuid" }
2. Hoje, o Ranger foi excluído
3. Carlos abre o app → store hidrata com "ranger-uuid"
4. Chip mostra "Ranger" mas API retorna 404 em qualquer request com esse ID
5. Dashboard em branco sem mensagem → experiência quebrada
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G-CTX-69 | Contexto sobrevive ao reload (F5)? | Zustand sem `persist`: não. Com `zustand/persist` + `sessionStorage`: sim | 🟠 Decisão pendente |
| G-CTX-70 | `sessionStorage` (per-tab) vs `localStorage` (cross-tab)? | sessionStorage: sem conflito entre abas mas perde ao fechar a aba. localStorage: persiste mas tem conflito multi-tab | 🟡 Trade-off consciente |
| G-CTX-71 | Duas abas com contextos diferentes conflitando (via localStorage)? | Última escrita ganha → contexto muda em aba A sem ação do usuário | 🟠 Com localStorage |
| G-CTX-72 | Veículo persistido excluído entre sessões → store com ID inválido ao montar? | Validar `activeVehicleId` na lista de veículos ao montar — limpar e exibir toast se inválido | 🟠 |
| G-CTX-73 | Persistência cross-device (banco vs cliente)? | `profiles.preferences.lastVehicleId` no Supabase garante cross-device; atualizar via PATCH com debounce 2s | 🟡 Fase 2 |
| G-CTX-74 | Contexto está na URL como querystring? | Não — contexto é pessoal e não deve ser compartilhado via URL | ✅ Decisão correta |

---

### 19.9 [BE] API de listagem de veículos para o switcher

**Como** desenvolvedor,
**quero** que a API forneça os veículos do usuário com dados mínimos e de forma eficiente
**para** popular o Dialog/Sheet rapidamente sem payload desnecessário.

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G-CTX-75 | `limit(20)` hardcoded no VehicleSwitcherContent — gestor com 60+ veículos não vê a frota completa sem buscar | Aumentar para `limit(100)`. Frotas > 100: busca server-side com debounce 300ms (fase 2) | 🔴 Funcionalidade quebrada |
| G-CTX-76 | Endpoint retorna campos desnecessários para o switcher (`photo_url`, `odometer_km`, `created_at`, etc.) | Adicionar projeção `?select=id,plate,make,model` para reduzir payload | 🟡 Performance |
| G-CTX-77 | Sem cache → cada abertura do Dialog gera nova request | SWR/React Query com `staleTime: 60000` (60s) e `cacheTime: 300000` (5min) | 🟠 |
| G-CTX-78 | Abrir/fechar Dialog 10× rapidamente dispara 10 requests paralelas? | Cache + deduplication do SWR previne requests duplicadas ✅ | ✅ Com SWR |
| G-CTX-79 | Ordenação `created_at DESC` (atual) não é intuitiva para o usuário | Ordenar por `plate ASC` como padrão — veículo "mais recente" não é o mais relevante | 🟡 UX |
| G-CTX-80 | RLS garante que usuário só vê seus veículos? | `vehicles.user_id = auth.uid()` na policy ✅ — aplicado via Supabase client autenticado | ✅ |
| G-CTX-81 | Veículo recém-criado aparece na lista sem recarregar o Dialog? | `mutate()` do SWR deve ser chamado após criar veículo para invalidar o cache do switcher | 🟡 |

---

### 19.10 [BE] API de listagem de grupos para o switcher

**Como** desenvolvedor,
**quero** que a API forneça grupos com contagem de membros **ativos** (excluindo veículos soft-deleted)
**para** que o count exibido no chip e na lista seja preciso.

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G-CTX-82 | `vehicle_group_members` inclui membros com `vehicles.deleted_at IS NOT NULL` → count inflado? | Query precisa de `INNER JOIN vehicles ON vehicles.id = vehicle_group_members.vehicle_id AND vehicles.deleted_at IS NULL` | 🔴 Dado incorreto exibido ao usuário |
| G-CTX-83 | `memberIds` array retornado no payload do switcher quando grupo tem 200 membros = payload grande | Para o switcher, retornar apenas `memberCount` — buscar `memberIds` apenas ao selecionar o grupo | 🟡 Performance |
| G-CTX-84 | Grupos ordenados por `created_at` → grupos mais usados não ficam no topo | Adicionar `last_used_at` ou ordenar por `name ASC` como fallback | 🟡 |
| G-CTX-85 | RLS em `vehicle_groups` isola grupos entre usuários? | `vehicle_groups.user_id = auth.uid()` na policy de SELECT — verificar | 🟡 |
| G-CTX-86 | Grupo recém-criado não aparece no Dialog até próximo refresh | `mutate()` do SWR após criação/deleção de grupo | 🟡 |

---

### 19.11 [BE] Validação de acesso e consistência do contexto

**Como** desenvolvedor,
**quero** que o backend valide o `vehicleId`/`groupId` recebido antes de processar operações
**para** evitar dados inconsistentes quando o contexto do cliente estiver desatualizado ou manipulado.

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G-CTX-87 | `GET /dashboard/stats?vehicleId=X` com X soft-deleted → retorna 404 ou dados zerados silenciosamente? | Retornar `{ error: 'VEHICLE_NOT_FOUND', status: 404 }` para que o frontend limpe o contexto | 🟠 |
| G-CTX-88 | `GET /expenses?vehicleId=X` com X de outro usuário → RLS retorna array vazio silencioso? | Array vazio silencioso dificulta debug; 403 explícito com código `VEHICLE_ACCESS_DENIED` é preferível | 🟡 Segurança/Debug |
| G-CTX-89 | Frontend exibe toast ao receber 404 por veículo de contexto inválido? | "O veículo selecionado não está mais disponível. Contexto limpo automaticamente." | 🟠 UX |
| G-CTX-90 | Grupo com membros excluídos → API avisa sobre discrepância de count? | Response pode incluir `{ memberCount: 10, staleCount: 12 }` para o frontend atualizar o chip | 🟡 |
| G-CTX-91 | Atacante manipula `activeVehicleId` no localStorage para ID de outro usuário | RLS no Supabase bloqueia a query — nunca confiar em vehicleId do cliente sem validação ✅ | ✅ RLS protege |
| G-CTX-92 | Sessão JWT expirada com Dialog aberto → submit de seleção retorna 401? | Dialog fecha, toast "Sessão encerrada — faça login novamente", redirect `/login?session=expired` | 🟠 |
| G-CTX-93 | Request com `groupId` inexistente (grupo deletado) → 404 ou dados zerados? | Mesma regra de G-CTX-87 — 404 explícito com código `GROUP_NOT_FOUND` | 🟠 |

---

### 19.12 [BE] Persistência da preferência de veículo padrão

**Como** gestor de frota,
**quero** que o sistema lembre o último veículo selecionado entre sessões e dispositivos
**para** não precisar re-selecionar ao abrir o app em qualquer dispositivo.

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G-CTX-94 | Salvar `lastVehicleId` em `profiles.preferences` → PATCH fire-and-forget a cada seleção? | Debounce de 2s antes de persistir — evita PATCH a cada clique rápido em troca frequente | 🟡 |
| G-CTX-95 | Carregar `lastVehicleId` ao abrir o app → 2 round-trips (fetch profile + validate vehicle)? | Usar Server Component no `(dashboard)/layout.tsx` para carregar profile + validar vehicle em uma requisição server-side | 🟠 Performance de inicialização |
| G-CTX-96 | Device A com Ranger selecionado, device B seleciona Ducato → ao abrir em A, qual aparece? | DB é fonte de verdade → device A carrega Ducato (último salvo) — comportamento esperado | ✅ |
| G-CTX-97 | `lastVehicleId` aponta para veículo excluído → ao carregar, validação retorna null? | Limpar `profiles.preferences.lastVehicleId` no hook de soft-delete do repositório de veículos | 🟠 |
| G-CTX-98 | Rate limit em PATCH /profile com seleções rápidas (10 em 30s)? | Debounce 2s no frontend como primeira linha; ThrottlerGuard no backend como segunda | 🟡 |
| G-CTX-99 | Usuário deslogado e logado novamente em outra conta no mesmo dispositivo → contexto do usuário anterior vaza? | `clearAllSelection()` deve ser chamado no hook de logout + limpar `sessionStorage`/`localStorage` da store | 🔴 Segurança crítica |

---

## 20. Persona P-004 — Rafael Lima (Motorista de App / Autônomo Individual)

> **Épico:** Adaptar o Nave para o perfil do motorista de aplicativo (Uber, 99, iFood) que usa o veículo como ferramenta de trabalho, abastece com alta frequência, precisa de controle de margem de lucro e tem 1–3 veículos no máximo.
>
> **Persona:** Rafael (P-004 · 29 anos · smartphone Android · sedã financiado · dois turnos diários · tech literacy médio-alto)
>
> **Contexto operacional:** Rafael roda 200–350 km/dia, abastece 4–6×/semana, e seu principal indicador de sucesso é a margem de lucro real (receita das corridas − custos totais do veículo). Ele não é gestor de frota no sentido clássico — é um autônomo que precisa saber se está lucrando ou perdendo dinheiro.

---

### 20.1 Registro ultra-rápido de abastecimento (2 toques)

**Como** Rafael, motorista de app que abastece 4–6× por semana,
**quero** registrar um abastecimento em no máximo 2 toques a partir da tela inicial
**para** não perder tempo entre corridas e manter meu controle de consumo atualizado.

#### Jornada simulada — fluxo ideal

```
1. Rafael para no posto entre corridas (pausa de 5 min)
2. Abre o Nave → tela inicial mostra atalho "⛽ Abastecer" em destaque
3. Toque 1: toca em "⛽ Abastecer"
4. Form abre com: veículo pré-selecionado (único ou último usado), data = agora, categoria = combustível
5. Rafael preenche: valor (R$ 250,00) + litros (42L) + odômetro (92.340 km)
6. Toque 2: toca em "Salvar"
7. Toast: "Abastecimento salvo · 8,2 km/L" (consumo calculado automaticamente)
8. Rafael volta para o app de corrida em < 15 segundos
```

#### Jornada simulada — template de abastecimento

```
1. Rafael já configurou um template "Posto Shell — Gasolina"
2. Toque 1: toca no atalho "⛽ Abastecer" → form abre com template aplicado
3. Campos pré-preenchidos: categoria=combustível, fuel_type=gasolina, supplier="Posto Shell"
4. Rafael preenche apenas: valor + litros + odômetro
5. Toque 2: "Salvar" → 10 segundos total
```

#### Jornada simulada — entre corridas com pressa

```
1. Rafael recebe notificação de corrida enquanto registra abastecimento
2. Precisa sair AGORA — abandona o formulário
3. Sem auto-draft: dados perdidos → Rafael esquece de registrar depois
4. Com auto-draft (R-PREF-02): rascunho persiste em sessionStorage
5. Na próxima pausa, Rafael abre /expenses/new → "Rascunho encontrado. [Restaurar]"
6. Completa o registro sem redigitar
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G-P4-01 | Atalho "Abastecer" na tela inicial (dashboard) | `quick-actions.tsx` existe mas sem atalho específico de combustível com template pré-aplicado | 🔴 Fricção alta — Rafael não vai navegar /expenses/new toda vez |
| G-P4-02 | Veículo pré-selecionado automaticamente quando Rafael tem apenas 1 veículo | `ExpenseForm` lê `activeVehicleId` do store, mas se nenhum veículo está "em foco", o select fica vazio mesmo com 1 único veículo | 🟠 Campo desnecessário para autônomo com 1 veículo |
| G-P4-03 | Feedback de consumo médio no toast de confirmação | Após salvar abastecimento com `full_tank=true`, exibir km/L calculado no toast, não apenas "Despesa criada" | 🟠 Valor percebido baixo sem feedback imediato |
| G-P4-04 | Auto-draft ativado por padrão para Rafael? | `auto_draft_enabled` default `false` (R-PREF-02) — Rafael provavelmente não sabe que existe essa opção | 🟡 Onboarding deveria sugerir ativação |
| G-P4-05 | Widget/shortcut na tela de bloqueio do Android (PWA) | PWA não suporta widgets nativos — alternativa: notificação persistente "Registrar abastecimento" após detectar parada em posto (geofencing fase 3) | 🟢 Fase futura |
| G-P4-06 | Tempo total > 30 segundos (regra dos 30s da skill) | Se Rafael precisa: abrir app → navegar → selecionar veículo → preencher 4 campos → salvar, facilmente ultrapassa 30s | 🔴 Quebra regra dos 30 segundos |

#### Scorecard

| Critério | Nota (1–5) | Justificativa |
|----------|-----------|---------------|
| Relevância operacional | 5 | Abastecimento é a despesa mais frequente de Rafael (4–6×/semana). Gatilho claro: acabou de abastecer |
| Facilidade de uso | 2 | Fluxo atual exige 4+ toques e > 30s. Sem atalho dedicado, sem veículo auto-selecionado |
| Hierarquia de informação | 3 | Formulário correto, mas feedback de consumo médio ausente no retorno |
| Valor percebido | 4 | Se rápido, Rafael usa todo dia. Se lento, volta para a planilha do WhatsApp |
| Alinhamento ao design system | 4 | Mobile-first OK. Inputs com font-size correto. FAB de ação rápida presente |

**Score final**: 70/100 — Implementar com ajustes na UX (atalho dedicado + auto-seleção de veículo único + feedback de consumo)

---

### 20.2 Visão de rentabilidade — custo vs. receita

**Como** Rafael, que depende do carro para renda,
**quero** informar minha receita semanal/mensal e ver automaticamente minha margem de lucro
**para** saber se estou ganhando dinheiro ou rodando no prejuízo depois de combustível, manutenção e custos fixos.

#### Jornada simulada — registro de receita

```
1. Rafael acessa /reports → aba "Rentabilidade"
2. Período: última semana (seg–dom)
3. Informa receita bruta: R$ 3.200,00 (Uber) + R$ 800,00 (99) = R$ 4.000,00
4. Sistema calcula custos do período:
   - Combustível: R$ 1.050,00 (4 abastecimentos)
   - Manutenção: R$ 0,00
   - Multas: R$ 0,00
   - Custos fixos (seguro rateado): R$ 87,50/semana
   - Total custos: R$ 1.137,50
5. Dashboard exibe:
   - Receita bruta: R$ 4.000,00
   - Custos totais: R$ 1.137,50
   - Lucro líquido: R$ 2.862,50
   - Margem: 71,6%
   - Custo/km: R$ 0,76
   - Receita/km: R$ 2,67
```

#### Jornada simulada — comparativo semanal

```
1. Rafael vê dashboard de rentabilidade no domingo à noite
2. Cards: "Esta semana: R$ 2.862 lucro · Semana passada: R$ 2.340 lucro"
3. Delta: +22,3% ↑ (verde)
4. Insight: "Seu maior custo foi combustível (92% dos gastos)"
5. Rafael percebe que trocou de posto e o combustível ficou mais caro
```

#### Jornada simulada — margem negativa

```
1. Rafael teve uma semana ruim: pouca demanda + manutenção de R$ 1.800
2. Receita: R$ 2.200 · Custos: R$ 3.050
3. Dashboard: "Lucro: -R$ 850,00 · Margem: -38,6%" (vermelho)
4. Insight: "Manutenção representou 59% dos custos esta semana"
5. Rafael decide compensar rodando mais no próximo período
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G-P4-07 | Tela `/reports` não existe | Apenas dashboard com KPIs básicos. Sem seção de rentabilidade (G28.1, G28.6) | 🔴 Feature ausente — a mais importante para P-004 |
| G-P4-08 | Campo de receita não existe no modelo de dados | Sem tabela `revenue` ou campo de receita em nenhuma entidade | 🔴 Modelo de dados insuficiente |
| G-P4-09 | Receita por app (Uber vs. 99 vs. iFood) | Rafael pode querer ver qual app é mais lucrativo — campo `revenue_source` necessário | 🟡 Fase 2 — MVP: receita total manual |
| G-P4-10 | Custos fixos rateados automaticamente (seguro, IPVA, parcela do carro) | `vehicle_recurring_costs` existe mas não é rateado por período no relatório de rentabilidade | 🟠 Custo fixo não entra no cálculo sem rateio |
| G-P4-11 | Custo/km e Receita/km dependem de odômetro | Se Rafael não preenche odômetro em toda despesa, métricas por km ficam imprecisas | 🟠 Dependência de R-FUEL-02 |
| G-P4-12 | Integração direta com Uber/99 para puxar receita automaticamente | APIs de plataformas de corrida são limitadas ou inexistentes para drivers individuais | 🟢 Fora de escopo — input manual |

#### Scorecard

| Critério | Nota (1–5) | Justificativa |
|----------|-----------|---------------|
| Relevância operacional | 5 | "Estou lucrando?" é a pergunta #1 do Rafael. Frequência: semanal no mínimo |
| Facilidade de uso | 1 | Feature não existe. Sem campo de receita, sem relatório, sem cálculo |
| Hierarquia de informação | 1 | Dados de custo existem mas não há cruzamento com receita em nenhuma tela |
| Valor percebido | 5 | Feature decisiva — diferencia o Nave de planilhas para motoristas de app |
| Alinhamento ao design system | N/A | Nada implementado para avaliar |

**Score final**: 36/100 — Questionar priorização: feature de altíssimo valor para P-004 mas completamente ausente. Requer nova spec + modelo de dados.

#### Próximo passo recomendado
Criar spec `SPEC-YYYYMMDD-XXX-profitability-report.md` com: tabela `revenue_entries(id, user_id, vehicle_id, amount, source, period_start, period_end, created_at)`, endpoint `GET /reports/profitability`, e componente de dashboard com cards de lucro/margem/custo-por-km.

---

### 20.3 Alertas de manutenção com sugestão de melhor dia para parar

**Como** Rafael, que não pode ficar sem o carro,
**quero** que o sistema me avise da manutenção necessária e sugira o melhor dia para parar
**para** programar a parada sem perder receita nos dias mais lucrativos.

#### Jornada simulada — alerta inteligente

```
1. Rafael agendou "Troca de óleo" para quando atingir 95.000 km
2. Odômetro atual: 94.200 km (registrado no último abastecimento)
3. Consumo médio: 280 km/dia → estima atingir 95.000 em ~3 dias
4. Nave envia push: "🔧 Troca de óleo em ~3 dias (95.000 km)"
5. Sugestão: "Terça e quarta são seus dias com menos corridas. Agendar para terça?"
6. Rafael toca em "Agendar terça" → manutenção criada com status pending
```

#### Jornada simulada — alerta simples (sem dados de rotina)

```
1. Rafael agendou "Revisão dos 100.000 km" para 15/07
2. 7 dias antes (08/07): email + push → "Revisão em 7 dias (15/07)"
3. Rafael toca → abre /maintenance/[id]
4. Vê custo estimado: R$ 600 · Oficina sugerida: última usada
5. Muda status para "Em andamento" no dia
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G-P4-13 | Alerta por quilometragem (`odometer_alert_km`) não existe | Campo ausente em `maintenances` — dependência de G11.4 e G25.1 | 🔴 Feature bloqueada |
| G-P4-14 | Estimativa de "dias até atingir km" baseada em consumo médio diário | Requer cálculo: `(target_km - current_km) / avg_km_per_day` — dados disponíveis via histórico de odômetro | 🟠 Cálculo simples mas dados ainda esparsos |
| G-P4-15 | "Melhor dia para parar" baseado em padrão de uso | Requer análise de receita por dia da semana — dados inexistentes (ver G-P4-08) | 🟡 Fase 3 — depende de dados de receita |
| G-P4-16 | Push notifications não implementadas (G24.1) | Alertas apenas por email no MVP — Rafael não lê email durante corridas | 🔴 Canal inadequado para o perfil |
| G-P4-17 | Alerta de manutenção com ação direta (agendar em 1 toque) | Push com deep link `/maintenance/[id]` funciona, mas não permite agendar diretamente da notificação | 🟠 Fricção na ação |

#### Scorecard

| Critério | Nota (1–5) | Justificativa |
|----------|-----------|---------------|
| Relevância operacional | 5 | Rafael adia manutenção por medo de perder receita — alertas inteligentes resolvem isso |
| Facilidade de uso | 2 | Sem push, sem alerta por km, sem sugestão de dia |
| Hierarquia de informação | 3 | Alerta por email existe (quando implementado), mas canal errado para Rafael |
| Valor percebido | 5 | "O app me disse que terça é melhor para parar" = valor tangível diferenciado |
| Alinhamento ao design system | 3 | Calm UI para alertas OK. Push notifications pendentes |

**Score final**: 68/100 — Implementar com ajustes: priorizar push notifications e campo `odometer_alert_km` antes de tentar "melhor dia"

---

### 20.4 Controle de multas com prazo de pagamento e desconto

**Como** Rafael, que pega muitas multas de radar e rodízio,
**quero** rastrear minhas multas com prazo de pagamento e valor com desconto
**para** não perder o prazo do desconto de 40% e controlar o impacto no meu lucro.

#### Jornada simulada — registrar multa

```
1. Rafael consulta o DETRAN e descobre uma multa de R$ 195,23
2. Abre /fines/new no Nave
3. Preenche:
   - Veículo: Corolla (pré-selecionado)
   - Valor: R$ 195,23
   - Data da infração: 10/06
   - Prazo para pagamento com desconto: 10/07 (40% off = R$ 117,14)
   - Prazo final: 10/08
   - Descrição: "Radar — Marginal Tietê"
4. Salva → multa aparece na lista com badge "30 dias para desconto"
```

#### Jornada simulada — lembrete de prazo

```
1. Faltam 5 dias para o prazo de desconto de uma multa de R$ 293,47
2. Push: "⚠️ Multa R$ 293,47 — desconto de 40% expira em 5 dias (R$ 176,08)"
3. Rafael toca → abre /fines/[id]
4. Vê: "Pagar até 15/07: R$ 176,08 · Após 15/07: R$ 293,47"
5. Rafael paga e marca como "Paga" → despesa vinculada com R$ 176,08 (R-LED-02)
```

#### Jornada simulada — múltiplas multas acumuladas

```
1. Rafael acessa /fines → lista com 4 multas pendentes
2. Resumo no topo: "4 multas pendentes · Total: R$ 780,00 · Com desconto: R$ 468,00"
3. Ordena por "Prazo mais próximo"
4. Primeira multa vence em 3 dias → badge vermelho
5. Rafael paga as duas mais urgentes e marca como pagas
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G-P4-18 | FinesModule implementado com ledger (EPIC-FIN-001) | ✅ Módulo existe com `amount_with_discount`, `due_date`, vinculação automática a expenses | ✅ Backend OK |
| G-P4-19 | Alerta de prazo de desconto expirando | Não há alerta automático baseado em `due_date` — depende de push (G24.1) ou email | 🟠 Rafael vai perder o desconto sem lembrete |
| G-P4-20 | KPI de multas no dashboard do Rafael | Dashboard não mostra total de multas pendentes nem próximos vencimentos | 🟠 Informação crítica escondida em /fines |
| G-P4-21 | Consulta automática de multas via placa (DETRAN API) | APIs de consulta de multas variam por estado e são instáveis — fora de escopo MVP | 🟢 Fase futura |
| G-P4-22 | Impacto da multa no relatório de rentabilidade | Multa paga gera expense vinculada (R-LED-02), que entra no custo total — se relatório de rentabilidade existir | 🟠 Dependência de G-P4-07 |

#### Scorecard

| Critério | Nota (1–5) | Justificativa |
|----------|-----------|---------------|
| Relevância operacional | 4 | Multas são frequentes para Rafael, mas não diárias. Gatilho: consulta ao DETRAN |
| Facilidade de uso | 4 | FinesModule bem implementado. Form simples com campos relevantes |
| Hierarquia de informação | 2 | Multas pendentes não estão visíveis no dashboard — Rafael precisa navegar até /fines |
| Valor percebido | 5 | "O app me lembrou do desconto de R$ 117" = economia real e tangível |
| Alinhamento ao design system | 4 | Badge de prazo, Calm UI para urgência com `bg-danger/10` |

**Score final**: 72/100 — Implementar com ajustes: KPI de multas pendentes no dashboard + alerta de prazo de desconto via push/email

---

### 20.5 Separação de custos por veículo (1–3 veículos)

**Como** Rafael, que planeja ter um segundo carro com motorista parceiro,
**quero** ver custos separados por veículo de forma simples
**para** saber qual carro dá mais lucro e se vale a pena manter os dois.

#### Jornada simulada — dois veículos

```
1. Rafael tem: Corolla 2020 (próprio) + Onix 2022 (parceiro)
2. Abre /dashboard → vê KPIs consolidados de ambos
3. Toca no chip de contexto → seleciona "Corolla"
4. Dashboard filtra: custos só do Corolla
5. Troca para "Onix" → vê custos do Onix
6. Compara mentalmente: "Corolla custou R$ 1.200 este mês, Onix R$ 980"
```

#### Jornada simulada — comparativo direto

```
1. Rafael acessa /reports → aba "Por Veículo" (SPEC-20260609-002)
2. Vê tabela comparativa:
   | Veículo       | Combustível | Manutenção | Multas | Total    |
   |---------------|-------------|------------|--------|----------|
   | Corolla 2020  | R$ 1.050    | R$ 150     | R$ 0   | R$ 1.200 |
   | Onix 2022     | R$ 830      | R$ 0       | R$ 150 | R$ 980   |
3. Insight: "Corolla gasta 26% mais em combustível — possível problema mecânico?"
4. Rafael agenda revisão do Corolla
```

#### Jornada simulada — segundo veículo com motorista parceiro

```
1. Rafael cadastra o Onix no Nave
2. Não quer que o parceiro tenha acesso à conta dele
3. Registra todas as despesas do Onix ele mesmo (controle centralizado)
4. No fim do mês, exporta CSV do Onix para acertar com o parceiro
5. Export: "nave-onix-2022-2026-06.csv" com todas as despesas do mês
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G-P4-23 | Chip de contexto funciona para trocar entre 2 veículos | ✅ `VehicleContextChip` + `VehicleSwitcherContent` implementados. Rafael troca com 2 toques | ✅ Funciona |
| G-P4-24 | Tab "Por Veículo" em /expenses | SPEC-20260609-002 existe. Se implementada, resolve a comparação | 🟡 Verificar status de implementação |
| G-P4-25 | Export CSV filtrado por veículo | ✅ `exportExpensesCsv` aceita `vehicleId` — Rafael pode exportar por carro | ✅ Funciona |
| G-P4-26 | Compartilhamento com motorista parceiro (G26.1) | Feature ausente — Rafael precisa registrar tudo sozinho | 🟡 Aceitável para 1–3 veículos. Fase 2 para escalar |
| G-P4-27 | Comparativo de rentabilidade por veículo (Corolla lucra mais que Onix?) | Depende de G-P4-07 (relatório de rentabilidade) + receita por veículo | 🟠 Feature de alto valor ausente |
| G-P4-28 | Grupos de veículos fazem sentido para Rafael com 2 carros? | Não — groups são para frotas de 10+. Rafael usa o modo `single` alternando entre 2 veículos | 🟢 UX adequada sem groups |

#### Scorecard

| Critério | Nota (1–5) | Justificativa |
|----------|-----------|---------------|
| Relevância operacional | 4 | Relevante quando Rafael tiver 2+ veículos. Com 1 veículo, transparente |
| Facilidade de uso | 4 | Chip de contexto resolve troca rápida. Export por veículo funciona |
| Hierarquia de informação | 3 | Custo por veículo acessível via chip, mas comparativo direto pode não estar implementado |
| Valor percebido | 4 | "Qual carro dá mais lucro?" é pergunta recorrente |
| Alinhamento ao design system | 4 | Chip compact, mobile-first, troca em 2 toques |

**Score final**: 76/100 — Implementar com ajustes: garantir tab "Por Veículo" e relatório comparativo de rentabilidade

---

### 20.6 Onboarding específico para motorista de app

**Como** Rafael, motorista de Uber/99 que acabou de baixar o Nave,
**quero** um fluxo inicial que entenda meu perfil e configure o app para meu uso
**para** começar a registrar despesas desde o primeiro dia sem precisar aprender o sistema todo.

#### Jornada simulada — primeiro acesso

```
1. Rafael cria conta → seleciona tipo: "Motorista de Aplicativo" (novo profile_type)
2. Onboarding detecta perfil e adapta:
   - Step 1: "Cadastre seu carro de trabalho" → /vehicles/new (campos mínimos)
   - Step 2: "Registre seu primeiro abastecimento" → atalho com template fuel
   - Step 3: "Quer rastrear sua receita?" → input de receita semanal
3. Dashboard configurado para P-004:
   - KPI #1: Custo do dia (combustível hoje)
   - KPI #2: Próxima manutenção
   - KPI #3: Multas pendentes
   - KPI #4: Lucro da semana (se receita informada)
4. Atalho "⛽ Abastecer" fixo no dashboard
5. Auto-draft ativado por padrão
```

#### Jornada simulada — sem onboarding (fluxo atual)

```
1. Rafael cria conta → cai no dashboard vazio
2. Vê KPIs zerados: "Total de veículos: 0 · Despesas do mês: R$ 0"
3. Pensa: "E agora? Cadê o botão de abastecer?"
4. Navega pelo menu: Veículos → Despesas → Manutenção → Multas
5. Desiste e volta para a planilha do WhatsApp
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G-P4-29 | `profile_type = 'app_driver'` não existe | Enum atual provavelmente tem apenas `autonomous` e `fleet_manager` | 🟠 Sem segmentação para motorista de app |
| G-P4-30 | Onboarding adaptado por profile_type | Onboarding genérico (G23.4) — sem bifurcação para motorista de app | 🟠 First-time UX genérica |
| G-P4-31 | Dashboard configurável por perfil | Dashboard fixo para todos os perfis — sem personalização de KPIs | 🟡 Fase 2 |
| G-P4-32 | Atalho permanente "Abastecer" no dashboard para P-004 | Quick actions existem mas sem priorização por perfil | 🟠 Feature principal do perfil escondida |
| G-P4-33 | Auto-draft ativado por padrão para motoristas de app | Default global é `false` (R-PREF-02) — Rafael não vai procurar nas configurações | 🟡 Ajuste de default por profile_type |

#### Scorecard

| Critério | Nota (1–5) | Justificativa |
|----------|-----------|---------------|
| Relevância operacional | 5 | Primeiro uso define se Rafael continua ou abandona — decisivo para retenção |
| Facilidade de uso | 2 | Onboarding genérico, sem adaptação para motorista de app, sem atalhos imediatos |
| Hierarquia de informação | 2 | Dashboard padrão prioriza KPIs de gestor de frota, não de motorista individual |
| Valor percebido | 5 | Onboarding bem feito = "esse app me entende" → retenção |
| Alinhamento ao design system | 3 | Wizard de onboarding no padrão Calm UI, mas inexistente |

**Score final**: 62/100 — Implementar com ajustes: criar `profile_type = 'app_driver'`, adaptar onboarding e dashboard

---

### 20.7 Histórico de consumo e custo por km

**Como** Rafael, que precisa otimizar cada real gasto no carro,
**quero** ver meu histórico de consumo médio (km/L) e custo por km ao longo do tempo
**para** identificar quando o carro está gastando demais e agir preventivamente.

#### Jornada simulada — evolução do consumo

```
1. Rafael acessa /vehicles/[id]/history → aba "Consumo"
2. Gráfico de linha: km/L nos últimos 3 meses
   - Abril: 9,2 km/L · Maio: 8,8 km/L · Junho: 7,1 km/L
3. Alerta visual: "⚠️ Consumo caiu 23% no último mês"
4. Rafael suspeita de problema mecânico → agenda revisão
```

#### Jornada simulada — custo por km

```
1. Rafael vê no dashboard: "Custo/km: R$ 0,82"
2. Mês passado era R$ 0,71 → aumento de 15%
3. Detalhe: combustível (R$ 0,58/km) + manutenção (R$ 0,12/km) + fixos (R$ 0,12/km)
4. Rafael percebe que o combustível subiu de preço e troca de posto
```

#### Gaps e caminhos não cobertos

| # | Cenário | Status | Risco |
|---|---------|--------|-------|
| G-P4-34 | km/L calculado por R-FUEL-02 | ✅ `computed.km_per_liter` retornado quando `full_tank=true` + odômetro anterior existe | ✅ Cálculo disponível |
| G-P4-35 | Gráfico de evolução do consumo ao longo do tempo | Não existe tela de histórico de consumo — dados calculados mas não visualizados | 🟠 Dado existe, visualização não |
| G-P4-36 | Custo/km no dashboard como KPI | Dashboard não calcula custo/km — requer: `total_cost / total_km_rodado` no período | 🟠 KPI de alto valor ausente |
| G-P4-37 | Alerta de queda de consumo | Sem detecção automática de anomalia — requer baseline + threshold configurável | 🟡 Fase 3 — IA/insights |
| G-P4-38 | Rafael não preenche `full_tank=true` em todos os abastecimentos | Sem tank-full, km/L não é calculado (R-FUEL-02) — gaps no histórico | 🟠 Educação do usuário necessária |

#### Scorecard

| Critério | Nota (1–5) | Justificativa |
|----------|-----------|---------------|
| Relevância operacional | 4 | Consulta semanal/mensal — não diária, mas de alto impacto em decisões |
| Facilidade de uso | 2 | Dados brutos calculados mas sem visualização acessível |
| Hierarquia de informação | 2 | km/L está escondido em `computed` da response — não visível no dashboard |
| Valor percebido | 4 | "Meu carro tá gastando 23% mais" = ação preventiva concreta |
| Alinhamento ao design system | 3 | Gráfico simples de linha adequado. Skeleton para loading OK |

**Score final**: 58/100 — Revisar o fluxo antes de implementar: criar KPI de custo/km no dashboard + gráfico de evolução em /vehicles/[id]/history

---

### Avaliação Consolidada — P-004 (Rafael) vs. Sistema Atual

**Contexto de uso**: Rafael opera em ciclos diários de alta frequência (turnos de corrida) com pausas curtas. Suas interações com o Nave são majoritariamente mobile, rápidas (< 30s), e focadas em registro de abastecimento e consulta de rentabilidade.

**Fluxo atual (sem adaptações para P-004)**: Rafael usa o Nave como um gestor de frota convencional — navega menus, preenche formulários completos, consulta KPIs genéricos. Não tem visão de rentabilidade, atalhos de abastecimento rápido, ou alertas por km.

### Pontos fortes do sistema atual para P-004

- FinesModule completo com ledger — multas vinculam automaticamente a despesas (R-LED-02)
- Enriquecimento de combustível (`fuel_type`, `full_tank`, `supplier`, km/L) — dados certos para motorista de app
- Chip de contexto — troca entre 2 veículos em 2 toques
- Templates de despesa — potencial para atalho "Abastecer" se bem configurado
- Export CSV por veículo — acerto com parceiro
- Auto-draft disponível (R-PREF-02) — protege contra perda de formulário

### Fricções identificadas

1. **Ausência total de relatório de rentabilidade** — a feature mais importante para P-004 não existe
2. **Registro de abastecimento lento** — sem atalho dedicado, sem auto-seleção de veículo único, > 30 segundos
3. **Dashboard genérico** — KPIs pensados para gestor de frota, não para motorista individual
4. **Push notifications ausentes** — canal de alerta inadequado (email) para quem vive no celular
5. **Alerta por quilometragem ausente** — manutenção preventiva por km é mais relevante que por data para quem roda 200+ km/dia
6. **Sem profile_type específico** — sistema não distingue motorista de app de outros perfis

### Sugestões de UX priorizadas

1. **P0 — Atalho "⛽ Abastecer"**: FAB ou card proeminente no dashboard com template fuel pré-aplicado + veículo auto-selecionado (quando único)
2. **P0 — KPI custo/km no dashboard**: cálculo simples, alto valor percebido, dados já disponíveis
3. **P1 — Spec de rentabilidade**: tabela `revenue_entries`, endpoint `/reports/profitability`, dashboard com lucro/margem
4. **P1 — Campo `odometer_alert_km`**: habilitar alerta por km em `maintenances`
5. **P2 — `profile_type = 'app_driver'`**: onboarding adaptado, dashboard configurável, auto-draft habilitado
6. **P2 — KPI de multas pendentes no dashboard**: total + próximo vencimento de desconto
7. **P3 — Push notifications (PWA)**: canal adequado para Rafael

### Scorecard consolidado

| Story | Feature | Score | Recomendação |
|-------|---------|-------|-------------|
| 20.1 | Registro rápido de abastecimento | 70/100 | Implementar com ajustes |
| 20.2 | Rentabilidade — custo vs. receita | 36/100 | Questionar priorização (feature nova) |
| 20.3 | Alertas de manutenção inteligentes | 68/100 | Implementar com ajustes |
| 20.4 | Controle de multas com prazo | 72/100 | Implementar com ajustes |
| 20.5 | Separação de custos por veículo | 76/100 | Implementar com ajustes |
| 20.6 | Onboarding para motorista de app | 62/100 | Implementar com ajustes |
| 20.7 | Histórico de consumo e custo/km | 58/100 | Revisar fluxo antes de implementar |

**Score médio P-004**: 63/100 — O sistema atende parcialmente o motorista de app mas precisa de adaptações significativas nas áreas de rentabilidade, velocidade de registro e personalização por perfil.

---

## Resumo de Gaps por Prioridade

### ✅ Implementados — completo (backend + frontend)

| Gap | Feature | Descrição |
|-----|---------|-----------|
| G1.8 | Auth | Profile criado em `auth.service.ts` na mesma transação com rollback |
| G2.1/G2.2 | Auth | Login retorna `INVALID_CREDENTIALS` genérico sem revelar email/senha |
| G2.3 | Auth | `useAuthWatcher` redireciona para `/login?session=expired` ao SIGNED_OUT |
| G3.1 | Auth | Reset de senha sempre retorna 200 (anti-enumeration) |
| G4.2 | Veículos | `license-plate.vo.ts` aceita Mercosul e formato antigo |
| G5.4 | Veículos | Todos os repositories filtram `deleted_at IS NULL` |
| G7.1 | Veículos | Delete em cascata: veículo + expenses + maintenances soft-deleted em paralelo |
| G7.2 | Veículos | `DeleteVehicleDialog` com confirmação por nome do modelo; `deleteVehicleAction` com cascade |
| G8.1 | Despesas | Frontend: `ExpenseForm` mostra estado vazio + CTA quando sem veículos |
| G8.8 | Despesas | Input pt-BR: `parseBRL`/`formatBRL` com vírgula em `expense-form.tsx` |
| G9.1 | Despesas | Backend: `limit`/`offset` em `GET /expenses`. Frontend: paginação 50/página com prev/next em `/expenses` |
| G10.1 | Despesas | Troca de veículo em despesa valida ownership do novo vehicle |
| G11.7 | Manutenções | Frontend: `MaintenanceForm` mostra estado vazio + CTA quando sem veículos |
| G12.1 | Manutenções | Máquina de estados com transições validadas e HTTP 400 para inválidas |
| G12.2 | Manutenções | `completion_date` obrigatória ao marcar `completed` (validação em `maintenance.service.ts`) |
| G13.1 | Manutenções | Backend: `?status=` em `GET /maintenance`. Frontend: `MaintenanceStatusFilter` com tabs de status via URL |
| G13.3 | Manutenções | Campo `is_overdue` calculado; maintenance page exibe "Atrasada" em vermelho |
| G14.1 | Dashboard | Dashboard exibe onboarding completo quando sem veículos |
| G14.2 | Dashboard | `currentMonthStart()` = 1º dia do mês corrente |
| G14.4 | Dashboard | Backend: `getStats` com `vehicleId` param. Frontend: `DashboardVehicleSelect` filtra KPIs por veículo via URL |
| G15.3 | Export CSV | Backend retorna `truncated: boolean`; frontend exibe banner de aviso |
| G15.5 | Export CSV | Param `include=['expenses','maintenances']` suportado |
| G15.6 | Export CSV | Nome correto via `Content-Disposition` header |
| G17.2 | LGPD | Anonimização: nome → 'Anônimo (Deletado)', dados transacionais mantidos |
| G17.3 | LGPD | Audit log de deleção usa SHA-256(email) como user_id |
| G17.6 | LGPD | `verifyPassword` + `DELETE /users/me` exige `password` no body |
| G18.3 | Admin | `listUsers` retorna apenas 5 campos seguros, sem dados financeiros |
| G18.6 | Admin | Auto-deleção bloqueada com `ForbiddenException` |
| G19.1 | Admin | `listAuditLogs` paginado via `.range()` |
| G19.3 | Admin | Log de deleção usa SHA-256(email) — rastreável sem PII |
| G20.1 | Alertas | Edge Function `send-maintenance-alerts` implementada com Resend |

### 🔴 Crítico — Impede uso real da feature

| Gap | Feature | Descrição |
|-----|---------|-----------|
| G20.1 | Alertas email | Edge Function `send-maintenance-alerts` não implementada |
| G21.1 | PWA Offline | POST offline provavelmente não funciona — sem Background Sync |
| G21.2 | PWA Offline | Fila de sync offline não implementada |
| G21.3 | PWA Offline | Sem estratégia de resolução de conflito de dados |
| G22.1 | IA | `ia-consultation.tsx` provavelmente stub sem LLM |
| G22.2 | IA | Nenhum LLM integrado encontrado |
| G22.3 | IA | Sem data pipeline para contextualizar a IA |
| G2.3 | Auth | Refresh token: `use-auth.ts` vazio = deslogamento silencioso |
| G-P4-01 | P-004 Abastecimento | Sem atalho "Abastecer" dedicado no dashboard — fricção alta para 4–6× por semana |
| G-P4-06 | P-004 Abastecimento | Tempo total de registro > 30 segundos — quebra regra UX |
| G-P4-07 | P-004 Rentabilidade | Tela `/reports` e relatório de rentabilidade completamente ausentes |
| G-P4-08 | P-004 Rentabilidade | Tabela/campo de receita inexistente no modelo de dados |
| G-P4-13 | P-004 Manutenção | Campo `odometer_alert_km` ausente — alerta por km bloqueado |
| G-P4-16 | P-004 Alertas | Push notifications ausentes — email inadequado para motorista de app |

### 🟠 Alto — Degrada experiência ou cria inconsistências

| Gap | Feature | Descrição |
|-----|---------|-----------|
| G1.2 | Auth | Sem fluxo de confirmação de email definido |
| G8.7 | Despesas | Categorias customizadas sem UI de gerenciamento |
| G8.8 | Despesas | Input de valor não aceita vírgula (pt-BR) |
| G11.4 | Manutenções | Sem campo de quilometragem para alertas por KM |
| G12.4 | Manutenções | Manutenção concluída não gera despesa automaticamente |
| G16.1 | Perfil | Sem opção de alterar email |
| G16.2 | Perfil | Sem opção de alterar senha no perfil |
| G16.3 | Perfil | Categorias customizadas sem UI |
| G20.4 | Alertas | Múltiplas manutenções no mesmo dia = múltiplos emails |
| G20.7 | Alertas | Reagendamento não reseta `alert_sent` |
| G21.6 | PWA | Limitações PWA no iOS não documentadas |
| G-P4-02 | P-004 Abastecimento | Veículo não auto-selecionado quando Rafael tem apenas 1 carro |
| G-P4-03 | P-004 Abastecimento | Sem feedback de km/L no toast de confirmação |
| G-P4-10 | P-004 Rentabilidade | Custos fixos não rateados no relatório — seguro/IPVA não entram no período |
| G-P4-19 | P-004 Multas | Sem alerta automático de prazo de desconto expirando |
| G-P4-20 | P-004 Dashboard | KPI de multas pendentes ausente do dashboard |
| G-P4-27 | P-004 Multi-veículo | Comparativo de rentabilidade por veículo ausente |
| G-P4-29 | P-004 Perfil | `profile_type = 'app_driver'` não existe — sem segmentação |
| G-P4-32 | P-004 Dashboard | Atalho "Abastecer" não priorizado no dashboard por perfil |
| G-P4-35 | P-004 Consumo | Gráfico de evolução de consumo (km/L) ao longo do tempo ausente |
| G-P4-36 | P-004 Dashboard | KPI custo/km ausente do dashboard |

### 🟡 Médio — Melhoria de UX ou regra de negócio ambígua (ainda sem decisão ou implementação)

| Gap | Feature | Descrição |
|-----|---------|-----------|
| G4.1 | Veículos | Duplicata de placa por usuário: aviso não-bloqueante pendente no frontend |
| G9.1 | Despesas | Paginação com cursor (20 itens/página) pendente |
| G11.3 | Manutenções | Sem categorização estruturada — campo `description` livre no MVP |
| G12.2 | Manutenções | `completion_date` obrigatória ao completar — validação backend pendente |
| G13.1 | Manutenções | Filtro por `status` no endpoint `GET /maintenance` pendente |
| G13.2 | Manutenções | Ordenação por `scheduled_date ASC` como padrão pendente |
| G19.2 | Admin | Filtro por `action` em audit logs pendente |
| G19.4 | Admin | Política de retenção de logs (12 meses) — cron fase 2 |
| G20.5 | Alertas | `preferences.emailAlerts` não implementado ainda |
| G20.8 | Alertas | Antecedência de alerta fixa (7 dias) — configurável na fase 2 |

---

## Próximos Passos Recomendados

### ✅ Implementados — não necessitam mais ação
G1.8, G2.1, G2.2, G2.3, G3.1, G4.2, G5.4, G7.1, G7.2, G8.1, G8.8, G9.1, G10.1, G11.7, G12.1, G12.2, G13.1, G13.3, G14.1, G14.2, G14.4, G15.3, G15.5, G15.6, G17.2, G17.3, G17.6, G18.3, G18.6, G19.1, G19.3, G20.1

### 🔴 P0 — Todos implementados ✅

### 🟠 P1 — Todos implementados ✅

### 🟡 P2 — Pendente (requer acesso ao ambiente de produção)
- **Cron `pg_cron`** — Executar no SQL Editor do Supabase o script em `supabase/migrations/20260521000000_pg_cron_maintenance_alerts.sql` (substituir `{PROJECT_REF}` e `{SERVICE_ROLE_KEY}`)
- **Rota `/ai-chat`** — Componente `FloatingIAButton` existe mas não está em uso. A rota é um placeholder sem implementação (fase 3)

---

## Respostas Decisórias — Resolução de Gaps

> Esta seção consolida as **decisões de produto e técnicas** para os gaps identificados nas seções anteriores. Cada resposta define o comportamento esperado e serve como contrato para implementação e testes.

---

### Auth

| Gap | Decisão | Responsável |
|-----|---------|-------------|
| G1.1 — Email duplicado no registro | Frontend exibe: "Este email já está cadastrado. [Fazer login / Esqueci a senha]" — nunca mensagem genérica | Frontend |
| G1.2 — Confirmação de email | Quando for habilitado, `emailRedirectTo` no Supabase. Quando habilitado, Usuário sem email confirmado loga mas vê banner persistente e não pode exportar dados | Backend + Frontend |
| G1.4 — `profile_type` obrigatório? | Campo obrigatório no `RegisterDto`. Default: `'autonomous'`. Motorista Autônomo é selecionado no form; Gestor de Frota requer seleção explícita | Full-stack |
| G1.5 — Rate limit 429 | Frontend detecta `429` e exibe: "Muitas tentativas. Aguarde X minutos." com countdown derivado do header `Retry-After` | Frontend |
| G1.6 — Senha fraca | Mínimo: 8 caracteres, 1 maiúscula, 1 número. Validação idêntica no Zod do frontend e em `@nave/validators` — nunca apenas no cliente | Full-stack |
| G1.7 — Toggle show/hide de senha | Obrigatório no form de registro e login. Acessibilidade: `aria-label` alternando "Mostrar senha" / "Ocultar senha" | Frontend |
| G1.8 — Profile criado após registro | ✅ Implementado em `auth.service.ts`: cria profile na mesma transação, rollback via delete do auth user em falha | Backend |
| G2.1/G2.2 — Mensagem de erro de login | ✅ Implementado: `INVALID_CREDENTIALS` genérico para senha errada ou conta inexistente — sem user enumeration | Backend |
| G2.1 — Aviso de tentativas restantes | Exibir contador somente quando restarem **≤ 2 tentativas** antes do bloqueio. Para 2 restantes: "E-mail ou senha inválidos. 2 tentativas restantes." Para 1: "E-mail ou senha inválidos. Última tentativa antes do bloqueio temporário." Para ≥ 3: apenas "E-mail ou senha inválidos." — sem expor o contador | Frontend |
| G2.3 — Sessão expirada silenciosa | `use-auth.ts` implementa interceptor: detecta `401`, tenta refresh automático via Supabase SDK, em falha redireciona para `/login?session=expired` com toast explicativo | Frontend |
| G2.4 — "Lembrar de mim" | Sem opção explícita no MVP. Refresh token de 7 dias é o mecanismo implícito. Documentar na tela de login como "sessão ativa por 7 dias" | Produto |
| G2.5 — Login multi-device | Aceitar como comportamento válido no MVP (JWT stateless). Documentar na spec de segurança para revisão futura (ofertar como controle de segurança) | Produto |
| G2.6 — Usuário logado acessa `/login` | Middleware de rota no frontend verifica sessão ativa: se autenticado, redirecionar para `/dashboard` sem renderizar o form | Frontend |
| G2.7 — Rate limit por IP ou usuário | `ThrottlerGuard` no NestJS: por IP (padrão). Login: 10 req/15min. Registro: 5 req/15min. Recovery: 3 req/15min | Backend |
| G3.1 — Email não cadastrado no reset | ✅ Implementado: API sempre retorna HTTP 200 com mensagem genérica — sem user enumeration | Backend |
| G3.2 — Token de reset expirado | Supabase invalida automaticamente (1h). Frontend detecta erro de token inválido no callback `/reset-password` e exibe: "Link expirado. [Solicitar novo link]" com botão direto para `/recover-password` | Frontend |
| G3.3 — Token já usado | Mesmo tratamento de G3.2 — Supabase retorna erro, frontend exibe mensagem amigável | Frontend |
| G3.5 — Reenvio de email de reset | Botão "Reenviar email" em `/recover-password` com cooldown de 60 segundos (countdown visual). Rate limit de 3 req/15min já protege o abuso | Frontend |

---

### Veículos

| Gap | Decisão | Responsável |
|-----|---------|-------------|
| G4.1 — Placa duplicada por usuário | Permitir duplicata (usuário pode ter registros históricos de mesmo veículo). Exibir aviso não-bloqueante: "Esta placa já está cadastrada" | Produto |
| G4.2 — Placa formato antigo (AAA-1234) | ✅ Implementado: `license-plate.vo.ts` aceita Mercosul e antigo, normaliza para uppercase | Backend |
| G4.3 — Upload foto >10MB | Frontend valida antes do upload: tamanho máximo 5MB, mensagem "Arquivo muito grande. Use uma imagem de até 5MB" | Frontend |
| G4.4 — Formato inválido no upload | Aceitar apenas `image/jpeg`, `image/png`, `image/webp`. Rejeitar HEIC, PDF etc. Mensagem: "Formato não suportado. Use JPG, PNG ou WebP" | Frontend |
| G4.5 — Ano inválido | Validação Zod: `year: z.number().int().min(1900).max(new Date().getFullYear() + 1)` | Full-stack |
| G4.6 — Cadastro offline | MVP: toast "Sem conexão — salve quando a internet voltar". Background Sync implementado na fase 2 | Frontend |
| G4.7 — Limite de veículos por plano | MVP (sem planos): sem limite. Quando planos forem implementados (fase 2): Free = 1 veículo, Pro = ilimitado | Produto |
| G4.8 — Marca como campo livre | MVP: campo `make` é texto livre com autocomplete local (lista das 20 marcas mais comuns). Sem lista fechada | Frontend |
| G5.1 — Estado vazio sem despesas/manutenções | Exibir card de onboarding contextual: "Nenhuma despesa ainda. [Registrar primeira despesa →]" | Frontend |
| G5.2 — Acesso a veículo de outro usuário via URL | API retorna 404 (via `findById` com `user_id` filter + RLS). Frontend exibe: "Veículo não encontrado" e redireciona para `/vehicles` | Backend + Frontend |
| G5.4 — Soft-deleted em queries | ✅ Implementado: todos os repositories filtram `deleted_at IS NULL` | Backend |
| G6.2 — Remover foto sem nova | API aceita `PATCH` com `photo_url: null`. Frontend exibe botão "Remover foto" | Backend + Frontend |
| G7.1 — Delete com dependências | ✅ Implementado: soft-delete em cascata via `Promise.all` em `supabase-vehicle.repository.ts` | Backend |
| G7.2 — Confirmação antes de deletar | Modal de confirmação obrigatório: "Excluir veículo e todo o histórico? Esta ação não pode ser desfeita. Digite o nome do veiculo para excluir definitivamente: __________" | Frontend |
| G7.4 — Acesso a veículo soft-deleted via URL | API retorna 404 (filtro `deleted_at IS NULL`). Frontend redireciona para `/vehicles` com toast "Veículo não encontrado ou removido" | Backend + Frontend |

---

### Despesas

| Gap | Decisão | Responsável |
|-----|---------|-------------|
| G8.1 — Sem veículo ao criar despesa | Backend: `vehiclesService.findOne` lança 404 ✅. Frontend: se lista de veículos estiver vazia ao abrir `/expenses/new`, redirecionar para `/vehicles/new` com banner explicativo | Frontend |
| G8.2 — Categoria não selecionada | Campo obrigatório no Zod: `category: z.enum(['combustivel', 'manutencao', 'seguro', 'ipva', 'multa', 'estacionamento', 'lavagem', 'outros'])`. Mensagem: "Selecione uma categoria" | Full-stack |
| G8.3 — Valor negativo ou zero | Validação Zod: `amount: z.number().positive()`. Mensagem: "O valor deve ser maior que zero" | Full-stack |
| G8.4 — Data futura | Aceitar datas futuras (despesa agendada/parcela). Sem restrição de data máxima | Produto |
| G8.6 — Registro offline | MVP: mesmo tratamento de G4.6 — toast "Sem conexão". Background Sync fase 2 | Frontend |
| G8.7 — Categorias customizadas | MVP: lista fechada (Combustível, Manutenção, Seguro, IPVA, Multa, Estacionamento, Lavagem, Outros). UI de categorias customizadas na fase 2 | Produto |
| G8.8 — Vírgula no input de valor | Input `type="text"` com máscara pt-BR (aceita vírgula). Conversão para `float` antes do submit. Nunca `type="number"` em campos monetários em pt-BR | Frontend |
| G9.1 — Lista com 500+ itens | Paginação com cursor: 20 itens/página. Infinite scroll no mobile. `ExpenseFiltersDto` recebe `limit` e `cursor` (offset por data) | Full-stack |
| G9.3 — Sem resultados para filtro | Estado vazio: "Nenhuma despesa com este filtro. [Limpar filtros]" com ação inline | Frontend |
| G9.4 — Ordenação | Padrão: mais recente primeiro (`order by date DESC`). Alternar por valor (`amount DESC`) na UI sem backend adicional — filtrar client-side para MVP | Frontend |
| G10.1 — Trocar veículo em despesa | ✅ Implementado: `expenses.service.update` valida ownership do novo `vehicle_id` | Backend |

---

### Manutenções

| Gap | Decisão | Responsável |
|-----|---------|-------------|
| G11.1 — Data passada aceita? | Aceitar datas passadas (registro retroativo de histórico de manutenção). Sem restrição de data mínima | Produto |
| G11.2 — Alertas de email não implementados | Implementar SPEC-20260521-002 como P0 da próxima sprint. Edge Function `send-maintenance-alerts` via Resend | Backend |
| G11.3 — Sem categorização estruturada | Adicionar campo `maintenance_type: enum` em `maintenances` na fase 2 (Óleo, Freios, Pneu, Revisão, Elétrico, Outros). MVP: campo `description` livre | Produto |
| G11.4 — Alerta por quilometragem | Adicionar campo `odometer_alert_km` em `maintenances`. Depende da implementação do odômetro (seção 15). Fase 2 | Backend |
| G11.7 — Sem veículo ao agendar manutenção | Backend: 404 se veículo inválido ✅. Frontend: mesmo tratamento de G8.1 — redirecionar com banner | Frontend |
| G12.1 — Transições de status inválidas | ✅ Implementado: máquina de estados com `VALID_TRANSITIONS` em `maintenance.service.ts`. HTTP 400 para transição inválida | Backend |
| G12.2 — Data de conclusão obrigatória ao completar? | `completion_date` obrigatória quando `status = 'completed'`. Validação no backend: se status for 'completed' e `completion_date` ausente → HTTP 422 | Backend |
| G12.4 — Manutenção concluída não gera despesa | Ao marcar "Concluído" com `actual_cost > 0`, perguntar: "Deseja criar uma despesa de R$ X automaticamente?" Usuário decide | Frontend |
| G13.1 — Filtrar manutenções por status | `GET /maintenance?status=scheduled` — adicionar query param `status` ao endpoint | Backend |
| G13.2 — Ordenação por data de agendamento | Padrão da API: `ORDER BY scheduled_date ASC` (mais próximas primeiro) | Backend |
| G13.3 — Manutenções vencidas sem destaque | ✅ Backend: campo `is_overdue: boolean` retornado em todas as respostas. Frontend: destacar em vermelho com ícone | Full-stack |
| G13.4 — Cancelada aparece na lista? | Manutenções `cancelled` ficam visíveis por padrão (histórico). Filtro `?status=active` para excluir terminais | Backend |
| G20.7 — Reagendamento não reseta `alert_sent` | PATCH em `scheduled_date` faz `alert_sent = false` automaticamente via hook no repository | Backend |

---

### Alertas de Email (G20.x)

| Gap | Decisão | Responsável |
|-----|---------|-------------|
| G20.1 — Edge Function não implementada | Implementar SPEC-20260521-002 como P0 da próxima sprint. Cron `pg_cron` existente; falta Edge Function `send-maintenance-alerts` + integração Resend | Backend |
| G20.2 — Email disponível na Edge Function | `auth.users.email` acessível via `SERVICE_ROLE_KEY` na Edge Function. Não necessita campo separado | Backend |
| G20.3 — Usuário sem email verificado | MVP: enviar alerta independente de verificação de email. Quando verificação for habilitada (G1.2), checar `email_confirmed_at IS NOT NULL` antes de enviar | Backend |
| G20.4 — Múltiplas manutenções no mesmo dia | Agrupar em um único email resumo com lista de todas as manutenções agendadas para o mesmo usuário no mesmo dia | Backend |
| G20.5 — Desativar alertas de email | Adicionar `preferences.emailAlerts: boolean` (padrão `true`). Edge Function verifica o campo antes de enviar | Backend + Frontend |
| G20.6 — Manutenção cancelada após alerta enviado | Não enviar email de cancelamento no MVP. Fase 2: email "Manutenção do [veículo] foi cancelada" | Produto |
| G20.9 — Template de email não definido | Template React Email (ou HTML inline): logo Nave, nome do veículo, data, tipo de manutenção, botão "Ver detalhes" com deep link | Backend |
| G20.10 — Rate limit / bounce do Resend | Registrar falhas de envio em `audit_logs` com `action = 'EMAIL_FAILED'`. Sem retry automático no MVP — cron tentará novamente no dia seguinte se `alert_sent = false` | Backend |

---

### Dashboard

| Gap | Decisão | Responsável |
|-----|---------|-------------|
| G14.1 — Dashboard vazio (usuário novo) | Exibir wizard de onboarding (seção 13) quando `vehicles.count = 0`. CTA "Adicionar primeiro veículo" como elemento principal | Frontend |
| G14.2 — Definição de "mês atual" | ✅ Implementado: `currentMonthStart()` = 1º dia do mês corrente (`YYYY-MM-01`) | Backend |
| G14.3 — "Pendentes" inclui in_progress? | "Pendentes" = `scheduled` + `in_progress` (tudo que não está concluído/cancelado). `countPending` filtra por esses dois status | Backend |
| G14.4 — Sem filtro por veículo no dashboard | Backend: ✅ `getStats` aceita `vehicleId` param. Frontend: dropdown "Todos os veículos" + lista de veículos; `vehicleId=all` por padrão | Full-stack |
| G14.7 — Botão de IA no dashboard | Remover `floating-ia-button` do MVP (decisão G22.1-G22.3). Readicionar na fase 3 após implementação da IA | Frontend |

---

### Export CSV

| Gap | Decisão | Responsável |
|-----|---------|-------------|
| G15.1 — Período obrigatório | Validação no backend: `period` deve corresponder a `YYYY-MM`. Retorna HTTP 400 se ausente ou inválido ✅ já implementado | Backend |
| G15.2 — Período com zero registros | API retorna CSV com apenas o cabeçalho e `truncated: false`. Frontend não exibe erro — apenas abre arquivo vazio com mensagem "Nenhum registro no período selecionado" | Full-stack |
| G15.3 — Limite 5.000 linhas sem aviso | ✅ Backend: `exportExpensesCsv` retorna `{ csv, truncated: boolean }`. Frontend exibe: "Export limitado a 5.000 registros. Refine o período para dados completos." | Full-stack |
| G15.5 — CSV só com despesas | ✅ Implementado: param `include=['expenses','maintenances']` suportado | Backend |
| G15.6 — Nome do arquivo genérico | ✅ Implementado: `nave-{vehicleName|geral}-{YYYY-MM}.csv` | Backend |
| G15.7 — Export no mobile (PWA) | Usar `<a href="blob:...">` para trigger de download. Testar no Android e iOS Safari. Fallback: copiar URL do CSV para clipboard se download falhar | Frontend |

---

### Perfil

| Gap | Decisão | Responsável |
|-----|---------|-------------|
| G16.1 — Sem opção de alterar email | Redirecionar para fluxo Supabase Auth: email de confirmação enviado para novo endereço. Não alterar diretamente via API | Backend + Frontend |
| G16.2 — Sem opção de alterar senha no perfil | Adicionar seção "Segurança" em `/profile` com botão "Alterar senha" que dispara o fluxo de reset por email | Frontend |
| G16.3 — Categorias customizadas sem UI | Criar tela `/profile/categories` na fase 2. MVP usa lista fechada (ver G8.7) | Produto |
| G16.4 — `preferences` indefinidas | MVP: chaves reconhecidas: `{ emailAlerts: boolean, pushAlerts: boolean, language: 'pt-BR' }`. Chaves desconhecidas ignoradas silenciosamente | Backend |
| G16.5 — Sem avatar de perfil | Fase 2: adicionar `avatar_url` em `profiles` + upload para Supabase Storage. MVP: inicial gerada automaticamente (letra do nome) | Produto |
| G16.6 — Migrar tipo de perfil | Mudança de `profile_type` sem impacto funcional no MVP. Fase 2: ao migrar para Gestor, desbloquear features de frota | Produto |

---

### LGPD

| Gap | Decisão | Responsável |
|-----|---------|-------------|
| G17.1 — Escopo de anonimização | Dados pessoais removidos: `name → 'Anônimo (Deletado)'`, `preferences → {}`, `deleted_at = now()`. Email removido pelo `auth.admin.deleteUser`. Dados mantidos: expenses, maintenances, vehicles (com `user_id` desassociado mas preservado para integridade referencial) | Backend + Legal |
| G17.2 — Escopo do delete de conta | ✅ Implementado em `users.service.deleteAccount` — anonimização + delete do auth user | Backend |
| G17.3 — Audit logs após exclusão | ✅ Implementado: log de `ACCOUNT_DELETED` usa `SHA-256(email)` como user_id — rastreável sem PII | Backend |
| G17.4 — Prazo para exclusão efetiva (LGPD 15 dias) | Exclusão imediata no MVP (dentro do prazo legal de 15 dias). Documentar no Aviso de Privacidade | Produto + Legal |
| G17.5 — Cancelar processo no meio | Estado atômico: ou a exclusão completa (anonimização + auth delete) ou não acontece. Sem estado parcial | Backend |
| G17.6 — Exclusão sem confirmação de senha | `users.service.verifyPassword` implementado ✅. Controller `DELETE /users/me` deve receber `{ password: string }` e chamar `verifyPassword` antes de `deleteAccount` | Backend + Frontend |

---

### Admin

| Gap | Decisão | Responsável |
|-----|---------|-------------|
| G18.1 — Promoção a admin | Procedure SQL `grant_admin_role(user_id)` executada via Supabase Dashboard por super-admin. Documentar no runbook operacional | DevOps |
| G18.2 — Sem painel Admin UI | Fase 2: criar `/admin` com Next.js. MVP: admin usa Swagger UI (`/api/docs`) protegido por `AdminGuard` | Produto |
| G18.3 — Admin bypass RLS sem escopo | ✅ Implementado: `listUsers` retorna apenas `id, email, created_at, last_sign_in_at, profile_type` | Backend |
| G18.4 — Busca de usuários por email | Adicionar query param `?email=` em `GET /admin/users` com filtro `ilike` | Backend |
| G18.5 — Banir temporariamente sem deletar | Fase 2: adicionar `banned_until: timestamp` em `profiles`. Middleware verifica antes de autorizar | Backend (fase 2) |
| G18.6 — Admin deleta própria conta | ✅ Implementado: `admin.service.deleteUser` lança `ForbiddenException` quando `targetUserId === adminUserId` | Backend |
| G19.2 — Filtro por ação em audit logs | Adicionar query param `?action=LOGIN` em `GET /admin/audit-logs` | Backend |
| G19.4 — Retenção de audit logs | Política: manter por 12 meses. Implementar cron/pg_cron que deleta registros com `created_at < now() - interval '12 months'` na fase 2 | Backend (fase 2) |

---

### PWA / Offline

| Gap | Decisão | Responsável |
|-----|---------|-------------|
| G21.1 — POST offline não funciona | MVP: bloquear ações de escrita com toast "Sem conexão — aguarde para salvar". Background Sync implementado na fase 2 como melhoria | Frontend |
| G21.2 — Fila de sync offline | Fase 2: `workbox-background-sync` com fila persistente em IndexedDB. MVP: dados perdidos se app fechado offline | Frontend (fase 2) |
| G21.3 — Conflito de sync | Adiar para fase 2. MVP aplica last-write-wins com timestamp UTC. Documentar como limitação conhecida | Produto |
| G21.4 — Login offline | Se JWT válido em cache (Supabase SDK armazena): permitir uso. Se expirado: exibir "Sem conexão — faça login quando reconectar" | Frontend |
| G21.6 — Limitações PWA no iOS | Documentar na tela de instalação: "Notificações push disponíveis no iOS 16.4 ou superior (Safari)" | Frontend + Docs |
| G21.7 — Atualização do PWA | Implementar `skipWaiting` + `clientsClaim` no service worker. Ao detectar novo SW: toast "Atualização disponível [Recarregar]" | Frontend |

---

### Seletor de Contexto de Veículo (Seção 19)

| Gap | Decisão | Responsável |
|-----|---------|-------------|
| G-CTX-02 — Overflow mobile no subheader | Chip tem `flex-shrink-0` + `max-w-[140px] truncate`. Chips de despesa ficam à direita do separador com `flex-1 overflow-x-auto`. Chip nunca empurra os chips de despesa para fora do viewport | Frontend |
| G-CTX-06 — Touch target insuficiente (h-7 = 28px) | Button do chip ocupa altura total do subheader via `h-full` com padding vertical zero. Visual permanece slim; área de toque = 44px ✅ | Frontend |
| G-CTX-15 — Conflito de Esc entre Dialog e sidebar | Radix Dialog captura Esc e chama `e.stopPropagation()` antes do handler global do sidebar — comportamento padrão do Radix. Se necessário, verificar ordem de event listeners | Frontend |
| G-CTX-23 — Biblioteca para Sheet mobile | Usar `vaul` (já disponível via shadcn/ui) para o Sheet. Sem customização de drag behavior — usar snap points padrão: 70% de altura | Frontend |
| G-CTX-33/34 — Normalização de busca | Normalizar diacríticos (`NFD` + strip combining marks) e hífens na placa antes de comparar. Aplicar em ambos os lados (termo buscado e dados da lista) | Frontend |
| G-CTX-39 — Input de busca stale ao reabrir | `search` state é controlado no VehicleSwitcherContent; ao desmontar o componente (Dialog/Sheet fecha) o estado é descartado naturalmente. Garantir que a key do componente mude ao abrir/fechar para forçar unmount | Frontend |
| G-CTX-44 — Lista stale com veículo excluído | Cache SWR com `staleTime: 60000` (60s). Ao receber 404 de qualquer request com `vehicleId` no contexto: interceptor chama `clearAllSelection()` + toast "Veículo não disponível" | Frontend + Backend |
| G-CTX-47 — Placas duplicadas na lista | Exibir linha com `plate` em negrito + `make model year` como subtexto. Se make/model ausentes, exibir data de cadastro: "cadastrado em dd/mm/aa" | Frontend |
| G-CTX-55 — Export CSV com grupo ativo | `exportExpensesCsv` aceita parâmetro adicional `groupId`. Backend expande para `vehicleIds` dos membros ativos antes de filtrar. Fase 2 | Backend |
| G-CTX-59 — memberCount inflado com membros excluídos | Query de grupos usa `INNER JOIN vehicles ON vehicles.id = vehicle_group_members.vehicle_id AND vehicles.deleted_at IS NULL` para contar apenas membros ativos | Backend |
| G-CTX-69/70 — sessionStorage vs localStorage | Usar `zustand/persist` com `sessionStorage` (por aba, sem conflito cross-tab). Persistência cross-device via `profiles.preferences.lastVehicleId` com debounce de 2s antes do PATCH. Fase 2 | Frontend + Backend |
| G-CTX-75 — limit(20) hardcoded | Aumentar para `limit(100)` na query do switcher. Frotas > 100 veículos: implementar busca server-side com debounce 300ms (fase 2) | Frontend + Backend |
| G-CTX-82 — memberCount inflado (BE) | Ver G-CTX-59 — mesmo fix no join de `vehicle_group_members` | Backend |
| G-CTX-87/88/89 — 404 de veículo excluído no contexto | API retorna `{ error: 'VEHICLE_NOT_FOUND', status: 404 }`. Frontend intercepta via SWR `onError` global: chama `clearAllSelection()` e exibe toast "O veículo selecionado não está mais disponível" | Frontend + Backend |
| G-CTX-97 — lastVehicleId de veículo excluído | Hook no repositório de veículos: ao fazer soft-delete, verificar se `profiles.preferences.lastVehicleId === vehicleId` e limpar o campo via PATCH fire-and-forget | Backend |
| G-CTX-99 — Contexto vaza entre usuários no mesmo device | `clearAllSelection()` + `sessionStorage.clear()` são chamados no handler de logout (após `signOut` bem-sucedido) | Frontend |

---

### IA

| Gap | Decisão | Responsável |
|-----|---------|-------------|
| G22.1 a G22.3 — IA não implementada | Remover `floating-ia-button` do MVP. Criar SPEC-IA dedicada antes de qualquer implementação. Integração prevista para fase 3 com Claude API (`claude-sonnet-4-6`) | Produto |
| G22.4 — LGPD e envio de dados à IA | Antes de enviar qualquer dado à API de IA, exibir consentimento explícito. Dados enviados: somente agregados anônimos, nunca PII | Produto + Legal |
| G22.5 — Alucinações da IA | Footer obrigatório em toda resposta: "Estas informações são indicativas e não constituem assessoria financeira." | Produto |
| G22.6 — Custo de API por usuário | Rate limit específico para chamadas de IA: 10 consultas/dia no plano Free, ilimitado no Pro | Produto |

---

### Novas Features (Seções 13–18)

| Gap | Decisão | Responsável |
|-----|---------|-------------|
| G23.1 — Onboarding ausente | Implementar checklist de onboarding armazenado em `profiles.onboarding_completed: boolean`. Componente `<OnboardingBanner>` exibido enquanto false | Frontend + Backend |
| G23.2 — Usuário ignora onboarding | Dashboard exibe estado vazio com CTA proeminente mesmo sem checklist. Onboarding pode ser ignorado, mas CTAs permanecem até 1 veículo ser cadastrado | Frontend |
| G23.3 — Retomar onboarding pela metade | `onboarding_completed` é `false` até todos os 3 steps (veículo, despesa, manutenção) serem completados. Estado persiste entre sessões via `profiles` | Backend |
| G23.4 — Onboarding por persona | MVP: onboarding único (3 steps). Fase 2: bifurcar baseado em `profile_type` — Gestor vê step extra de "adicionar motorista" | Produto |
| G24.1 — Push não implementada | Fase 2: implementar Web Push API com VAPID. MVP: apenas alertas por email | Backend (fase 2) |
| G24.2 — Permissão solicitada quando | Solicitar após primeiro agendamento de manutenção com data futura. Não solicitar no onboarding (contexto insuficiente) | Frontend (fase 2) |
| G24.3 — iOS compatibility | Documentar: Push nativa disponível a partir do iOS 16.4 (Safari). Fallback para email em versões anteriores | Docs |
| G24.4 — Usuário nega push | Exibir: "Tudo bem! Você ainda receberá alertas por email." Oferecer opção de reativar em `/profile` | Frontend |
| G24.6 — Push subscriptions sem infraestrutura | Criar tabela `push_subscriptions(id, user_id, endpoint, p256dh, auth, created_at)`. VAPID keys em variáveis de ambiente | Backend (fase 2) |
| G25.1 — Campo odômetro ausente | Adicionar `odometer_km: integer` opcional em `expenses` e `maintenances`. Migration versionada sem breaking change | Backend |
| G25.2 — Alerta KM bloqueado | Depende de G25.1. Após implementar odômetro, adicionar `odometer_alert_km` em `maintenances` | Backend (fase 2) |
| G25.3 — KM menor que anterior | Validação soft: exibir aviso "Quilometragem menor que o último registro (X km). Confirma?" sem bloquear — erro de registro deve ser corrigível | Frontend |
| G25.4 — KM opcional | Campo `odometer_km` opcional. Cálculo de consumo exibido apenas quando 2+ registros com KM preenchido existem | Backend |
| G26.1 — Compartilhamento sem modelo de dados | Criar tabela `vehicle_permissions(vehicle_id, user_id, role: 'viewer'\|'editor', invited_by, accepted_at)` com RLS por `user_id`. Fase 2 | Backend |
| G26.2 — Modelo de dados compartilhamento | RLS: `SELECT` via `vehicle_permissions` join. Motorista convidado vê apenas veículos onde tem permissão ativa | Backend (fase 2) |
| G26.3 — Convidado sem conta Nave | Fluxo: email de convite com link de cadastro pré-vinculado. Aceitar convite cria conta e vincula automaticamente | Backend (fase 2) |
| G26.4 — Revogação de acesso | Revogar: `DELETE FROM vehicle_permissions`. Despesas já lançadas permanecem atribuídas ao veículo com `created_by_user_id` | Backend (fase 2) |
| G27.1 — Monetização ausente | Criar tabela `subscriptions(user_id, plan: 'free'\|'pro', status, stripe_subscription_id, current_period_end)`. Webhooks Stripe para mudanças de status | Backend (fase 2) |
| G27.2 — Limites do plano Free | Free: 1 veículo, 100 despesas/mês, sem IA, sem push. Pro: ilimitado, IA (10/dia), push, export avançado | Produto |
| G27.3 — Gateway de pagamento | Stripe com Checkout Session. Webhook `/stripe/webhook` valida assinatura com `STRIPE_WEBHOOK_SECRET` | Backend (fase 2) |
| G27.4 — Sem aviso de limite | Exibir barra de progresso: "87 de 100 despesas usadas este mês" em `/expenses`. Modal de upgrade ao atingir 100% | Frontend (fase 2) |
| G27.5 — Downgrade com excedente | Ao cancelar Pro: veículos excedentes ficam em modo somente-leitura até usuário deletar. Nunca deletar dados automaticamente | Backend + Produto |
| G27.7 — Cobrança falha | Webhook Stripe `invoice.payment_failed`: email de aviso + grace period de 3 dias antes de rebaixar para Free | Backend (fase 2) |
| G28.1 — Relatórios sem tela dedicada | Criar rota `/reports` com componente de filtros avançados. API: `GET /reports/summary?period=&vehicleId=&groupBy=vehicle\|category` | Full-stack (fase 2) |
| G28.2 — Comparação entre veículos | `GET /reports/summary?groupBy=vehicle` retorna breakdown por veículo. Requer endpoint novo | Backend (fase 2) |
| G28.3 — Export em PDF | Fase 2: usar biblioteca como `@react-pdf/renderer` para gerar PDF client-side ou Chromium serverless | Frontend (fase 2) |
| G28.6 — Relatório de rentabilidade | Adicionar seção "Rentabilidade" em `/reports`: campos de receita manual (ex: ganhos Uber/99) vs. custo do veículo. Alto valor para motoristas de app | Produto (fase 2) |
