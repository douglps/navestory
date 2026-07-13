-- @spec matrices/impacto.md IMPACTO-026 achado 6 — search_path fixo em todas as funções (S9)

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.update_expense_templates_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_vehicle_soft_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.deleted_at = now();
  new.plate = 'DELETED';
  return new;
end;
$$;

create or replace function public.enforce_expense_templates_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*) from public.expense_templates where user_id = new.user_id
  ) >= 20 then
    raise exception 'Limite de 20 modelos de despesa por usuário atingido.';
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, profile_type, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'profile_type')::profile_type, 'autonomous'::profile_type),
    now(),
    now()
  );
  return new;
end;
$$;

create or replace function public.soft_delete_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.deleted_at is null then
    update public.profiles
    set name = 'Anônimo (Deletado)', preferences = '{}'::jsonb, deleted_at = now()
    where id = old.id;
  end if;
  return old;
end;
$$;

create trigger update_profiles_modtime before update on public.profiles for each row execute function public.update_updated_at_column();
create trigger update_vehicles_modtime before update on public.vehicles for each row execute function public.update_updated_at_column();
create trigger update_expenses_modtime before update on public.expenses for each row execute function public.update_updated_at_column();
create trigger update_maintenances_modtime before update on public.maintenances for each row execute function public.update_updated_at_column();
create trigger update_fines_modtime before update on public.fines for each row execute function public.update_updated_at_column();
create trigger update_vehicle_groups_modtime before update on public.vehicle_groups for each row execute function public.update_updated_at_column();
create trigger update_vehicle_recurring_costs_modtime before update on public.vehicle_recurring_costs for each row execute function public.update_updated_at_column();
create trigger update_drivers_modtime before update on public.drivers for each row execute function public.update_updated_at_column();
create trigger update_documents_modtime before update on public.documents for each row execute function public.update_updated_at_column();
create trigger user_preferences_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();

create trigger trg_expense_templates_limit before insert on public.expense_templates for each row execute function public.enforce_expense_templates_limit();
create trigger trg_expense_templates_updated_at before update on public.expense_templates for each row execute function public.update_expense_templates_updated_at();

create trigger before_delete_vehicles before delete on public.vehicles for each row execute function public.set_vehicle_soft_delete();
create trigger before_delete_profiles before delete on public.profiles for each row execute function public.soft_delete_profile();

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
