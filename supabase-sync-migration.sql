-- Execute este arquivo no SQL Editor do Supabase.
-- Permite ao administrador listar e alterar perfis.

create policy "profiles_admin_select" on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'administrador')
);

create policy "profiles_admin_update" on public.profiles
for update to authenticated
using (
  id = auth.uid()
  or exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'administrador')
)
with check (
  id = auth.uid()
  or exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'administrador')
);

-- Permite ao administrador excluir produtos/pedidos se essas funções forem adicionadas depois.
create policy "orders_admin_delete" on public.orders
for delete to authenticated
using (exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'administrador'));

-- Realtime para atualizações entre telas/dispositivos.
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.neighborhood_fees;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;
alter publication supabase_realtime add table public.profiles;