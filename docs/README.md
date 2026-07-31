# 📚 Índice Mestre de Documentação - Nave SaaS

Bem-vindo à documentação oficial do **Nave SaaS**. Este índice organiza toda a base de conhecimento do projeto de acordo com a estrutura [Diátaxis](https://diataxis.fr/) e os requisitos oficiais de Produto e Arquitetura.

---

## 🗺️ Navegação Principal (Diataxis)

A documentação do Nave é dividida em quatro quadrantes, além das definições centrais de produto e operação:

| Categoria         | Descrição                                                                | Diretório                                   |
| ----------------- | ------------------------------------------------------------------------ | ------------------------------------------- |
| **Tutorials**     | Guias passo-a-passo e focados em aprendizado para novos desenvolvedores. | [`/docs/tutorials`](/docs/tutorials/)       |
| **How-To Guides** | Guias orientados a problemas ou tarefas específicas para o dia a dia.    | [`/docs/guides`](/docs/guides/)             |
| **Reference**     | Informação técnica objetiva (APIs, Schemas, Código).                     | [`/docs/reference`](/docs/reference/)       |
| **Explanation**   | Contexto arquitetural, decisões (ADRs) e visão sistêmica.                | [`/docs/architecture`](/docs/architecture/) |

---

## 📋 Produto e Requisitos (PRD)

Documentos oficiais que guiam o ciclo de vida de desenvolvimento do MVP.

- 📄 [PRD v1.0 Consolidado](./PRD/PRD-v1.0.md) (Leitura Humana)
- 🤖 [PRD v1.0 Machine-Readable](./PRD/PRD-v1.0.json) (Validação e Integração IA)
- 📝 [Esquema JSON do PRD](./PRD/prd-schema.json)
- 🔄 [Changelog Oficial](./PRD/changelog.md)
- 📖 [User Stories — Jornadas e Gaps](./user-stories.md)
- 🎨 [Apresentação do Sistema — Referência para Design e Produto](./product/apresentacao-sistema-design-produto.md)

---

## 🏗️ Arquitetura e Engenharia

- 📐 **Visão Geral:** [Architecture Overview](./architecture/overview.md)
- 🛡️ **Segurança:** [Security Guidelines](./architecture/security/README.md)
- 📜 **Decisões (ADRs):** [Architectural Decision Records](./architecture/decisions/)
- 🔌 **Contratos de API:** [OpenAPI Spec](./api/openapi.yaml)

---

## ⚙️ Operações e Legal

- 🛠️ **Operações:** [Runbooks e Infraestrutura](./operations/)
- ⚖️ **Legal:** [Termos, Privacidade e LGPD](./legal/)
- 👥 **Comunidade:** [Código de Conduta](./code-of-conduct.md) e [Guia de Contribuição](./contributing.md)

---

> **Nota:** Todos os PRs que incluírem novas features devem acompanhar as alterações correspondentes nos quadrantes Diataxis apropriados e ser adicionados ao Changelog.
