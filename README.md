# Sluice

Issue the real asset. The market decides if you keep the money.

Sluice issues claims on real-world cash flow, invoices, royalties and revenue as
tokens on Solana. An issuer receives a NAV band from a valuation model, and that band
sets the shape of a sixteen segment Meteora DBC bonding curve. A Token-2022 transfer
hook enforces the issuing jurisdiction's policy during the raise, and DBC revokes it
automatically at graduation, leaving a controlled primary distribution and a
permissionless secondary market. Each tranche of capital is tied to a single binary
question with a machine-checkable answer and a named verifier. A market opens on that
question. If it resolves yes, the tranche releases on schedule. If it resolves no,
remaining capital routes to a redemption vault and holders claim pro rata. If the
verifier fails to report inside the grace window, the tranche resolves no by default.

Built for Colosseum Crypto World's Fair.

## Status

**Sluice is a devnet beta. It is not open, and this repository does not pretend
otherwise.** Everything below describes the design and the code as written. Here is
what that means concretely:

| | State |
|---|---|
| Frontend | Deployed and live at [sluice-beryl.vercel.app](https://sluice-beryl.vercel.app) |
| Indexer | Deployed at `sluice-indexer-production.up.railway.app`, on **devnet** |
| Issuance surface | Working end to end against a seeded demo fixture |
| Groups | Not built. Phase 1. The routes exist and say so |
| Rust programs | **Do not compile.** The dependency graph is unresolved, see below |
| Network | Solana devnet. No mainnet deployment and none attempted |

Three things are worth being blunt about before a judge reads further.

**The programs do not build.** Solana 1.17.34 needs Rust 1.85 or older, and the
lockfile floats to transitive crates that require `edition2024`, which that Rust
cannot parse. The source has been written and six compile errors fixed, but nothing
here has been compiled, tested against a validator, or deployed to any cluster. Treat
the Rust as a design artifact that has not been run. `core-math` is the exception:
it has no Solana dependencies, 83 unit tests pass on any toolchain, and it is where
the arithmetic that decides where a holder's money goes actually lives.

**The live frontend runs on a demo fixture.** No program is deployed, so there is
nothing on any cluster to read. The indexer serves a seeded fixture and every
surface it touches carries a visible DEMO tag. That tag is a requirement, not a
decoration.

**Groups is not built.** Savings circles between strangers are Phase 1 and are
waiting on mobile money rails. `/app/groups`, `/app/groups/new` and
`/app/circle/[address]` exist and answer with that explanation rather than a mockup
or a dead link, because a nav entry that leads nowhere teaches a visitor the
product's promises are not kept.

The site takes a [waitlist](https://sluice-beryl.vercel.app/waitlist) rather than
claiming availability. That is why the nav's primary action is "Join waitlist"
instead of "Connect wallet".


## What is novel

MetaDAO already ships launchpad plus futarchy plus Meteora DAMM v2, so that
combination is proven, not new. What Sluice adds:

| Claim | Why it holds |
|---|---|
| Real-world assets | MetaDAO launches crypto companies. Sluice issues claims on off-chain cash flow |
| The waterfall vault | Real-world cash arriving on-chain and distributing pro rata |
| Token-2022 hook plus DBC auto-revocation | The invention is that DBC revokes the hook automatically at graduation |
| DBC native | Sluice is native to Meteora DBC's curve, fee scheduler and migration |
| Binary event market as adjudicator | MetaDAO prices a token. Sluice resolves a fact |

**Sluice is not futarchy, and the word is never used to describe it.** MetaDAO's
futarchy runs conditional markets on a token's *future price* and resolves by TWAP.
Sluice runs a binary event market on a single verifiable fact. Both use markets to
decide things. They are different mechanisms, and conflating them in front of a judge
who builds the former would be a costly mistake.

Sluice's programs are independently written. MetaDAO's were studied as an
architectural reference only; their licence is BUSLv1.1 and no code was copied.

## Repository layout

```
programs/          Rust, Anchor 0.29.0, Solana 1.17.34
  core-math/         Dependency-free pure logic, unit tested without a validator
  curve/             NAV anchored sixteen segment curve configuration
  compliance/        Token-2022 transfer hook, attestation registry, policy files
  bond/              Issuer bond, slashable only on attestation failure
  verifier/          Question validation, pluggable resolution, default no
  settlement/        Fee claimer, vesting, tranche release, treasury routing
  redemption/        Pro rata claims on failed milestones
  waterfall/         Real-world cash flow distribution
  autopilot/         DAMM v2 position split, DLMM ladder (deferred to Phase 2)
indexer/           Yellowstone gRPC subscription, featured selection, public API
web/               Next.js 14 App Router, TypeScript, Tailwind, motion/react
supabase/          Postgres migrations: issuance drafts, then the waitlist
```

## Programme line counts

| Programme | Lines | Holds |
|---|---|---|
| settlement | ~600 | 100% of user capital at rest |
| compliance | ~585 | The transfer hook and attestations |
| bond | ~559 | The issuer bond |
| verifier | ~431 | Milestone resolution |
| waterfall | ~438 | Real cash flow in transit |
| curve | ~452 | Curve configuration |
| redemption | ~345 | Everything owed on a failed milestone |
| autopilot | ~393 | Deferred to Phase 2, auditable scope |
| **Total deployable** | **~3,800** | |
| core-math | ~1,890 | Pure logic, no accounts, no funds |

Security relevance for an audit scope: settlement, redemption and waterfall together
hold every dollar users have at rest.

## Quick start

### Prerequisites

```bash
node --version      # 18 or higher
npm --version       # 9 or higher
rustc --version     # 1.78.0 or higher
solana --version    # 1.17.34
anchor --version    # 0.29.0
```

### Install

```bash
cp .env.example .env      # then fill in what you have
npm --prefix web install
npm --prefix indexer install
```

### Database

The web app needs Postgres for issuance drafts and for the waitlist. Apply the
migrations in order, in the Supabase SQL editor or via `supabase db push`:

```
supabase/migrations/0001_drafts.sql
supabase/migrations/0002_draft_query_grant.sql
supabase/migrations/0003_waitlist.sql
supabase/migrations/0004_beta_invites.sql
```

0004 also creates `consume_invite` and `activate_invite`. They are functions rather
than plain queries because PostgREST cannot express an atomic increment, and a
single-use invite that can be redeemed twice by two people at once is not a
single-use invite.

Both tables have row level security enabled with **no policies**, which is
intentional. There is no anonymous read path to a waitlist: it is a list of who
wants to be contacted, and that is not public information. The service role key is
the only way in, and it never leaves the server.

### Programs

> **These scripts currently fail.** `check.ps1` and `build-sbf.ps1` run
> `cargo check`, which cannot resolve the workspace: Solana 1.17.34 requires Rust
> 1.85 or older, and the lockfile floats to transitive crates that need
> `edition2024`. `lockfile.ps1` rewrites the lockfile format version but does not
> fix this. Running `cargo test -p sluice-core-math` on its own does work, and is
> the honest way to verify the arithmetic.

```powershell
# Regenerate the lock file, pinned to the Solana 1.17.34 toolchain.
powershell -ExecutionPolicy Bypass -File .\programs\lockfile.ps1

# Type-check every programme and run the core-math tests. Currently fails, above.
powershell -ExecutionPolicy Bypass -File .\programs\check.ps1

# Build the SBF artefacts. Currently fails, above.
powershell -ExecutionPolicy Bypass -File .\programs\build-sbf.ps1

# What does work: the pure logic, on any toolchain.
cargo test --manifest-path programs/Cargo.toml -p sluice-core-math
```

`core-math` holds the arithmetic that decides where a holder's money goes: the
NAV-anchored curve derivation, pro rata entitlement, the jurisdiction policy
evaluator, milestone resolution including the default-no path, the claim ledger, and
the issuance fee with its minimum raise. It has no Solana dependencies, so its tests
run on any toolchain.

### Indexer

```bash
npm --prefix indexer run dev      # listens on :8787
```

The indexer owns every live read. It prefers a Yellowstone gRPC subscription, degrades
to a websocket `accountSubscribe`, and finally to a fifteen second poll, logging each
degradation rather than failing silently.

### Web

```bash
npm --prefix web run dev
```

## Design

Dark editorial, bento grid, one accent used on under ten percent of surface. Display
type is Schibsted Grotesk, body is Inter, and every ticker, price, odds figure,
timestamp and address is set in Geist Mono. The full system is transcribed in
`web/src/styles/globals.css`; components reference CSS custom properties and never a
literal colour.

The landing page is ten sections with ten distinct layout families: hero, problem,
groups, mechanism, the ladder, marketplace, adjudication, compliance, metrics, and
the closing call to action. The hero loop is ambient: the video owns its own timeline
and scroll drives scale, opacity, translation and blur only. Scroll position never
touches `video.currentTime`.

Where a surface does not exist yet, it says so in its own words and links to the
specification. No mockup, no example member, no invented pot total. The rule the
groups section follows is worth stating as a rule rather than a preference: **a
number on this site is either a chain read or it is not on this site.**

## Live data contract

Every figure the product renders is a chain read. There is no off-chain mirror of
balances, no invented figure, and no cache the chain does not back. When no issuance
qualifies and demo mode is on, a seeded fixture is served and every surface it touches
carries a visible DEMO tag. Flipping demo mode is an indexer restart, never a
programme redeploy.

The frontend stores nothing in `localStorage` or `sessionStorage`. Issuance drafts
autosave to the server through `PUT /api/drafts`, keyed by user id, so a draft
survives a cleared browser and follows the user to another device.

The same rule governs the waitlist. `POST /api/waitlist` validates server-side and
writes to Postgres. There is no counter, no seat count and no countdown on the
waitlist page, because every instance of that furniture is a number somebody made
up, and this project does not publish numbers it made up. A wallet address is
optional and explicitly so: requiring one to join a list would exclude exactly the
people the Groups design is for, who do not have one and are not going to make one
to fill in a form.

## Access, and what an invite actually proves

The app routes are invite-gated. `ProtectedRoute` asks `/api/beta/status` whether
the connected wallet has redeemed a code, and sends anybody who has not to the
waitlist. Connecting a wallet stopped being sufficient, because the site says it is
not open and a wallet is not the same thing as a place.

**An invite on devnet proves exactly one thing: a human the project trusts handed
this code to this person.** It does not prove *who* that person is, and any design
that implied otherwise would be claiming a guarantee it does not have.

That is a deliberate boundary, not a shortcut. The invite is not the security
boundary; **the wallet address** is. Email selects the cohort and anyone can create
an email. An address cannot be created by hand without a key, so binding to it is
what turns "somebody holding a code" into "this specific signer". The flow is:

```
/invite/CODE -> verify on the server -> connect wallet -> POST /api/beta/redeem
             -> use consumed atomically, wallet written, activated_at set
             -> the gate opens for that address, from then on
```

There are two kinds of code, and the difference is what stops the wrong person in:

| | Email-bound | Open |
|---|---|---|
| Signature covers | `code`, `email`, `expiresAt`, `maxUses` | `code`, `expiresAt`, `maxUses` |
| Forwarded to somebody else | fails, `email` is in the payload | works, up to `maxUses` |
| Use when | you know their email | met in person, no address for them |
| Default `maxUses` | 1 | 1, hard-capped at 3 |

An open code exists because the email-bound kind is useless when you meet somebody
at an event and have no address for them. Its weakness, forwardability, is bounded
by `maxUses` and a fourteen-day expiry rather than pretended away. Rotating
`BETA_INVITE_SECRET` invalidates every outstanding code, which is the intended way
to withdraw a batch you have lost.

Codes are Crockford base32 with `I`, `L`, `O` and `U` removed, so nothing in them
can be misread over the phone or off a screenshot. Issuing one:

```bash
node scripts/issue-invite.mjs --email someone@example.com   # bound, single use
node scripts/issue-invite.mjs --open --uses 2               # no email, two wallets
```

### The mainnet path

Three things change, and none of them is "trust the email harder".

**1. Move the allowlist on-chain.** Add an `Allowlist` PDA holding the authorised
addresses, owned by the same pause guardian that can already halt issuance.
`ProtectedRoute` stops being the boundary and becomes a convenience: the terminal
reads it to avoid a pointless transaction, and the program checks regardless. That
difference is the whole point, because a frontend gate can be bypassed by anyone who
reads the JavaScript and a program gate cannot be bypassed by anyone at all.

**2. Replace the code with a signature challenge.** The invitation becomes a
`SignInvite` instruction: the invited wallet signs a nonce the program issues, and
the program verifies it against the allowlist before it writes. What that buys is
that identity is established by a key rather than asserted by a database row that
somebody with a service role key could have written. This is the step that turns
"a human approved this" into "this key was approved", and it is blocked on the
dependency graph resolving, not on design.

**3. Drop email as a credential entirely.** At mainnet, email is a contact address
and never an authorisation. The column stays because it is how somebody is told they
were promoted. Nothing that grants access reads it.

Two controls come with it, worth stating now rather than at launch:

- **One activation per address,** enforced by a unique index on `wallet`, so a code
  cannot be walked across a list of wallets harvested from somewhere else.
- **An on-chain kill that does not depend on the frontend.** The pause guardian can
  already halt issuance, tranche release and redemption claims. It cannot halt a
  holder claiming funds already vested to them, and it must keep that property. A
  guardian that can freeze a withdrawal is a custodian, and this protocol is not one.

What does **not** change: the fee schedule, the default-no resolution path, and the
rule that no Sluice fee comes from the LP fee. An access model is not a reason to
reopen a pricing decision that was settled on the record.

### What is deliberately not built

No referral rewards. Every piece of research on invite-driven launches converges on
the same conclusion: flat per-referral rewards attract sybil farms, and the moment a
reward is attached to an invite the queue stops measuring interest and starts
measuring bot throughput. Sluice has no token, so there is nothing to pay with and
nothing to buy. If invites should spread, the use cap and the expiry are the
mechanism, and they are already there.

One obligation that comes with all of this: **the waitlist has to be a real
waitlist.** People have to be promoted from it on a cadence, not once. A list nobody
is ever let in from is a wall that claims not to be one, and it costs more trust
than having no list at all.

## Audit scope

**[`AUDIT_SCOPE.md`](./AUDIT_SCOPE.md) is the scoping document**, written for CertiK
and usable by any reviewer. It carries the measured line counts, the value-at-risk
ranking, the dependency exposure table, a 12 month roadmap and a mainnet target.

The short version, because the ordering matters more than the detail:

**In scope:** the eight Issuance programs, at a commit hash tagged for audit.
**Out of scope:** Groups programs, the indexer, the frontend, and third-party
dependencies including Meteora and Panta.
**On the roadmap:** Groups, roughly 750 lines, audited separately before it holds
funds.

Settlement, redemption and waterfall are 1,419 lines and hold 100% of user funds at
rest. That is the smallest and highest-risk slice, and a scoping conversation that
does not start there has started in the wrong place.

Roadmap and audit scope are different documents. Conflating them is how a project
ends up described as audited when a subset was.
## Fees

Fixed, published, unchanging. Not tiered by volume, not stepped by growth, not
discounted for whales.

| Action | Fee |
|---|---|
| Curve trade | 0.30% |
| Milestone market trade | 0.50% |
| Secondary trade | 0.30% |
| Redemption claim | 0.25% |
| Waterfall claim | 0.50% |
| Issuance creation | $200, or 0.25% of target if greater |
| Minimum raise | $25,000, enforced at creation |
| Preset purchase | $49, or 0.25% of raise if greater |
| Attestation renewal | attestor cost plus 15% |

**There is no deposit-only action and no deposit exemption.** Buying along the curve
is a trade and is charged in both directions. An earlier version of this repository
had a fee-free deposit path; it described a step that does not exist and created a way
for a buy to escape the curve trade fee entirely.

**No Sluice fee is ever taken from the LP fee.** The LP fee pays liquidity providers
for holding the pool. Every Sluice fee comes from a partner, protocol or creator
allocation, or from a programme Sluice owns outright.

## Dependencies, and what they hold

Sluice is built on other people's programmes. An audit of Sluice's own code says
nothing about the security of Meteora, Panta or Privy.

| Dependency | What it holds | What Sluice loses if compromised | What Sluice does not lose |
|---|---|---|---|
| Meteora DBC | Capital in curve pools during a raise | Funds in that pool | Released tranches; anything in a Sluice vault |
| Meteora DAMM v2 | Post-graduation liquidity | Secondary liquidity and trading | Tokens in wallets; vault balances |
| Panta | The binary market on each milestone | Correctness of one tranche decision | Sluice's programmes |
| Privy | Issuer authentication | That one issuer's account | Protocol funds; other issuers |
| USDC | The settlement currency | The value of USDC held | Everything else |
| Solana | Liveness of the whole system | The ability to transact | Nothing. State persists |

Sluice's settlement, redemption and waterfall programmes hold user capital under
Sluice's own authority, separate from any pool. A DBC exploit drains DBC pools and
does not touch capital already in a Sluice vault.

The likeliest failure is not an exploit of a dependency. It is a thin milestone market
being moved cheaply, which releases a tranche that should not have been released. Four
controls address it: a depth floor below which a resolution is not accepted from the
market, a 48 hour delay between resolution and release during which a guardian can
halt, value caps, and a narrowly scoped pause guardian that can halt new issuance,
tranche release and redemption claims but **cannot** halt a holder claiming funds
already vested to them.

Sluice cannot prevent a dependency exploit, cannot make a third-party market deep, and
cannot insure deposits. The 8% insurance allocation is a protocol backstop and is not
insurance coverage for holders.

## Regulatory position

Sluice is compliance infrastructure for registered offerings and licensed operators.
It is not a registered exchange and it does not provide legal advice.

## Repository

Public. Colosseum scores submissions partly on whether they are open-sourced, and a
public repository also removes the Meteora requirement to grant a judge read access
for reviewing.

## Licence

GPL-3.0-or-later. MetaDAO's programmes are BUSLv1.1 and were studied as an
architectural reference only. No MetaDAO code was copied.
