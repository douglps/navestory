# Specs — Autenticação e Cadastro

Regras: S1 (JWT obrigatório), S4 (rate limit), S11 (redirect global em 401 client-side)

| Spec | Título | Status |
|------|--------|--------|
| [SPEC-20260524-001](SPEC-20260524-001.md) | Autenticação e Cadastro — Especificação Unificada | Aprovado |
| [SPEC-20260524-002](SPEC-20260524-002.md) | Cadastro de Conta — Regras de Senha e Comportamentos Frontend | Aprovado |
| [SPEC-20260731-003](SPEC-20260731-003-redirect-login-sessao-invalida.md) | Redirecionamento Global para /login em 401 de Chamadas Client-Side (Sessão Inválida) | Aprovado |

Implementação em `apps/api/src/modules/auth/` e `apps/web/app/(auth)/`.
