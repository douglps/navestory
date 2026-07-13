# Política de Segurança

## Reportar Vulnerabilidade

1. **NÃO** crie issue pública
2. Email: lps.doug@protonmail.com
3. Resposta em até 72h

## Severidade

| Tipo                   | Resposta |
| ---------------------- | -------- |
| RCE, SQLi, Auth Bypass | 24h      |
| XSS, CSRF              | 72h      |
| Info Disclosure        | 7 dias   |

## Ferramentas

- Secret Scanning: Ativado
- Dependabot: Ativado
- CodeQL: Ativado

## Processo

- Revisão trimestral do OWASP Checklist em `docs/architecture/security/`
- Divulgação Responsável: não publicar o incidente até que haja patch de correção aplicado
