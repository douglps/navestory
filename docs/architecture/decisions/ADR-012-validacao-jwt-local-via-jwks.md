# ADR-012: Validação Local de JWT via JWKS (substitui round-trip a `auth.getUser()`)

## Status

Aceito

## Contexto

`ADR-003` (`003-auth-jwt-strategy.md`) decidiu o uso de JWT com sessão web em `httpOnly cookies`, mas não especificava o mecanismo de validação da assinatura do token a cada requisição. Até 2026-08-08, `SupabaseAuthGuard` e `SoftDeletedUserGuard` validavam o access token chamando `supabase.auth.getUser()` — um round-trip de rede ao GoTrue do Supabase em **toda** requisição autenticada.

O dashboard do navestory dispara várias chamadas paralelas por carregamento de tela (KPIs, alertas, gráficos, subheader financeiro). Cada uma delas pagava esse round-trip de forma independente, gerando dezenas de requisições concorrentes a `/auth/v1/user` por segundo por usuário ativo (achado de performance de Douglas em 2026-08-08).

## Decisão

A validação de assinatura do access token passa a ser feita **localmente**, contra o JWKS (JSON Web Key Set) publicado pelo GoTrue, usando a biblioteca `jose` (`jwtVerify` + `createRemoteJWKSet`). O JWKS é buscado e cacheado pela própria `jose` (rotação de chave suportada nativamente, sem gestão manual de cache de chave pública).

A lógica é compartilhada entre `SupabaseAuthGuard` e `SoftDeletedUserGuard` via `apps/api/src/common/guards/supabase-jwt.util.ts` (`extractSupabaseToken` + `verifySupabaseJwt`), eliminando duplicação entre os dois guards.

A checagem de `profiles.deleted_at` (soft-delete) continua sendo uma query real ao Postgres — não é algo inferível do JWT — mas ganhou cache em memória de 5 segundos por usuário (`PROFILE_CACHE_TTL_MS`) no próprio `SupabaseAuthGuard`, pelo mesmo motivo: várias chamadas paralelas por tela pagavam a mesma query redundante.

Este ADR estende `ADR-003` — não substitui a decisão de usar JWT/httpOnly cookies, apenas especifica e documenta o mecanismo de validação de assinatura.

## Consequências

- **Positivas:**
  - Elimina o round-trip de rede síncrono ao GoTrue em toda requisição autenticada — validação de assinatura passa a ser local (criptografia assimétrica, sem I/O de rede após o JWKS estar em cache).
  - Reduz a dependência de disponibilidade do GoTrue no caminho crítico de cada requisição: uma degradação momentânea do serviço de auth do Supabase não derruba requisições já autenticadas com token válido.
  - Elimina duplicação de lógica de extração/validação de token entre os dois guards.

- **Negativas / riscos aceitos:**
  - **Revogação não é imediata.** Um JWT assinado continua criptograficamente válido até sua expiração natural, mesmo que a sessão seja revogada no GoTrue (ex: logout forçado por admin, rotação de chave por incidente). `auth.getUser()` pegava revogação em tempo real; a validação local via JWKS não. Mitigação: o lifetime do access token já é curto (minutos, por decisão de `ADR-003`), limitando a janela de exposição.
  - **Cache de `deleted_at` é local à instância do processo.** O `Map` em memória de `SupabaseAuthGuard` não é compartilhado entre instâncias/pods. Em ambiente com múltiplas instâncias rodando em paralelo, uma conta marcada para soft-delete pode continuar acessível por até 5s em **qualquer instância que já tenha essa conta em cache antes do soft-delete**. Hoje a API roda em instância única — o risco é zero na prática — mas se o navestory escalar horizontalmente, este cache precisa virar um cache distribuído (Redis) ou o TTL precisa ser reavaliado.
  - **Erro de configuração do JWKS é uma falha silenciosa de segurança, não uma falha óbvia de build.** Se `SUPABASE_JWKS`/`SUPABASE_URL` apontarem para o endpoint errado, tokens válidos passam a ser rejeitados (falha segura, fail-closed) — não há risco de aceitar token de emissor errado, pois o `issuer` é validado explicitamente (`${supabaseUrl}/auth/v1`).

## Referências

- `apps/api/src/common/guards/supabase-jwt.util.ts` — implementação de `extractSupabaseToken`/`verifySupabaseJwt`
- `apps/api/src/common/guards/supabase-auth.guard.ts`, `soft-deleted-user.guard.ts` — consumidores
- `apps/api/src/shared/supabase/supabase.constants.ts`, `supabase.module.ts` — provider `SUPABASE_JWKS`
- `docs/architecture/decisions/003-auth-jwt-strategy.md` — ADR-003, decisão base de estratégia JWT/cookie que este ADR estende
