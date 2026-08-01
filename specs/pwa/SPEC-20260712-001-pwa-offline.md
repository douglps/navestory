---
id: SPEC-20260712-001
title: "PWA Offline — Instalação, Cache e Modo Somente-Leitura Sem Conexão"
status: approved
date: 2026-07-12
author: Douglas Lopes (lps.doug@protonmail.com)
rules:
  [
    R-PWA-01,
    R-PWA-02,
    R-PWA-03,
    R-PWA-04,
    R-PWA-05,
    R-PWA-06,
    R-PWA-07,
    R-PWA-08,
  ]
security: [S1, S2, S6]
camadas: [frontend, infra]
---

# SPEC-20260712-001: PWA Offline — Instalação, Cache e Modo Somente-Leitura Sem Conexão

**Versão:** 0.5 (aprovada — implementada)
**Status:** Approved
**Autor:** douglps
**Data:** 2026-07-12
**Data de aprovação:** 2026-07-18
**Reviewers:** douglps
**ADR de referência:** nenhuma ainda — o Decision Log (§17) desta spec cobre o racional; formalizar como ADR é uma decisão em aberto (ver §16)
**Análise de impacto:** não aplicável — feature greenfield, ainda sem código em `apps/web`

---

## 1. Resumo

Formaliza a primeira fase do PWA do navestory: tornar o app **instalável** (manifest + ícones + prompt de instalação) e capaz de **exibir dados já visitados quando o dispositivo está sem conexão** (Service Worker com cache de shell, assets estáticos e respostas de leitura da API), usando Serwist sobre Next.js 16 App Router. Nesta fase, **escrever dados (registrar despesa, manutenção, multa) permanece bloqueado explicitamente quando offline** — não há fila de sincronização nem resolução de conflito. Essas duas capacidades (fila de sync e push notifications) já estão marcadas como Fase 2 em `docs/PRD/PRD-v1.0.md` e ficam fora do escopo desta spec (§5).

---

## 2. Explicando em termos simples

> Esta seção existe para quem vai revisar ou aprovar esta spec sem ser da parte técnica — um gestor de produto, alguém do time comercial, ou o próprio usuário do navestory. Nenhum termo técnico é usado aqui sem ser explicado primeiro.

**O problema que estamos resolvendo:** o Carlos (motorista autônomo, nossa persona principal) abastece o carro num posto na estrada, sem sinal de internet ou 4G. Hoje, se ele abrir o navestory nesse momento, o app simplesmente não carrega — tela branca ou erro. Ele não consegue nem ver quanto gastou no mês passado.

**O que é "instalar o app" num navegador (PWA):** hoje, para usar o navestory, o Carlos abre o navegador (Chrome, Safari) e digita o endereço do site. Um "PWA" (sigla para _Progressive Web App_) permite que esse mesmo site seja "instalado" no celular como se fosse um aplicativo baixado da loja — ganha um ícone na tela inicial, abre em tela cheia (sem a barra de endereço do navegador), e pode funcionar parcialmente sem internet. A grande vantagem: não precisa passar pela Play Store ou App Store, nem o usuário baixar algo pesado — é o mesmo site, só que "empacotado" para parecer e se comportar como um app nativo.

**O que é um "Service Worker":** é um pequeno programa que o navegador mantém rodando em segundo plano, mesmo depois que o usuário fecha a aba do navestory. Pense nele como um assistente que fica de guarda entre o app e a internet: toda vez que o navestory pede alguma informação (uma tela, uma imagem, os dados do painel), esse assistente decide se busca na internet ou se já tem uma cópia guardada de uma visita anterior. Ele é o que permite o app funcionar (ainda que de forma limitada) mesmo sem sinal.

**O que é "cache" nesse contexto:** é essa cópia guardada. Quando o Carlos abriu o navestory hoje de manhã com internet, o Service Worker guardou uma cópia do painel, da lista de despesas recentes e das imagens/ícones do app. Se depois ele perder o sinal, o app mostra essa cópia guardada em vez de uma tela de erro — com um aviso claro de que os dados podem estar desatualizados.

**Por que só "ver", e não "cadastrar", funciona offline por agora:** guardar uma cópia para _mostrar_ é relativamente simples. O difícil é o caminho contrário: se o Carlos _cadastrar_ um abastecimento sem internet, esse dado precisa ficar guardado no celular até a internet voltar, ser enviado nesse momento, e o sistema precisa lidar com o caso de esse mesmo dado ter sido alterado por outro lugar nesse meio tempo (ex: o Carlos editou no computador da oficina). Essa complexidade — chamada de "sincronização em segundo plano" — é real, mas decidimos deixá-la para uma fase futura (Fase 2, fora desta spec) e, por enquanto, apenas avisar claramente: "Sem conexão — tente novamente quando a internet voltar". É uma escolha deliberada: entregar a parte simples e útil primeiro (ver dados offline), sem arriscar perder ou duplicar dados do usuário com uma sincronização mal resolvida.

**O que é o "manifest":** é um arquivo pequeno que descreve o app para o sistema operacional — nome, ícone, cor de fundo, se abre em tela cheia. É ele que faz o ícone do navestory aparecer corretamente na tela inicial do celular quando o Carlos instala o app.

**Por que iOS (iPhone) é diferente:** a Apple restringe o que PWAs podem fazer no Safari — por exemplo, não existe um botão automático de "instalar"; o usuário precisa tocar em "Compartilhar" e depois em "Adicionar à Tela de Início" manualmente. Por isso, esta spec prevê uma tela explicando esse passo a passo só para quem acessa via iPhone.

---

## 3. Contexto e Motivação

**Problema:**

O navestory é desenhado como mobile-first (`docs/PRD/PRD-v1.0.md` §5) e boa parte dos momentos de uso — abastecer, pagar uma multa, sair de uma manutenção — acontece em locais com conectividade ruim ou inexistente (postos de combustível, oficinas, estacionamentos subterrâneos). O PRD já promete "PWA básico (manifest + service worker)" no MVP e já marca como **✅ IN**: Manifest.json, Service Worker (cache de assets + Supabase), página offline customizada, e prompt de "Adicionar à Tela Inicial" (`docs/PRD/PRD-v1.0.md` linhas 56–59, 71).

Apesar disso, nenhuma spec formal existe ainda para esta feature. As decisões estão espalhadas e parcialmente contraditórias entre documentos:

- `docs/user-stories.md` §11 (PWA — Offline e Instalação) e §14 (Notificações Push) levantam 11 gaps não resolvidos, marcados 🔴 (crítico), 🟠 (importante) ou 🟡 (menor) — entre eles: "o Service Worker cacheia a API ou só o shell?" (G21.1), "existe fila de sincronização (Background Sync)?" (G21.2), "como se resolve conflito de dados offline vs. online?" (G21.3), "como o usuário é notificado de uma atualização do Service Worker?" (G21.7).
- `.agents/pwa-offline-serwist.md` já esboça uma estratégia técnica (stale-while-revalidate para imagens e `/api/fleet`) mas não cobre mutações, atualização do SW, nem o fluxo de instalação no iOS.
- `docs/user-stories.md` linhas 2135–2144 já registram decisões pontuais de MVP (bloquear escrita offline com toast; JWT em cache válido permite uso offline; last-write-wins como estratégia de conflito de **fase futura**; `skipWaiting`+`clientsClaim` com toast de atualização) — mas essas decisões nunca foram consolidadas numa spec, então não têm ID de regra rastreável nem critério de aceite formal.

**Evidências registradas (docs/user-stories.md):**

- G4.6 e G8.6 — "Carlos cadastra veículo/registra abastecimento offline (PWA)" marcados como 🔴 gap crítico.
- G15.7 — exportação de CSV no mobile via PWA pode ter comportamento diferente entre Android e iOS.
- G21.6 — limitações de PWA no iOS (sem push, Background Sync limitado) não documentadas para o usuário final.

**Por que agora:**

O PRD já compromete PWA básico para o MVP, e o time de UX/PWA (`.agents/navestory-ui-pwa/SKILL.md`) já definiu requisitos de interface mobile-first (touch targets, performance Lighthouse) que dependem da mesma infraestrutura. Sem uma spec formal, a implementação começaria sem critérios de aceite, sem regras rastreáveis, e repetiria a ambiguidade já identificada nos gaps do user-stories.md.

---

## 4. Goals (Objetivos)

- [ ] G-01: O navestory pode ser instalado como app na tela inicial em Android/Chrome (via prompt automático) e em iOS/Safari (via instrução manual), com ícone, nome e cores da marca navestory corretos.
- [ ] G-02: Ao abrir o app sem conexão, o usuário vê a última versão em cache do shell (layout, navegação) e dos dados já visitados (dashboard, lista de despesas, veículos) em vez de uma tela de erro — com um indicador fixo e sempre visível mostrando exatamente há quanto tempo aqueles dados foram atualizados pela última vez (RF-13, R-PWA-07), nunca um aviso genérico de "pode estar desatualizado" sem precisão.
- [ ] G-03: Qualquer tentativa de criar, editar ou excluir um registro (despesa, manutenção, multa, veículo) enquanto offline é bloqueada no cliente **antes** da tentativa de rede, com mensagem clara — nunca falha silenciosamente nem trava a UI.
- [ ] G-04: Quando uma nova versão do Service Worker é publicada, o usuário em uma aba aberta é avisado por um toast e escolhe quando recarregar — nunca há reload automático sem aviso.
- [ ] G-05: O app atinge nota Lighthouse PWA e Mobile Performance consistentes com as metas já definidas no PRD (Performance > 90, FCP < 1.8s).

**Métricas de sucesso:**

| Métrica                                                                     | Baseline atual             | Target                                                      | Prazo                 |
| --------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------- | --------------------- |
| App instalável (Lighthouse PWA installability check)                        | Não avaliável — sem código | 100% (todos os critérios do checklist Lighthouse PWA)       | Na entrega desta fase |
| Abertura do app offline após 1ª visita online                               | Tela de erro / em branco   | Shell + última tela visitada renderizados a partir do cache | Na entrega desta fase |
| Tentativas de escrita offline que resultam em erro genérico ou tela travada | Não medido (sem PWA ainda) | 0% — sempre mensagem explícita pré-envio                    | Na entrega desta fase |
| Lighthouse Performance (mobile)                                             | Não medido                 | > 90 (meta já definida no PRD)                              | Na entrega desta fase |

---

## 5. Non-Goals (Fora do Escopo)

- **NG-01 — Fila de sincronização de escritas offline (Background Sync):** registrar uma despesa/manutenção/multa sem conexão e enviá-la automaticamente quando a internet voltar. Marcado como gap 🔴 G21.2 em `docs/user-stories.md` e como decisão de Fase 2. Motivo: exige fila persistente (IndexedDB), reconciliação de estado da UI e tratamento de falha parcial — complexidade que não deve bloquear a entrega do valor mais simples (ver offline) desta fase.
- **NG-02 — Resolução de conflito de dados:** o que acontece se o mesmo registro for alterado offline em um dispositivo e online em outro. `docs/user-stories.md` linha 2141 já aponta "last-write-wins com timestamp UTC" como direção para quando NG-01 for implementado — mas isso só se torna relevante quando existir fila de escrita, o que não é o caso aqui.
- **NG-03 — Push Notifications:** Web Push API, VAPID keys, tabela `push_subscriptions`. Marcado como **❌ OUT (Fase 2)** explicitamente em `docs/PRD/PRD-v1.0.md` linha 60, com gaps 🔴 G24.1 e G24.6 em `docs/user-stories.md` ainda sem solução de infraestrutura.
- **NG-04 — Cadastro completo de veículo/despesa offline:** depende de NG-01. Nesta fase, o usuário consegue _ver_ seus veículos e despesas offline, mas não _criar_ novos enquanto sem conexão.
- **NG-05 — Cache de exportação (CSV) offline:** gap G15.7 do user-stories.md permanece aberto; exportação continua exigindo conexão.
- **NG-06 — Suporte a Web Push no iOS abaixo da versão 16.4:** apenas documentação da limitação (ver §13), sem solução alternativa nesta fase (não há push nesta fase de qualquer forma — NG-03).

---

## 6. Usuários e Personas

Reaproveita as personas já definidas em `specs/PRD.md`:

- **P-001 — Carlos, Motorista Autônomo** (35–50 anos): usa o celular como ferramenta de trabalho, frequentemente em locais com sinal instável (postos, estradas, estacionamentos). É o usuário primário desta spec — quem mais se beneficia de conseguir consultar dados offline.
- **P-002 — Ana, Gestora de Frota Pequena** (28–45 anos): usa desktop e mobile; instala o PWA no celular para checagens rápidas fora do escritório, mas majoritariamente trabalha com conexão estável.

**Jornada atual (sem a feature):**

1. Carlos abastece o carro num posto sem sinal de celular.
2. Ele abre o navestory para conferir se já bateu a meta de gasto do mês.
3. O navegador não consegue carregar a página — tela branca, erro de conexão, ou spinner infinito.
4. Carlos desiste e anota o valor num papel para lançar depois — ou simplesmente esquece.

**Jornada futura (com a feature) — consulta offline:**

1. Carlos abriu o navestory pela manhã, com internet, e navegou pelo dashboard e pela lista de despesas.
2. No posto, sem sinal, ele abre o app (instalado na tela inicial ou via navegador).
3. O Service Worker responde com a última versão em cache do shell e dos dados já visitados.
4. O indicador fixo no `Header` mostra: **"Offline · Atualizado Hoje 08:42"**.
5. Carlos confere o total gasto no mês (dado do dashboard já em cache) — consulta resolvida sem precisar de sinal, sabendo exatamente a idade do dado.

**Jornada futura — tentativa de escrita offline:**

1. Ainda sem sinal, Carlos toca em "Nova despesa" para registrar o abastecimento.
2. Ele preenche o formulário e toca em "Salvar".
3. Antes de qualquer chamada de rede, o app detecta que está offline e exibe: **"Sem conexão — não é possível salvar agora. Tente novamente quando a internet voltar."**
4. O formulário permanece preenchido na tela (não perde o que foi digitado), para que Carlos tente de novo assim que houver sinal.

**Jornada futura — instalação (Android):**

1. Ana acessa o navestory pelo Chrome no Android pela segunda vez.
2. O navegador dispara automaticamente um prompt "Adicionar navestory à tela inicial".
3. Ana confirma — o ícone do navestory aparece na tela inicial do celular, com as cores da marca.

**Jornada futura — instalação (iOS):**

1. Carlos acessa o navestory pelo Safari no iPhone.
2. Como o Safari não dispara prompt automático, o app exibe um banner discreto: **"Instale o navestory: toque em Compartilhar → Adicionar à Tela de Início."**
3. Carlos segue as instruções manualmente.

**Jornada futura — atualização do app:**

1. O time publica uma nova versão do navestory enquanto Ana está com o app aberto em segundo plano.
2. O Service Worker detecta a nova versão e o app exibe um toast: **"Nova versão disponível — [Recarregar]"**.
3. Ana toca em "Recarregar" quando estiver conveniente — a atualização nunca acontece sozinha e nunca interrompe algo que ela esteja digitando.

---

## 7. Requisitos Funcionais

### 7.1 Manifest e Instalação (R-PWA-04, R-PWA-05)

| ID    | Requisito                                                                                                                                                                                                                                                                       | Prioridade | Critério de Aceite                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-01 | O app expõe um Web App Manifest (via `app/manifest.ts`, API nativa do Next.js App Router) com `name`, `short_name`, `start_url`, `display: "standalone"`, `theme_color` e `background_color` alinhados à paleta navestory (`.agents/navestory-ui-pwa/SKILL.md`).                | Must       | `GET /manifest.webmanifest` retorna JSON válido; Lighthouse PWA audit "Web app manifest meets installability requirements" passa.            |
| RF-02 | O manifest inclui ícones 192×192 e 512×512 em formato `purpose: "any"` e uma segunda entrada `purpose: "maskable"` para cada tamanho, evitando corte de ícone em launchers Android que aplicam máscara circular/squircle.                                                       | Must       | Lighthouse PWA audit de ícones passa sem warning de "missing maskable icon".                                                                 |
| RF-03 | Em navegadores que disparam o evento `beforeinstallprompt` (Chrome/Edge Android e desktop), a UI captura o evento, posterga o prompt nativo e exibe um CTA próprio ("Instalar app") após a 2ª visita do usuário (critério já definido em `docs/PRD/PRD-v1.0.md` linha 71). | Must       | Em Chrome Android, após a 2ª visita, o CTA de instalação aparece; ao tocar, o prompt nativo do navegador é exibido.                     |
| RF-04 | Em navegadores sem suporte a `beforeinstallprompt` (Safari iOS e iPadOS), a UI detecta a plataforma (`navigator.userAgent` ou `navigator.standalone`) e exibe um banner com instrução manual: "Toque em Compartilhar → Adicionar à Tela de Início".                        | Must       | Em Safari iOS, o banner de instrução manual aparece em vez do CTA de RF-03; em qualquer outro navegador, o banner de RF-04 não aparece. |

### 7.2 Cache de Shell e Assets Estáticos (R-PWA-01)

| ID    | Requisito                                                                                                                                                                                                                                                                                               | Prioridade | Critério de Aceite                                                                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-05 | O Service Worker (`apps/web/app/sw.ts`, registrado via `@serwist/next`) faz precache do shell da aplicação (HTML de layout, CSS, JS dos bundles principais) no momento da instalação, usando a estratégia `CacheFirst` para assets versionados (hash no nome do arquivo, gerado pelo build do Next.js). | Must       | Após a 1ª visita, DevTools → Application → Cache Storage mostra os assets do build precacheados. Segunda visita com rede desligada (`chrome://inspect` offline) carrega o shell sem erro de rede. |
| RF-06 | Requisições de navegação (HTML de rota, ex: `/dashboard`, `/expenses`) usam estratégia `NetworkFirst` com timeout curto (ex: 3s) e fallback para a versão em cache da mesma rota, ou para a página `/offline` (RF-07) quando a rota nunca foi visitada.                                            | Must       | Rota já visitada online: ao ficar offline, recarregar a mesma rota exibe a versão em cache. Rota nunca visitada: exibe `/offline`.                                                                |
| RF-07 | Existe uma página `apps/web/app/offline/page.tsx` (rota dedicada — decisão fixada, ver Q2/D12) com mensagem amigável ("Você está sem conexão. Algumas informações podem não estar disponíveis.") e um botão "Tentar novamente", exibida como fallback de navegação (RF-06).                        | Must       | Acessar uma rota nunca visitada com o dispositivo offline exibe esta página, não um erro de navegador.                                                                                       |

### 7.3 Cache de Dados de Leitura da API (R-PWA-01, R-PWA-06)

| ID    | Requisito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Prioridade | Critério de Aceite                                                                                                                                                                                                                                                                                                            |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-08 | Requisições `GET` para rotas de dados da API (ex: `/api/vehicles`, `/api/expenses`, `/api/dashboard/summary`) usam estratégia `StaleWhileRevalidate`: responde imediatamente com o cache (se existir) e atualiza o cache em segundo plano quando há rede.                                                                                                                                                                                                                                                                    | Must       | Com rede normal, dois `GET` seguidos à mesma rota: o 2º é servido do cache imediatamente e depois atualizado (visível no DevTools como duas entradas de timing).                                                                                                                                                              |
| RF-09 | Requisições `POST`, `PUT`, `PATCH` e `DELETE` **nunca** são interceptadas pelo Service Worker — passam direto para a rede sem estratégia de cache, sob qualquer condição.                                                                                                                                                                                                                                                                                                                                                    | Must       | Nenhuma entrada de mutação aparece no Cache Storage. Interceptar a requisição via DevTools confirma `networkOnly`.                                                                                                                                                                                                            |
| RF-10 | Entradas de cache de dados de API **não têm prazo de invalidação atrelado à exibição** — permanecem exibíveis indefinidamente enquanto existirem no Cache Storage, sempre acompanhadas do indicador de idade do dado (RF-13, R-PWA-07). O TTL de 30 dias (R-PWA-06) é só um teto de **armazenamento em disco por higiene/segurança**: entradas mais antigas que isso são removidas na próxima abertura do app **com conexão disponível** — nunca força estado vazio enquanto o usuário está offline consultando aquele dado. | Must       | Simular `Date.now()` 31 dias no futuro com o dispositivo **online**: a entrada expirada é removida na próxima leitura, revalidando via rede. Com o dispositivo **offline**, mesmo além de 30 dias, o dado em cache continua sendo exibido com o indicador de idade — nunca substituído por estado vazio só por estar offline. |

### 7.4 Bloqueio Explícito de Escrita Offline (R-PWA-02)

| ID                 | Requisito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Prioridade | Critério de Aceite                                                                                                                                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-11              | Antes de qualquer submissão de formulário (Server Action ou chamada REST) que resulte em `POST`/`PUT`/`PATCH`/`DELETE`, o cliente verifica `navigator.onLine` (ou equivalente via evento `online`/`offline`) como sinal rápido inicial e, se offline, bloqueia o envio e exibe a mensagem: **"Sem conexão — não é possível salvar agora. Tente novamente quando a internet voltar."** `navigator.onLine` só reflete se há uma interface de rede ativa, não se há conectividade real — ver RF-11.1 para o caso em que ele reporta "online" incorretamente. | Must       | Com o dispositivo offline, submeter qualquer formulário transacional exibe a mensagem e não dispara nenhuma requisição de rede.                                                                                                                           |
| RF-11.1 (R-PWA-08) | Se `navigator.onLine` indicar "online" mas a submissão falhar por erro de rede (falha de conexão — `TypeError`/`Failed to fetch`, não uma resposta HTTP de erro do servidor), o cliente trata essa falha como indicativo de estar offline: exibe a mesma mensagem de RF-11 (nunca um erro genérico de rede), preserva os dados do formulário (RF-12) e atualiza o indicador de RF-13 para o estado offline.                                                                                                                                               | Must       | Simular `navigator.onLine === true` com a requisição de rede forçada a falhar por erro de conexão (não HTTP): a UI exibe a mensagem de RF-11, não um erro genérico, e o indicador de RF-13 muda para offline.                                             |
| RF-12              | O conteúdo já digitado no formulário nunca é descartado quando a submissão é bloqueada por falta de conexão (RF-11) — o usuário pode tentar novamente sem redigitar.                                                                                                                                                                                                                                                                                                                                                                                      | Must       | Após o bloqueio de RF-11, os campos do formulário mantêm os valores digitados.                                                                                                                                                                            |
| RF-13              | Um indicador fixo e compacto (pill/badge — não um banner full-width) ocupa uma posição estratégica constante do layout (ao lado do `VehicleContextChip` no `Header`, ver §10.1) informando o estado de conectividade, em qualquer tela. Estado online: indicador discreto ou ausente. Estado offline: exibe `"Offline · Atualizado [Hoje HH:mm / Ontem HH:mm / DD/MM/AA HH:mm]"` (R-PWA-07), calculado a partir do timestamp mais recente entre as entradas de cache relevantes à tela atual.                                                             | Must       | Desligar a rede em qualquer tela do app exibe o indicador "Offline · Atualizado ..." dentro de 2 segundos (detecção via eventos `online`/`offline` do navegador), sem deslocar o layout existente (sem CLS — o espaço já é reservado pelo `Header`). |
| RF-13.1 (R-PWA-07) | Formato do timestamp de "última atualização": mesma data (calendário local) → `"Hoje HH:mm"`; um dia antes → `"Ontem HH:mm"`; mais antigo → `"DD/MM/AA HH:mm"`.                                                                                                                                                                                                                                                                                                                                                                                           | Must       | Simular `Date.now()` em cada uma das três faixas e verificar o texto exato exibido no indicador.                                                                                                                                                          |

### 7.5 Atualização do Service Worker (R-PWA-03)

| ID    | Requisito                                                                                                                                                                                                                                                                                                     | Prioridade | Critério de Aceite                                                                                                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| RF-14 | Quando uma nova versão do Service Worker é detectada (evento `updatefound` / novo SW em estado `waiting`), a UI exibe um toast persistente: **"Nova versão disponível — [Recarregar]"**. O `skipWaiting()` e `clientsClaim()` só são executados após o usuário tocar em "Recarregar" — nunca automaticamente. | Must       | Publicar uma nova versão do build e reabrir a aba: o toast aparece. A página não recarrega sozinha; recarrega apenas ao clicar no botão. |
| RF-15 | Se o usuário ignorar o toast de atualização (RF-14) e fechar todas as abas do app, a próxima abertura já carrega a nova versão automaticamente (comportamento padrão do ciclo de vida do Service Worker — sem necessidade de lógica adicional).                                                               | Should     | Fechar todas as abas após ignorar o toast e reabrir: a nova versão está ativa sem novo aviso.                                            |

### 7.6 Limpeza de Cache no Logout (R-PWA-06, S6)

| ID    | Requisito                                                                                                                                                                                                                                                | Prioridade | Critério de Aceite                                                                                                                           |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-16 | No evento `SIGNED_OUT` do Supabase Auth Client, o app limpa todas as entradas do Cache Storage referentes a dados de usuário (rotas de API, RF-08), preservando apenas o precache de assets estáticos públicos (RF-05, que não contêm dados de usuário). | Must       | Fazer logout e inspecionar Cache Storage: nenhuma entrada de `/api/*` remanescente; entradas de assets estáticos (JS/CSS/ícones) permanecem. |
| RF-17 | Login de um segundo usuário no mesmo dispositivo, imediatamente após o logout do primeiro (RF-16), nunca exibe dados em cache do usuário anterior — nem mesmo brevemente antes do primeiro carregamento de rede.                                         | Must       | Logout de usuário A, login de usuário B: dashboard de B não mostra nenhum valor residual de A, mesmo com a rede lenta simulada.              |

---

## 8. Fluxos Detalhados

### 8.1 Fluxo Principal A — Primeira Visita e Precache

1. Ana acessa o navestory pela primeira vez, com internet.
2. O Service Worker é registrado e instalado; o evento `install` dispara o precache do shell (RF-05).
3. Ana navega pelo dashboard e pela lista de veículos — cada resposta `GET` bem-sucedida é armazenada via `StaleWhileRevalidate` (RF-08).
4. O Service Worker assume controle da página (`activate` → `clientsClaim`, já que é a primeira instalação, sem necessidade de confirmação do usuário).

### 8.2 Fluxo Principal B — Consulta Offline (Carlos no Posto)

1. Carlos abriu o app pela manhã, com internet, e visitou `/dashboard` e `/expenses`.
2. No posto, sem sinal, ele reabre o app (instalado ou via navegador).
3. A requisição de navegação para `/dashboard` cai no timeout de `NetworkFirst` (RF-06) e recorre ao cache da mesma rota.
4. As chamadas `GET /api/dashboard/summary` e `GET /api/expenses` respondem com o cache (RF-08), sem tentar rede (offline detectado).
5. O indicador fixo "Offline · Atualizado ..." é exibido no `Header` (RF-13).
6. Carlos vê o total gasto no mês, calculado a partir dos dados em cache.

### 8.3 Fluxo Alternativo C — Tentativa de Escrita Offline

1. Ainda offline, Carlos abre o formulário de nova despesa (a tela em si carrega do cache, RF-06).
2. Ele preenche os campos e toca em "Salvar".
3. O cliente detecta `navigator.onLine === false` antes de qualquer chamada de rede (RF-11).
4. Mensagem exibida: "Sem conexão — não é possível salvar agora. Tente novamente quando a internet voltar."
5. Os campos preenchidos permanecem no formulário (RF-12).
6. Minutos depois, a conexão retorna; Carlos toca em "Salvar" novamente; a submissão ocorre normalmente.

### 8.4 Fluxo Alternativo D — Atualização de Versão em Aba Aberta

1. Ana está com o navestory aberto em segundo plano no celular.
2. O time publica uma nova versão do frontend.
3. O navegador detecta um novo Service Worker em `waiting` (RF-14).
4. Um toast aparece: "Nova versão disponível — [Recarregar]".
5. Ana termina o que estava fazendo e, minutos depois, toca em "Recarregar".
6. `skipWaiting()` + `clientsClaim()` executam; a página recarrega com a nova versão.

### 8.5 Fluxo Alternativo E — Instalação no iOS

1. Carlos acessa o navestory pelo Safari no iPhone.
2. A UI detecta `navigator.standalone === false` e `userAgent` de Safari/iOS (RF-04).
3. Um banner discreto aparece: "Instale o navestory: toque em Compartilhar → Adicionar à Tela de Início."
4. Carlos segue as instruções manualmente pelo próprio Safari (fora do controle do app).
5. Da próxima vez, ele abre o navestory pelo ícone na tela inicial, em modo standalone.

### 8.6 Fluxo Alternativo F — Troca de Usuário no Mesmo Dispositivo

1. Ana faz login num tablet compartilhado da frota.
2. Ela navega e consulta dados — populando o cache de API (RF-08).
3. Ana faz logout. O evento `SIGNED_OUT` dispara a limpeza do Cache Storage de dados de usuário (RF-16).
4. Outro gestor faz login no mesmo tablet.
5. Nenhum dado de Ana aparece, mesmo antes da primeira resposta de rede completar (RF-17).

---

## 9. Requisitos Não-Funcionais

| ID     | Requisito                                                                                                                            | Valor alvo                                                                     | Observação                                                                                                                                                                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Lighthouse PWA installability checklist                                                                                              | 100% dos critérios (manifest válido, ícones, HTTPS, Service Worker registrado) | Auditar em CI ou manualmente antes do rollout (§15).                                                                                                                                                                                                                                            |
| RNF-02 | Lighthouse Performance (mobile)                                                                                                      | > 90                                                                           | Meta já definida em `docs/PRD/PRD-v1.0.md`; cache agressivo de assets deve contribuir, não prejudicar (evitar precache excessivo que atrase o `install` do SW).                                                                                                                                 |
| RNF-03 | First Contentful Paint (mobile, 4G simulado)                                                                                         | < 1.8s                                                                         | Meta já definida no PRD; shell servido do cache deve reduzir esse tempo em visitas subsequentes.                                                                                                                                                                                                |
| RNF-04 | Tempo de detecção de offline/online                                                                                                  | < 2s                                                                           | Via eventos nativos `online`/`offline`, sem polling custoso.                                                                                                                                                                                                                                    |
| RNF-05 | Tamanho total do precache do shell                                                                                                   | < 5 MB                                                                         | Evitar precache de todo o bundle da aplicação — apenas o necessário para renderizar o layout base e a última rota visitada.                                                                                                                                                                     |
| RNF-06 | Teto de retenção em disco do cache de dados de API (higiene/segurança de armazenamento — não é mais um prazo de exibição, ver RF-10) | 30 dias                                                                        | R-PWA-06 — decisão de produto explícita (não decorre do ADR-003, que não define validade de refresh token por tempo fixo — ver Decision Log D9). Reforça que dados offline não ficam "eternos" no dispositivo, sem cortar a experiência de leitura offline enquanto o usuário está sem conexão. |
| RNF-07 | Zero reload automático sem interação do usuário                                                                                      | 100% dos casos de atualização de SW                                            | R-PWA-03 — proteção contra perda de dados de formulário em digitação.                                                                                                                                                                                                                           |

---

## 10. Design e Interface

### 10.1 Indicador Fixo de Status de Conectividade

- Pill/badge compacto dentro do `Header` (`apps/web/src/components/layout/header.tsx`), ao lado do `VehicleContextChip` — não um banner full-width. Não desloca o layout (sem CLS): o espaço é reservado dentro da altura fixa do `Header` (`h-14`).
- Estado online: indicador discreto (ponto verde) ou ausente, conforme decisão de UI a refinar com o agente `design-system`.
- Estado offline: texto `"Offline · Atualizado [Hoje HH:mm / Ontem HH:mm / DD/MM/AA HH:mm]"` (RF-13.1/R-PWA-07), cor de fundo `warning` (pastel, conforme paleta em `.agents/navestory-ui-pwa/SKILL.md` — nunca vermelho puro).
- Volta ao estado online automaticamente ao detectar o evento `online` (sem necessidade de ação do usuário).
- `aria-live="polite"` na transição online↔offline, para leitores de tela anunciarem a mudança (WCAG 2.2 AA, `.agents/rules/accessibility.md`).

### 10.2 Toast de Atualização Disponível

- Reaproveita o padrão de toast já implementado no projeto (`apps/web/src/components/layout/context-stale-toast.tsx` + store `ui-store` do Zustand, construído em T5.4) — **não** introduz `Sonner` nem qualquer lib de toast nova.
- Texto: "Nova versão disponível." Ação: botão "Recarregar".
- Persistente (não expira automaticamente) até o usuário interagir ou recarregar a página manualmente.

### 10.3 Banner de Instalação Manual (iOS)

- Card discreto, dismissível, exibido uma vez por sessão (não repetir se o usuário já dispensou).
- Texto: "Instale o navestory: toque em 📤 Compartilhar e depois em 'Adicionar à Tela de Início'."
- Ícone ilustrativo do gesto via emoji (📤), seguindo a convenção de ícones já estabelecida no projeto (`VEHICLE_TYPE_ICONS`, T5.4) — **não** introduz `lucide-react`, que nunca foi adicionado como dependência.

### 10.4 CTA de Instalação (Android/Chrome)

- Botão "Instalar app" exibido após a 2ª visita (RF-03), em local não intrusivo (ex: dentro do menu de configurações ou como banner dismissível).
- Ao tocar, invoca o prompt nativo capturado do evento `beforeinstallprompt`.

### 10.5 Ícones do Manifest

- Gerados a partir da paleta de marca navestory (`.agents/navestory-ui-pwa/SKILL.md`): fundo com a cor `Primary (oklch(0.556 0.15 260))`.
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
        ├── use-online-status.ts     → hook `navigator.onLine` + eventos online/offline + fallback de falha de rede (RF-11, RF-11.1/R-PWA-08, RF-13)
        ├── use-install-prompt.ts    → captura de `beforeinstallprompt` (RF-03)
        ├── platform-detection.ts    → detecção de iOS/Safari sem beforeinstallprompt (RF-04)
        ├── format-cache-age.ts      → formata "Hoje/Ontem/DD-MM-AA HH:mm" a partir do timestamp de cache (RF-13.1/R-PWA-07)
        └── clear-cache-on-signout.ts → listener do evento SIGNED_OUT do Supabase (RF-16)
```

### 11.1 Estratégias de Cache (exemplo de configuração)

```typescript
// apps/web/app/sw.ts
import { defaultCache } from "@serwist/next/worker";
import { installSerwist } from "@serwist/sw";

installSerwist({
  precacheEntries: self.__SW_MANIFEST, // shell + assets versionados — RF-05
  runtimeCaching: [
    {
      // navegação de rotas — RF-06
      matcher: ({ request }) => request.mode === "navigate",
      handler: "NetworkFirst",
      options: { cacheName: "navestory-pages", networkTimeoutSeconds: 3 },
    },
    {
      // Leitura de dados da API — RF-08, RF-10
      // maxAgeSeconds aqui é só o teto de RETENÇÃO EM DISCO (RNF-06/R-PWA-06) — a
      // expiração do plugin do Workbox só remove entradas quando há uma tentativa de
      // rede (fetch) que dispara a checagem; nunca invalida silenciosamente uma leitura
      // servida puramente do cache offline (RF-10/D9) — não usar essa opção sozinha para
      // decidir o que exibir na UI, só para limpeza de armazenamento.
      matcher: ({ url, request }) =>
        request.method === "GET" && url.pathname.startsWith("/api/"),
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "navestory-api-data",
        expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 dias — R-PWA-06
      },
    },
    {
      // Mutações — nunca interceptadas — RF-09
      matcher: ({ request }) =>
        ["POST", "PUT", "PATCH", "DELETE"].includes(request.method),
      handler: "NetworkOnly",
    },
  ],
});
```

### 11.2 Limpeza de Cache no Logout (esboço)

```typescript
// apps/web/lib/pwa/clear-cache-on-signout.ts
// @spec SPEC-20260712-001 RF-16 RF-17

supabase.auth.onAuthStateChange(async (event) => {
  if (event === "SIGNED_OUT") {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key === "navestory-api-data")
        .map((key) => caches.delete(key)),
    );
  }
});
```

---

## 12. Integrações e Dependências

| Dependência                                           | Tipo                                                        | Impacto se indisponível                                                                                                 |
| ----------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `@serwist/next`                                       | Obrigatória (já na stack — `docs/architecture/overview.md`) | Sem ela, não há geração/registro automático do Service Worker integrado ao build do Next.js.                            |
| `app/manifest.ts` (API nativa do Next.js 16)          | Obrigatória                                                 | Alternativa seria um `manifest.json` estático em `public/` — rejeitada (ver Decision Log D3).                           |
| Supabase Auth Client — evento `SIGNED_OUT`            | Obrigatória para RF-16/RF-17                                | Sem o listener, o cache de dados de usuário sobrevive ao logout — risco de segurança em dispositivo compartilhado (S6). |
| `.agents/navestory-ui-pwa/SKILL.md` (paleta de cores) | Referência de design                                        | Ícones e banners devem seguir a paleta já definida; divergência exige alinhamento com o agente `design-system`.         |
| Next.js 16 App Router                                 | Obrigatória                                                 | Estrutura de arquivos (§11) depende das convenções de App Router (`app/manifest.ts`, `app/offline/page.tsx`).           |

---

## 13. Edge Cases e Tratamento de Erros

| ID    | Cenário                                                                                                                                                | Trigger                                                                                                                                                                                                           | Comportamento esperado                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC-01 | Primeira visita ao app, sem nenhum cache ainda, e o dispositivo já está offline                                                                        | Usuário abre o app pela primeira vez sem ter tido conexão antes                                                                                                                                                   | Nenhum shell em cache disponível — navegador exibe o erro padrão de "sem conexão"; fora do alcance do Service Worker (não há como cachear o que nunca foi buscado). Documentar como limitação conhecida.                                                                                                                                                                                                                                   |
| EC-02 | Cota de armazenamento do navegador excedida (`QuotaExceededError`) ao tentar cachear uma resposta                                                 | Dispositivo com pouco espaço livre                                                                                                                                                                                | O Service Worker captura a exceção no `runtimeCaching` e ignora a tentativa de cache silenciosamente — a resposta de rede ainda é entregue normalmente ao usuário; apenas o cache falha. Nunca bloquear a resposta por falha de cache.                                                                                                                                                                                                          |
| EC-03 | Troca de conta no mesmo dispositivo sem logout explícito (ex: sessão expirada e novo login direto)                                                     | Refresh token expira e um usuário diferente faz login                                                                                                                                                             | **Prioridade: Must** (elevada de "a validar" para obrigatória — Q4/D13, mesmo padrão de proteção de RF-16/RF-17, custo de implementação baixo frente ao risco de exposição de dado entre usuários). Login sempre passa por `SIGNED_IN`; o app deve tratar `SIGNED_IN` para um `user_id` diferente do último cache conhecido como equivalente a um `SIGNED_OUT` implícito, disparando a limpeza de RF-16 antes de servir qualquer dado em cache. |
| EC-04 | JWT de acesso expirado enquanto o dispositivo está offline                                                                                             | Usuário abre o app offline após 60+ minutos sem uso (`jwt_expiry = 3600` em `supabase/config.toml`; o ADR-003 não fixa esse número, só declara o princípio de tokens de acesso curtos — verificado em 2026-07-18) | Sem conexão, não há como renovar o token. A leitura de dados em cache (RF-08) não depende de token válido no momento da leitura (já foi buscado com token válido antes) — o app permanece funcional para leitura. Qualquer tentativa de escrita já é bloqueada por RF-11 independentemente do estado do token.                                                                                                                                  |
| EC-05 | Safari iOS descarta o Service Worker/cache após período de inatividade do site (política de ITP da Apple)                                              | Usuário não abre o app por várias semanas                                                                                                                                                                         | Comportamento fora do controle do app — documentar como limitação conhecida do iOS (ver §6, jornada iOS) e reforçar mensagem de instalação (RF-04) como mitigação parcial (apps instalados têm política de retenção mais generosa que abas de navegador).                                                                                                                                                                                  |
| EC-06 | Nova versão do Service Worker publicada mas o usuário nunca reabre nenhuma aba do app                                                                  | Deploy silencioso, usuário ausente                                                                                                                                                                                | Próxima visita já carrega o SW novo diretamente na instalação (sem página antiga para avisar) — comportamento aceitável, sem necessidade de RF-14 nesse caso.                                                                                                                                                                                                                                                                                   |
| EC-07 | `beforeinstallprompt` disparado antes da lógica de RF-03 estar pronta para capturá-lo (ordem de carregamento de scripts)                               | navegador dispara o evento muito cedo no ciclo de vida da página                                                                                                                                             | O listener deve ser registrado o mais próximo possível do carregamento inicial do app (idealmente fora de componentes lazy-loaded) para minimizar a janela de perda do evento; se perdido, o CTA de instalação simplesmente não aparece nessa sessão — sem erro visível ao usuário.                                                                                                                                                             |
| EC-08 | `navigator.onLine` reporta `true` sem conectividade real (ex: Wi-Fi de posto/hotel conectado mas sem acesso à internet, portal cativo não autenticado) | Dispositivo conectado a uma rede local que não tem saída para a internet                                                                                                                                          | O app assume "online" inicialmente (RF-11 não bloqueia preventivamente); a primeira tentativa de rede falha por erro de conexão, não por resposta HTTP — RF-11.1/R-PWA-08 intercepta esse erro e trata como offline retroativamente, sem deixar o usuário com um erro genérico. O indicador de RF-13 só reflete o estado real após essa primeira tentativa falhar.                                                                              |

---

## 14. Segurança e Privacidade

- **Autenticação (S1) e Autorização (S2):** o Service Worker não introduz nenhum novo caminho de acesso a dados — ele apenas cacheia respostas que já passaram pelas verificações normais de `SupabaseAuthGuard` e RLS no momento em que foram buscadas com sucesso. Nenhuma resposta de erro (401/403) é cacheada.
- **Limpeza de cache no logout (S6 — nova regra desta spec):** o Cache Storage de dados de API (`navestory-api-data`) é removido no evento `SIGNED_OUT` (RF-16), mitigando o risco de um segundo usuário no mesmo dispositivo visualizar dados residuais do usuário anterior — cenário realista para gestores de frota que compartilham tablets.
- **Sem PII adicional:** o Service Worker não coleta nem armazena nenhum dado que o app não já exiba ao usuário autenticado — é uma cópia local do que a API já retornou. Não há novo processamento de dados pessoais além do já descrito em `docs/legal/privacy-policy.md` (que já menciona "Service Worker cache" como categoria existente de dado armazenado).
- **Teto de retenção em disco (R-PWA-06):** o TTL de 30 dias do cache de API (RNF-06) é uma decisão de produto para evitar a situação de dados "offline para sempre" que nunca são revalidados nem removidos — não é mais amarrado à validade do refresh token (D9), que no `supabase/config.toml` deste projeto não tem prazo fixo configurado (`inactivity_timeout` desabilitado). A limpeza por RF-16 no `SIGNED_OUT` continua sendo a proteção primária contra exposição em dispositivo compartilhado; o TTL de 30 dias é uma camada adicional de higiene, não a defesa principal.
- **LGPD (C1):** a exclusão de conta via `DELETE /users/me` já aciona cascata no banco (C1); esta spec não altera esse fluxo. Cache local seguiria a mesma limpeza do logout (RF-16), já que exclusão de conta implica desautenticação.

---

## 15. Plano de Rollout

**Estratégia:** entrega única (sem fases internas nesta spec — a divisão Fase 1/Fase 2 já existe entre esta spec e o trabalho futuro de NG-01/NG-02/NG-03).

| Etapa       | Entregável                                                                               | Pré-requisito           | Risco se pulada                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Etapa 1** | Manifest + ícones + registro do Service Worker com precache do shell (RF-01–RF-07)       | Nenhum                  | Sem instalabilidade nem cache de shell — nenhuma outra etapa tem valor sem esta base.                           |
| **Etapa 2** | Cache de leitura da API + indicador fixo de status offline com timestamp (RF-08–RF-13.1) | Etapa 1 concluída       | Usuário instala o app mas não ganha nenhuma capacidade real de uso offline.                                     |
| **Etapa 3** | Fluxo de atualização de versão + limpeza de cache no logout (RF-14–RF-17)                | Etapas 1 e 2 concluídas | Risco de segurança em dispositivo compartilhado (sem RF-16/RF-17) e de reload destrutivo sem aviso (sem RF-14). |

**Rollback:**

- Etapas 1–3 são inteiramente client-side (sem migração de banco) — rollback é reverter o deploy do frontend. Risco baixo.
- Atenção: usuários que já instalaram o PWA mantêm o Service Worker da versão anterior em cache até a próxima atualização normal (RF-14) — um rollback de emergência deve considerar isso ao avaliar o tempo de propagação da correção.

**Monitoramento pós-deploy:**

- Taxa de instalação do PWA (evento `appinstalled`) por semana.
- Lighthouse CI (se configurado) — regressão no score de PWA/Performance bloqueia o merge.
- Volume de tentativas de escrita bloqueadas por offline (RF-11) — sinal indireto de quanto os usuários realmente enfrentam conectividade ruim, útil para priorizar NG-01 (fila de sync) no futuro.

---

## 16. Open Questions

Todas as questões abaixo foram revisadas e resolvidas em 2026-07-18 (v0.3). Mantidas na spec como registro de decisão (não removidas), conforme convenção de changelog do projeto.

| #   | Questão                                                                                                                              | Resolução (2026-07-18)                                                                                                                                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | O teto de retenção em disco de 30 dias (RNF-06) é o valor certo?                                                                     | **Resolvida — aceito como está.** Desde D9, o TTL não corta mais exibição, só decide quando o dado é removido do disco por higiene; o risco de "dado desatualizado sem aviso" já é coberto pelo indicador de idade (RF-13.1). Fica aberto para recalibração futura com dado de uso real, sem bloquear aprovação.                                                                 |
| Q2  | A página `/offline` (RF-07) deve ser uma rota dedicada ou um overlay renderizado sobre a última tela válida?                         | **Resolvida — rota dedicada (D12).** É a opção mais simples de implementar, alinhada ao padrão de App Router já usado no projeto (nenhuma tela hoje usa overlay global), e o cenário em que aparece (EC-01) é raro o suficiente para não justificar a complexidade extra. RF-07 já reflete essa decisão.                                                                         |
| Q3  | Vale formalizar esta spec como ADR também, dado que introduz um padrão arquitetural novo (client-side caching layer)?                | **Resolvida — não criar ADR agora.** O `CLAUDE.md` exige ADR para mudança de padrão _estabelecido_, não para um padrão _novo_; o Decision Log (§17) já documenta o racional com o mesmo rigor. Revisitar só se o cache client-side virar padrão replicado em outras partes do app.                                                                                               |
| Q4  | Qual prioridade de implementação para EC-03 (troca de usuário sem logout explícito)?                                                 | **Resolvida — prioridade elevada para Must (D13).** Custo de implementação é baixo (reaproveita a limpeza de RF-16 já existente) frente ao risco de exposição de dado entre usuários em dispositivo compartilhado; não vale esperar validação com usuários reais para uma proteção de segurança já barata de cobrir. EC-03 já reflete essa decisão.                              |
| Q5  | Vale empacotar o PWA como Trusted Web Activity (TWA) para distribuição via Play Store, depois desta fase estar validada em produção? | **Resolvida — não bloqueia esta spec.** Análise de mercado (2026-07-18): TWA reaproveita 100% do manifest/ícones/SW já previstos aqui (RF-01/02/05), custo baixo (US$ 25, sem tocar iOS). Padrão de mercado para produtos de nicho é validar retenção via PWA puro primeiro. Revisitar como spec própria (`specs/pwa/`) após T7.1 estar em produção e houver dados de uso reais. |

---

## 17. Decisões Tomadas (Decision Log)

| ID  | Decisão                                                                                                                                                                                                      | Alternativas consideradas                                                                                                                                | Racional                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Escopo desta spec restrito a instalação + leitura offline; escrita offline (fila de sync) e push notifications ficam em Non-Goals para uma spec futura                                                       | Entregar tudo de uma vez (instalação + sync + push)                                                                                                      | Prática de mercado consolidada é faturar PWA offline em fases — a complexidade de sync/conflito não deve bloquear o valor simples e imediato de "ver dados sem internet". Reduz risco de entregar uma fila de sincronização mal resolvida que perca dados do usuário.                                                                                                                                                                                                                                                                                                                                                                       |
| D2  | Uso de Serwist (`@serwist/next`) em vez de Workbox puro ou implementação manual do Service Worker                                                                                                            | Workbox standalone; Service Worker escrito à mão                                                                                                         | Serwist já está decidido na stack (`docs/architecture/overview.md`) e tem integração nativa com o build do Next.js App Router, reduzindo boilerplate de registro e versionamento do SW.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| D3  | Manifest via `app/manifest.ts` nativo do Next.js 16 em vez de `public/manifest.json` estático                                                                                                                | Arquivo estático em `public/`                                                                                                                            | A API nativa do App Router gera o manifest dinamicamente a partir de TypeScript (permite reaproveitar constantes de tema/cores do design system) e é a convenção recomendada para Next.js 13+ em diante.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D4  | Estratégias de cache diferenciadas por tipo de recurso: `CacheFirst` para assets versionados, `NetworkFirst` para navegação, `StaleWhileRevalidate` para GET de API, `NetworkOnly` para mutações        | Uma única estratégia genérica para tudo                                                                                                                  | Cada tipo de recurso tem uma tolerância diferente a dados desatualizados — assets versionados nunca mudam sob o mesmo hash (seguro cachear agressivamente); dados de API mudam com frequência (precisa balancear velocidade com atualização); mutações nunca podem ser "resolvidas" por cache.                                                                                                                                                                                                                                                                                                                                              |
| D5  | Atualização do Service Worker é opt-in via toast (RF-14), nunca reload automático silencioso                                                                                                                 | `skipWaiting()` automático assim que uma nova versão é detectada                                                                                         | Reload automático em segundo plano pode descartar dados não salvos de um formulário em digitação — prioriza não perder trabalho do usuário sobre "estar sempre na versão mais nova".                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| D6  | Cache de dados de API é limpo no evento `SIGNED_OUT` do Supabase Auth (RF-16)                                                                                                                                | Deixar o cache expirar naturalmente pelo TTL (RNF-06)                                                                                                    | Dispositivos compartilhados (tablets de frota, persona Ana) tornam a limpeza imediata no logout uma exigência de segurança, não apenas de higiene de dados — TTL de 7 dias sozinho deixaria uma janela grande de exposição a um segundo usuário.                                                                                                                                                                                                                                                                                                                                                                                            |
| D7  | Bloqueio de escrita offline (RF-11) ocorre no cliente, antes de qualquer chamada de rede — não depende do backend detectar ausência de payload                                                               | Deixar a requisição falhar naturalmente por timeout de rede e tratar o erro genérico resultante                                                          | Detecção client-side via `navigator.onLine`/eventos é instantânea e permite a mensagem específica ("sem conexão") em vez de um erro genérico de rede após um timeout longo — melhor experiência percebida.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| D8  | Indicador de status trocado de banner full-width para pill fixo no `Header`, com timestamp de última atualização (RF-13/R-PWA-07) em vez de aviso genérico                                                   | Manter o banner full-width original (v0.1)                                                                                                               | Revisão de v0.1 (2026-07-18) identificou que um banner que aparece/desaparece é fonte clássica de layout shift (contraria RNF-02/03) e competiria visualmente com o `VehicleContextChip`, que ocupa a mesma região do layout desde T5.4 (posterior à v0.1 desta spec). Um indicador de posição fixa, sempre presente (visível ou "vazio"), não desloca nada. O timestamp explícito também substitui um aviso vago ("pode estar desatualizado") por informação acionável.                                                                                                                                                                    |
| D9  | TTL de 30 dias (RNF-06/R-PWA-06) deixa de ser prazo de exibição e vira só teto de retenção em disco por higiene/segurança; RF-10 não força mais estado vazio por dado antigo enquanto o usuário está offline | Manter TTL de 7 dias cortando a exibição (v0.1)                                                                                                          | Revisão de v0.1 identificou que o corte de exibição aos 7 dias quebra a promessa central da feature (G-02) justamente no cenário mais relevante para a persona Carlos — viagens longas sem sinal. Combinado com D8 (indicador de idade sempre visível), passa a ser seguro manter o dado exibível por mais tempo: o usuário nunca é enganado sobre a idade do dado, então não há necessidade de escondê-lo. O valor de 30 dias é uma decisão de produto explícita nesta rodada — não decorre do ADR-003, que não define validade de refresh token por tempo fixo (verificado em `supabase/config.toml`: `inactivity_timeout` desabilitado). |
| D10 | §10.2 (toast de atualização) e §10.3 (banner de instalação iOS) reescritos para reaproveitar `ContextStaleToast`/`ui-store` (Zustand) e ícone em emoji, em vez de `Sonner` e `lucide-react`                  | Manter as referências originais (v0.1) a `Sonner`/`lucide-react`                                                                                         | v0.1 foi escrita antes de T5.4 estabelecer o padrão real de toast (`ContextStaleToast`) e a convenção de ícones do projeto (emoji, `VEHICLE_TYPE_ICONS`) — nenhuma das duas libs citadas originalmente está instalada em `apps/web/package.json`. Implementar como estava introduziria duas dependências novas e dois padrões visuais concorrentes com o que já existe, contrariando a regra global de não reinventar o que já existe.                                                                                                                                                                                                      |
| D11 | `navigator.onLine` tratado como sinal rápido, não como fonte única de verdade — falha de rede com `navigator.onLine === true` é reinterpretada como offline (RF-11.1/R-PWA-08/EC-08)                         | Confiar apenas em `navigator.onLine`/eventos `online`/`offline` (v0.1); ou implementar um endpoint de ping dedicado para checagem ativa de conectividade | `navigator.onLine` só reflete se há interface de rede ativa, não conectividade real (ex: Wi-Fi de posto sem internet) — API conhecidamente não confiável para esse fim. Reinterpretar falhas de rede (erro de conexão, não resposta HTTP) como sinal de offline resolve o caso mais comum sem exigir infraestrutura nova (endpoint de ping dedicado foi considerado e descartado por complexidade desproporcional ao ganho nesta fase).                                                                                                                                                                                                     |
| D12 | Q2 resolvida: `/offline` (RF-07) é rota dedicada (`apps/web/app/offline/page.tsx`), não um overlay sobre a última tela válida                                                                                | Overlay renderizado sobre a última tela válida, preservando mais contexto visual                                                                         | Rota dedicada é mais simples de implementar, segue o padrão de App Router já usado em todo o projeto (nenhuma tela hoje usa overlay global de página), e o cenário em que aparece (EC-01, primeira visita sem cache) é raro o suficiente para não justificar a complexidade extra de um overlay.                                                                                                                                                                                                                                                                                                                                            |
| D13 | Q4 resolvida: EC-03 (troca de usuário sem logout explícito) elevado de "prioridade a validar" para **Must**                                                                                                  | Deixar como caso a validar com usuários reais antes de decidir se implementa                                                                             | O custo de implementar é baixo — reaproveita a limpeza de cache já construída para RF-16/RF-17 — enquanto o custo de não implementar é exposição real de dado entre usuários num dispositivo compartilhado (persona Ana, tablets de frota). Não há motivo para esperar validação de uso quando a proteção já é barata e o risco é de segurança, não de UX.                                                                                                                                                                                                                                                                                  |

---

## Apêndice

### Referências

- `docs/PRD/PRD-v1.0.md` §5 "Estratégia Mobile-First e PWA" — Manifest/SW/Offline page marcados ✅ IN; Push Notifications ❌ OUT (Fase 2)
- `docs/user-stories.md` §11 "PWA — Offline e Instalação" (linhas 581–608) e §14 "Notificações Push" (linhas 675–702) — jornadas e gaps originais
- `docs/user-stories.md` linhas 2135–2144 — decisões pontuais de MVP que esta spec formaliza
- `.agents/pwa-offline-serwist.md` — esboço técnico original de estratégia de cache
- `.agents/navestory-ui-pwa/SKILL.md` — paleta de cores navestory e regras de UI mobile-first (touch targets, ícones)
- `docs/architecture/overview.md` — Serwist já listado na stack técnica
- `docs/architecture/decisions/003-auth-jwt-strategy.md` (ADR-003) — validade de access token (`jwt_expiry`, referenciada em EC-04); **não** define validade de refresh token por tempo fixo — o TTL de RNF-06/R-PWA-06 é decisão de produto independente (ver D9), confirmado contra `supabase/config.toml` (`inactivity_timeout` desabilitado)
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

- Cache names: `navestory-pages` (navegação), `navestory-api-data` (leitura de API) — usados literalmente em RF-16/D6, não renomear sem atualizar esta spec.
- Hooks em `apps/web/lib/pwa/`: `useOnlineStatus`, `useInstallPrompt`.

**Rastreabilidade no código:**

- Anotar `// @spec SPEC-20260712-001 RF-XX` nos arquivos relevantes.
- `// valida R-PWA-01` na configuração de `runtimeCaching` do `sw.ts`.
- `// valida R-PWA-02` no ponto de bloqueio de submissão offline.
- `// valida R-PWA-06` / `// valida S6` no listener de `SIGNED_OUT`.
- `// valida R-PWA-07` na função de formatação do timestamp "Hoje/Ontem/DD-MM-AA" do indicador (RF-13.1).
- `// valida R-PWA-08` no tratamento de falha de rede com `navigator.onLine === true` (RF-11.1).

**Atenção especial:**

- Esta spec está `approved` (v0.3, 2026-07-18) — pronta para implementação, conforme o gate de sincronia do `.claude/CLAUDE.md` (entrada correspondente já registrada em `matrices/rastreabilidade.md`).
- As Open Questions (§16) foram todas resolvidas em 2026-07-18 (v0.3) — mantidas na tabela como registro de decisão, não como pendências.
- Qualquer edição de conteúdo pós-aprovação exige entrada de changelog no rodapé desta spec (Histórico de Revisões), conforme regra do projeto para specs `approved`.

### Histórico de Revisões

| Versão | Data       | Autor   | Mudanças                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------ | ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1    | 2026-07-12 | douglps | Criação do rascunho inicial — consolida decisões dispersas em PRD, user-stories e esboços de `.agents/`; escopo restrito a instalação + leitura offline (Fase 1); fila de sync e push explicitamente adiados (Non-Goals)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 0.2    | 2026-07-18 | douglps | Revisão pré-aprovação: banner full-width de status (RF-13) substituído por indicador fixo com timestamp de última atualização (RF-13.1/R-PWA-07, D8); TTL de cache de API deixa de forçar estado vazio (RF-10) e vira teto de retenção em disco de 30 dias, desacoplado da UI (RNF-06/R-PWA-06, D9); G-02 reescrito para refletir o indicador com timestamp em vez de aviso genérico; `aria-live` adicionado ao indicador (§10.1, WCAG 2.2 AA); §10.2/§10.3 reescritos para reaproveitar `ContextStaleToast`/`ui-store` e ícone em emoji, em vez de `Sonner`/`lucide-react` (D10); `navigator.onLine` deixa de ser fonte única de verdade — falha de rede com "online" incorretamente reportado agora é tratada como offline retroativo (RF-11.1/R-PWA-08, EC-08, D11). Q5 (TWA/Play Store) também adicionada nesta revisão. **Passada final de consistência (mesmo dia):** removidos resíduos de texto "banner" nas jornadas de §6/§8.2; referência cruzada corrigida em RNF-06 (apontava para D8, é D9); exemplo de código em §11.1 atualizado de 7 para 30 dias com comentário explicando que a expiração do Workbox só limpa por higiene, nunca decide o que a UI exibe; §14 reescrito para não afirmar mais "alinhado à validade do refresh token"; Q1 recalibrada para refletir que o TTL não corta mais exibição; EC-04 corrigido de "15+ minutos" para "60+ minutos" após checar `jwt_expiry = 3600` em `supabase/config.toml` (o número anterior também não tinha fonte real); referência ao ADR-003 no Apêndice corrigida para não implicar que ele define o TTL de 30 dias; convenções de rastreabilidade e estrutura de arquivos (§11, Contexto para Agentes de IA) atualizadas com R-PWA-07/R-PWA-08 e o util `format-cache-age.ts`. |
| 0.3    | 2026-07-18 | douglps | Todas as 5 Open Questions (§16) resolvidas: Q1 (TTL de 30 dias) aceito como está; Q2 (rota dedicada vs. overlay para `/offline`) decidido por rota dedicada (D12), refletido em RF-07; Q3 (ADR) decidido por não criar agora; Q4 (prioridade de EC-03) elevada para Must (D13), refletido em EC-03; Q5 (TWA/Play Store) mantido como não-bloqueante, revisitar após T7.1 em produção. Nenhuma Open Question permanece bloqueando a aprovação.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 0.4    | 2026-07-18 | douglps | Implementação (T7.1) — RF-01 a RF-17 e edge cases relevantes codificados em `apps/web`; matriz de rastreabilidade atualizada com caminhos reais. Duas correções técnicas pós-aprovação, sem mudar comportamento observável nem exigir spec nova (mudança pequena, não estrutural): **(1)** §11.2/Apêndice pressupunham `supabase.auth.onAuthStateChange` no client para RF-16/RF-17 — este projeto não tem Supabase Auth Client no browser (sessão via cookie httpOnly + JWT, `apps/web/middleware.ts`); o gancho real é `apps/web/src/lib/auth/logout.ts`. EC-03 fica **⏸️ adiado**: o backend não expõe `user_id` ao client (`/auth/login` retorna só `{message}`), então não há como detectar troca de usuário sem logout explícito sem uma mudança de API fora do escopo desta implementação frontend — sinalizado na matriz de rastreabilidade, não implementado às cegas. **(2)** §11.1 exemplificava `@serwist/next` (v8, API `withSerwist(nextConfig)`), que depende do plugin de webpack — o build deste projeto usa Turbopack (padrão do Next.js 16), que não executa esse plugin (build "passava" sem gerar nenhum Service Worker). Migrado para `@serwist/turbopack` (v9), que compila o SW via route handler (`src/app/serwist/[path]/route.ts`) — compatível com Turbopack. Nomes de cache (`navestory-pages`/`navestory-api-data`) e estratégias por RF mantidos exatamente como especificado. Também corrigido em `apps/web/middleware.ts`: `/serwist`, `/manifest.webmanifest`, `/icons` e `/offline` precisam ser públicos (o middleware de auth os redirecionava para `/login`, quebrando o registro do Service Worker) — bug descoberto e corrigido durante a verificação end-to-end (`pnpm build && pnpm start` + `curl`).   |
| 0.5    | 2026-07-18 | douglps | Correção técnica pós-aprovação (mudança pequena, não estrutural — sem alteração de comportamento observável para o usuário): `apps/web/src/components/pwa/connectivity-indicator.tsx` adicionou guard `mounted` (useState + useEffect) para evitar hydration mismatch em RF-13. O problema: `useOnlineStatus()` lê `navigator.onLine` no client — se o dispositivo já estiver offline no momento do mount, o componente renderizava conteúdo diferente do SSR (que não tem `navigator`), causando erro de hidratação do React. Correção: o componente retorna `null` tanto no SSR quanto no primeiro render do client (antes de `setMounted(true)`); a partir do segundo tick do useEffect ele passa a refletir o estado real. Comportamento funcional do RF-13 preservado integralmente. IMPACTO-037 registrado em `matrices/impacto.md` (item 7).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 0.6    | 2026-07-20 | douglps | Correção de segurança pós-aprovação (achado T10 de `docs/qa/2026-07-19-plano-de-acao-auditoria.md`): a premissa de RF-16 de que `navestory-pages` contém "apenas o precache de assets estáticos públicos" estava incorreta — em `apps/web/src/app/sw.ts`, `navestory-pages` também é populado por `NetworkFirst` para qualquer navegação (`request.mode === "navigate"`, sem filtro de path), incluindo o shell HTML das rotas protegidas do grupo `(app)`. Isso deixava o shell de telas protegidas cacheado após o logout, criando uma janela de exposição em dispositivo compartilhado (S6) caso o Service Worker servisse esse shell no lugar do redirect do `middleware.ts` para `/login`. `clearApiCache()` (`apps/web/src/lib/pwa/clear-api-cache.ts`) passou a apagar `navestory-pages` inteiro além de `navestory-api-data` no logout — decisão deliberada de não filtrar seletivamente por rota, para não depender de uma lista de paths protegidos sincronizada manualmente com `middleware.ts`. O critério de aceite de RF-16 ("entradas de assets estáticos... permanecem") não reflete mais o comportamento implementado; mantido aqui como registro histórico da decisão original. Dado de outro usuário nunca vazou (RLS + `SupabaseAuthGuard` continuam bloqueando as chamadas de API) — o que vazava era só o shell visual. Verificação manual em navegador (Chrome + Firefox) do sintoma original e da correção ainda pendente do usuário.                                                                                                                                                                                                                                                                           |
