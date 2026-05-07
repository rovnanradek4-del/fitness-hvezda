-- clients
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  profile_markdown text not null default '',
  created_at timestamptz not null default now()
);

-- training_sessions
create table if not exists training_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  date text not null,
  content_markdown text not null default '',
  created_at timestamptz not null default now(),
  unique(client_id, date)
);

create index if not exists training_sessions_client_date on training_sessions(client_id, date desc);

-- google_tokens (single row enforced by constraint)
create table if not exists google_tokens (
  id integer primary key default 1,
  access_token text,
  refresh_token text,
  expiry_date bigint,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
