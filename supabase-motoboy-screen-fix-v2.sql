-- BRASABOX — correção das telas do motoboy v2
-- Aplicado no projeto Supabase eaqngkiegrkmhopaztgz em 25/09/2026.

create policy "Motoboys can view production delivery orders"
on public.orders
for select
to authenticated
using (
  status = 'em_producao'
  and (select private.is_bv_motoboy())
  and (motoboy_id is null or motoboy_id = (select auth.uid()))
);

create policy "Motoboys can view available delivery items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.status in ('em_preparo','em_producao','saiu_entrega')
      and (o.motoboy_id is null or o.motoboy_id = (select auth.uid()))
      and (select private.is_bv_motoboy())
  )
);

create or replace function public.motoboy_collect_or_deliver(p_order_id uuid, p_action text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then raise exception 'Não autenticado'; end if;

  select p.role into v_role
  from public.profiles p
  where p.id = v_uid;

  if v_role <> 'motoboy' then
    raise exception 'Apenas motoboys podem executar esta ação';
  end if;

  if p_action not in ('coletar','entregar') then
    raise exception 'Ação inválida';
  end if;

  if p_action = 'coletar' then
    update public.orders
       set motoboy_id = v_uid, status = 'saiu_entrega', updated_at = now()
     where id = p_order_id
       and status in ('em_preparo','em_producao')
       and (motoboy_id is null or motoboy_id = v_uid);

    if not found then
      raise exception 'Pedido não está disponível para coleta para este motoboy';
    end if;
  else
    update public.orders
       set status = 'entregue', delivery_fee_collected = true, updated_at = now()
     where id = p_order_id
       and status = 'saiu_entrega'
       and motoboy_id = v_uid;

    if not found then
      raise exception 'Pedido não está em entrega para este motoboy';
    end if;
  end if;

  return true;
end;
$function$;

revoke execute on function public.motoboy_collect_or_deliver(uuid,text) from public, anon;
grant execute on function public.motoboy_collect_or_deliver(uuid,text) to authenticated;
