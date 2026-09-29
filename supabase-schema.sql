-- BRASABOX - estrutura inicial do banco Supabase
-- Execute este arquivo no SQL Editor do seu projeto Supabase.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null default 'usuario' check (role in ('usuario','motoboy','administrador')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric(10,2) not null default 0 check (price >= 0),
  category text not null default 'Lanches' check (category in ('Lanches','Bebidas')),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.neighborhood_fees (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  fee numeric(10,2) not null default 0 check (fee >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'recebido' check (status in ('recebido','em_preparo','saiu_entrega','entregue','cancelado')),
  payment_method text not null default 'pix' check (payment_method in ('pix','dinheiro','cartao')),
  payment_status text not null default 'pendente' check (payment_status in ('pendente','pago','cancelado')),
  customer_name text not null default '',
  phone text not null default '',
  address text not null default '',
  neighborhood text not null default '',
  delivery_fee numeric(10,2) not null default 0,
  subtotal numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  total numeric(10,2) not null check (total >= 0)
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.neighborhood_fees enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Perfil: o próprio usuário pode ler seu perfil. Admin pode gerenciar perfis.
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Produtos: todos os usuários autenticados podem consultar produtos ativos; admin gerencia tudo.
create policy "products_select_active" on public.products for select to authenticated using (active = true or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrador'));
create policy "products_admin_insert" on public.products for insert to authenticated with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrador'));
create policy "products_admin_update" on public.products for update to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrador')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrador'));
create policy "products_admin_delete" on public.products for delete to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrador'));

-- Bairros: clientes consultam bairros ativos; admin gerencia.
create policy "fees_select_active" on public.neighborhood_fees for select to authenticated using (active = true or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrador'));
create policy "fees_admin_insert" on public.neighborhood_fees for insert to authenticated with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrador'));
create policy "fees_admin_update" on public.neighborhood_fees for update to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrador')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrador'));
create policy "fees_admin_delete" on public.neighborhood_fees for delete to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrador'));

-- Pedidos: cliente vê/cria os próprios; admin vê todos; motoboy vê pedidos de entrega.
create policy "orders_select" on public.orders for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('administrador','motoboy')));
create policy "orders_insert_own" on public.orders for insert to authenticated with check (user_id = auth.uid());
create policy "orders_update" on public.orders for update to authenticated using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('administrador','motoboy'))) with check (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('administrador','motoboy')));

create policy "order_items_select" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('administrador','motoboy')))));
create policy "order_items_insert" on public.order_items for insert to authenticated with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- Cria perfil automaticamente após cadastro no Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name',''), 'usuario')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Produtos iniciais. Só insere se a tabela estiver vazia.
insert into public.products (name, price, description, category)
select * from (values
('X-Salada',12.99,'Pão, ovo, mussarela, requeijão, presunto e salada.','Lanches'),
('Hambúrguer',15.00,'Pão, bife, presunto, mussarela, milho e requeijão.','Lanches'),
('X-Egg',17.00,'Pão, bife, presunto, mussarela, ovo, milho, batata e salada.','Lanches'),
('X-Bacon',19.00,'Pão, bife, bacon, requeijão, presunto, cheddar, mussarela, batata, milho e salada.','Lanches'),
('BV X-Tudão',23.00,'Pão, 2 bifes, presunto, mussarela, calabresa, requeijão, milho e salada.','Lanches'),
('X-Explosão',27.00,'Pão, bife, ovo, presunto, mussarela, calabresa, requeijão, batata, milho, cebola, alface e tomate.','Lanches'),
('X-Caminhoneiro',28.00,'Pão, 2 bifes, ovo, presunto, mussarela, bacon, cheddar, requeijão e salada.','Lanches'),
('BV-Megã Monstrão',34.00,'Pão, 4 bifes, 2 ovos, calabresa, bacon, cheddar, requeijão, frango desfiado, batata e salada.','Lanches')
) as v(name,price,description,category)
where not exists (select 1 from public.products);