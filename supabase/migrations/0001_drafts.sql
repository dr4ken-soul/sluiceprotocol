-- Issuance drafts.
--
-- `FRONTEND_SPEC.md` §2.2 requires long-form drafts to autosave to the server rather
-- than to `localStorage`, so they survive a cleared browser and follow the user to
-- another device. This table is that server-side store.
--
-- One draft per user. The upsert in the API route relies on the primary key, and a
-- partial unique index on `user_id` would break the on-conflict clause.
--
-- Apply with:
--   supabase db push
-- or paste into the SQL editor.

create table if not exists public.issuance_drafts (
  user_id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at bigint not null default 0,
  constraint issuance_drafts_user_id_not_blank check (length(btrim(user_id)) > 0)
);

comment on table public.issuance_drafts is
  'Server-side autosave for the six step issuance wizard. Keyed by user id. Never stored in the browser.';

-- Row level security is on, and the service role key bypasses it. These policies
-- therefore exist to deny anonymous access outright rather than to permit anything:
-- a draft is private to its owner, and the browser never talks to this table
-- directly. It goes through the API route, which holds the service role key.
alter table public.issuance_drafts enable row level security;

revoke all on table public.issuance_drafts from anon, authenticated;

-- A single RPC, so the API route can read, write and delete through one endpoint
-- and never needs table-level grants.
create or replace function public.draft_query(query text, params jsonb)
returns setof jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rows jsonb;
begin
  -- Only three statements are reachable, and each is written out rather than
  -- assembled, so the parameter cannot change the statement.
  if query like 'insert into%' then
    execute 'insert into public.issuance_drafts (user_id, data, updated_at) values ($1, $2::jsonb, $3)
             on conflict (user_id) do update set data = excluded.data, updated_at = excluded.updated_at'
      using params->>0, params->>1, (params->>2)::bigint;
    return next '{}'::jsonb;
    return;
  elsif query like 'select%' then
    execute 'select coalesce(jsonb_agg(data), ''[]''::jsonb) from public.issuance_drafts where user_id = $1'
      into rows
      using params->>0;
    return query select jsonb_array_elements(rows);
    return;
  elsif query like 'delete%' then
    execute 'delete from public.issuance_drafts where user_id = $1' using params->>0;
    return next '{}'::jsonb;
    return;
  end if;

  raise exception 'unsupported draft query';
end;
$$;

revoke all on function public.draft_query(text, jsonb) from public, anon, authenticated;
