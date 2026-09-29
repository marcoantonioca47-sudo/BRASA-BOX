-- BRASABOX — fluxo do motoboy
-- Fluxo: Em preparo -> Coletar -> Saiu para entrega -> Confirmar entrega -> Entregue.

create schema if not exists private;

create or replace function private.motoboy_collect_or_deliver(p_order_id uuid,p_action text)
returns table(order_id uuid,new_status text,motoboy_id uuid)
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_uid uuid:=auth.uid();
  v_role text;
  v_order public.orders%rowtype;
begin
  if v_uid is null then raise exception 'Usuário não autenticado.'; end if;
  select role into v_role from public.profiles where id=v_uid;
  if v_role <> 'motoboy' then raise exception 'Apenas motoboys podem executar esta ação.'; end if;
  if p_action not in ('coletar','entregar') then raise exception 'Ação inválida.'; end if;

  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;

  if p_action='coletar' then
    if v_order.status <> 'em_preparo' then raise exception 'Este pedido não está disponível para coleta.'; end if;
    if v_order.motoboy_id is not null and v_order.motoboy_id <> v_uid then raise exception 'Este pedido já foi coletado por outro motoboy.'; end if;
    update public.orders set motoboy_id=v_uid,status='saiu_entrega',updated_at=now() where id=p_order_id;
  else
    if v_order.status <> 'saiu_entrega' or v_order.motoboy_id <> v_uid then raise exception 'Este pedido não está em entrega para este motoboy.'; end if;
    update public.orders set status='entregue',updated_at=now() where id=p_order_id;
  end if;

  return query select o.id,o.status,o.motoboy_id from public.orders o where o.id=p_order_id;
end;
$$;

revoke all on function private.motoboy_collect_or_deliver(uuid,text) from public;
grant execute on function private.motoboy_collect_or_deliver(uuid,text) to authenticated;

alter table public.orders enable row level security;
drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin" on public.orders for select to authenticated
using (user_id=auth.uid() or motoboy_id=auth.uid() or private.is_bv_admin());

drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin" on public.orders for update to authenticated
using (private.is_bv_admin() or (motoboy_id=auth.uid() and status='saiu_entrega'))
with check (private.is_bv_admin() or (motoboy_id=auth.uid() and status in ('saiu_entrega','entregue')));

drop policy if exists "order_items_select_own_or_admin" on public.order_items;
create policy "order_items_select_own_or_admin" on public.order_items for select to authenticated
using (exists(select 1 from public.orders o where o.id=order_items.order_id and (o.user_id=auth.uid() or o.motoboy_id=auth.uid() or private.is_bv_admin())));
