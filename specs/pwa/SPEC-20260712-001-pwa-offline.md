---
id: SPEC-20260712-001
title: "PWA Offline — Instalação, Cache e Modo Somente-Leitura Sem Conexão"
status: draft
date: 2026-07-12
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-PWA-01, R-PWA-02, R-PWA-03, R-PWA-04, R-PWA-05, R-PWA-06]
security: [S1, S2, S6]
camadas: [frontend, infra]
---

# SPEC-20260712-001: PWA Offline — Instalação, Cache e Modo Somente-Leitura Sem Conexão

**Versão:** 0.1 (rascunho)
**Status:** Draft — em revisão
**Autor:** douglps
**Data:** 2026-07-12
**Reviewers:** —
**ADR de referência:** nenhuma ainda — o Decision Log (§17) desta spec cobre o racional; formalizar como ADR é uma decisão em aberto (ver §16)
**Análise de impacto:** não aplicável — feature greenfield, ainda sem código em `apps/web`

---

## 1. Resumo

Formaliza a primeira fase do PWA do Nave: tornar o app **instalável** (manifest + ícones + prompt de instalação) e capaz de **exibir dados já visitados quando o dispositivo está sem conexão** (Service Worker com cache de shell, assets estáticos e respostas de leitura da API), usando Serwist sobre Next.js 16 App Router. Nesta fase, **escrever dados (registrar despesa, manutenção, multa) permanece bloqueado explicitamente quando offline** — não há fila de sincronização nem resolução de conflito. Essas duas capacidades (fila de sync e push notifications) já estão marcadas como Fase 2 em `docs/PRD/PRD-v1.0.md` e ficam fora do escopo desta spec (§5).

---

## 2. Explicando em termos simples

> Esta seção existe para quem vai revisar ou aprovar esta spec sem ser da parte técnica — um gestor de produto, alguém do time comercial, ou o próprio usuário do Nave. Nenhum termo técnico é usado aqui sem ser explicado primeiro.

**O problema que estamos resolvendo:** o Carlos (motorista autônomo, nossa persona principal) abastece o carro num posto na estrada, sem sinal de internet ou 4G. Hoje, se ele abrir o Nave nesse momento, o app simplesmente não carrega — tela branca ou erro. Ele não consegue nem ver quanto gastou no mês passado.

**O que é "instalar o app" num navegador (PWA):** hoje, para usar o Nave, o Carlos abre o navegador (Chrome, Safari) e digita o endereço do site. Um "PWA" (sigla para *Progressive Web App*) permite que esse mesmo site seja "instalado" no celular como se fosse um aplicativo baixado da loja — ganha um ícone na tela inicial, abre em tela cheia (sem a barra de endereço do navegador), e pode funcionar parcialmente sem internet. A grande vantagem: não precisa passar pela Play Store ou App Store, nem o usuário baixar algo pesado — é o mesmo site, só que "empacotado" para parecer e se comportar como um app nativo.

**O que é um "Service Worker":** é um pequeno programa que o navegador mantém rodando em segundo plano, mesmo depois que o usuário fecha a aba do Nave. Pense nele como um assistente que fica de guarda entre o app e a internet: toda vez que o Nave pede alguma informação (uma tela, uma imagem, os dados do painel), esse assistente decide se busca na internet ou se já tem uma cópia guardada de uma visita anterior. Ele é o que permite o app funcionar (ainda que de forma limitada) mesmo sem sinal.

**O que é "cache" nesse contexto:** é essa cópia guardada. Quando o Carlos abriu o Nave hoje de manhã com internet, o Service Worker guardou uma cópia do painel, da lista de despesas recentes e das imagens/ícones do app. Se depois ele perder o sinal, o app mostra essa cópia guardada em vez de uma tela de erro — com um aviso claro de que os dados podem estar desatualizados.

**Por que só "ver", e não "cadastrar", funciona offline por agora:** guardar uma cópia para *mostrar* é relativamente simples. O difícil é o caminho contrário: se o Carlos *cadastrar* um abastecimento sem internet, esse dado precisa ficar guardado no celular até a internet voltar, ser enviado nesse momento, e o sistema precisa lidar com o caso de esse mesmo dado ter sido alterado por outro lugar nesse meio tempo (ex: o Carlos editou no computador da oficina). Essa complexidade — chamada de "sincronização em segundo plano" — é real, mas decidimos deixá-la para uma fase futura (Fase 2, fora desta spec) e, por enquanto, apenas avisar claramente: "Sem conexão — tente novamente quando a internet voltar". É uma escolha deliberada: entregar a parte simples e útil primeiro (ver dados offline), sem arriscar perder ou duplicar dados do usuário com uma sincronização mal resolvida.

**O que é o "manifest":** é um arquivo pequeno que descreve o app para o sistema operacional — nome, ícone, cor de fundo, se abre em tela cheia. É ele que faz o ícone do Nave aparecer corretamente na tela inicial do celular quando o Carlos instala o app.

**Por que iOS (iPhone) é diferente:** a Apple restringe o que PWAs podem fazer no Safari — por exemplo, não existe um botão automático de "instalar"; o usuário precisa tocar em "Compartilhar" e depois em "Adicionar à Tela de Início" manualmente. Por isso, esta spec prevê uma tela explicando esse passo a passo só para quem acessa via iPhone.

---

## 3. Contexto e Motivação

**Problema:**

O Nave é desenhado como mobile-first (`docs/PRD/PRD-v1.0.md` §5) e boa parte dos momentos de uso — abastecer, pagar uma multa, sair de uma manutenção — acontece em locais com conectividade ruim ou inexistente (postos de combustível, oficinas, estacionamentos subterrâneos). O PRD já promete "PWA básico (manifest + service worker)" no MVP e já marca como **✅ IN**: Manifest.json, Service Worker (cache de assets + Supabase), página offline customizada, e prompt de "Adicionar à Tela Inicial" (`docs/PRD/PRD-v1.0.md` linhas 56–59, 71).

Apesar disso, nenhuma spec formal existe ainda para esta feature. As decisões estão espalhadas e parcialmente contraditórias entre documentos:

- `docs/user-stories.md` §11 (PWA — Offline e Instalação) e §14 (Notificações Push) levantam 11 gaps não resolvidos, marcados 🔴 (crítico), 🟠 (importante) ou 🟡 (menor) — entre eles: "o Service Worker cacheia a API ou só o shell?" (G21.1), "existe fila de sincronização (Background Sync)?" (G21.2), "como se resolve conflito de dados offline vs. online?" (G21.3), "como o usuário é notificado de uma atualização do Service Worker?" (G21.7).
- `.agents/pwa-offline-serwist.md` já esboça uma estratégia técnica (stale-while-revalidate para imagens e `/api/fleet`) mas não cobre mutações, atualização do SW, nem o fluxo de instalação no iOS.
- `docs/user-stories.md` linhas 2135–2144 já registram decisões pontuais de MVP (bloquear escrita offline com toast; JWT em cache válido permite uso offline; last-write-wins como estratégia de conflito de **fase futura**; `skipWaiting`+`clientsClaim` com toast de atualização) — mas essas decisões nunca foram consolidadas numa spec, então não têm ID de regra rastreável nem critério de aceite formal.

**Evidências registradas (docs/user-stories.md):**
- G4.6 e G8.6 — "Carlos cadastra veículo/registra abastecimento offline (PWA)" marcados como 🔴 gap crítico.
- G15.7 — exportação de CSV no mobile via PWA pode ter comportamento diferente entre Android e iOS.
- G21.6 — limitações de PWA no iOS (sem push, Background Sync limitado) não documentadas para o usuário final.

**Por que agora:**

O PRD já compromete PWA básico para o MVP, e o time de UX/PWA (`.agents/nave-ui-pwa/SKILL.md`) já definiu requisitos de interface mobile-first (touch targets, performance Lighthouse) que dependem da mesma infraestrutura. Sem uma spec formal, a implementação começaria sem critérios de aceite, sem regras rastreáveis, e repetiria a ambiguidade já identificada nos gaps do user-stories.md.

---

## 4. Goals (Objetivos)

- [ ] G-01: O Nave pode ser instalado como app na tela inicial em Android/Chrome (via prompt automático) e em iOS/Safari (via instrução manual), com ícone, nome e cores da marca Nave corretos.
- [ ] G-02: Ao abrir o app sem conexão, o usuário vê a última versão em cache do shell (layout, navegação) e dos dados já visitados (dashboard, lista de despesas, veículos) em vez de uma tela de erro — com um banner claro informando que está offline e que os dados podem estar desatualizados.
- [ ] G-03: Qualquer tentativa de criar, editar ou excluir um registro (despesa, manutenção, multa, veículo) enquanto offline é bloqueada no cliente **antes** da tentativa de rede, com mensagem clara — nunca falha silenciosamente nem trava a UI.
- [ ] G-04: Quando uma nova versão do Service Worker é publicada, o usuário em uma aba aberta é avisado por um toast e escolhe quando recarregar — nunca há reload automático sem aviso.
- [ ] G-05: O app atinge nota Lighthouse PWA e Mobile Performance consistentes com as metas já definidas no PRD (Performance > 90, FCP < 1.8s).

**Métricas de sucesso:**

| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| App instalável (Lighthouse PWA installability check) | Não avaliável — sem código | 100% (todos os critérios do checklist Lighthouse PWA) | Na entrega desta fase |
| Abertura do app offline após 1ª visita online | Tela de erro / em branco | Shell + última tela visitada renderizados a partir do cache | Na entrega desta fase |
| Tentativas de escrita offline que resultam em erro genérico ou tela travada | Não medido (sem PWA ainda) | 0% — sempre mensagem explícita pré-envio | Na entrega desta fase |
| Lighthouse Performance (mobile) | Não medido | > 90 (meta já definida no PRD) | Na entrega desta fase |

---

## 5. Non-Goals (Fora do Escopo)

- **NG-01 — Fila de sincronização de escritas offline (Background Sync):** registrar uma despesa/manutenção/multa sem conexão e enviá-la automaticamente quando a internet voltar. Marcado como gap 🔴 G21.2 em `docs/user-stories.md` e como decisão de Fase 2. Motivo: exige fila persistente (IndexedDB), reconciliação de estado da UI e tratamento de falha parcial — complexidade que não deve bloquear a entrega do valor mais simples (ver offline) desta fase.
- **NG-02 — Resolução de conflito de dados:** o que acontece se o mesmo registro for alterado offline em um dispositivo e online em outro. `docs/user-stories.md` linha 2141 já aponta "last-write-wins com timestamp UTC" como direção para quando NG-01 for implementado — mas isso só se torna relevante quando existir fila de escrita, o que não é o caso aqui.
- **NG-03 — Push Notifications:** Web Push API, VAPID keys, tabela `push_subscriptions`. Marcado como **❌ OUT (Fase 2)** explicitamente em `docs/PRD/PRD-v1.0.md` linha 60, com gaps 🔴 G24.1 e G24.6 em `docs/user-stories.md` ainda sem solução de infraestrutura.
- **NG-04 — Cadastro completo de veículo/despesa offline:** depende de NG-01. Nesta fase, o usuário consegue *ver* seus veículos e despesas offline, mas não *criar* novos enquanto sem conexão.
- **NG-05 — Cache de exportação (CSV) offline:** gap G15.7 do user-stories.md permanece aberto; exportação continua exigindo conexão.
- **NG-06 — Suporte a Web Push no iOS abaixo da versão 16.4:** apenas documentação da limitação (ver §13), sem solução alternativa nesta fase (não há push nesta fase de qualquer forma — NG-03).

---

## 6. Usuários e Personas

Reaproveita as personas já definidas em `specs/PRD.md`:

- **P-001 — Carlos, Motorista Autônomo** (35–50 anos): usa o celular como ferramenta de trabalho, frequentemente em locais com sinal instável (postos, estradas, estacionamentos). É o usuário primário desta spec — quem mais se beneficia de conseguir consultar dados offline.
- **P-002 — Ana, Gestora de Frota Pequena** (28–45 anos): usa desktop e mobile; instala o PWA no celular para checagens rápidas fora do escritório, mas majoritariamente trabalha com conexão estável.

**Jornada atual (sem a feature):**

1. Carlos abastece o carro num posto sem sinal de celular.
2. Ele abre o Nave para conferir se já bateu a meta de gasto do mês.
3. O navegador não consegue carregar a página — tela branca, erro de conexão, ou spinner infinito.
4. Carlos desiste e anota o valor num papel para lançar depois — ou simplesmente esquece.

**Jornada futura (com a feature) — consulta offline:**

1. Carlos abriu o Nave pela manhã, com internet, e navegou pelo dashboard e pela lista de despesas.
2. No posto, sem sinal, ele abre o app (instalado na tela inicial ou via navegador).
3. O Service Worker responde com a última versão em cache do shell e dos dados já visitados.
4. Um banner no topo informa: **"Você está offline — dados podem estar desatualizados."**
5. Carlos confere o total gasto no mês (dado do dashboard já em cache) — consulta resolvida sem precisar de sinal.

**Jornada futura — tentativa de escrita offline:**

1. Ainda sem sinal, Carlos toca em "Nova despesa" para registrar o abastecimento.
2. Ele preenche o formulário e toca em "Salvar".
3. Antes de qualquer chamada de rede, o app detecta que está offline e exibe: **"Sem conexão — não é possível salvar agora. Tente novamente quando a internet voltar."**
4. O formulário permanece preenchido na tela (não perde o que foi digitado), para que Carlos tente de novo assim que houver sinal.

**Jornada futura — instalação (Android):**

1. Ana acessa o Nave pelo Chrome no Android pela segunda vez.
2. O navegador dispara automaticamente um prompt "Adicionar Nave à tela inicial".
3. Ana confirma — o ícone do Nave aparece na tela inicial do celular, com as cores da marca.

**Jornada futura — instalação (iOS):**

1. Carlos acessa o Nave pelo Safari no iPhone.
2. Como o Safari não dispara prompt automático, o app exibe um banner discreto: **"Instale o Nave: toque em Compartilhar → Adicionar à Tela de Início."**
3. Carlos segue as instruções manualmente.

**Jornada futura — atualização do app:**

1. O time publica uma nova versão do Nave enquanto Ana está com o app aberto em segundo plano.
2. O Service Worker detecta a nova versão e o app exibe um toast: **"Nova versão disponível — [Recarregar]"**.
3. Ana toca em "Recarregar" quando estiver conveniente — a atualização nunca acontece sozinha e nunca interrompe algo que ela esteja digitando.

---

## 7. Requisitos Funcionais

### 7.1 Manifest e Instalação (R-PWA-04, R-PWA-05)

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O app expõe um Web App Manifest (via `app/manifest.ts`, API nativa do Next.js App Router) com `name`, `short_name`, `start_url`, `display: "standalone"`, `theme_color` e `background_color` alinhados à paleta Nave (`.agents/nave-ui-pwa/SKILL.md`). | Must | `GET /manifest.webmanifest` retorna JSON válido; Lighthouse PWA audit "Web app manifest meets installability requirements" passa. |
| RF-02 | O manifest inclui ícones 192×192 e 512×512 em formato `purpose: "any"` e uma segunda entrada `purpose: "maskable"` para cada tamanho, evitando corte de ícone em launchers Android que aplicam máscara circular/squircle. | Must | Lighthouse PWA audit de ícones passa sem warning de "missing maskable icon". |
| RF-03 | Em navegadores que disparam o evento `beforeinstallprompt` (Chrome/Edge Android e desktop), a UI captura o evento, posterga o prompt nativo e exibe um CTA próprio ("Instalar app") após a 2ª visita do usuário (critério já definido em `docs/PRD/PRD-v1.0.md` linha 71). | Must | Em Chrome Android, após a 2ª visita, o CTA de instalação aparece; ao tocar, o prompt nativo do navegador é exibido. |
| RF-04 | Em navegadores sem suporte a `beforeinstallprompt` (Safari iOS e iPadOS), a UI detecta a plataforma (`navigator.userAgent` ou `navigator.standalone`) e exibe um banner com instrução manual: "Toque em Compartilhar → Adicionar à Tela de Início". | Must | Em Safari iOS, o banner de instrução manual aparece em vez do CTA de RF-03; em qualquer outro navegador, o banner de RF-04 não aparece. |

### 7.2 Cache de Shell e Assets Estáticos (R-PWA-01)

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-05 | O Service Worker (`apps/web/app/sw.ts`, registrado via `@serwist/next`) faz precache do shell da aplicação (HTML de layout, CSS, JS dos bundles principais) no momento da instalação, usando a estratégia `CacheFirst` para assets versionados (hash no nome do arquivo, gerado pelo build do Next.js). | Must | Após a 1ª visita, DevTools → Application → Cache Storage mostra os assets do build precacheados. Segunda visita com rede desligada (`chrome://inspect` offline) carrega o shell sem erro de rede. |
| RF-06 | Requisições de navegação (HTML de rota, ex: `/dashboard`, `/expenses`) usam estratégia `NetworkFirst` com timeout curto (ex: 3s) e fallback para a versão em cache da mesma rota, ou para a página `/offline` (RF-07) quando a rota nunca foi visitada. | Must | Rota já visitada online: ao ficar offline, recarregar a mesma rota exibe a versão em cache. Rota nunca visitada: exibe `/offline`. |
| RF-07 | Existe uma página `apps/web/app/offline/page.tsx` com mensagem amigável ("Você está sem conexão. Algumas informações podem não estar disponíveis.") e um botão "Tentar novamente", exibida como fallback de navegação (RF-06). | Must | Acessar uma rota nunca visitada com o dispositivo offline exibe esta página, não um erro de navegador. |

### 7.3 Cache de Dados de Leitura da API (R-PWA-01, R-PWA-06)

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-08 | Requisições `GET` para rotas de dados da API (ex: `/api/vehicles`, `/api/expenses`, `/api/dashboard/summary`) usam estratégia `StaleWhileRevalidate`: responde imediatamente com o cache (se existir) e atualiza o cache em segundo plano quando há rede. | Must | Com rede normal, dois `GET` seguidos à mesma rota: o 2º é servido do cache imediatamente e depois atualizado (visível no DevTools como duas entradas de timing). |
| RF-09 | Requisições `POST`, `PUT`, `PATCH` e `DELETE` **nunca** são interceptadas pelo Service Worker — passam direto para a rede sem estratégia de cache, sob qualquer condição. | Must | Nenhuma entrada de mutação aparece no Cache Storage. Interceptar a requisição via DevTools confirma `networkOnly`. |
| RF-10 | Toda entrada de cache de dados de API tem um TTL máximo de 7 dias (alinhado à validade do refresh token, ADR-003) — entradas mais antigas são consideradas inválidas e removidas na próxima leitura. | Must | Simular `Date.now()` 8 dias no futuro: leitura do cache expirado força fallback para estado vazio/erro tratado, nunca dado de mais de 7 dias sem aviso. |

### 7.4 Bloqueio Explícito de Escrita Offline (R-PWA-02)

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-11 | Antes de qualquer submissão de formulário (Server Action ou chamada REST) que resulte em `POST`/`PUT`/`PATCH`/`DELETE`, o cliente verifica `navigator.onLine` (ou equivalente via evento `online`/`offline`) e, se offline, bloqueia o envio e exibe a mensagem: **"Sem conexão — não é possível salvar agora. Tente novamente quando a internet voltar."** | Must | Com o dispositivo offline, submeter qualquer formulário transacional exibe a mensagem e não dispara nenhuma requisição de rede. |
| RF-12 | O conteúdo já digitado no formulário nunca é descartado quando a submissão é bloqueada por falta de conexão (RF-11) — o usuário pode tentar novamente sem redigitar. | Must | Após o bloqueio de RF-11, os campos do formulário mantêm os valores digitados. |
| RF-13 | Um indicador visual global e persistente (banner fixo, não um toast que desaparece) informa quando o app está offline, em qualquer tela — não apenas nas telas de formulário. | Must | Desligar a rede em qualquer tela do app exibe o banner "Você está offline" dentro de 2 segundos (detecção via eventos `online`/`offline` do navegador). |

### 7.5 Atualização do Service Worker (R-PWA-03)

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-14 | Quando uma nova versão do Service Worker é detectada (evento `updatefound` / novo SW em estado `waiting`), a UI exibe um toast persistente: **"Nova versão disponível — [Recarregar]"**. O `skipWaiting()` e `clientsClaim()` só são executados após o usuário tocar em "Recarregar" — nunca automaticamente. | Must | Publicar uma nova versão do build e reabrir a aba: o toast aparece. A página não recarrega sozinha; recarrega apenas ao clicar no botão. |
| RF-15 | Se o usuário ignorar o toast de atualização (RF-14) e fechar todas as abas do app, a próxima abertura já carrega a nova versão automaticamente (comportamento padrão do ciclo de vida do Service Worker — sem necessidade de lógica adicional). | Should | Fechar todas as abas após ignorar o toast e reabrir: a nova versão está ativa sem novo aviso. |

### 7.6 Limpeza de Cache no Logout (R-PWA-06, S6)

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-16 | No evento `SIGNED_OUT` do Supabase Auth Client, o app limpa todas as entradas do Cache Storage referentes a dados de usuário (rotas de API, RF-08), preservando apenas o precache de assets estáticos públicos (RF-05, que não contêm dados de usuário). | Must | Fazer logout e inspecionar Cache Storage: nenhuma entrada de `/api/*` remanescente; entradas de assets estáticos (JS/CSS/ícones) permanecem. |
| RF-17 | Login de um segundo usuário no mesmo dispositivo, imediatamente após o logout do primeiro (RF-16), nunca exibe dados em cache do usuário anterior — nem mesmo brevemente antes do primeiro carregamento de rede. | Must | Logout de usuário A, login de usuário B: dashboard de B não mostra nenhum valor residual de A, mesmo com a rede lenta simulada. |

---

## 8. Fluxos Detalhados

### 8.1 Fluxo Principal A — Primeira Visita e Precache

1. Ana acessa o Nave pela primeira vez, com internet.
2. O Service Worker é registrado e instalado; o evento `install` dispara o precache do shell (RF-05).
3. Ana navega pelo dashboard e pela lista de veículos — cada resposta `GET` bem-sucedida é armazenada via `StaleWhileRevalidate` (RF-08).
4. O Service Worker assume controle da página (`activate` → `clientsClaim`, já que é a primeira instalação, sem necessidade de confirmação do usuário).

### 8.2 Fluxo Principal B — Consulta Offline (Carlos no Posto)

1. Carlos abriu o app pela manhã, com internet, e visitou `/dashboard` e `/expenses`.
2. No posto, sem sinal, ele reabre o app (instalado ou via navegador).
3. A requisição de navegação para `/dashboard` cai no timeout de `NetworkFirst` (RF-06) e recorre ao cache da mesma rota.
4. As chamadas `GET /api/dashboard/summary` e `GET /api/expenses` respondem com o cache (RF-08), sem tentar rede (offline detectado).
5. O banner "Você está offline — dados podem estar desatualizados" é exibido (RF-13).
6. Carlos vê o total gasto no mês, calculado a partir dos dados em cache.

### 8.3 Fluxo Alternativo C — Tentativa de Escrita Offline

1. Ainda offline, Carlos abre o formulário de nova despesa (a tela em si carrega do cache, RF-06).
2. Ele preenche os campos e toca em "Salvar".
3. O cliente detecta `navigator.onLine === false` antes de qualquer chamada de rede (RF-11).
4. Mensagem exibida: "Sem conexão — não é possível salvar agora. Tente novamente quando a internet voltar."
5. Os campos preenchidos permanecem no formulário (RF-12).
6. Minutos depois, a conexão retorna; Carlos toca em "Salvar" novamente; a submissão ocorre normalmente.

### 8.4 Fluxo Alternativo D — Atualização de Versão em Aba Aberta

1. Ana está com o Nave aberto em segundo plano no celular.
2. O time publica uma nova versão do frontend.
3. O navegador detecta um novo Service Worker em `waiting` (RF-14).
4. Um toast aparece: "Nova versão disponível — [Recarregar]".
5. Ana termina o que estava fazendo e, minutos depois, toca em "Recarregar".
6. `skipWaiting()` + `clientsClaim()` executam; a página recarrega com a nova versão.

### 8.5 Fluxo Alternativo E — Instalação no iOS

1. Carlos acessa o Nave pelo Safari no iPhone.
2. A UI detecta `navigator.standalone === false` e `userAgent` de Safari/iOS (RF-04).
3. Um banner discreto aparece: "Instale o Nave: toque em Compartilhar → Adicionar à Tela de Início."
4. Carlos segue as instruções manualmente pelo próprio Safari (fora do controle do app).
5. Da próxima vez, ele abre o Nave pelo ícone na tela inicial, em modo standalone.

### 8.6 Fluxo Alternativo F — Troca de Usuário no Mesmo Dispositivo

1. Ana faz login num tablet compartilhado da frota.
2. Ela navega e consulta dados — populando o cache de API (RF-08).
3. Ana faz logout. O evento `SIGNED_OUT` dispara a limpeza do Cache Storage de dados de usuário (RF-16).
4. Outro gestor faz login no mesmo tablet.
5. Nenhum dado de Ana aparece, mesmo antes da primeira resposta de rede completar (RF-17).

---

## 9. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Lighthouse PWA installability checklist | 100% dos critérios (manifest válido, ícones, HTTPS, Service Worker registrado) | Auditar em CI ou manualmente antes do rollout (§15). |
| RNF-02 | Lighthouse Performance (mobile) | > 90 | Meta já definida em `docs/PRD/PRD-v1.0.md`; cache agressivo de assets deve contribuir, não prejudicar (evitar precache excessivo que atrase o `install` do SW). |
| RNF-03 | First Contentful Paint (mobile, 4G simulado) | < 1.8s | Meta já definida no PRD; shell servido do cache deve reduzir esse tempo em visitas subsequentes. |
| RNF-04 | Tempo de detecção de offline/online | < 2s | Via eventos nativos `online`/`offline`, sem polling custoso. |
| RNF-05 | Tamanho total do precache do shell | < 5 MB | Evitar precache de todo o bundle da aplicação — apenas o necessário para renderizar o layout base e a última rota visitada. |
| RNF-06 | Cache de dados de API nunca sobrevive além da validade do refresh token | 7 dias (ADR-003) | R-PWA-06 — reforça que dados offline não ficam "eternos" no dispositivo. |
| RNF-07 | Zero reload automático sem interação do usuário | 100% dos casos de atualização de SW | R-PWA-03 — proteção contra perda de dados de formulário em digitação. |

---

## 10. Design e Interface

### 10.1 Banner de Status Offline

- Fixo no topo da viewport (abaixo do header, para não conflitar com o `VehicleContextChip` do subheader — ver `specs/context/SPEC-20260603-001-context-chip-subheader.md`), cor de fundo `warning` (pastel, conforme paleta em `.agents/nave-ui-pwa/SKILL.md` — nunca vermelho puro).
- Texto: "Você está offline — dados podem estar desatualizados."
- Desaparece automaticamente ao detectar o evento `online` (sem necessidade de ação do usuário).

### 10.2 Toast de Atualização Disponível

- Usa o padrão de toast já existente no design system (Shadcn/ui `Sonner` ou equivalente).
- Texto: "Nova versão disponível." Ação: botão "Recarregar".
- Persistente (não expira automaticamente) até o usuário interagir ou recarregar a página manualmente.

### 10.3 Banner de Instalação Manual (iOS)

- Card discreto, dismissível, exibido uma vez por sessão (não repetir se o usuário já dispensou).
- Texto: "Instale o Nave: toque em [ícone Compartilhar] e depois em 'Adicionar à Tela de Início'."
- Inclui um ícone ilustrativo do gesto (Compartilhar do iOS), usando `lucide-react` conforme convenção de ícones do projeto.

### 10.4 CTA de Instalação (Android/Chrome)

- Botão "Instalar app" exibido após a 2ª visita (RF-03), em local não intrusivo (ex: dentro do menu de configurações ou como banner dismissível).
- Ao tocar, invoca o prompt nativo capturado do evento `beforeinstallprompt`.

### 10.5 Ícones do Manifest

- Gerados a partir da paleta de marca Nave (`.agents/nave-ui-pwa/SKILL.md`): fundo com a cor `Primary (oklch(0.556 0.15 260))`.
- Conjuntos: 192×192 e 512×512, cada um em variante `any` e `maskable` (RF-02).

---

## 11. Modelo de Dados / Arquivos Técnicos

Esta feature não introduz tabelas no banco de dados — é inteiramente client-side (Service Worker + Cache Storage do navegador). A estrutura de arquivos planejada, seguindo o esboço já existente em `.agents/pwa-offline-serwist.md` e a convenção de Next.js 16 App Router:

```
apps/web/
├── app/
│   ├── manifest.ts              → Web App Manifest nativo do Next.js (RF-01, RF-02)
│   ├── sw.ts                    → Entry point do Service Worker (Serwist)
│   └── offline/
│       └── page.tsx             → Página de fallback offline (RF-07)
├── next.config.ts               → withSerwist({ swSrc: 'app/sw.ts', swDest: 'public/sw.js' })
└── lib/
    └── pwa/
        ├── use-online-status.ts     → hook `navigator.onLine` + eventos online/offline (RF-11, RF-13)
        ├── use-install-prompt.ts    → captura de `beforeinstallprompt` (RF-03)
        ├── platform-detection.ts    → detecção de iOS/Safari sem beforeinstallprompt (RF-04)
        └── clear-cache-on-signout.ts → listener do evento SIGNED_OUT do Supabase (RF-16)
```

### 11.1 Estratégias de Cache (exemplo de configuração)

```typescript
// apps/web/app/sw.ts
import { defaultCache } from '@serwist/next/worker';
import { installSerwist } from '@serwist/sw';

installSerwist({
  precacheEntries: self.__SW_MANIFEST, // shell + assets versionados — RF-05
  runtimeCaching: [
    {
      // Navegação de rotas — RF-06
      matcher: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: { cacheName: 'nave-pages', networkTimeoutSeconds: 3 },
    },
    {
      // Leitura de dados da API — RF-08, RF-10
      matcher: ({ url, request }) =>
        request.method === 'GET' && url.pathname.startsWith('/api/'),
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'nave-api-data',
        expiration: { maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 dias — R-PWA-06
      },
    },
    {
      // Mutações — nunca interceptadas — RF-09
      matcher: ({ request }) =>
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method),
      handler: 'NetworkOnly',
    },
  ],
});
```

### 11.2 Limpeza de Cache no Logout (esboço)

```typescript
// apps/web/lib/pwa/clear-cache-on-signout.ts
// @spec SPEC-20260712-001 RF-16 RF-17

supabase.auth.onAuthStateChange(async (event) => {
  if (event === 'SIGNED_OUT') {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key === 'nave-api-data').map((key) => caches.delete(key)),
    );
  }
});
```

---

## 12. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| `@serwist/next` | Obrigatória (já na stack — `docs/architecture/overview.md`) | Sem ela, não há geração/registro automático do Service Worker integrado ao build do Next.js. |
| `app/manifest.ts` (API nativa do Next.js 16) | Obrigatória | Alternativa seria um `manifest.json` estático em `public/` — rejeitada (ver Decision Log D3). |
| Supabase Auth Client — evento `SIGNED_OUT` | Obrigatória para RF-16/RF-17 | Sem o listener, o cache de dados de usuário sobrevive ao logout — risco de segurança em dispositivo compartilhado (S6). |
| `.agents/nave-ui-pwa/SKILL.md` (paleta de cores) | Referência de design | Ícones e banners devem seguir a paleta já definida; divergência exige alinhamento com o agente `design-system`. |
| Next.js 16 App Router | Obrigatória | Estrutura de arquivos (§11) depende das convenções de App Router (`app/manifest.ts`, `app/offline/page.tsx`). |

---

## 13. Edge Cases e Tratamento de Erros

| ID | Cenário | Trigger | Comportamento esperado |
|----|---------|---------|----------------------|
| EC-01 | Primeira visita ao app, sem nenhum cache ainda, e o dispositivo já está offline | Usuário abre o app pela primeira vez sem ter tido conexão antes | Nenhum shell em cache disponível — navegador exibe o erro padrão de "sem conexão"; fora do alcance do Service Worker (não há como cachear o que nunca foi buscado). Documentar como limitação conhecida. |
| EC-02 | Cota de armazenamento do navegador excedida (`QuotaExceededError`) ao tentar cachear uma resposta | Dispositivo com pouco espaço livre | O Service Worker captura a exceção no `runtimeCaching` e ignora a tentativa de cache silenciosamente — a resposta de rede ainda é entregue normalmente ao usuário; apenas o cache falha. Nunca bloquear a resposta por falha de cache. |
| EC-03 | Troca de conta no mesmo dispositivo sem logout explícito (ex: sessão expirada e novo login direto) | Refresh token expira e um usuário diferente faz login | Login sempre passa por `SIGNED_IN`; o app deve tratar `SIGNED_IN` para um `user_id` diferente do último cache conhecido como equivalente a um `SIGNED_OUT` implícito, disparando a limpeza de RF-16 antes de servir qualquer dado em cache. |
| EC-04 | JWT de acesso expirado enquanto o dispositivo está offline | Usuário abre o app offline após 15+ minutos sem uso (ADR-003) | Sem conexão, não há como renovar o token. A leitura de dados em cache (RF-08) não depende de token válido no momento da leitura (já foi buscado com token válido antes) — o app permanece funcional para leitura. Qualquer tentativa de escrita já é bloqueada por RF-11 independentemente do estado do token. |
| EC-05 | Safari iOS descarta o Service Worker/cache após período de inatividade do site (política de ITP da Apple) | Usuário não abre o app por várias semanas | Comportamento fora do controle do app — documentar como limitação conhecida do iOS (ver §6, jornada iOS) e reforçar mensagem de instalação (RF-04) como mitigação parcial (apps instalados têm política de retenção mais generosa que abas de navegador). |
| EC-06 | Nova versão do Service Worker publicada mas o usuário nunca reabre nenhuma aba do app | Deploy silencioso, usuário ausente | Próxima visita já carrega o SW novo diretamente na instalação (sem página antiga para avisar) — comportamento aceitável, sem necessidade de RF-14 nesse caso. |
| EC-07 | `beforeinstallprompt` disparado antes da lógica de RF-03 estar pronta para capturá-lo (ordem de carregamento de scripts) | Navegador dispara o evento muito cedo no ciclo de vida da página | O listener deve ser registrado o mais próximo possível do carregamento inicial do app (idealmente fora de componentes lazy-loaded) para minimizar a janela de perda do evento; se perdido, o CTA de instalação simplesmente não aparece nessa sessão — sem erro visível ao usuário. |

---

## 14. Segurança e Privacidade

- **Autenticação (S1) e Autorização (S2):** o Service Worker não introduz nenhum novo caminho de acesso a dados — ele apenas cacheia respostas que já passaram pelas verificações normais de `SupabaseAuthGuard` e RLS no momento em que foram buscadas com sucesso. Nenhuma resposta de erro (401/403) é cacheada.
- **Limpeza de cache no logout (S6 — nova regra desta spec):** o Cache Storage de dados de API (`nave-api-data`) é removido no evento `SIGNED_OUT` (RF-16), mitigando o risco de um segundo usuário no mesmo dispositivo visualizar dados residuais do usuário anterior — cenário realista para gestores de frota que compartilham tablets.
- **Sem PII adicional:** o Service Worker não coleta nem armazena nenhum dado que o app não já exiba ao usuário autenticado — é uma cópia local do que a API já retornou. Não há novo processamento de dados pessoais além do já descrito em `docs/legal/privacy-policy.md` (que já menciona "Service Worker cache" como categoria existente de dado armazenado).
- **Expiração alinhada à sessão (R-PWA-06):** o TTL de 7 dias do cache de API (RNF-06) é deliberadamente igual à validade do refresh token (ADR-003) — evita a situação de dados "offline para sempre" que nunca são revalidados nem removidos.
- **LGPD (C1):** a exclusão de conta via `DELETE /users/me` já aciona cascata no banco (C1); esta spec não altera esse fluxo. Cache local seguiria a mesma limpeza do logout (RF-16), já que exclusão de conta implica desautenticação.

---

## 15. Plano de Rollout

**Estratégia:** entrega única (sem fases internas nesta spec — a divisão Fase 1/Fase 2 já existe entre esta spec e o trabalho futuro de NG-01/NG-02/NG-03).

| Etapa | Entregável | Pré-requisito | Risco se pulada |
|-------|-----------|--------------|-----------------|
| **Etapa 1** | Manifest + ícones + registro do Service Worker com precache do shell (RF-01–RF-07) | Nenhum | Sem instalabilidade nem cache de shell — nenhuma outra etapa tem valor sem esta base. |
| **Etapa 2** | Cache de leitura da API + banner de status offline (RF-08–RF-13) | Etapa 1 concluída | Usuário instala o app mas não ganha nenhuma capacidade real de uso offline. |
| **Etapa 3** | Fluxo de atualização de versão + limpeza de cache no logout (RF-14–RF-17) | Etapas 1 e 2 concluídas | Risco de segurança em dispositivo compartilhado (sem RF-16/RF-17) e de reload destrutivo sem aviso (sem RF-14). |

**Rollback:**
- Etapas 1–3 são inteiramente client-side (sem migração de banco) — rollback é reverter o deploy do frontend. Risco baixo.
- Atenção: usuários que já instalaram o PWA mantêm o Service Worker da versão anterior em cache até a próxima atualização normal (RF-14) — um rollback de emergência deve considerar isso ao avaliar o tempo de propagação da correção.

**Monitoramento pós-deploy:**
- Taxa de instalação do PWA (evento `appinstalled`) por semana.
- Lighthouse CI (se configurado) — regressão no score de PWA/Performance bloqueia o merge.
- Volume de tentativas de escrita bloqueadas por offline (RF-11) — sinal indireto de quanto os usuários realmente enfrentam conectividade ruim, útil para priorizar NG-01 (fila de sync) no futuro.

---

## 16. Open Questions

| # | Questão | Por que está aberta |
|---|---------|---------------------|
| Q1 | O TTL de 7 dias do cache de API (RNF-06) é o valor certo, ou deveria ser mais curto para dados financeiros sensíveis a mudanças (ex: 24h)? | Nenhum dado de uso real ainda para calibrar; proposto por simetria com o refresh token, não por medição de comportamento do usuário. |
| Q2 | A página `/offline` (RF-07) deve ser uma rota dedicada ou um overlay renderizado sobre a última tela válida? | Impacta a experiência (rota dedicada é mais simples de implementar; overlay preserva mais contexto visual). Recomenda-se decidir durante a implementação da Etapa 1. |
| Q3 | Vale formalizar esta spec como ADR também, dado que introduz um padrão arquitetural novo (client-side caching layer)? | Convenção do projeto (`CLAUDE.md`) exige ADR para mudança de padrão arquitetural *estabelecido* — este é um padrão *novo*, não uma mudança; ADR é recomendável mas não obrigatório pela regra atual. Decisão do responsável pela arquitetura. |
| Q4 | Qual o comportamento exato de EC-03 (troca de usuário sem logout explícito) deve ter prioridade de implementação — é um caso raro ou algo que gestores de frota com tablets compartilhados encontrarão com frequência? | Depende de validação com usuários reais (persona Ana); nenhum dado de uso ainda. |

---

## 17. Decisões Tomadas (Decision Log)

| ID | Decisão | Alternativas consideradas | Racional |
|----|---------|--------------------------|---------|
| D1 | Escopo desta spec restrito a instalação + leitura offline; escrita offline (fila de sync) e push notifications ficam em Non-Goals para uma spec futura | Entregar tudo de uma vez (instalação + sync + push) | Prática de mercado consolidada é faturar PWA offline em fases — a complexidade de sync/conflito não deve bloquear o valor simples e imediato de "ver dados sem internet". Reduz risco de entregar uma fila de sincronização mal resolvida que perca dados do usuário. |
| D2 | Uso de Serwist (`@serwist/next`) em vez de Workbox puro ou implementação manual do Service Worker | Workbox standalone; Service Worker escrito à mão | Serwist já está decidido na stack (`docs/architecture/overview.md`) e tem integração nativa com o build do Next.js App Router, reduzindo boilerplate de registro e versionamento do SW. |
| D3 | Manifest via `app/manifest.ts` nativo do Next.js 16 em vez de `public/manifest.json` estático | Arquivo estático em `public/` | A API nativa do App Router gera o manifest dinamicamente a partir de TypeScript (permite reaproveitar constantes de tema/cores do design system) e é a convenção recomendada para Next.js 13+ em diante. |
| D4 | Estratégias de cache diferenciadas por tipo de recurso: `CacheFirst` para assets versionados, `NetworkFirst` para navegação, `StaleWhileRevalidate` para GET de API, `NetworkOnly` para mutações | Uma única estratégia genérica para tudo | Cada tipo de recurso tem uma tolerância diferente a dados desatualizados — assets versionados nunca mudam sob o mesmo hash (seguro cachear agressivamente); dados de API mudam com frequência (precisa balancear velocidade com atualização); mutações nunca podem ser "resolvidas" por cache. |
| D5 | Atualização do Service Worker é opt-in via toast (RF-14), nunca reload automático silencioso | `skipWaiting()` automático assim que uma nova versão é detectada | Reload automático em segundo plano pode descartar dados não salvos de um formulário em digitação — prioriza não perder trabalho do usuário sobre "estar sempre na versão mais nova". |
| D6 | Cache de dados de API é limpo no evento `SIGNED_OUT` do Supabase Auth (RF-16) | Deixar o cache expirar naturalmente pelo TTL (RNF-06) | Dispositivos compartilhados (tablets de frota, persona Ana) tornam a limpeza imediata no logout uma exigência de segurança, não apenas de higiene de dados — TTL de 7 dias sozinho deixaria uma janela grande de exposição a um segundo usuário. |
| D7 | Bloqueio de escrita offline (RF-11) ocorre no cliente, antes de qualquer chamada de rede — não depende do backend detectar ausência de payload | Deixar a requisição falhar naturalmente por timeout de rede e tratar o erro genérico resultante | Detecção client-side via `navigator.onLine`/eventos é instantânea e permite a mensagem específica ("sem conexão") em vez de um erro genérico de rede após um timeout longo — melhor experiência percebida. |

---

## Apêndice

### Referências

- `docs/PRD/PRD-v1.0.md` §5 "Estratégia Mobile-First e PWA" — Manifest/SW/Offline page marcados ✅ IN; Push Notifications ❌ OUT (Fase 2)
- `docs/user-stories.md` §11 "PWA — Offline e Instalação" (linhas 581–608) e §14 "Notificações Push" (linhas 675–702) — jornadas e gaps originais
- `docs/user-stories.md` linhas 2135–2144 — decisões pontuais de MVP que esta spec formaliza
- `.agents/pwa-offline-serwist.md` — esboço técnico original de estratégia de cache
- `.agents/nave-ui-pwa/SKILL.md` — paleta de cores Nave e regras de UI mobile-first (touch targets, ícones)
- `docs/architecture/overview.md` — Serwist já listado na stack técnica
- `docs/architecture/decisions/003-auth-jwt-strategy.md` (ADR-003) — validade de access/refresh token, referenciada em RNF-06 e R-PWA-06
- `docs/legal/privacy-policy.md` — menção existente a "Service Worker cache" como categoria de dado armazenado
- `specs/PRD.md` — personas P-001 (Carlos) e P-002 (Ana)
- `specs/dashboard/SPEC-20260531-001.md` RNF-05 — funcionamento offline do dashboard (Zona A), já aprovado, coerente com esta spec
- `specs/business/SPEC-20260620-001-business-strategy-stories.md` — BS-FLW-05, BS-ONB-03, BS-RET-01 (menções a PWA em histórias de negócio)

### Contexto para Agentes de IA

Ao implementar esta spec (quando sair de `draft` para `approved`), respeitar:

**Ordem sugerida de implementação:**
1. `app/manifest.ts` + ícones (RF-01, RF-02) — não depende de mais nada.
2. Registro do Service Worker via `@serwist/next` + precache do shell (RF-05, RF-06, RF-07).
3. Runtime caching de dados de API (RF-08, RF-09, RF-10).
4. Hooks de status online/offline + banner (RF-11, RF-12, RF-13).
5. Fluxo de atualização do SW (RF-14, RF-15).
6. Listener de `SIGNED_OUT` para limpeza de cache (RF-16, RF-17) — depende do `AuthProvider` já existir.
7. CTA de instalação Android (RF-03) e banner manual iOS (RF-04) — podem ser implementados em paralelo às etapas acima, sem dependência.

**Convenções de nomenclatura:**
- Cache names: `nave-pages` (navegação), `nave-api-data` (leitura de API) — usados literalmente em RF-16/D6, não renomear sem atualizar esta spec.
- Hooks em `apps/web/lib/pwa/`: `useOnlineStatus`, `useInstallPrompt`.

**Rastreabilidade no código:**
- Anotar `// @spec SPEC-20260712-001 RF-XX` nos arquivos relevantes.
- `// valida R-PWA-01` na configuração de `runtimeCaching` do `sw.ts`.
- `// valida R-PWA-02` no ponto de bloqueio de submissão offline.
- `// valida R-PWA-06` / `// valida S6` no listener de `SIGNED_OUT`.

**Atenção especial:**
- Esta spec está em `status: draft` — não implementar antes de passar para `review`/`approved`, conforme o ciclo de vida definido em `specs/README.md`.
- As Open Questions (§16) devem ser resolvidas (ou explicitamente aceitas como está) antes da aprovação, especialmente Q2 (rota dedicada vs. overlay para `/offline`), que afeta a estrutura de arquivos do §11.

### Histórico de Revisões

| Versão | Data | Autor | Mudanças |
|--------|------|-------|---------|
| 0.1 | 2026-07-12 | douglps | Criação do rascunho inicial — consolida decisões dispersas em PRD, user-stories e esboços de `.agents/`; escopo restrito a instalação + leitura offline (Fase 1); fila de sync e push explicitamente adiados (Non-Goals) |
