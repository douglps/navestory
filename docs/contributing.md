# Contribuindo para o navestory SaaS

## Fluxo de Trabalho

1. Crie uma branch a partir de `master`: `git checkout -b feature/sua-feature`
2. **Specs antes de código** — toda feature nova exige spec aprovada em `specs/<domínio>/`
3. Atualize a documentação afetada (**PR sem doc = PR rejeitado**)
4. Mudança arquitetural? Adicione um ADR em `docs/architecture/decisions/` antes de implementar
5. Mantenha testes e linters passando antes do push

## Padrão de Commits (Conventional Commits)

| Tipo        | Descrição                                |
| ----------- | ---------------------------------------- |
| `feat:`     | Nova feature                             |
| `fix:`      | Bug fix                                  |
| `docs:`     | Documentação                             |
| `refactor:` | Refatoração sem mudança de comportamento |
| `test:`     | Testes                                   |
| `chore:`    | Manutenção (deps, config, CI)            |

## Padrões de Código

- TypeScript strict — sem `any` sem justificativa
- ESLint + Prettier — rodar `pnpm lint` antes de commitar
- Testes obrigatórios para qualquer feature nova
- Sem `console.log` / `debugger` esquecidos no código final
- Sem secrets hardcoded — usar variáveis de ambiente

## Segurança

- Nunca commitar arquivos `.env` ou credenciais
- Reportar vulnerabilidades conforme `docs/security.md`

## Reporte de Bugs

Crie uma Issue detalhando: ambiente, passos para reproduzir e evidências (logs, screenshots).
