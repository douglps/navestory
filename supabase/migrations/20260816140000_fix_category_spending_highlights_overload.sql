-- @spec SPEC-20260721-002 RF-08 — corrige overload ambíguo de get_category_spending_highlights
-- `20260722165221_fleet_charts.sql` derrubou a assinatura de 2 argumentos (p_vehicle_id,
-- p_group_vehicle_ids) e criou a de 3 (com p_limit default 3). Porém
-- `20260722183819_timezone_aware_datetime.sql` recriou a assinatura de 2 argumentos via
-- `create or replace function` — como a lista de parâmetros difere, isso cria um overload novo
-- em vez de substituir a função existente, e a de 3 argumentos nunca foi removida de novo.
-- Resultado: PostgREST não consegue resolver `rpc('get_category_spending_highlights', {
-- p_vehicle_id, p_group_vehicle_ids })` entre as duas assinaturas (erro PGRST203), quebrando
-- GET /dashboard/spending-highlights com 500 em qualquer ambiente que rodou as duas migrations
-- em sequência. Mantém apenas a assinatura de 3 argumentos (com p_limit), já usada por
-- getFullCategoryBreakdown e compatível com a chamada de 2 argumentos via default.

drop function if exists public.get_category_spending_highlights(uuid, uuid[]);
