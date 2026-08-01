# ADR-008: Divisão de Responsabilidade entre TanStack Query e Zustand

## Status

Accepted

## Context

Documentos existentes do repositório divergiam sobre a estratégia de estado no frontend:

- README.md e `docs/architecture/overview.md` citavam **Zustand 5** como solução de estado (inclusive um `use-dashboard-store.ts` referenciado em `matrices/impacto.md`).
- `.agents/rules/stack.md` determinava **TanStack Query** para dados vindos do servidor e explicitamente instruía "evitar Zustand/Redux para dados do servidor".

Essas duas afirmações não são mutuamente exclusivas — o conflito era de **escopo mal definido**, não de tecnologia incompatível. Antes de iniciar a implementação, era necessário decidir explicitamente a fronteira de responsabilidade entre as duas ferramentas, e avaliar alternativas de mercado (Apollo Client, RTK Query, SWR).

### Alternativas avaliadas

1. **Apollo Client** — descartado. É uma solução acoplada a GraphQL; o backend do navestory é REST (NestJS) com validação Zod compartilhada (ADR de arquitetura, `specs/API-SPEC.md`). Adotar Apollo exigiria uma camada GraphQL inexistente no projeto.
2. **RTK Query** — descartado. Resolveria o mesmo problema que o TanStack Query (cache/sincronização de dados de servidor), mas exige trazer o Redux Toolkit inteiro como dependência de estado global, o que é redundante já que o Zustand já cobre o estado de UI. Duplicaria responsabilidade sem ganho.
3. **SWR** — descartado. Mais enxuto que o TanStack Query, mas com API de mutations mais limitada e sem suporte nativo a pausa/retomada de mutações offline — relevante para a regra **R-PWA-02** (bloqueio client-side de mutação offline) da spec `pwa/SPEC-20260712-001`.
4. **TanStack Query + Zustand com fronteira explícita** — escolhida.

## Decision

Adotar **TanStack Query** para todo estado que se origina do backend (dados de servidor: listagens, detalhes, mutations, cache, invalidação, retry, estado offline/pausa de mutation) e **Zustand** exclusivamente para estado de UI puramente client-side que não representa dado de servidor (ex: estado de modais, wizard multi-step, tema, filtros temporários de UI antes de aplicados, o "Em Foco" de veículo quando não precisar ser hidratado do servidor a cada render).

Regra prática de fronteira:

- Se o dado pode ficar desatualizado e precisa ser revalidado/sincronizado com o backend → **TanStack Query**.
- Se o dado só existe no cliente e nunca é persistido isoladamente no servidor → **Zustand**.

Em Server Components/Server Actions (Next.js 16 App Router), a leitura inicial pode ocorrer no servidor; a hidratação subsequente no cliente usa TanStack Query para manter cache e revalidação consistentes, evitando estado duplicado entre Server Component e client store.

## Consequences

**Facilita:**

- Elimina duplicação de cache: dados de servidor não são espelhados manualmente em um store Zustand.
- TanStack Query já oferece deduplicação de requests, retry, cache por chave e pausa de mutations offline — direto para PWA (R-PWA-02).
- Zustand permanece leve, dedicado a estado de UI, sem crescer para virar um "cache de API paralelo".

**Dificulta:**

- Exige disciplina de code review para não vazar dado de servidor para dentro de um store Zustand por conveniência.
- Times acostumados a Redux/RTK Query precisam internalizar a fronteira de responsabilidade (documentada aqui e em `.agents/rules/stack.md`, que deve ser atualizado para refletir esta decisão).

**Trade-offs aceitos:**

- Duas bibliotecas de estado no bundle em vez de uma única solução all-in-one — aceito porque cada uma resolve um problema diferente e ambas já eram usadas em pontos distintos da documentação anterior.

## References

- `.agents/rules/stack.md` — deve ser atualizado para remover a proibição genérica a Zustand e registrar a fronteira acima
- `docs/architecture/overview.md` — stack técnica geral
- `specs/pwa/SPEC-20260712-001.md` — R-PWA-02 (bloqueio de mutação offline)
- `docs/IMPLEMENTATION_STRATEGY.md` — Fase de Fundação, tarefa de setup de estado
