-- DriverSide accounts: what a signed-in account holds.
--
-- Run once in Supabase -> SQL Editor (or `supabase db push`). Safe to run
-- again: every statement is idempotent.
--
-- Rules this file enforces, not the app:
--  * Every table is row-level secured: a signed-in user can read and
--    write only their own rows. Guests never touch the database.
--  * Passes are written only by the server (the Stripe webhook, using the
--    service role). Users can read their own; they can't create or edit one.
--  * Deleting an account deletes everything about it (on delete cascade),
--    from one function the user calls on themselves.

-- ── profiles: one row per account ──────────────────────────────────────
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  state        text check (state ~ '^[A-Z]{2}$'),
  email_opt_in boolean not null default false,  -- marketing email: off unless they turn it on
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── user_state: the garage, setup and dealer session, synced ───────────
-- One JSON document per account, the same shape the app keeps on the
-- phone (src/lib/storage.js). Kept as one document on purpose: the app
-- merges it whole (src/lib/cloud.js), and it stays small (a few KB).
create table if not exists public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null default '{}'::jsonb check (pg_column_size(state) < 262144),
  version    integer not null default 1,
  updated_at timestamptz not null default now()
);

-- ── passes: Deal Passes, written by the Stripe webhook ─────────────────
-- user_id is empty for a guest purchase; the email links it later when
-- they sign in with the same address.
create table if not exists public.passes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users (id) on delete cascade,
  email              text,
  product            text not null check (product in ('deal_pass', 'deal_pass_90')),
  cohort             text not null check (cohort in ('paid_full', 'paid_founding', 'comped_batch')),
  amount_cents       integer not null default 0 check (amount_cents >= 0),
  stripe_session_id  text unique,
  status             text not null default 'active' check (status in ('active', 'refunded', 'expired')),
  created_at         timestamptz not null default now(),
  expires_at         timestamptz
);
create index if not exists passes_user_idx  on public.passes (user_id);
create index if not exists passes_email_idx on public.passes (lower(email));

-- ── my_cars: cars they've bought, for "Get to know your car" ───────────
create table if not exists public.my_cars (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  vin            text check (vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  year           integer check (year between 1981 and 2100),
  make           text,
  model          text,
  trim           text,
  purchased_on   date,
  price_cents    integer check (price_cents >= 0),
  features       jsonb not null default '[]'::jsonb,
  onboarding     jsonb not null default '{}'::jsonb,   -- checklist progress
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists my_cars_user_idx on public.my_cars (user_id);

-- ── row-level security ─────────────────────────────────────────────────
alter table public.profiles   enable row level security;
alter table public.user_state enable row level security;
alter table public.passes     enable row level security;
alter table public.my_cars    enable row level security;

drop policy if exists "own profile"     on public.profiles;
drop policy if exists "own state"       on public.user_state;
drop policy if exists "read own passes" on public.passes;
drop policy if exists "own cars"        on public.my_cars;

create policy "own profile" on public.profiles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own state" on public.user_state
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "read own passes" on public.passes
  for select to authenticated using (user_id = auth.uid());
create policy "own cars" on public.my_cars
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── a profile for every new account ────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.user_state (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts made before this file ran get their rows too.
insert into public.profiles (user_id)   select id from auth.users on conflict (user_id) do nothing;
insert into public.user_state (user_id) select id from auth.users on conflict (user_id) do nothing;

-- ── claim passes bought as a guest with the same email ────────────────
create or replace function public.claim_my_passes()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.passes p
     set user_id = auth.uid()
    from auth.users u
   where u.id = auth.uid()
     and p.user_id is null
     and u.email is not null
     and lower(p.email) = lower(u.email);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.claim_my_passes() from public, anon;
grant execute on function public.claim_my_passes() to authenticated;

-- ── delete my account ─────────────────────────────────────────────────
-- Removes the sign-in and, by cascade, every row above. Paid passes
-- remain in Stripe's records for refunds and tax, as they must; nothing
-- here can be recovered.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- keep updated_at honest
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists touch_profiles on public.profiles;
drop trigger if exists touch_state    on public.user_state;
drop trigger if exists touch_cars     on public.my_cars;
create trigger touch_profiles before update on public.profiles   for each row execute function public.touch_updated_at();
create trigger touch_state    before update on public.user_state for each row execute function public.touch_updated_at();
create trigger touch_cars     before update on public.my_cars    for each row execute function public.touch_updated_at();
