-- BRASABOX — HARDENING SUPABASE / MULTI-APARELHO
-- Execute este arquivo no Supabase SQL Editor.
-- Ele corrige os pontos que podem impedir um pedido de outro aparelho
-- de aparecer para o administrador: perfil automático, permissões, RLS e grants.

create schema if not exists private;

-- 1) Cria automaticamente o perfil quando uma conta Auth é criada.
-- Assim nenhum aparelho depende de localStorage para criar o perfil.
create or replace function private.handle_bv_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  desired_role text;
  desired_name text;
begin
  desired_name := coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(coalesce(new.email,''),'@',1), 'Usuário');
  desired_role := case
    when lower(coalesce(new.email,'')) = 'admin@brasabox.com' then 'administrador'
    else 'usuario'
  end;

  insert into public.profiles(id,name,role)
  values(new.id, desired_name, desired_role)
  on conflict (id) do update
    set name = coalesce(excluded.name, public.profiles.name),
        role = case
          when lower(coalesce(new.email,'')) = 'admin@brasabox.com' then 'administrador'
          else public.profiles.role
        end;

  return new;
end;
$$;

revoke all on function private.handle_bv_new_user() from public;
grant execute on function private.handle_bv_new_user() to service_role;

drop trigger if exists on_bv_auth_user_created on auth.users;
create trigger on_bv_auth_user_created
after insert on auth.users
for each row execute function private.handle_bv_new_user();

-- 2) Garante que a conta administrativa existente tenha perfil administrativo.
insert into public.profiles(id,name,role)
select id,'Administrador','administrador'
from auth.users
where lower(email)='admin@brasabox.com'
on conflict (id) do update
set name='Administrador', role='administrador';

-- 3) Permissões da Data API.
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.neighborhood_fees to anon, authenticated;
grant insert, update, delete on public.neighborhood_fees to authenticated;
grant select on public.settings to anon, authenticated;
grant insert, update on public.settings to authenticated;

-- 4) PROFILES
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select to authenticated
using (id=(select auth.uid()) or (select private.is_bv_admin()));

drop policy if exists "profiles_insert_own_or_admin" on public.profiles;
create policy "profiles_insert_own_or_admin"
on public.profiles for insert to authenticated
with check (id=(select auth.uid()) or (select private.is_bv_admin()));

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update to authenticated
using (id=(select auth.uid()) or (select private.is_bv_admin()))
with check (id=(select auth.uid()) or (select private.is_bv_admin()));

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
on public.profiles for delete to authenticated
using ((select private.is_bv_admin()));

-- 5) PEDIDOS
alter table public.orders enable row level security;

drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin"
on public.orders for select to authenticated
using (user_id=(select auth.uid()) or (select private.is_bv_admin()));

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
on public.orders for insert to authenticated
with check (user_id=(select auth.uid()));

drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin"
on public.orders for update to authenticated
using ((select private.is_bv_admin()))
with check ((select private.is_bv_admin()));

drop policy if exists "orders_delete_admin" on public.orders;
create policy "orders_delete_admin"
on public.orders for delete to authenticated
using ((select private.is_bv_admin()));

-- 6) ITENS DOS PEDIDOS
alter table public.order_items enable row level security;

drop policy if exists "order_items_select_own_or_admin" on public.order_items;
create policy "order_items_select_own_or_admin"
on public.order_items for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id=order_items.order_id
      and (o.user_id=(select auth.uid()) or (select private.is_bv_admin()))
  )
);

drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own"
on public.order_items for insert to authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id=order_items.order_id
      and o.user_id=(select auth.uid())
  )
);

drop policy if exists "order_items_update_admin" on public.order_items;
create policy "order_items_update_admin"
on public.order_items for update to authenticated
using ((select private.is_bv_admin()))
with check ((select private.is_bv_admin()));

drop policy if exists "order_items_delete_admin" on public.order_items;
create policy "order_items_delete_admin"
on public.order_items for delete to authenticated
using ((select private.is_bv_admin()));

-- 7) PRODUTOS
alter table public.products enable row level security;

drop policy if exists "products_select_public" on public.products;
create policy "products_select_public"
on public.products for select to anon, authenticated
using (active=true or (select private.is_bv_admin()));

drop policy if exists "products_insert_admin" on public.products;
create policy "products_insert_admin"
on public.products for insert to authenticated
with check ((select private.is_bv_admin()));

drop policy if exists "products_update_admin" on public.products;
create policy "products_update_admin"
on public.products for update to authenticated
using ((select private.is_bv_admin()))
with check ((select private.is_bv_admin()));

drop policy if exists "products_delete_admin" on public.products;
create policy "products_delete_admin"
on public.products for delete to authenticated
using ((select private.is_bv_admin()));

-- 8) TAXAS POR BAIRRO
alter table public.neighborhood_fees enable row level security;

drop policy if exists "neighborhood_select_public" on public.neighborhood_fees;
create policy "neighborhood_select_public"
on public.neighborhood_fees for select to anon, authenticated
using (active=true or (select private.is_bv_admin()));

drop policy if exists "neighborhood_insert_admin" on public.neighborhood_fees;
create policy "neighborhood_insert_admin"
on public.neighborhood_fees for insert to authenticated
with check ((select private.is_bv_admin()));

drop policy if exists "neighborhood_update_admin" on public.neighborhood_fees;
create policy "neighborhood_update_admin"
on public.neighborhood_fees for update to authenticated
using ((select private.is_bv_admin()))
with check ((select private.is_bv_admin()));

drop policy if exists "neighborhood_delete_admin" on public.neighborhood_fees;
create policy "neighborhood_delete_admin"
on public.neighborhood_fees for delete to authenticated
using ((select private.is_bv_admin()));

-- 9) REALTIME: pedidos e itens precisam estar na publicação.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='order_items'
  ) then
    alter publication supabase_realtime add table public.order_items;
  end if;
end $$;

-- 10) Evita que pedidos iguais sejam inseridos duas vezes durante migrações.
-- Não altera pedidos existentes; serve apenas como diagnóstico futuro.
