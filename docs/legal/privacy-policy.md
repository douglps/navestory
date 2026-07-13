# Política de Privacidade — Nave

**Versão:** 1.0  
**Vigência:** a partir de março de 2026  
**Última atualização:** maio de 2026

---

> Esta Política explica como a Nave coleta, usa, armazena e protege seus dados pessoais. Redigimos de forma direta para que você saiba exatamente o que acontece com suas informações — sem letras miúdas.

---

## 1. Quem somos

A **Nave Tecnologia Ltda.** é a empresa responsável pela plataforma Nave — gestão inteligente de veículos. Somos o **controlador** dos seus dados pessoais, conforme definido pela Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).

**Contato do encarregado de dados (DPO):**  
E-mail: privacidade@nave.app  
Resposta em até 5 dias úteis.

---

## 2. Que dados coletamos

Coletamos apenas o necessário para que o serviço funcione. Veja o detalhamento abaixo:

### 2.1 Dados que você fornece diretamente

| Dado | Quando | Para quê |
|------|--------|----------|
| Nome completo | Cadastro | Identificar sua conta e personalizar a experiência |
| E-mail | Cadastro | Autenticação, comunicados e alertas de manutenção |
| Senha | Cadastro | Acesso seguro (armazenada com hash — não lemos sua senha) |
| Tipo de perfil | Cadastro | Adaptar funcionalidades (autônomo, gestor de frota) |
| Dados dos veículos | Uso do app | Placa (formato Mercosul ou padrão), marca, modelo, ano, cor, fotos |
| Despesas | Uso do app | Categoria, valor, data, veículo vinculado, observações |
| Manutenções | Uso do app | Tipo de serviço, data agendada, status, veículo vinculado |

### 2.2 Dados coletados automaticamente

| Dado | Origem | Para quê |
|------|--------|----------|
| Endereço IP | Toda requisição | Segurança, rate limiting e prevenção de fraudes |
| Tipo e versão do navegador | Toda requisição | Compatibilidade e diagnóstico técnico |
| Tokens de sessão (JWT) | Login | Manter sua sessão ativa com segurança |
| Logs de acesso | Toda ação | Auditoria de segurança — **sem dados pessoais identificáveis** |
| Cache local (Service Worker) | Navegação | Funcionamento offline e performance |

### 2.3 O que **não** coletamos

- Localização GPS
- Contatos do dispositivo
- Dados de outros aplicativos
- Informações financeiras além das que você mesmo insere (não há integração com bancos)
- Dados biométricos

---

## 3. Por que usamos seus dados

Cada uso tem uma finalidade clara e uma base legal definida pela LGPD:

| Finalidade | Base legal (LGPD) |
|-----------|-------------------|
| Criar e gerenciar sua conta | Execução de contrato (art. 7º, V) |
| Exibir seus veículos, despesas e manutenções | Execução de contrato (art. 7º, V) |
| Enviar alertas de manutenção por e-mail | Execução de contrato (art. 7º, V) |
| Proteger a plataforma contra acessos indevidos | Legítimo interesse (art. 7º, IX) |
| Gerar logs de segurança e auditoria | Legítimo interesse (art. 7º, IX) |
| Enviar comunicados sobre o serviço (mudanças, incidentes) | Legítimo interesse (art. 7º, IX) |
| Melhorar a plataforma com base em uso agregado e anônimo | Legítimo interesse (art. 7º, IX) |
| Cumprir obrigações legais | Cumprimento de obrigação legal (art. 7º, II) |

**Não usamos seus dados para publicidade de terceiros.**

---

## 4. Com quem compartilhamos seus dados

A Nave **não vende nem aluga** seus dados. Compartilhamos apenas com fornecedores de infraestrutura essenciais para o funcionamento do serviço:

### Subprocessadores

| Fornecedor | Função | Dados compartilhados | País |
|-----------|--------|----------------------|------|
| **Supabase Inc.** | Banco de dados, autenticação e armazenamento de arquivos | Todos os dados da conta (armazenados e processados sob contrato) | EUA (servidores AWS) |

> **Transferência internacional:** os dados são armazenados em servidores do Supabase na AWS. O Supabase mantém conformidade com padrões internacionais de segurança (SOC 2 Type II) e possui cláusulas contratuais compatíveis com a LGPD. Você pode consultar a política de privacidade do Supabase em supabase.com/privacy.

Podemos ainda compartilhar dados quando **exigido por lei** — como em resposta a ordem judicial ou requisição de autoridade pública competente — sem necessidade de seu consentimento prévio, nos termos do art. 7º, II da LGPD.

---

## 5. Como protegemos seus dados

Adotamos medidas técnicas e organizacionais para proteger suas informações:

**Técnicas:**
- **Isolamento por usuário:** cada conta acessa apenas os próprios dados, garantido por Row Level Security (RLS) diretamente no banco de dados — não apenas na aplicação
- **Criptografia em repouso:** todos os dados armazenados são criptografados pela infraestrutura Supabase/AWS
- **Criptografia em trânsito:** toda comunicação usa HTTPS/TLS
- **Senhas com hash:** armazenamos apenas o hash da sua senha (bcrypt, 12 rounds) — nem nós conseguimos ver sua senha
- **Tokens de curta duração:** tokens de acesso expiram em 15 minutos; tokens de atualização expiram em 7 dias
- **Rate limiting:** limitamos requisições por IP para prevenir ataques automatizados
- **Logs sem PII:** registros de auditoria não contêm dados pessoais identificáveis

**Organizacionais:**
- Acesso ao banco de produção restrito a pessoal autorizado
- Revisão periódica de permissões e acessos

Nenhum sistema é 100% seguro. Em caso de incidente que coloque seus direitos em risco, você será notificado dentro do prazo legal.

---

## 6. Por quanto tempo guardamos seus dados

| Situação | Prazo de retenção |
|----------|-------------------|
| Conta ativa | Enquanto você usar o serviço |
| Após solicitação de exclusão da conta | 30 dias (para possível reversão) |
| Após os 30 dias de carência | Exclusão definitiva ou anonimização irreversível |
| Logs de segurança (sem PII) | Até 12 meses |
| Dados exigidos por obrigação legal | Conforme prazo da legislação aplicável |

---

## 7. Cookies e armazenamento local

A Nave usa recursos de armazenamento no seu dispositivo de forma mínima:

| Recurso | O que armazena | Por quê |
|---------|---------------|---------|
| **Cookie de sessão** | Token de autenticação (JWT) | Manter você logado com segurança |
| **Service Worker cache** | Assets do app e respostas da API | Funcionamento offline e performance |
| **localStorage** | Preferências de interface (tema, etc.) | Experiência personalizada |

Não usamos cookies de rastreamento publicitário nem ferramentas de análise que identifiquem você individualmente.

---

## 8. Seus direitos como titular de dados

A LGPD garante os seguintes direitos — e nos comprometemos a atendê-los de forma ágil:

| Direito | O que significa | Como exercer |
|---------|----------------|--------------|
| **Acesso** | Saber quais dados temos sobre você | Solicitar por e-mail |
| **Correção** | Corrigir dados incompletos ou imprecisos | Direto nas configurações do perfil ou por e-mail |
| **Exclusão** | Apagar seus dados da nossa base | Configurações da conta → "Excluir conta" ou por e-mail |
| **Portabilidade** | Receber seus dados em formato estruturado (CSV) | Export disponível no Dashboard ou por e-mail |
| **Revogação do consentimento** | Desfazer consentimentos dados | Por e-mail; pode limitar funcionalidades |
| **Informação sobre compartilhamento** | Saber com quem seus dados foram compartilhados | Por e-mail |
| **Oposição** | Contestar tratamento baseado em legítimo interesse | Por e-mail |
| **Revisão de decisões automatizadas** | Questionar decisões tomadas por algoritmos | Por e-mail (quando aplicável) |

Para exercer qualquer direito: **privacidade@nave.app** — respondemos em até **5 dias úteis**.

Você também pode encaminhar reclamações à **Autoridade Nacional de Proteção de Dados (ANPD)** em gov.br/anpd.

---

## 9. Menores de idade

A Nave não é destinada a menores de 18 anos. Não coletamos intencionalmente dados de menores. Se tomarmos conhecimento de que um menor criou uma conta, excluiremos os dados imediatamente.

---

## 10. Alterações nesta Política

Podemos atualizar esta Política quando necessário — por mudanças no serviço, na legislação ou nas práticas de segurança.

Quando isso acontecer:
- Avisaremos por **e-mail** com pelo menos **15 dias de antecedência**;
- A data de "última atualização" no topo deste documento será alterada;
- Mudanças significativas podem exigir sua confirmação ativa antes de entrarem em vigor.

---

## 11. Contato

Para qualquer dúvida, solicitação ou exercício de direitos:

**Encarregado de Dados (DPO):** privacidade@nave.app  
**Segurança:** seguranca@nave.app  
**Prazo de resposta:** até 5 dias úteis

---

*Sua privacidade importa para nós. Se algo aqui não estiver claro, escreva — estamos disponíveis para explicar.*
