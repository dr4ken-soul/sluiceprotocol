-- Fix: grant the draft store to service_role, and keep it away from the browser.
--
-- Two defects in 0001, both found by calling the live project rather than reading
-- the SQL. Every draft call answered 42501:
--
--   permission denied for function draft_query
--   permission denied for table issuance_drafts
--
-- Cause. `revoke all on function public.draft_query(text, jsonb) from public, anon,
-- authenticated` revokes from the pseudo-role PUBLIC, which names every role in the
-- database. service_role is not exempt, so the one caller the project depends on,
-- the API route in web/src/lib/server/drafts.ts, lost EXECUTE along with everyone
-- else. The table had the mirror problem: a table created from the SQL editor is
-- not covered by the platform's default privileges, so service_role held no
-- privileges on it at all.
--
-- The intent of 0001 was correct and is kept here. A draft is private to its owner
-- and the browser never holds the service role key, so anon and authenticated must
-- have nothing. What 0001 got wrong was relying on revoking PUBLIC to express that.
-- This migration names every role explicitly instead, so the grant that matters is
-- stated positively rather than inferred from what was taken away.

-- The browser's roles get nothing.
revoke all on table public.issuance_drafts from anon;
revoke all on table public.issuance_drafts from authenticated;
revoke all on function public.draft_query(text, jsonb) from public;
revoke all on function public.draft_query(text, jsonb) from anon;
revoke all on function public.draft_query(text, jsonb) from authenticated;

-- The API route's role gets exactly what it uses, and nothing more.
grant select, insert, delete on table public.issuance_drafts to service_role;
grant usage on schema public to service_role;
grant execute on function public.draft_query(text, jsonb) to service_role;

-- Assert the resulting posture at apply time. A silent partial grant here is what
-- produced the 42501 in the first place, so it is checked rather than assumed.
do $$
declare
  statements text := 'insert into issuance_drafts (user_id, data, updated_at) values ($1, $2::jsonb, $3) on conflict (user_id) do update set data = excluded.data, updated_at = excluded.updated_at';
  rows jsonb;
begin
  if not has_schema_privilege('service_role', 'public', 'usage') then
    raise exception 'service_role lacks usage on schema public';
  end if;
  if not has_table_privilege('service_role', 'public.issuance_drafts', 'select') then
    raise exception 'service_role cannot select from public.issuance_drafts';
  end if;
  if not has_table_privilege('service_role', 'public.issuance_drafts', 'insert') then
    raise exception 'service_role cannot insert into public.issuance_drafts';
  end if;
  if not has_table_privilege('service_role', 'public.issuance_drafts', 'delete') then
    raise exception 'service_role cannot delete from public.issuance_drafts';
  end if;
  if not has_function_privilege('service_role', 'public.draft_query(text, jsonb)', 'execute') then
    raise exception 'service_role cannot execute public.draft_query';
  end if;

  -- The lockout must not have been fixed by opening the table to the browser.
  if has_table_privilege('anon', 'public.issuance_drafts', 'select') then
    raise exception 'anon can select from public.issuance_drafts; drafts would be public';
  end if;
  if has_function_privilege('anon', 'public.draft_query(text, jsonb)', 'execute') then
    raise exception 'anon can execute public.draft_query';
  end if;

  -- Round trip once, under a throwaway id, then clean up. Proves the function body
  -- still runs and not merely that the privilege bits are set.
  execute statements using 'draft_query_selftest', '{"selftest":true}'::jsonb, 0;
  execute 'select coalesce(jsonb_agg(data), ''[]''::jsonb) from public.issuance_drafts where user_id = $1'
    into rows
    using 'draft_query_selftest';
  if jsonb_array_length(rows) <> 1 then
    raise exception 'draft_query round trip returned % rows, expected 1', jsonb_array_length(rows);
  end if;
  execute 'delete from public.issuance_drafts where user_id = $1' using 'draft_query_selftest';
end;
$$;
