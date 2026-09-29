-- BRASABOX - habilita sincronização em tempo real
-- Execute no SQL Editor do Supabase uma única vez.

begin;

-- O Realtime precisa estar inscrito nessas tabelas.
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.neighborhood_fees;
alter publication supabase_realtime add table public.profiles;

commit;