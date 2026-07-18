# Changelog

Todas as mudanças notáveis deste projeto são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e este projeto
adota [Versionamento Semântico](https://semver.org/lang/pt-BR/) a partir do primeiro release
público.

## [Não lançado]

Projeto ainda não teve um release versionado — em desenvolvimento pré-1.0 (`package.json` em
`0.0.0`). Entradas abaixo acumulam mudanças notáveis desde que o pipeline de CD
(`SPEC-20260716-001`) foi aprovado, até o primeiro deploy de produção.

### Adicionado
- Pipeline de CI/CD (`.github/workflows/cd.yml`) com gate de aprovação humana em produção (`SPEC-20260716-001`).
- Observabilidade estruturada: logging com Pino (redação de PII), health check com timeout por dependência, integração Sentry (`SPEC-20260716-002`).
- Motor de Analytics: TCO, tendência de combustível, detecção de anomalias, benchmark de frota, projeção de custos, sazonalidade e insights em linguagem natural (`SPEC-20260622-001`).

---

## Como manter este arquivo

- Toda mudança **notável para quem opera ou usa o produto** (não todo commit) ganha uma entrada em
  `[Não lançado]`, nas categorias: `Adicionado`, `Modificado`, `Descontinuado`, `Removido`,
  `Corrigido`, `Segurança`.
- No primeiro release em produção, a seção `[Não lançado]` vira `[0.1.0] - AAAA-MM-DD` (ou a
  versão correspondente) e uma nova seção `[Não lançado]` vazia é criada acima.
- Este arquivo é sobre **impacto observável** (o que mudou para quem usa o sistema), não sobre
  detalhe de implementação — esse detalhe já vive nas specs (`specs/`) e nos commits
  (Conventional Commits).
