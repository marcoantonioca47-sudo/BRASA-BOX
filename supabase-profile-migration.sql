-- BRASABOX: endereço do cliente sincronizado no perfil
alter table public.profiles add column if not exists phone text not null default '';
alter table public.profiles add column if not exists street text not null default '';
alter table public.profiles add column if not exists number text not null default '';
alter table public.profiles add column if not exists neighborhood text not null default '';
alter table public.profiles add column if not exists cep text not null default '';
alter table public.profiles add column if not exists complement text not null default '';

-- Permite que o próprio cliente salve/atualize seus dados de entrega.
drop policy if exists profiles_update_own on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- O administrador continua podendo alterar permissões e perfis.
