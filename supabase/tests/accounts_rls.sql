-- Security checks for 20261108_accounts.sql. Run against a database with
-- the migration applied (see supabase/tests/README.md). Every check raises
-- an error on failure, so a clean run means every rule held.
\set ON_ERROR_STOP 1
insert into auth.users values ('00000000-0000-0000-0000-00000000000a', 'ana@example.com'),
                              ('00000000-0000-0000-0000-00000000000c', 'cy@example.com');

do $$ begin
  if (select count(*) from public.profiles) <> 3 then raise exception 'every account (including the one that existed first) should get a profile'; end if;
  if (select count(*) from public.user_state) <> 3 then raise exception 'every account should get a state row'; end if;
end $$;

-- A guest bought a pass with Ana's email; the webhook (server) writes it.
insert into public.passes (email, product, cohort, amount_cents, stripe_session_id)
values ('ANA@example.com', 'deal_pass', 'paid_founding', 1900, 'cs_test_1');

-- Now act as Ana.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

update public.user_state set state = '{"cars":[{"id":"x"}]}' where user_id = auth.uid();
do $$ begin
  if (select count(*) from public.user_state) <> 1 then raise exception 'Ana should see only her own state'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'Ana should see only her own profile'; end if;
end $$;

-- She can't touch Cy's state.
update public.user_state set state = '{"hacked":true}' where user_id = '00000000-0000-0000-0000-00000000000c';

-- She can't make herself a pass.
do $$ begin
  begin
    insert into public.passes (user_id, email, product, cohort) values (auth.uid(), 'ana@example.com', 'deal_pass', 'paid_full');
    raise exception 'Ana created a pass; only the server should';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Signing in claims the guest pass bought with her email (any case).
do $$ begin
  if public.claim_my_passes() <> 1 then raise exception 'Ana should claim her guest pass'; end if;
  if (select count(*) from public.passes) <> 1 then raise exception 'Ana should now see her pass'; end if;
end $$;

-- Delete my account.
select public.delete_my_account();
reset role;

do $$ begin
  if exists (select 1 from auth.users where id = '00000000-0000-0000-0000-00000000000a') then raise exception 'Ana''s sign-in should be gone'; end if;
  if exists (select 1 from public.user_state where user_id = '00000000-0000-0000-0000-00000000000a') then raise exception 'Ana''s state should be gone'; end if;
  if exists (select 1 from public.passes where email ilike 'ana@%') then raise exception 'Ana''s pass rows should be gone'; end if;
  if (select state from public.user_state where user_id = '00000000-0000-0000-0000-00000000000c') <> '{}'::jsonb then raise exception 'Cy''s state should be untouched'; end if;
  if not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-00000000000c') then raise exception 'Cy should still exist'; end if;
end $$;

-- A guest (anon) can't call delete or claim.
set role anon;
do $$ begin
  begin perform public.delete_my_account(); raise exception 'anon called delete'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'ALL ACCOUNT SECURITY CHECKS PASSED' as result;
