-- Execute no SQL Editor do Supabase
create table if not exists products (
  id text primary key,
  name text,
  description text,
  tags text[],
  original_url text,
  factory_url text,
  digital_url text,
  format text,
  width int,
  height int,
  created_at timestamptz default now()
);

-- Bucket de storage (crie manualmente no painel: 'products', público)
-- insert into storage.buckets (id, name, public) values ('products','products',true);