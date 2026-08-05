# PRD — navestory SaaS

> Documento completo: [`docs/PRD/PRD-v1.0.md`](../docs/PRD/PRD-v1.0.md)

---

## Visão

**"Permitir que proprietários de veículos gerenciem manutenções e despesas em um único lugar, reduzindo custos operacionais e evitando esquecimentos críticos."**

---

## Personas Alvo

| ID    | Persona                         | Perfil                                                                            | Prioridade |
| ----- | ------------------------------- | --------------------------------------------------------------------------------- | ---------- |
| P-001 | Carlos, Motorista Autônomo      | 35-50 anos, usa o veículo para trabalho, controla custo individual no celular     | MVP        |
| P-002 | Ana, Gestora de Frota Pequena   | 28-45 anos, gerencia 3-10 veículos, toma decisões com dados, usa desktop e mobile | MVP        |
| P-003 | Roberto, Gestor de Grande Frota | 40-55 anos, 50-500 veículos, precisa de dashboards consolidados                   | Fase 2     |

---

## Jobs to Be Done

### Usuário individual

1. Registrar despesa logo após abastecimento (< 30 segundos, mobile)
2. Verificar quais manutenções estão vencidas ou próximas do vencimento
3. Controlar o gasto mensal total e por categoria de um veículo
4. Exportar despesas do período para Excel/Google Sheets
5. Saber o custo por km de cada veículo

### Gestor de workspace (workspace_owner — plano Frota)

6. Ter visão consolidada e atualizada da situação documental de cada motorista do workspace (CNH vigente, cadastro mínimo preenchido) sem depender de planilha ou cobrança manual fora do produto
7. Configurar quais campos são obrigatórios e o que cada motorista convidado deve preencher antes do primeiro uso, garantindo padrão de dados em toda a equipe sem precisar cobrar individualmente

---

## Critérios de Sucesso (Métricas Observáveis)

| Métrica                                | Alvo                               |
| -------------------------------------- | ---------------------------------- |
| Tempo para criar uma despesa           | < 30 segundos                      |
| Duplicatas inseridas sem aviso         | 0 (valida R2)                      |
| Manutenções com alerta enviado a tempo | 100% das agendadas a 7 dias        |
| Health score calculado por veículo     | Presente em cada abertura de ficha |
| Lighthouse Mobile                      | > 90                               |

---

## Não Objetivos (Escopo Fora do MVP)

- Rastreamento GPS de veículos
- Integração com seguradoras ou financeiras
- Aplicativo nativo (React Native / Flutter)
- OAuth, MFA, login social
- Push notifications nativas
- Multi-usuário por conta (veículo compartilhado entre usuários)
- API pública para integrações externas

---

## Riscos e Hipóteses Não Validadas

| Risco                     | Hipótese                                          | Mitigação                                   |
| ------------------------- | ------------------------------------------------- | ------------------------------------------- |
| Fidelidade do odômetro    | Usuários preenchem odômetro corretamente toda vez | Warning R1 + campo não-bloqueante           |
| Adoção mobile-first       | 80%+ dos usuários acessam pelo celular            | PWA + layout mobile-first                   |
| Categorias inconsistentes | Usuários categorizam gastos de forma diferente    | Categorias padrão + customizáveis (ADR-003) |
| Engajamento com templates | Usuários repetirão despesas frequentes            | Templates ordenados por uso recente (P2)    |
