-- AGORA schema. Run in the Supabase SQL editor (or `supabase db push`).
-- Provider (Groq) API keys are NEVER stored here.

create extension if not exists "pgcrypto";

create table public.philosophers (
  id text primary key,
  name text not null,
  philosophical_school text not null,
  biography text not null,
  personality_prompt text not null,
  portrait_url text
);

create table public.debates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null check (char_length(topic) between 3 and 300),
  philosopher_1_id text not null references public.philosophers(id),
  philosopher_2_id text not null references public.philosophers(id),
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  configuration jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  check (philosopher_1_id <> philosopher_2_id)
);
create index debates_user_idx on public.debates (user_id, created_at desc);
create index debates_topic_search on public.debates using gin (to_tsvector('english', topic));

create table public.debate_messages (
  id bigint generated always as identity primary key,
  debate_id uuid not null references public.debates(id) on delete cascade,
  speaker text not null check (speaker in ('p1','p2','user')),
  round_number int not null default 0,
  message_type text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index debate_messages_debate_idx on public.debate_messages (debate_id, id);

create table public.debate_results (
  id uuid primary key default gen_random_uuid(),
  debate_id uuid not null unique references public.debates(id) on delete cascade,
  philosopher_1_score numeric(4,1) not null check (philosopher_1_score between 0 and 100),
  philosopher_2_score numeric(4,1) not null check (philosopher_2_score between 0 and 100),
  category_scores jsonb not null,
  final_verdict text not null,
  evaluation jsonb not null,
  created_at timestamptz not null default now()
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  debate_id uuid not null references public.debates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  selected_philosopher text not null check (selected_philosopher in ('p1','p2','tie')),
  created_at timestamptz not null default now(),
  unique (debate_id, user_id)
);

-- public.users mirrors auth.users (id, email, created_at) for convenient joins
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.users (id, email) values (new.id, new.email) on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Row level security
alter table public.users enable row level security;
alter table public.philosophers enable row level security;
alter table public.debates enable row level security;
alter table public.debate_messages enable row level security;
alter table public.debate_results enable row level security;
alter table public.votes enable row level security;

create policy "own profile" on public.users for select using (id = auth.uid());
create policy "philosophers readable" on public.philosophers for select using (true);

create policy "debates: owner full access" on public.debates for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "debates: public readable" on public.debates for select using (is_public);

create policy "messages: owner access" on public.debate_messages for all
  using (exists (select 1 from public.debates d where d.id = debate_id and d.user_id = auth.uid()))
  with check (exists (select 1 from public.debates d where d.id = debate_id and d.user_id = auth.uid()));
create policy "messages: public readable" on public.debate_messages for select
  using (exists (select 1 from public.debates d where d.id = debate_id and d.is_public));

create policy "results: owner access" on public.debate_results for all
  using (exists (select 1 from public.debates d where d.id = debate_id and d.user_id = auth.uid()))
  with check (exists (select 1 from public.debates d where d.id = debate_id and d.user_id = auth.uid()));
create policy "results: public readable" on public.debate_results for select
  using (exists (select 1 from public.debates d where d.id = debate_id and d.is_public));

create policy "votes: own" on public.votes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "votes: tallies readable on public debates" on public.votes for select
  using (exists (select 1 from public.debates d where d.id = debate_id and d.is_public));
