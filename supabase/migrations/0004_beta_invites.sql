-- 0004: beta invites.
--
-- Sluice's app routes are gated. This is the table that decides who clears the
-- gate, and the two columns that record the journey from "we have your email" to
-- "this wallet is in".
--
-- The design question this migration answers is what an invite actually proves.
-- On devnet it proves exactly one thing: a human the project trusts handed this
-- code to this person. It does not prove who that person is. Email binding is not
-- identity, because anyone can create an email, and pretending otherwise would be
-- the kind of security theatre that reads well in a demo and fails in an audit.
--
-- What makes it good enough for a devnet beta is that the identity it *does* bind
-- to is the wallet address, which cannot be created by hand without a key. The
-- email selects the cohort; the wallet is the identity. See README for the
-- mainnet path, which replaces the email check with an on-chain allowlist and a
-- signature challenge, both of which need programs that exist.

create table if not exists beta_invites (
  -- The public half of the code. A random 10-character Crockford base32 string, so
  -- it is unambiguous over the phone and has no 0/O or 1/I to be misread.
  code         text primary key,

  -- The email this invite is bound to, or null for an open invite.
  --
  -- Null is a deliberate second kind of code, not a missing value. An email-bound
  -- invite forwarded to Bob fails because the signature covers this column. An open
  -- invite can be forwarded, which is why it is capped by `max_uses` and expires.
  email        text,

  -- How many wallets may redeem it. One for an email-bound invite, and one by
  -- default for an open one too: an open invite that never decays is a permanent
  -- hole, which is the standard way invite-only launches leak.
  max_uses     int  not null default 1,

  -- Incremented on each redemption. The check `uses < max_uses` is done in the
  -- server's conditional update, not by reading then writing, because two people
  -- redeeming the last use at the same moment would otherwise both succeed.
  uses         int  not null default 0,

  -- When it stops working. Fourteen days, which is long enough to be forwarded
  -- deliberately and short enough that a leaked link in a screenshot is stale
  -- before anyone thinks to use it.
  expires_at   timestamptz not null,

  -- Set by hand to kill a code without deleting the row, so there is a record that
  -- an invite was issued and withdrawn.
  revoked_at   timestamptz,

  created_at   timestamptz not null default now()
);

-- Redemption writes need to find the row by code.
create index if not exists beta_invites_email_idx on beta_invites (email);

-- The promotion columns on the waitlist row.
--
-- Three distinct states, and the difference between them is the whole flow:
--
--   invited_at   set when someone with a code lands. They have been let in by a
--                human, but have not yet proved which wallet they are.
--   activated_at set when a wallet redeems. This is the one the gate reads.
--   wallet       the bound address, which is the actual identity from here on.
--
-- They are separate columns rather than one status string because the states are
-- not ordered by severity but by stage, and a column that collapses them hides
-- which one you are looking at.
alter table waitlist_signups add column if not exists invited_at  timestamptz;
alter table waitlist_signups add column if not exists activated_at timestamptz;

-- The redemption lookup is by wallet, not by email, because the wallet is the
-- identity. Without this the gate does a sequential scan on every page load of
-- every gated route.
create index if not exists waitlist_signups_wallet_idx
  on waitlist_signups (wallet)
  where activated_at is not null;

-- Same reasoning as 0003: RLS bypass is not table permission.
alter table beta_invites enable row level security;
grant insert, update, select on table public.beta_invites to service_role;
grant update on table public.waitlist_signups to service_role;

-- No delete grant, for the same reason as 0003: removing a record has to be a
-- deliberate act by a person. An invite is withdrawn by setting revoked_at, which
-- leaves the fact that it existed.

-- ---------------------------------------------------------------------------
-- The two functions the server calls.
--
-- Both exist because PostgREST cannot express the operation, not because security
-- requires them to be hidden. `consume_invite` needs an atomic read-modify-write,
-- which PostgREST has no syntax for.
-- ---------------------------------------------------------------------------

-- Consumes one use, atomically.
--
-- The guard `uses < max_uses` lives in the `where` clause of the `update`, so it is
-- evaluated by the database against the locked row. Read-then-write from the
-- application would let two simultaneous redemptions of the final use both observe
-- `uses = 0` and both succeed, which defeats the point of a single-use invite.
--
-- `revoked_at is null` is in the same guard rather than checked beforehand, for the
-- same reason: a separate read would leave a window between the check and the write
-- in which a revoke could be missed.
--
-- Returns false when the invite was already spent, revoked, expired or unknown. The
-- caller cannot tell those apart, which is deliberate: distinguishing them would
-- confirm that a given code exists.
create or replace function public.consume_invite(invite_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  consumed int;
begin
  update beta_invites
     set uses = uses + 1
   where code = invite_code
     and uses < max_uses
     and revoked_at is null
     and expires_at > now();
  get diagnostics consumed = row_count;

  if consumed = 1 then
    return true;
  end if;
  return false;
end;
$$;

-- Binds a wallet to an invite and activates the matching waitlist row.
--
-- The invite row carries the email for the open case, where there is no waitlist
-- row to read it from. So this creates the waitlist row if it does not exist. That
-- is not a loophole: an open invite is exactly an invite for somebody who never
-- filled in the form, and refusing them would make the open code useless.
--
-- Returns the email that is now bound to the wallet, which is what the gate and the
-- wallet menu both display.
create or replace function public.activate_invite(invite_code text, wallet_address text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_email text;
begin
  select email into target_email from beta_invites where code = invite_code;
  if target_email is null then
    raise exception 'unknown invite';
  end if;

  insert into waitlist_signups (email, role, solana_familiarity, invited_at, wallet, activated_at)
  values (target_email, 'all', 'unknown', now(), wallet_address, now())
  on conflict (email) do update
    set wallet = excluded.wallet,
        activated_at = now(),
        invited_at = coalesce(waitlist_signups.invited_at, now());

  return target_email;
end;
$$;

-- Both are `security definer` because the service role calls them over PostgREST,
-- which runs as `authenticated`, not as the owner. `search_path` is pinned so a
-- malicious object in another schema cannot be substituted for `beta_invites`.
revoke execute on function public.consume_invite(text) from public, anon, authenticated;
revoke execute on function public.activate_invite(text, text) from public, anon, authenticated;
grant execute on function public.consume_invite(text) to service_role;
grant execute on function public.activate_invite(text, text) to service_role;

