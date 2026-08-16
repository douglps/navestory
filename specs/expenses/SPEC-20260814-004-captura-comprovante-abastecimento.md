---
id: SPEC-20260814-004
title: "Formulário de Abastecimento: Captura de Comprovante (Upload com Schema Pronto para OCR)"
status: approved
date: 2026-08-14
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-RCP-01, R-RCP-02, R-RCP-03, R-RCP-04, R-RCP-05, R-RCP-06, R-MON-01, R-MON-02, R-SAN-05, R5]
security: [S1, S2, S8, S-RCP-01]
camadas: [frontend, backend, database, infra]
---

# SPEC-20260814-004: Formulário de Abastecimento — Captura de Comprovante (Upload com Schema Pronto para OCR)

## Contexto

O formulário `/expenses/new` com `category = fuel` não possui campo para anexar o comprovante do abastecimento. Motoristas que precisam comprovar despesas para reembolso ou auditoria de frota não têm forma de associar o cupom fiscal à despesa registrada.

Além disso, o mercado concorrente (Abastece Aí, Mobil Fleet, TotalEnergies Fleet) já oferece extração automática de dados do comprovante via OCR — feature de alto valor percebido pelo segmento frota. O navestory ainda não tem essa infraestrutura.

Esta spec implementa **o upload e o schema de dados** com arquitetura preparada para OCR futuro, mas **não implementa a extração OCR em si**. A decisão de provedor (Google Vision, AWS Textract, Tesseract) é deliberadamente adiada para quando a spec de OCR for escrita, momento em que o tech-lead deve ser consultado para decidir a arquitetura de processamento assíncrono.

**Gap de campos ausentes:** o campo `supplier` e outros campos de combustível não são renderizados no formulário atual — gap de frontend identificado em auditoria de 2026-08-14. Esta spec adiciona um campo novo (`receipt`) ao formulário, pressupondo que o restante dos campos de combustível estejam visíveis por trabalho independente.

---

## Objetivo

Implementar upload opcional de foto ou PDF do comprovante de abastecimento no formulário de despesa. Criar no schema da tabela `expenses` os campos de storage e os campos de OCR (preenchidos como `not_applicable`/`null` até spec futura de OCR). Garantir segurança de armazenamento com bucket segregado, RLS owner-only e auditoria de toda operação de arquivo.

---

## Histórias de Usuário e Critérios de Aceitação

### US-01: Upload de comprovante no formulário

**Como** motorista registrando um abastecimento, **quero** anexar a foto do cupom fiscal, **para** ter o comprovante associado à despesa para auditoria ou reembolso.

- **Dado que** estou preenchendo o formulário de abastecimento, **quando** clico em "Adicionar comprovante", **então** um seletor de arquivo é exibido aceitando JPEG, PNG, WebP e PDF.
- **Dado que** selecionei um arquivo válido (< 10MB, tipo aceito), **quando** o upload é realizado, **então** uma prévia (thumbnail para imagens, ícone de documento para PDF) é exibida no formulário indicando sucesso.
- **Dado que** o upload foi concluído com sucesso, **quando** submeto o formulário, **então** a despesa é salva com a referência ao arquivo (`receipt_storage_key`).
- **Dado que** não quero anexar comprovante, **quando** submeto o formulário sem arquivo, **então** a despesa é salva normalmente com `receipt_storage_key = null` (campo opcional).
- **Dado que** selecionei um arquivo acima de 10MB, **quando** o arquivo é selecionado, **então** uma mensagem de erro inline é exibida "Arquivo muito grande (máx. 10MB)" e o upload não é iniciado.
- **Dado que** selecionei um arquivo com tipo não suportado (ex: `.docx`), **quando** o arquivo é selecionado, **então** uma mensagem de erro inline é exibida "Tipo de arquivo não suportado. Use JPEG, PNG, WebP ou PDF."

### US-02: Visualização do comprovante na listagem de despesas

**Como** motorista ou gestor de frota, **quero** ver o thumbnail do comprovante na listagem ou detalhe da despesa, **para** identificar rapidamente quais despesas têm comprovante.

- **Dado que** a despesa tem `receipt_storage_key` não nulo, **quando** a despesa é exibida na listagem, **então** um ícone ou thumbnail indica a presença do comprovante.
- **Dado que** clico no thumbnail, **quando** o clique é processado, **então** o arquivo completo (imagem ou PDF) é aberto em nova aba ou modal.
- **Dado que** a despesa não tem comprovante, **quando** exibida na listagem, **então** nenhum indicador de comprovante é mostrado (estado padrão — ausente, não "pendente").

### US-03: Integridade após soft-delete da despesa

**Como** gestor de compliance, **quero** que o comprovante seja preservado mesmo após a exclusão da despesa, **para** garantir rastreabilidade histórica.

- **Dado que** uma despesa com comprovante é soft-deletada (`deleted_at IS NOT NULL`), **quando** verifico o bucket de storage, **então** o arquivo ainda existe (não foi removido).
- **Dado que** a despesa foi soft-deletada, **quando** consulto a tabela `expenses` (incluindo soft-deletados), **então** `receipt_storage_key` ainda aponta para o arquivo no bucket (não nulificado).

---

## Requisitos Funcionais

| ID    | Requisito | Prioridade | História relacionada |
|-------|-----------|------------|----------------------|
| RF-01 | Adicionar migration que inclui as colunas a seguir na tabela `expenses`: `receipt_storage_key TEXT NULL`, `receipt_uploaded_at TIMESTAMPTZ NULL`, `receipt_ocr_status TEXT NULL DEFAULT 'not_applicable' CHECK (receipt_ocr_status IN ('not_applicable', 'pending', 'processing', 'completed', 'failed'))`, `receipt_ocr_raw JSONB NULL`, `receipt_ocr_parsed JSONB NULL`, `receipt_ocr_confidence NUMERIC(5,4) NULL` | Alta | US-01 |
| RF-02 | Criar bucket privado `receipts` no Supabase Storage (se não existir) com policy RLS owner-only: apenas o `auth.uid()` dono da despesa pode fazer upload, download e delete de objetos no path `{user_id}/` do bucket (R-RCP-06); nenhuma policy de LIST público (S8) | Alta | US-01 |
| RF-03 | Path de arquivo no bucket: `{user_id}/{uuid_v4}.{ext}` onde `uuid_v4` é gerado pelo servidor (nunca o nome original do arquivo — R-RCP-02) e `ext` é inferida do tipo MIME validado (R-SAN-05) | Alta | US-01 |
| RF-04 | Validar no cliente (antes de iniciar upload) e no servidor (server action): tamanho máximo de 10MB (R-RCP-01), tipos MIME aceitos: `image/jpeg`, `image/png`, `image/webp`, `application/pdf` (R-RCP-01, R-SAN-05); rejeitar com mensagem inline específica | Alta | US-01 |
| RF-05 | Gerar thumbnail do arquivo para exibição em listagem: resolução máxima de 400px no lado maior, mantendo proporção, em formato JPEG com qualidade 80%; geração via processamento server-side no momento do upload (não lazy); PDF não gera thumbnail — usar ícone estático de documento | Alta | US-02 |
| RF-06 | Thumbnail armazenado no mesmo bucket em path `{user_id}/thumb_{uuid_v4}.jpg`, com a mesma policy RLS do arquivo original | Alta | US-02 |
| RF-07 | Toda operação de upload e de download de comprovante gera entrada em `audit_logs` com `action = 'RECEIPT_UPLOADED'` ou `'RECEIPT_ACCESSED'`, `table_name = 'expenses'`, `record_id = expense_id`; o campo `changes` não inclui o `storage_key` completo como PII (R-MON-02); operação é fire-and-forget (R-MON-01, R-RCP-03) | Alta | US-01, US-02 |
| RF-08 | Soft-delete de despesa (`deleted_at IS NOT NULL`) **não remove** o arquivo do bucket nem nulifica `receipt_storage_key` (R-RCP-04, R5 estende-se ao arquivo associado) | Alta | US-03 |
| RF-09 | Os campos de OCR são inicializados como `receipt_ocr_status = 'not_applicable'`, `receipt_ocr_raw = NULL`, `receipt_ocr_parsed = NULL`, `receipt_ocr_confidence = NULL` para toda despesa, com ou sem comprovante; esses campos nunca são preenchidos por esta spec — permanecem inalterados até spec futura de OCR | Alta | — |
| RF-10 | O campo de upload no formulário é opcional: o formulário pode ser submetido com ou sem comprovante; nenhum campo de comprovante é obrigatório neste ciclo | Alta | US-01 |
| RF-11 | Exibir estado de loading durante upload (barra de progresso ou spinner); não permitir submissão do formulário enquanto upload está em andamento | Alta | US-01 |
| RF-12 | Permitir remoção do comprovante antes de submeter: botão "Remover" na prévia do arquivo cancela o upload (se em andamento) ou remove o arquivo do bucket (se já enviado) e limpa `receipt_storage_key` do estado do formulário | Média | US-01 |

---

## Requisitos Não-Funcionais

| ID     | Requisito | Métrica de Aceite |
|--------|-----------|-----------------|
| RNF-01 | Performance de upload | Upload de arquivo de 10MB completo em < 30s em conexão 3G (100kbps upload); não há SLA mais restrito pois depende de conectividade do usuário |
| RNF-02 | Performance de thumbnail | Geração de thumbnail em < 3s para imagens até 10MB; se superar 5s, retornar a despesa salva sem thumbnail e gerar thumbnail em job assíncrono posterior (fallback aceitável) |
| RNF-03 | Segurança de storage | Bucket `receipts` nunca tem policy de LIST público — S8 aplica; apenas download por URL assinada (signed URL com TTL de 60 minutos para visualização) |
| RNF-04 | Resolução do arquivo original | O arquivo original é armazenado sem compressão ou redimensionamento; resolução mínima recomendada ao usuário é ≥1200px no lado maior para viabilizar OCR futuro (R-RCP-05); a UI pode exibir dica "Para melhor OCR futuro, prefira fotos nítidas"; a recomendação é informativa, nunca um bloqueio |
| RNF-05 | Segurança de path | O nome do arquivo no bucket nunca deriva do nome original enviado pelo cliente — previne path traversal e enumeração de arquivos (R-RCP-02) |
| RNF-06 | Compliance | Arquivo é preservado mesmo após soft-delete da despesa para fins de auditoria; remoção física do bucket é responsabilidade de job de limpeza futuro com política de retenção a definir (R-RCP-04) |
| RNF-07 | Acessibilidade | Campo de upload usa `<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf">` com label descritivo e mensagem de erro acessível (`aria-describedby`); drag-and-drop é melhoria progressiva, não requisito |

---

## Fora de Escopo

- Extração OCR de dados do comprovante (valor, litros, fornecedor, data): nenhum provedor integrado, nenhum job assíncrono de processamento OCR implementado nesta spec; os campos `receipt_ocr_*` ficam sempre com valores `not_applicable`/`null` até spec futura de OCR.
- Escolha de provedor de OCR (Google Vision, AWS Textract, Tesseract ou outro): decisão deliberadamente adiada; quando a spec de OCR for escrita, o tech-lead deve ser consultado para decidir a arquitetura de processamento assíncrono e o provedor adequado ao volume e custo.
- Comprovante obrigatório: o campo permanece opcional neste ciclo; uma regra de obrigatoriedade condicional (ex: comprovante obrigatório para despesas acima de R$ X em contexto de frota) é mencionada aqui como possibilidade futura, mas não definida — depende de spec de regras de workflow de frota.
- Validação automática de dados do comprovante contra os campos digitados (ex: confirmar que o valor do cupom bate com o campo `amount`): depende de OCR implementado.
- Gerenciamento de comprovantes em lote (ex: upload de múltiplos comprovantes de uma vez).
- Comprovante de despesas de outras categorias (manutenção, multa): fora deste ciclo; a estrutura de storage pode ser estendida futuramente, mas a schema migration é genérica o suficiente para suportar.

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260606-001 | Define a tabela `expenses` e seus campos de combustível; a migration desta spec adiciona colunas a essa tabela |
| Spec | SPEC-20260714-001 | CRUD base de expenses — a server action de criação/atualização de despesa deve lidar com `receipt_storage_key` |
| Regra | R-MON-01, R-MON-02 | Auditoria fire-and-forget e sem PII no campo `changes` — aplicados em RF-07 |
| Regra | R-SAN-05 | Validação de tipo MIME e tamanho de upload no servidor — reaproveitada em RF-04 |
| Regra | R5 | Soft-delete via `deleted_at` — RF-08 estende a semântica de R5 para o arquivo associado |
| Regra | S8 | Bucket de storage sem policy de LIST público — RF-02 aplica este princípio ao bucket `receipts` |
| Infra | Supabase Storage | Bucket `receipts` criado via migration SQL (`storage.buckets`) ou painel; policy RLS via migration |
| Decisão futura | Tech-lead (OCR) | Escolha de provedor de OCR e arquitetura de job assíncrono são decisões futuras a serem formalizadas em spec e ADR separados |

---

## Notas Técnicas

### Migration SQL (esqueleto)

```sql
-- @spec SPEC-20260814-004 RF-01
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS receipt_storage_key     TEXT,
  ADD COLUMN IF NOT EXISTS receipt_uploaded_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS receipt_ocr_status      TEXT DEFAULT 'not_applicable'
    CONSTRAINT expenses_receipt_ocr_status_check
      CHECK (receipt_ocr_status IN ('not_applicable','pending','processing','completed','failed')),
  ADD COLUMN IF NOT EXISTS receipt_ocr_raw         JSONB,
  ADD COLUMN IF NOT EXISTS receipt_ocr_parsed      JSONB,
  ADD COLUMN IF NOT EXISTS receipt_ocr_confidence  NUMERIC(5,4);

-- Bucket (executar via Supabase Storage API ou painel, não via SQL migration diretamente)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('receipts', 'receipts', false)
-- ON CONFLICT DO NOTHING;
```

### Policy RLS do bucket (esqueleto)

```sql
-- @spec SPEC-20260814-004 RF-02, R-RCP-06
-- Upload: somente o owner pode fazer upload no próprio path
CREATE POLICY "receipts_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- Select/download: somente o owner pode acessar seus objetos
CREATE POLICY "receipts_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- Delete: somente o owner pode remover (ex: via RF-12 — remoção antes de submeter)
CREATE POLICY "receipts_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- LIST nunca habilitado publicamente (S8)
```

### Geração de thumbnail

Opção preferida: usar `sharp` (já disponível em ambientes Node.js/Next.js) via server action para redimensionar imagem antes de enviar ao bucket. Para PDF, pular geração de thumbnail e retornar ícone estático.

```
// Pseudo-código
const thumbnail = await sharp(fileBuffer)
  .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 80 })
  .toBuffer();
```

O parâmetro `withoutEnlargement: true` garante que imagens menores que 400px não são ampliadas, preservando qualidade.

### Resolução mínima para OCR futuro

A literatura de OCR (Google Vision, Tesseract) recomenda ≥ 200 DPI para texto impresso, o que equivale a ≥ 1200px no lado maior de um cupom A5. A recomendação ao usuário na UI é informativa: "Para melhor resultado de extração futura, use foto nítida (≥ 1200px)." Nunca bloquear o upload por resolução — o sistema não pode verificar resolução de forma confiável antes do upload completo, e baixa resolução não impede o uso básico da feature de comprovante.

O arquivo original **não é redimensionado ou comprimido** — apenas o thumbnail é gerado em menor resolução (R-RCP-05). Isso garante que o OCR futuro opere sobre o arquivo em resolução original.

### Campos de OCR no schema

Os campos `receipt_ocr_*` são adicionados agora para evitar migration adicional no futuro. O custo de adicioná-los agora é baixo (colunas `NULL` não ocupam espaço por linha no PostgreSQL); o custo de adicioná-los depois seria uma migration com possível lock de tabela grande. Eles não são usados por nenhum código desta spec.

---

## Changelog (pós-aprovação)

| Data | O que mudou | Por quê |
|------|-------------|---------|
| 2026-08-14 | Gate técnico concluído; status promovido de `draft` para `approved`. Três ajustes de implementação: (1) o "gap de campos ausentes" referenciado no contexto estava incorreto para os demais campos — não impacta esta spec (que adiciona um campo novo), mas o pré-requisito geral de campos visíveis já está satisfeito sem trabalho adicional. (2) Upload e geração de thumbnail devem ser implementados como `POST /expenses/:id/receipt` em `apps/api` com `multipart/form-data`; `sharp` deve rodar em Node.js runtime (não Edge); segue padrão REST do projeto. (3) Nota para spec futura: quando workspace managers precisarem acessar comprovantes de membros (extensão de R-WS-04), adicionar policy `SELECT` em `storage.objects` baseada em `workspace_vehicle_assignments` — não mudar a policy atual owner-only. | Gate técnico (tech-lead, 2026-08-14). |
| 2026-08-14 | Implementação concluída. Decisão de arquitetura de Douglas antes de implementar: geração de thumbnail é **assíncrona** (fire-and-forget) — o upload síncrono salva `receipt_storage_key`/`receipt_uploaded_at` e retorna; o thumbnail roda em job separado (`ExpensesService.generateReceiptThumbnail`). RNF-02 original só previa isso como fallback de exceção (">5s"); a decisão generaliza esse comportamento para todo upload de imagem. Isso exigiu duas colunas fora do esqueleto original: `receipt_thumbnail_key TEXT NULL` e `receipt_thumbnail_status TEXT DEFAULT 'not_applicable'` (mesma forma de `receipt_ocr_status`: `not_applicable`/`pending`/`completed`/`failed`) — sem elas, `receipt_thumbnail_key IS NULL` seria ambíguo entre "PDF, nunca terá thumbnail" e "imagem, ainda gerando" (racional completo em `supabase/migrations/20260814160000_expenses_receipt_columns.sql`). Endpoint `GET /expenses/:id/receipt` (fora do esqueleto original) foi adicionado para servir as signed URLs (RNF-03) e cobrir `RECEIPT_ACCESSED` (RF-07). Desvio de fluxo no frontend: como `POST /expenses/:id/receipt` exige uma despesa já existente, `/expenses/new` cria a despesa primeiro e envia o comprovante depois (arquivo fica em memória local até a submissão, não durante o preenchimento como US-01 sugeria); falha no upload não desfaz a despesa nem bloqueia a navegação — mostra aviso com link para retry na tela de detalhe, que também ganhou a capacidade de anexar/reenviar comprovante (extensão razoável de RF-10/RF-12, não estava explícita no escopo original de US-02). Caminhos reais de código e teste em `matrices/rastreabilidade.md`. **Recomendação para revisão futura (não bloqueante — autorizado a avançar sem esse checkpoint agora):** o `dba` ainda não validou as duas migrations de storage (`20260814160000`, `20260814160500`) antes de aplicação em produção; recomenda-se essa revisão antes do próximo deploy que as inclua, em especial a policy RLS de `storage.objects` (RF-02) e o `CHECK` de `receipt_thumbnail_status`. | Decisão de Douglas (thumbnail assíncrono) + fechamento da implementação. |
| 2026-08-15 | Gate técnico do `tech-lead` + revisão do `dba` concluídos. RLS de `storage.objects` e ausência de rewrite/downtime em `ADD COLUMN` confirmados corretos — sem bloqueante. Adicionado `@Throttle({ limit: 5, ttl: 60_000 })` em `POST /expenses/:id/receipt` (achado do tech-lead: endpoint de upload sem rate limit, custo de memória/CPU maior que os demais endpoints). Nova regra `S-RCP-01` registrada em `RULES.md` e adicionada ao frontmatter desta spec: job `generateReceiptThumbnail` deve usar `service_role`, nunca chave anon, para não ser bloqueado silenciosamente pela policy `receipts_owner_insert` (que só cobre a role `authenticated`). **Pendência aberta, não bloqueante para esta migration, mas bloqueante para produção com dados reais de usuário:** o backup automático do Supabase cobre o banco Postgres, não os arquivos binários do bucket Storage — sem backup/retenção configurado para o bucket `receipts`, um arquivo corrompido ou removido não é recuperável. Registrado em `important/PENDENCIAS-E-PROCESSOS.md` (Bloco 1.2) para decisão de Douglas antes de aceitar comprovantes reais em produção. | Gate técnico (tech-lead) + revisão de banco de dados (dba), 2026-08-15. |
