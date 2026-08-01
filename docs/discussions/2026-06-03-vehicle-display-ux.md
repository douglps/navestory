# Discussão — UX de Configurações de Exibição e Organização Semântica do Perfil

**Data:** 2026-06-03  
**Contexto:** Pós-implementação de SPEC-20260603-003 (Preferências de Exibição do Veículo no Chip)  
**Status:** Em aberto — pontos a debater nas próximas sessões

---

## 1. O Problema de Descoberta ("Discoverability")

A implementação atual tem dois pontos de acesso para a preferência de exibição:

| Ponto                            | Onde                        | Fricção    | Problema                                   |
| -------------------------------- | --------------------------- | ---------- | ------------------------------------------ |
| **Popover inline**               | Ícone de engrenagem no chip | Quase zero | O usuário precisa saber que o ícone existe |
| **Perfil → Exibição do Veículo** | Página `/profile`           | Média      | Usuário precisa navegar até lá        |

**Questão central:** como comunicar ao usuário que o chip é configurável, sem poluir visualmente o subheader?

**Opções a explorar:**

- `?` ou `·` pulsante na primeira visita (onboarding hint) que desaparece após interação
- Tooltip no próprio ícone de engrenagem com copy "Personalize o chip"
- Empty state do chip (modo `none`) com dica explícita "Selecione um veículo e configure como ele aparece aqui"
- Badge de "novo" por 7 dias após o deploy da feature

---

## 2. Organização Semântica do Perfil

A página `/profile` tem hoje uma nav lateral estática com itens sem estado (não respondem a clique). Os itens são:

- Geral
- Notificações
- Segurança
- Assinatura
- Preferências ← recém-adicionado

**Problemas identificados:**

1. Os botões da nav não são âncoras — não fazem scroll nem trocam seção
2. "Geral" e "Preferências" se sobrepõem conceitualmente (qual a diferença?)
3. A seção de Dados Pessoais deveria ficar em "Geral" ou é o próprio "Geral"?

**Proposta de reorganização semântica:**

```
Perfil
├── Identidade           — nome, foto, email (read-only por ora)
├── Segurança            — senha, MFA, sessões ativas
├── Aparência            — tema (claro/escuro/sistema), densidade da UI
├── Exibição de Frota    — chipFields, formato padrão de listagens, moeda
├── Notificações         — canais, frequência, tipos de alerta
└── Assinatura & Plano   — plano atual, histórico de pagamento
```

**Questão:** faz sentido ter "Exibição de Frota" como categoria ampla (engloba chipFields + futuros: formato de data, moeda padrão, ordenação padrão de listagens) em vez de apenas "Preferências"?

---

## 3. Expansão Natural da Feature de Preferências

A SPEC-20260603-003 implementou apenas o chip. Mas a mesma lógica de "o usuário escolhe como ver os dados" se aplica em vários outros lugares:

### 3a. Ordenação padrão da lista de veículos

Hoje: por `created_at DESC`. O usuário pode querer: por placa, por modelo, por último uso.

### 3b. Formato de exibição de data

Hoje: Intl.DateTimeFormat com locale `pt-BR`. Alguns usuários preferem formato ISO para copiar/colar.

### 3c. Moeda e formato numérico

Hoje: BRL hardcoded. Usuários de frotas em outros países?

### 3d. Densidade da UI (compact / comfortable / spacious)

Afeta padding de cards, tamanho de fonte base, espaçamento de listas.

**Proposta:** criar uma `SPEC-PREFERENCIAS-GLOBAIS` que englobe todos esses eixos, com `user_preferences` como repositório único (adicionar colunas à tabela já criada).

---

## 4. Zero Friction — O que falta para chegar lá

A filosofia "zero friction" se aplica em camadas:

### Camada 0 — Sem configuração (default inteligente)

O padrão `[make, model, plate]` já resolve 80% dos casos. Um usuário que nunca abriu as preferências tem uma experiência decente.

### Camada 1 — Configuração inline, sem navegar

O popover no chip resolve isso para o chip. **Gaps restantes:**

- Não há como reordenar os campos no popover (só toggle on/off)
- Sem drag-and-drop para definir ordem dos campos
- O popover não sincroniza com o servidor em tempo real (só salva ao fechar)

### Camada 2 — Configuração contextual, onde faz sentido

**Ideia para debater:** cada "local de exibição" poderia ter seu próprio atalho de configuração inline:

- Chip → engrenagem → chipFields
- Card de veículo na lista → menu de contexto (3 pontos) → "Personalizar exibição deste card"
- Tabela de manutenções → header de coluna clicável → "Ocultar/exibir coluna"

### Camada 3 — Configuração global no perfil (atual)

O que já existe em `/profile`.

**Questão:** queremos implementar drag-and-drop para reordenar campos no popover já (na próxima iteração)? Ou o toggle simples é suficiente para o MVP?

---

## 5. O Campo "Apelido" (nickname) e a Identidade do Veículo

A implementação do apelido levanta questões mais amplas sobre identidade do veículo:

### Contextos onde o apelido agrega valor

- Frota com 3 Corolla do mesmo ano → o apelido é o único diferenciador humano
- Veículo pessoal com vínculo emocional ("Branquinho", "Titão")
- Relatórios compartilhados com equipe não-técnica (que não reconhece placa)

### Contextos onde o apelido atrapalha

- Integração com sistemas externos que conhecem só a placa
- Formulários fiscais e de seguro
- Exportação de dados para DETRAN/sistemas gov

**Proposta:** o apelido deveria ter um campo de "visibilidade" — `nickname_public: boolean` — que indica se ele aparece em documentos/exportações ou apenas na UI interna.

### Questão aberta: o apelido é por veículo ou por usuário?

Hoje: por veículo (coluna em `vehicles`). Em frotas com múltiplos usuários (futuro), o mesmo veículo pode ter apelidos diferentes para motoristas diferentes. Isso requer uma tabela `vehicle_user_labels` separada, não um campo na entidade veículo.

---

## 6. Arquitetura de Preferências — Pontos de Tensão

### Onde vive a fonte de verdade das preferências?

| Opção                                    | Vantagem                        | Desvantagem                                 |
| ---------------------------------------- | ------------------------------- | ------------------------------------------- |
| `user_preferences` (Supabase)            | Sincroniza entre dispositivos   | Latência na leitura inicial                 |
| `localStorage`                           | Zero latência                   | Não sincroniza entre dispositivos           |
| `sessionStorage` (atual para chipFields) | Zero latência, isolado por aba  | Não persiste entre sessões nem dispositivos |
| Cookie (`Set-Cookie` SSR)                | Disponível no servidor para SSR | Complexidade de sync                        |

**Estratégia atual (implementada):** sessionStorage como cache de sessão + Supabase como persistência. Na próxima abertura de aba/sessão, `getChipFields()` carrega do banco.

**Gap identificado:** o layout não chama `getChipFields()` no boot — o chipFields apenas rehidrata do sessionStorage. Se o usuário abrir uma nova aba, verá o default `[make, model, plate]` até interagir com as preferências.

**Proposta de correção:** o `DashboardLayout` deveria chamar `getChipFields()` server-side e passar via prop para o store no primeiro render. Isso é um padrão de "seeding" do store com dados do servidor.

---

## 7. Próximas Sprints Sugeridas

Ordenadas por valor/esforço:

| Prioridade | Feature                                                                         | Esforço | Valor |
| ---------- | ------------------------------------------------------------------------------- | ------- | ----- |
| 1          | Seed de `chipFields` do servidor no boot (corrige nova aba sem default correto) | Baixo   | Alto  |
| 2          | Reordenar campos no popover com drag-and-drop simples                           | Médio   | Médio |
| 3          | Reorganização semântica da página de Perfil (nav funcional + âncoras)           | Médio   | Médio |
| 4          | Expansão de `user_preferences` para outras preferências (densidade, moeda)      | Médio   | Alto  |
| 5          | `vehicle_user_labels` para apelidos por usuário (multi-tenant futuro)           | Alto    | Médio |
| 6          | Visibilidade do apelido em documentos/exportações                               | Baixo   | Baixo |

---

## 8. Questões Abertas para Debate

1. **Reordenar campos:** o popover atual só faz toggle. Precisamos de drag-and-drop para RF-05 (ordem configurável)? Ou definimos uma ordem fixa (make sempre antes de model)?

2. **Sincronização entre dispositivos:** vale implementar o seed server-side agora ou deixar para quando houver múltiplos dispositivos?

3. **Apelido em formulários de criação:** o `QuickVehicleRegister` (formulário rápido de novo veículo) deve ter o campo de apelido? A análise de impacto recomendou omitir para reduzir fricção de cadastro inicial.

4. **Seção "Preferências" vs "Exibição de Frota":** qual nome faz mais sentido na nav do perfil?

5. **Popover de settings no chip mobile:** no mobile, o chip abre o Sheet de seleção. O ícone de engrenagem deveria abrir um Sheet separado de configurações, ou integrado ao próprio Sheet de seleção como aba/seção?

6. **max 30 vs 50 chars no nickname:** a spec disse 30, o validator atual tem 50. Qual alinhamos? (O banco aceita o que o Zod deixar passar.)

---

_Documento gerado em 2026-06-03. Atualizar conforme decisões forem tomadas._
