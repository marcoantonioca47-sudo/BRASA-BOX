-- BRASABOX — configurações gerais centralizadas no Supabase
-- Execute este script no Supabase SQL Editor uma única vez.

create table if not exists public.settings (
  id bigint primary key default 1,
  fee numeric(10,2) not null default 0,
  whatsapp text not null default '',
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

insert into public.settings (id, fee, whatsapp)
values (1, 0, '')
on conflict (id) do nothing;

alter table public.settings enable row level security;

-- O app usa a chave publicável do Supabase. Usuários autenticados podem
-- consultar e atualizar as configurações; a aplicação continua usando
-- localStorage como fallback quando a sessão do Supabase não estiver disponível.
drop policy if exists "settings_select_authenticated" on public.settings;
drop policy if exists "settings_insert_authenticated" on public.settings;
drop policy if exists "settings_update_authenticated" on public.settings;


-- Segurança: somente administradores podem alterar as configurações gerais.
-- A função lê o perfil do usuário autenticado sem expor a tabela de perfis à política.
create schema if not exists private;

create or replace function private.is_bv_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'administrador'
  );
$$;

revoke execute on function private.is_bv_admin() from public;
grant execute on function private.is_bv_admin() to authenticated;

drop policy if exists "settings_select_authenticated" on public.settings;
drop policy if exists "settings_insert_authenticated" on public.settings;
drop policy if exists "settings_update_authenticated" on public.settings;

create policy "settings_select_authenticated"
on public.settings for select
to anon, authenticated
using (true);

drop policy if exists "settings_insert_admin" on public.settings;
create policy "settings_insert_admin"
on public.settings for insert
to authenticated
with check ((select private.is_bv_admin()));

drop policy if exists "settings_update_admin" on public.settings;
create policy "settings_update_admin"
on public.settings for update
to authenticated
using ((select private.is_bv_admin()))
with check ((select private.is_bv_admin()));

-- Mantém as tabelas do BV disponíveis para Postgres Changes quando ainda não
-- estiverem na publicação do Realtime.
do $$
declare
  t text;
begin
  foreach t in array array['settings','products','orders','order_items','profiles','neighborhood_fees']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname='supabase_realtime'
        and schemaname='public'
        and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;


-- ============================================================
-- PEDIDOS: cliente vê os próprios; administrador vê todos.
-- ============================================================
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.profiles enable row level security;

create or replace function private.is_bv_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('administrador','admin')
  );
$$;

revoke execute on function private.is_bv_admin() from public;
grant execute on function private.is_bv_admin() to authenticated;

drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin"
on public.orders for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_bv_admin())
);

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
on public.orders for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin"
on public.orders for update
to authenticated
using ((select private.is_bv_admin()))
with check ((select private.is_bv_admin()));

drop policy if exists "orders_delete_admin" on public.orders;
create policy "orders_delete_admin"
on public.orders for delete
to authenticated
using ((select private.is_bv_admin()));

drop policy if exists "order_items_select_own_or_admin" on public.order_items;
create policy "order_items_select_own_or_admin"
on public.order_items for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (o.user_id = (select auth.uid()) or (select private.is_bv_admin()))
  )
);

drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own"
on public.order_items for insert
to authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.user_id = (select auth.uid())
  )
);

drop policy if exists "order_items_update_admin" on public.order_items;
create policy "order_items_update_admin"
on public.order_items for update
to authenticated
using ((select private.is_bv_admin()))
with check ((select private.is_bv_admin()));

drop policy if exists "order_items_delete_admin" on public.order_items;
create policy "order_items_delete_admin"
on public.order_items for delete
to authenticated
using ((select private.is_bv_admin()));

-- PERFIS: cada usuário lê o próprio perfil; administrador lê todos.
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (id = (select auth.uid()) or (select private.is_bv_admin()));
