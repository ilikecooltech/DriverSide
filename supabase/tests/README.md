# Database checks

`accounts_rls.sql` proves the rules in `migrations/20261108_accounts.sql`:
each account sees only its own rows, nobody but the server can create a
pass, a guest pass is claimed by the matching email, and deleting an
account removes everything tied to it.

Run it against a throwaway Postgres 16 with a stub of Supabase's `auth`
schema (`auth.users`, `auth.uid()` reading `request.jwt.claim.sub`, roles
`anon` and `authenticated`), after applying the migration. Never run it
against production: it inserts and deletes users.
