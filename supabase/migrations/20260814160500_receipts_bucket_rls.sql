-- @spec SPEC-20260814-004 RF-02, RF-06, R-RCP-06
-- Bucket privado de comprovantes de abastecimento. Diferente do bucket `vehicles`
-- (20260712172120_storage_vehicle_photos.sql), este é PRIVADO (`public = false`) — leitura só via
-- signed URL gerada sob demanda pela API (RNF-03, TTL 60min), nunca por URL pública direta.
-- Path do objeto original: {user_id}/{uuid}.{ext}; do thumbnail: {user_id}/thumb_{uuid}.jpg
-- (mesmo prefixo de usuário, mesma policy).
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Upload: somente o dono pode inserir no próprio prefixo de path.
-- DROP + CREATE (em vez de só CREATE) porque CREATE POLICY não aceita IF NOT EXISTS — mantém a
-- migration segura para reaplicação manual (rollback + re-apply) sem falhar em "policy already exists".
drop policy if exists receipts_owner_insert on storage.objects;
create policy receipts_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (select auth.uid())::text = (storage.foldername(name))[1]);

-- Download/leitura: somente o dono pode ler os próprios objetos (via signed URL assinada com este
-- client, ou diretamente pela API usando o client user-scoped).
drop policy if exists receipts_owner_select on storage.objects;
create policy receipts_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (select auth.uid())::text = (storage.foldername(name))[1]);

-- Delete: somente o dono pode remover (ex.: RF-12, remoção de comprovante recém-enviado antes de
-- submeter o formulário). Note que soft-delete de despesa NUNCA aciona este delete (R-RCP-04, R5).
drop policy if exists receipts_owner_delete on storage.objects;
create policy receipts_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and (select auth.uid())::text = (storage.foldername(name))[1]);

-- Nenhuma policy de UPDATE (nunca sobrescrevemos objeto existente — sempre um novo UUID) nem de
-- LIST público (S8) é criada aqui deliberadamente.
