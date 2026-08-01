# Acordo de Processamento de Dados — navestory SaaS

> Contrato-modelo entre navestory Tecnologia Ltda. (controlador) e subprocessadores de dados. Este documento consolida informações de `docs/legal/privacy-policy.md` sobre compartilhamento de dados com terceiros.

**Última atualização:** 2026-07-13  
**Controlador:** navestory Tecnologia Ltda.  
**DPO:** privacidade@navestory.app

---

## 1. Introdução

A **navestory Tecnologia Ltda.** (doravante "navestory" ou "Controlador"), na qualidade de controlador de dados pessoais conforme a LGPD (Lei 13.709/2018), instrui e supervisiona os **subprocessadores** listados neste documento a processar dados pessoais exclusivamente por sua instrução e nos limites da finalidade descrita.

Este documento serve como referência técnica interna e como base para acordos formais com cada subprocessador. **Nenhum dado é compartilhado com terceiros para fins comerciais ou publicitários.**

---

## 2. Lista de subprocessadores

**Subprocessador identificado em documentação existente do repositório:**

| Subprocessador    | Função                                                                                            | Dados transferidos                                                                                                        | Localização                                                                               | Referência                        |
| ----------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------- |
| **Supabase Inc.** | Banco de dados PostgreSQL gerenciado, autenticação (GoTrue) e armazenamento de arquivos (Storage) | Todos os dados de conta do usuário: perfil, veículos, despesas, manutenções, multas, logs de auditoria, fotos de veículos | EUA (servidores AWS — região a confirmar com o Supabase no momento do deploy de produção) | `docs/legal/privacy-policy.md` §4 |

**Subprocessadores adicionais — situação pendente:**

A lista abaixo refere subprocessadores que podem ser necessários com base em specs aprovadas, mas cuja contratação formal ainda não foi confirmada no repositório:

| Subprocessador potencial          | Função                                                                     | Status                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Resend** (ou alternativa)       | Envio de e-mails transacionais e alertas de manutenção (SPEC-20260521-002) | Pendente — `RESEND_API_KEY` referenciada em specs mas acordo formal não documentado                                  |
| **Vercel Inc.**                   | Hospedagem do frontend `apps/web`                                          | Pendente — README menciona Vercel como provedor de deploy, mas acordo de processamento de dados não está formalizado |
| Provedor de hospedagem do backend | Hospedagem de `apps/api`                                                   | Pendente — nenhuma decisão formal sobre provedor do backend (apenas Vercel para o frontend está no README)           |
| Provedor de monitoramento/APM     | Rastreamento de erros em produção (ex: Sentry)                             | Pendente — nenhum ADR ou spec define o provedor                                                                      |

> Se um novo subprocessador for contratado, ele **deve ser adicionado a esta lista antes de iniciar o processamento de dados pessoais**.

---

## 3. Obrigações do subprocessador

Todo subprocessador da navestory deve:

1. Processar dados pessoais **apenas por instrução documentada** da navestory, nunca para finalidades próprias
2. Garantir **confidencialidade**: apenas pessoal autorizado e com necessidade de conhecer acessa os dados
3. Implementar **medidas técnicas e organizacionais** adequadas ao risco (criptografia em repouso e em trânsito, controle de acesso, logs de auditoria)
4. **Não subcontratar** o processamento a outros sem aprovação prévia por escrito da navestory
5. **Notificar a navestory** sobre qualquer incidente de segurança que afete dados pessoais da navestory sem demora injustificada
6. **Apoiar** a navestory no cumprimento de obrigações perante titulares de dados (exclusão, portabilidade, acesso)
7. Ao término do contrato, **apagar ou devolver** todos os dados pessoais, conforme instrução da navestory

---

## 4. Detalhamento: Supabase Inc.

O Supabase é o principal subprocessador, responsável pela infraestrutura central da plataforma.

### 4.1 Dados processados

- Tabelas PostgreSQL: todos os dados de domínio listados em `docs/reference/database-schema.md`
- Autenticação: hash de senha (bcrypt, gerenciado pelo GoTrue), tokens JWT, e-mail do usuário
- Storage: fotos de veículos e outros arquivos enviados pelo usuário

### 4.2 Medidas de segurança do Supabase

Conforme documentação pública do Supabase e mencionado em `docs/legal/privacy-policy.md`:

- Certificação SOC 2 Type II
- Criptografia em repouso (gerenciada pela AWS)
- Criptografia em trânsito (TLS)
- Conformidade com padrões internacionais de segurança

Referência: supabase.com/privacy e supabase.com/security

### 4.3 Transferência internacional de dados

Os dados são armazenados em servidores do Supabase na AWS. O Supabase dispõe de cláusulas contratuais compatíveis com a LGPD para transferências internacionais. A região AWS específica (ex: `us-east-1`, `sa-east-1`) deve ser confirmada e documentada aqui no momento da configuração do projeto de produção — **esta informação está pendente**.

### 4.4 Configuração de segurança obrigatória no projeto `navestory` (Supabase)

Antes do lançamento em produção, as seguintes configurações devem estar ativas no Dashboard do Supabase:

- [ ] RLS habilitado em **todas** as tabelas de domínio (regra S2)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` exposta **apenas** no backend; nunca como `NEXT_PUBLIC_*` (regra S3)
- [ ] Buckets do Storage sem policy de LIST público (regra S8)
- [ ] Funções SQL com `search_path` fixo (regra S9)
- [ ] Funções SQL que retornam dados de usuário validam `auth.uid()` internamente (regra S7)
- [ ] Proteção HaveIBeenPwned habilitada em Auth → Security (Tarefa T0.11 do roadmap)
- [ ] PITR (Point-in-Time Recovery) ativo no plano Pro ou superior (ver `docs/operations/disaster-recovery.md`)

---

## 5. Transferências internacionais de dados

A LGPD exige que transferências internacionais de dados pessoais ocorram apenas para países que proporcionem grau adequado de proteção ou mediante garantias adequadas (art. 33).

O Supabase Inc. está estabelecido nos EUA. A base para transferência é a existência de cláusulas contratuais padrão e certificações de segurança mantidas pelo Supabase. **A navestory deve confirmar formalmente com o Supabase a existência de um DPA (Data Processing Agreement) assinado antes do processamento de dados de produção.**

Para os demais subprocessadores (Vercel, Resend e outros a contratar), a avaliação de adequação para transferência internacional deve ser feita individualmente no momento da contratação.

---

## 6. Revisão e atualização

Este documento deve ser revisado:

- Ao contratar ou descontratar qualquer subprocessador
- Ao alterar o tipo de dados processados por um subprocessador existente
- Anualmente como revisão de rotina de governança de dados

Alterações devem ser registradas no histórico de versões abaixo.

---

## Histórico de versões

| Versão | Data       | Mudança                                                                                                                      |
| ------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1.0    | 2026-07-13 | Criação do documento; consolidação de subprocessadores identificados no repositório; lista de pendências formais documentada |
