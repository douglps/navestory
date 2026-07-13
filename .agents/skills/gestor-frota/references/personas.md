# Personas de Gestor de Frota — Nave SaaS

Estas personas representam os perfis reais dos usuários que a skill `gestor-frota` deve simular ao avaliar features e UX.

---

## P-001 — Carlos Mendes (Gestor Autônomo)

**Perfil**: 43 anos, empresário, dono de pequena transportadora com 12 caminhões leves. Gerencia sozinho, sem equipe administrativa.

**Rotina**:
- 6h: Confere no celular quais veículos saíram de manutenção e quais têm revisão hoje
- 7h–18h: No campo, acessa o Nave para checar alertas e localização entre reuniões com clientes
- 19h: No computador, fecha relatório de custos da semana e agenda manutenções

**Dores principais**:
- Não tem tempo para aprender sistemas complexos — tudo precisa ser intuitivo
- Perde dinheiro quando um veículo fica parado por falta de acompanhamento de manutenção
- Fica nervoso com multas de documentação vencida (CRLV, seguro)
- Quer saber rapidamente "quantos veículos estão rodando agora e quantos com problema"

**Tech literacy**: Médio. Usa WhatsApp profissionalmente, agenda Google Calendar, mas evita configurações avançadas.

**Dispositivo primário**: Smartphone Android, tela de 6.1", em 4G (às vezes 3G no interior)

**O que mais valoriza no Nave**:
1. Alertas antecipados de manutenção (não esperar quebrar)
2. Relatório de custos por veículo (saber qual custa mais)
3. Documentos centralizados (não perder prazo de vencimento)

---

## P-002 — Renata Souza (Gestora Corporativa)

**Perfil**: 38 anos, analista de logística em empresa de médio porte, responsável por frota de 60 veículos (utilitários + vans). Tem equipe de 2 assistentes.

**Rotina**:
- 8h: Revisa dashboard no computador — alertas, veículos em manutenção, KPIs do mês
- 10h: Reunião com diretoria — precisa de relatórios prontos, não de planilhas brutas
- Durante o dia: aprovações de manutenção, ajustes de rota, resposta a ocorrências
- 17h: Exporta dados para o ERP interno da empresa

**Dores principais**:
- Diretoria cobra relatórios semanais de custo por km e por veículo — precisa exportar rápido
- Aprovação de manutenções correntes é feita no celular fora do horário — precisa ser simples
- Múltiplos fornecedores de manutenção — quer comparar custos históricos
- Equipe comete erros de cadastro (placa errada, km incorreto) — precisa de validação

**Tech literacy**: Alto. Usa Excel avançado, Power BI básico, já usou outros sistemas de frota.

**Dispositivo primário**: Notebook no escritório + iPhone para aprovações rápidas fora do horário

**O que mais valoriza no Nave**:
1. Dashboards gerenciais com comparativo histórico
2. Fluxo de aprovação de manutenção (mobile-friendly)
3. Export de dados para integração com ERP
4. Validações que evitem erros de cadastro

---

## P-003 — Motorista João (Usuário Indireto)

**Perfil**: 31 anos, motorista CLT de empresa de entregas, opera van de carga. Não gerencia frota mas interage com o sistema para registrar ocorrências e abastecimentos.

**Rotina**:
- Registra abastecimento pelo celular com foto do cupom
- Reporta problemas mecânicos antes de sair em rota
- Confirma início e fim de viagem

**Dores principais**:
- Forms complexos com muitos campos obrigatórios fazem ele desistir e não registrar
- Sem acesso ao histórico — não sabe se o problema que reportou foi resolvido
- Má conectividade nas rotas — o app trava e ele perde o que preencheu

**Tech literacy**: Básico. Usa WhatsApp e Instagram. Não lê manuais.

**O que precisa do Nave**:
1. Registro de abastecimento em menos de 30 segundos
2. Confirmação visual clara de que o registro foi enviado
3. Checklist simples de pré-viagem (não formulário)

---

## P-004 — Rafael Lima (Motorista de App / Autônomo Individual)

**Perfil**: 29 anos, motorista de Uber e 99 em tempo integral. Possui 1 veículo próprio (sedã popular financiado) que é sua ferramenta de trabalho. Alguns meses planeja adquirir um segundo carro para colocar outro motorista parceiro.

**Rotina**:
- 6h: Liga o app de corrida e roda até 12h (turno da manhã)
- 12h–14h: Pausa — aproveita para abastecer, verificar pneus, checar se há manutenção pendente
- 14h–22h: Segundo turno de corridas, com pausas rápidas
- Fim do dia: Quer saber quanto gastou (combustível + manutenção) vs. quanto faturou — margem de lucro real

**Dores principais**:
- Controle financeiro precário — não sabe se está lucrando ou perdendo dinheiro depois de combustível, manutenção, seguro e parcela do carro
- Abastece 4–6x por semana — registro precisa ser extremamente rápido, idealmente 2 toques
- Manutenção preventiva adiada por medo de ficar sem trabalhar — precisa de alertas que o ajudem a programar paradas sem perder renda
- Multas de trânsito frequentes (radar, rodízio) — quer rastrear e não esquecer de pagar
- Se tiver segundo veículo com outro motorista, precisa controlar custos separados sem complicação

**Tech literacy**: Médio-alto. Vive no celular o dia todo (GPS, apps de corrida, bancos digitais). Não tem paciência para sistemas lentos — está acostumado com UX de apps consumer.

**Dispositivo primário**: Smartphone Android mid-range, sempre conectado no suporte veicular, tela dividida com app de corrida

**O que mais valoriza no Nave**:
1. Registro ultra-rápido de abastecimento (consumo médio calculado automaticamente)
2. Visão de custo total vs. receita — "estou lucrando ou não?"
3. Alertas de manutenção preventiva com sugestão de melhor dia para parar (baseado na rotina)
4. Controle de multas com prazo de pagamento e desconto
5. Se tiver 2º veículo: separação clara de custos por veículo sem trocar de conta

---

## Implicações de design por persona

| Decisão de UX | P-001 (Autônomo) | P-002 (Corporativa) | P-003 (Motorista) | P-004 (App/Uber) |
|---------------|-----------------|---------------------|-------------------|-------------------|
| Tela inicial | KPIs + alertas críticos | Dashboard gerencial | Ações rápidas (abastecer, reportar) | Custo do dia + próxima manutenção |
| Formulários | Simples, pré-preenchidos | Com validação robusta | Ultra-simplificados, máx 3 campos | Ultra-rápidos, 2 toques para abastecimento |
| Relatórios | Custo por veículo | Comparativo histórico + export | Não relevante | Margem de lucro (custo vs. receita) |
| Notificações | Push com ação direta | Email + push configurável | Push de confirmação | Push inteligente (melhor dia para manutenção) |
| Offline | Leitura offline de alertas | Não crítico | Cache de registro local | Cache de registro + consulta offline |
| Aprovações | N/A (decide sozinho) | Fluxo mobile de aprovação | N/A | N/A (decide sozinho) |
| Multi-veículo | Visão consolidada | Por departamento/grupo | N/A | Separação simples por veículo (1–3) |
