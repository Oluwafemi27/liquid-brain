-- === Migration 022: supplier order ledger (dropshipping) ===
-- One row per supplier purchase made to fulfil a store order. Service-role only (RLS on, no policies).
-- Customer addresses are deliberately NOT stored here.
create table if not exists supplier_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_order_id text not null,
  store_order_display text,
  supplier text not null check (supplier in ('manual', 'cj')),
  supplier_ref text,
  status text not null default 'to_place'
    check (status in ('to_place', 'placed', 'shipped', 'delivered', 'issue', 'cancelled', 'refunded')),
  items jsonb not null default '[]'::jsonb,
  currency text not null,
  total_cost numeric(12, 2),
  ship_to_country text,
  carrier text,
  tracking_number text,
  expected_delivery date,
  placed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  note text,
  events jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Never buy twice for the same store order (a cancelled attempt may be retried).
create unique index if not exists supplier_orders_one_active_per_order
  on supplier_orders (user_id, store_order_id) where status <> 'cancelled';
create index if not exists supplier_orders_user_status_idx on supplier_orders (user_id, status, created_at desc);
alter table supplier_orders enable row level security;
