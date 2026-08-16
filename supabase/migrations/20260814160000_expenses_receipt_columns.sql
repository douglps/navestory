-- @spec SPEC-20260814-004 RF-01, RF-09
-- Colunas de storage do comprovante de abastecimento + campos de OCR (schema pronto, nunca
-- preenchido nesta spec — ver "Fora de Escopo" da spec). Ver Notas Técnicas da spec para o
-- racional de adicionar as colunas de OCR agora (custo de ALTER TABLE futuro > custo de colunas
-- NULL hoje).
--
-- Decisão de implementação (2026-08-14, Douglas): geração de thumbnail é ASSÍNCRONA — o upload
-- do arquivo original salva a despesa imediatamente com `receipt_storage_key` preenchido, sem
-- esperar o thumbnail (gerado em job fire-and-forget separado). Isso exige rastrear o estado do
-- thumbnail em si, não coberto pelo esqueleto original da spec (que só tinha
-- `receipt_ocr_status`). Adiciona-se `receipt_thumbnail_key` (aponta para o objeto gerado,
-- populado só quando pronto) e `receipt_thumbnail_status` (mesma forma de `receipt_ocr_status`):
--   'not_applicable' — sem comprovante, ou comprovante é PDF (nunca gera thumbnail, RF-05)
--   'pending'        — comprovante de imagem enviado, thumbnail em geração
--   'completed'      — `receipt_thumbnail_key` populado, pronto para exibição
--   'failed'         — geração falhou; UI cai no fallback estático permanentemente
-- Sem essa coluna, `receipt_thumbnail_key IS NULL` seria ambíguo entre "ainda gerando" e "PDF,
-- nunca terá thumbnail" — a UI (RF fallback "preparando prévia" vs. ícone estático de documento)
-- depende dessa distinção.
alter table public.expenses
  add column if not exists receipt_storage_key text,
  add column if not exists receipt_uploaded_at timestamptz,
  add column if not exists receipt_thumbnail_key text,
  add column if not exists receipt_thumbnail_status text not null default 'not_applicable'
    constraint expenses_receipt_thumbnail_status_check
      check (receipt_thumbnail_status in ('not_applicable','pending','completed','failed')),
  add column if not exists receipt_ocr_status text not null default 'not_applicable'
    constraint expenses_receipt_ocr_status_check
      check (receipt_ocr_status in ('not_applicable','pending','processing','completed','failed')),
  add column if not exists receipt_ocr_raw jsonb,
  add column if not exists receipt_ocr_parsed jsonb,
  add column if not exists receipt_ocr_confidence numeric(5,4);
