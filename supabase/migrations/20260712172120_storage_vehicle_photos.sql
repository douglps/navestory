-- @spec matrices/impacto.md IMPACTO-026 achado 2 — bucket público sem policy de listagem (acesso só via URL direta)

insert into storage.buckets (id, name, public)
values ('vehicles', 'vehicles', true)
on conflict (id) do nothing;

-- Sem policy de SELECT para anon/authenticated: URLs públicas continuam acessíveis
-- (Supabase Storage serve objetos de bucket público sem checar RLS), mas a listagem via API fica bloqueada.
create policy vehicles_photos_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'vehicles' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy vehicles_photos_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'vehicles' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy vehicles_photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'vehicles' and (select auth.uid())::text = (storage.foldername(name))[1]);
