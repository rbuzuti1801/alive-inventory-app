create extension if not exists "pgcrypto";

create table if not exists public.sectors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid references public.sectors(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  unique (sector_id, name)
);

create table if not exists public.users_internal (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text unique not null,
  password_hash text not null,
  role text not null check (role in ('admin', 'responsavel', 'visualizador')),
  sector_id uuid references public.sectors(id),
  active boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  item_code text unique not null,
  description text not null,
  sector_id uuid references public.sectors(id),
  subcategory_id uuid references public.subcategories(id),
  brand text,
  model text,
  quantity integer not null default 1 check (quantity >= 0),
  conservation_status text not null check (conservation_status in ('novo', 'bom', 'regular', 'danificado', 'em_manutencao')),
  location text not null,
  acquisition_date date,
  acquisition_value numeric,
  responsible_name text,
  observations text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo', 'descartado')),
  created_by uuid references public.users_internal(id),
  updated_by uuid references public.users_internal(id),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create index if not exists idx_inventory_items_sector on public.inventory_items(sector_id);
create index if not exists idx_inventory_items_subcategory on public.inventory_items(subcategory_id);
create index if not exists idx_inventory_items_status on public.inventory_items(status);
create index if not exists idx_inventory_items_conservation on public.inventory_items(conservation_status);
create index if not exists idx_subcategories_sector on public.subcategories(sector_id);

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists touch_sectors_updated_at on public.sectors;
create trigger touch_sectors_updated_at
before update on public.sectors
for each row execute function public.touch_updated_at();

drop trigger if exists touch_subcategories_updated_at on public.subcategories;
create trigger touch_subcategories_updated_at
before update on public.subcategories
for each row execute function public.touch_updated_at();

drop trigger if exists touch_users_internal_updated_at on public.users_internal;
create trigger touch_users_internal_updated_at
before update on public.users_internal
for each row execute function public.touch_updated_at();

drop trigger if exists touch_inventory_items_updated_at on public.inventory_items;
create trigger touch_inventory_items_updated_at
before update on public.inventory_items
for each row execute function public.touch_updated_at();

alter table public.sectors enable row level security;
alter table public.subcategories enable row level security;
alter table public.users_internal enable row level security;
alter table public.inventory_items enable row level security;

revoke all on public.sectors from anon, authenticated;
revoke all on public.subcategories from anon, authenticated;
revoke all on public.users_internal from anon, authenticated;
revoke all on public.inventory_items from anon, authenticated;

insert into public.sectors (name, description)
values
  ('Templo', 'Ambientes principais do templo'),
  ('Hall de entrada', 'Recepção, café e banheiros do hall'),
  ('Sala Ap. e Profeta', 'Sala pastoral'),
  ('Cozinha', 'Cozinha e apoio'),
  ('Espaço Kids', 'Salas e materiais infantis'),
  ('Sala dos voluntários', 'Apoio aos voluntários'),
  ('Estoque', 'Áreas de armazenamento')
on conflict do nothing;

insert into public.subcategories (sector_id, name)
select s.id, x.name
from public.sectors s
join (
  values
    ('Templo', 'Nave'),
    ('Templo', 'Altar'),
    ('Templo', 'Mídia'),
    ('Templo', 'House música'),
    ('Hall de entrada', 'Espaço'),
    ('Hall de entrada', 'Café'),
    ('Hall de entrada', 'Banheiro'),
    ('Sala Ap. e Profeta', 'Banheiro'),
    ('Espaço Kids', 'Sala 01'),
    ('Espaço Kids', 'Sala 02'),
    ('Espaço Kids', 'Sala 03'),
    ('Sala dos voluntários', 'Armário de voluntários'),
    ('Estoque', 'Estoque frente'),
    ('Estoque', 'Estoque fundo')
) as x(sector_name, name) on x.sector_name = s.name
on conflict do nothing;
