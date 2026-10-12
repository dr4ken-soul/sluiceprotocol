-- 0003: waitlist.
--
-- This exists because Sluice is not generally available yet. The programs are in
-- a devnet beta and are being released one surface at a time, so the site takes
-- names instead of pretending the product is open. Storing those names is a
-- production flow with real people's details on it, so it gets the same treatment
-- as issuance drafts: a real table, a real migration, and no browser storage.
--
-- Written for the same reason the drafts table is: a list that lives in a browser
-- is a list that is lost when the browser is cleared, and this is the only list
-- the project has.

create table if not exists waitlist_signups (
  -- Supabase's own uuid, used as the primary key. Not exposed to the client.
  id           uuid primary key default gen_random_uuid(),

  -- Email is the identity. A person may ask to be removed, or may re-submit after
  -- forgetting they had already joined, and both are easier if one email is one row.
  -- The uniqueness is what lets the route answer "you are already on the list"
  -- instead of pretending every resubmission is a new person.
  email        text not null unique,

  -- Which of the three roles this person wants to use Sluice as. Framed as the
  -- three roles in APP_BLUEPRINT.md rather than as job titles, because a person who
  -- has never issued anything cannot tell you that they are an "issuer" and would
  -- pick "other" and be lost. Asking what they want to *do* gets a usable answer.
  role         text not null
                 check (role in ('issuer', 'investor', 'member', 'all')),

  -- Free text: the claim they would issue or fund. Invoice, royalty, rent,
  -- revenue share. Unconstrained, because the point is to learn what people
  -- actually intend rather than to fit it into categories chosen in advance.
  intent       text,

  -- Region, free text rather than an ISO enum. The groups design depends on which
  -- mobile money rails are actually available where someone lives, and the rail
  -- landscape changes faster than a database enum should.
  region       text,

  -- Whether they already hold mobile money, and which one. This is the question
  -- the whole Groups design rests on: the people this is for are not buying SOL to
  -- pay gas, so whether they already have a balance somewhere is the thing worth
  -- knowing before building for them.
  mobile_money text,

  -- Whether they have used Solana before. Decides how much onboarding the beta
  -- needs, and whether the devnet faucet flow is a first introduction to the chain
  -- or a fifth.
  solana_familiarity text not null default 'unknown'
                 check (solana_familiarity in ('never', 'once', 'used', 'unknown')),

  -- Optional and deliberately not required. Requiring a wallet address to join a
  -- waitlist would exclude exactly the people the product is for, who do not have
  -- one yet and are not going to make one to fill in a form.
  wallet       text,

  -- Where they came from. Optional, and only ever read in aggregate.
  referrer     text,

  created_at   timestamptz not null default now()
);

-- The route filters by role to size each beta cohort, so this needs to be an index
-- and not a sequential scan once the list stops being small.
create index if not exists waitlist_signups_role_idx
  on waitlist_signups (role);

-- Newest first. The only ordering anything reads this table in.
create index if not exists waitlist_signups_created_at_idx
  on waitlist_signups (created_at desc);

-- RLS on, with no policies. The service role bypasses it, which is how the route
-- writes. There is no anon read path and there should not be one: a waitlist is a
-- list of who wants to be contacted, and it is not public information.
alter table waitlist_signups enable row level security;
