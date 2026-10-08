# Sluice — Build Guide

## Before You Write a Single Line of Code

Read `FRONTEND_SPEC.md` and `APP_BLUEPRINT.md` in full. Every class, animation value and z-index lives in the former. Every data structure, program responsibility and fee rate lives in the latter. This guide sequences the build, it does not repeat content that already exists at full fidelity elsewhere.

Where a step says "as specified in X", go and read that section before writing the file. Do not guess.

`CLAUDE.md`, once written, becomes the persistent context file for future sessions and sits alongside this guide rather than replacing it.

---

## Prerequisites

```bash
node --version      # 18 or higher
npm --version       # 9 or higher
rustc --version     # 1.78.0
solana --version    # 1.17.34
anchor --version    # 0.29.0
git --version
```

A Solana wallet funded with SOL for deployment and testing. A WalletConnect or Privy project ID. A Yellowstone gRPC endpoint, Helius or Triton, with an access token.

Clone the MetaDAO programs repository as an architectural reference. Do not build inside it and do not copy from it. Its licence is BUSLv1.1.

```bash
git clone https://github.com/metaDAOproject/programs sluice-metadao-reference
```

Read it for the `#[access_control]` plus `handle` split, the error enum conventions and the reentrancy workarounds. Write Sluice's programs independently.

---

## Repository Setup

```bash
mkdir sluice && cd sluice
git init
mkdir -p programs/{settlement,redemption,waterfall,autopilot,compliance,bond,verifier,curve}/src
mkdir -p indexer/src/api
mkdir -p web/src/{app/{app/{asset,issue}},components/{layout,sections,terminal,asset},hooks,lib,styles}
```

Root `.env`, copied into each package as needed, never committed:

```
NEXT_PUBLIC_SOLANA_RPC_URL=
GRPC_ENDPOINT=
NEXT_PUBLIC_PRIVY_APP_ID=
FOUNDER_DISTRIBUTION_ADDRESS=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_DEMO_MODE=true
```

Full variable list in `APP_BLUEPRINT.md`.

---

## Phase 1 — Programs

Build in the order below. Each program gets its own test file before the next begins.

**Phase 0 scope, what ships for the hackathon:** steps 1.1 through 1.7, plus the DBC to DAMM v2 graduation path. Seven of the eight programs.

**Deferred:** step 1.8, autopilot, to Phase 2 unconditionally. It still counts toward the CertiK line figure in `APP_BLUEPRINT.md` because it is auditable scope, but it does not block the demo.

If time runs short, cut in this order: autopilot first, then the preset format, then the issue wizard. Never cut the settlement program, the verifier, the redemption vault, the waterfall vault or the adjudication screen, because those five are the product.

### Step 1.1: Curve engine

Create `programs/curve/src/lib.rs`. Implement `Issuance` and the curve config account as specified in `APP_BLUEPRINT.md`, Data Structures section. The NAV band writes `nav_low` and `nav_high`, and the 16 segment shape derives from them.

Unit test: changing the band changes the derived segment shape, and the sum of segment prices reconciles to the target raise within one basis point.

### Step 1.2: Compliance transfer hook

Implement the Token-2022 transfer hook reading the `Policy` account. Enforce `max_holders`, `transfer_limit` and `holding_period`.

**The critical behaviour:** `revoked_at_graduation` must be honoured. Test that a transfer rejected before graduation succeeds after it. This single property is the invention, so it gets its own named test.

### Step 1.3: Bond vault

Implement posting and slashing. Slashing is reachable only through the attestation failure path in the verifier program. Test that a slash cannot be triggered by any other caller.

### Step 1.4: Milestone verifier

Implement the `Milestone` account, question validation, resolution, and the **default no** path when the verifier does not report inside `grace_window`.

Keep the resolver behind a trait so Panta is swappable for an internal market. Test both: external resolution, internal resolution, and silence resolving no.

### Step 1.5: Settlement

The highest-value program and the one holding user funds. It owns the fee claimer, the creator vesting schedule and the bond vault.

Fee routing to the treasury must be **atomic**. If it fails the whole transaction reverts, so revenue can never be silently lost. Write a test asserting the treasury balance increases by exactly the expected amount on a completed raise.

Verify the DBC partner and fee claimer split against current Meteora documentation before writing this instruction. Do not assume the rate from `APP_BLUEPRINT.md`.

### Step 1.6: Redemption vault

Pro rata claims on failed milestones. Use a claim pattern rather than a push loop, so gas stays bounded regardless of holder count.

Test: a holder claims their share, a second claim for the same tranche reverts, and the vault balance reconciles to the sum of outstanding claims after every operation.

### Step 1.7: Waterfall vault

**Phase 0. This ships.**

Real-world cash flow distribution. Same claim pattern. Test that a distribution moves the correct amount to each holder at the snapshot, and that a holder who claims after a later snapshot does not receive the earlier distribution.

It stays in scope because Meteora scores traction and mainnet volume, and there will be a real issuer. The waterfall vault is what makes the real-world cash flow claim demonstrable rather than theoretical, and it earns 0.50% of each distribution, so it is revenue-positive rather than a cost centre.

Also test that the distribution fee is charged only when a distribution actually occurs. No distribution, no fee.

### Step 1.8: Autopilot

**Deferred to Phase 2. Skip this in Phase 0.**

Splits the DAMM v2 position NFT, locks a floor tranche, then builds the DLMM bin ladder. Harvest and compound on a cadence.

Skip it not because it is hard but because its entire fee stream, 0.50% AUM plus 10% performance, depends on assets under management that will not exist at launch. It is roughly 700 lines of audit surface generating zero revenue and zero demo value in Phase 0.

### Step 1.9: Deploy and verify

```bash
anchor build
anchor deploy --provider.cluster mainnet
```

Copy every program ID into `.env` and into the README. Verify each on Solscan. An unverified program makes the demo look unfinished.

---

## Phase 2 — Indexer and Data API

### Step 2.1: gRPC subscription

Create `indexer/src/grpc.ts`. Subscribe to issuance, milestone and settlement accounts over Yellowstone gRPC. Emit typed events.

Fallback chain, in order: gRPC, then websocket `accountSubscribe`, then a 15 second poll logged as a warning. Never start with the poll.

### Step 2.2: Featured issuance selection

Create `indexer/src/featured.ts`. Implements the deterministic rule: milestone still open, soonest settlement timestamp, tie-broken by amount raised.

When no real issuance qualifies and `NEXT_PUBLIC_DEMO_MODE` is true, serve the seeded fixture from `APP_BLUEPRINT.md`. The fixture carries `isDemo: true` and the frontend renders the DEMO tag from that flag.

**Test that promotion is a configuration change, not a deploy.** Flip the flag, confirm the frontend switches without a rebuild of the programs.

### Step 2.3: Public data API

**Phase 2. The terminal and the widget ship in Phase 0, the metered paid API does not.**

What ships now: the public risk terminal and the embeddable widget, both unmetered and free. They answer Meteora's data-tooling ask and they are the demo surface, so they are not optional.

What waits: key management, rate limiting, metering, Stripe billing and the Starter and Institutional tiers. All of it is monetisation plumbing with no demo value, and every line of it is a place to get billing wrong in public.

Meter the tiers per `APP_BLUEPRINT.md` when the switch flips in Phase 2.

---

## Phase 3 — Frontend

### Step 3.1: Next.js and Tailwind setup

```bash
cd web
npx create-next-app@latest . --typescript --tailwind --app
npm install motion @solana/wallet-adapter-react @solana/wallet-adapter-wallets @solana/web3.js
npm install @privy-io/react-auth @tanstack/react-query
```

Translate the colour system and font imports from `FRONTEND_SPEC.md` §1.1 and §1.2 into `tailwind.config.ts` and `src/styles/globals.css` exactly as written. This is the one part of the spec that gets copied in full, because it is foundational wiring rather than section content.

Add the semantic z-index scale from §1.3 and the global CSS rules hiding the scrollbar.

### Step 3.2: Providers

Wrap the app in `PrivyProvider` with the config from `FRONTEND_SPEC.md` §2.2, plus the Solana wallet adapter for the self-custody path, plus `QueryClientProvider`.

Mount the grain overlay once at the root, per §1.5. Never per section.

### Step 3.3: Auth, role selection and gating

Create `ProtectedRoute` per `FRONTEND_SPEC.md` §2.1, reading `authenticated` and `ready` from Privy rather than `isConnected`. Create the connection modal with all four states, and the wallet menu per §2.1 and §2.2.

**Every sign-in method is offered to every user, in both roles.** Google, email and self-custody wallet on one screen, for issuers and investors alike. Configure `loginMethods: ['google', 'email', 'wallet']`. Never gate a method behind the role choice.

Order is role first, then method, and **role is not a permission check**:

- Never branch on role to decide what a user may do
- Derive issuer capability from chain state, by asking whether the address owns any `Issuance` accounts
- Role selection sets a default landing view only, overridable at any time
- Store the role preference server-side with the draft autosave, never in browser storage

Build **one** app interior with role-conditional surfaces. Do not create a separate issuer dashboard and investor dashboard.

Add `vercel.json` with the SPA rewrite now, not later. Deep-link handling is a release blocker and it is easy to forget until the demo.

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

### Step 3.4: Live data hook

Create `src/hooks/useIssuances.ts`. Subscribes once, shares state through the query cache keyed by account address. Values transition with count-up over 600ms rather than jumping.

No `localStorage`, no `sessionStorage`, no `setInterval`.

### Step 3.5: Landing sections

One component per section in `src/components/sections/`, built to the matching numbered section of `FRONTEND_SPEC.md`:

- `Hero.tsx` — §3, includes `HeroVideo`
- `Problem.tsx` — §4
- `Mechanism.tsx` — §5
- `Marketplace.tsx` — §6
- `Adjudication.tsx` — §7
- `Compliance.tsx` — §8
- `Metrics.tsx` — §9
- `FinalCta.tsx` — §10
- `Footer.tsx` — §11

Assemble in `src/app/page.tsx` in that order.

### Step 3.6: Hero video

Per `FRONTEND_SPEC.md` §1.6. Drop `hero-video.mp4` and `hero-video.webp` into `public/`.

Verify before moving on: the element has `autoPlay muted loop playsInline preload="auto"`, and there is no `currentTime` assignment anywhere in the codebase. Grep for it.

```bash
grep -rn "currentTime" web/src     # must return nothing
grep -rn "once: true" web/src      # must return nothing
```

### Step 3.7: App interior

- `src/app/app/page.tsx` — terminal, per §16.1
- `src/app/app/asset/[ticker]/page.tsx` — five tabs, per §16.2
- `src/app/app/issue/page.tsx` — six step wizard, per §16.3

The adjudication table and the attestation panel are the demo screens. Build them before the terminal if time is short.

### Step 3.8: Build and deploy

```bash
npm run build
vercel --cwd web
```

---

## Phase 4 — Revenue Wiring

Fees are live from day one at fixed rates. Build the routing, the treasury PDA, the multisig and the sweep, and test every fee individually.

**Read `APP_BLUEPRINT.md`, "Where every fee physically comes from", before writing any fee instruction.** Each fee has a different source layer, and getting one wrong either loses the revenue or damages a pool.

### Step 4.1: Treasury

Deploy the program-owned Treasury PDA. Configure the 3-of-5 multisig and the 48 hour timelock above the withdrawal threshold.

Set `NEXT_PUBLIC_DBC_PARTNER_ADDRESS` and `NEXT_PUBLIC_DAMMV2_PARTNER_ADDRESS` to the **Treasury PDA**, not to any externally owned wallet. The partner address is the fee claimer, so whatever sits here receives every Meteora-routed fee.

### Step 4.2: Founder distribution

Set `FOUNDER_DISTRIBUTION_ADDRESS` in the environment. Never hardcode it. Test the monthly sweep on devnet first, with a small amount, before enabling on mainnet.

Confirm the sweep is idempotent. Running it twice in one period must not double pay.

### Step 4.3: Curve trade fee, 0.30%

Source: **DBC partner fee allocation.** Never the LP fee.

1. Read the current DBC developer guide and the `dynamic-bonding-curve` repository
2. Register Sluice as the pool's partner at creation
3. Set the partner `fee_claimer` to the Treasury PDA
4. Set the partner `fee_bps` to 30

Test: run a swap, assert the Treasury PDA balance increases by exactly 0.30% of the swap notional. Then assert the LP fee accrual is unchanged from a control pool without the partner allocation configured.

### Step 4.4: Secondary trade fee, 0.30%

Source: **DAMM v2 and DLMM partner or protocol fee share.** Never the LP fee.

Same procedure as 4.3 against the DAMM v2 program. Confirm which of partner allocation or protocol share is available in live config and use whichever applies. Test identically.

### Step 4.5: Milestone market fee, 0.50%

Source: **Panta creator fee.**

Sluice creates each milestone market, so Sluice is the market creator. Confirm with Panta in their `#dev-chat` Discord channel that the creator fee rate is configurable before assuming 50 bps is available. If it is capped lower, take the cap and record the real number in `APP_BLUEPRINT.md`.

Test: place a YES trade, assert the creator fee accrues to the configured address at the expected rate.

### Step 4.6: Program-owned fees

These four come from Sluice's own programs, so the fee is a deduction taken before the funds reach their destination. Each must route to the Treasury PDA **inside the same transaction**, so that a failed routing reverts the whole thing rather than losing revenue.

| Fee | Rate | Deducted from |
|---|---|---|
| Issuance creation | $200, or 0.25% of target if greater, capped at 1% of target | the creation transaction, and the target must be at least $25,000 |
| Redemption claim | 0.25% | the amount being claimed |
| Waterfall claim | 0.50% | the distribution amount |
| Preset purchase | $49, or 0.25% of raise if greater | the launch transaction |

**Preset purchase has an extra step.** 70% of it goes to the preset creator, and that transfer must happen **before** the remainder reaches the Treasury PDA, inside the same transaction. If the creator transfer fails, the whole transaction reverts.

Test for each: assert the recipient receives exactly the net amount, and the Treasury PDA receives exactly the fee amount.

### Step 4.7: No deposit path, and the minimum raise

**There is no deposit exemption, and there must be no deposit-only code path.**

An earlier version of this guide said the opposite, and it was wrong. The exemption was inherited from a perpetual futures product where funding an account and opening a position are two separate actions. In Sluice they are one action: a buyer sends USDC and receives tokens in a single swap, and the curve trade fee is taken inside that swap.

This matters more than it looks. A free-deposit path is a way for a buy to escape the curve trade fee entirely, and trading carries 87% of Phase 0 gross revenue at every projected scale.

- Assert that every buy along the curve accrues exactly 0.30% to the Treasury PDA, with no path that skips it
- Assert that no instruction accepts funds into an issuance without applying the curve trade fee
- Assert the swap fee is charged in both directions, buy and sell

**Minimum raise, $25,000.** Enforce it at issuance creation and reject anything below it. Without a floor, the flat $200 fee would be 100% of a $200 target and 20% of a $1,000 target.

- Assert that an issuance with a target below $25,000 is rejected at creation
- Assert that the issuance fee never exceeds 1% of the target
- Test issuances stay free on devnet, and are never free on mainnet

### Step 4.8: Attestation renewal

Charged at attestor cost plus a 15% coordination margin. This is a pass-through, not pure margin, so track the attestor's actual cost separately from the 15% and only count the 15% as protocol revenue.

### Step 4.9: Stripe

Data API subscriptions only, Phase 2. Never route a core on-chain transaction through Stripe.

### Step 4.10: Dependency exposure controls

These four exist because the likeliest failure is not an exploit of Meteora or Panta. It is a thin milestone market being moved cheaply, which releases a tranche that should not have been released. None of them are optional.

**Depth floor.** If the market on a milestone has not reached a minimum depth and volume by the deadline, its resolution is not accepted. It falls back to the internal market, or to the verifier report alone. Assert that a resolution from a market below the floor is rejected.

**Resolution-to-release delay.** 48 hours between a milestone resolving and the tranche releasing, during which the pause guardian can halt a wrong release. It applies to tranche release only. Capital already vested to a holder is never subject to it.

**Caps.** A maximum value per DBC pool, per issuance, and protocol-wide during Phase 0. These do not prevent an incident, they bound it. Set the Phase 0 protocol-wide cap low.

**Pause guardian.** A multisig that can halt new issuance creation, tranche release, and redemption claims. It must **never** be able to stop a holder claiming funds already vested to them, because that is a rug vector and every reviewer will read it as one.

Write the test proving the guardian cannot touch vested claims **before** the test proving it can pause.

Thresholds for the depth floor and the caps are left unset deliberately. Set them from observed market depth once real issuances exist. Do not guess now.

---

## Phase 5 — Quality Audit

**Programs:**
- [ ] Every program verified on Solscan
- [ ] Fee routing test asserts the exact treasury amount
- [ ] Slashing reachable only through the attestation failure path
- [ ] Verifier silence resolves no
- [ ] Transfer rejected before graduation, succeeds after
- [ ] Second claim on the same tranche reverts
- [ ] Error variants appended to the end of every enum, never inserted

**Frontend:**
- [ ] `grep -rn "currentTime" web/src` returns nothing
- [ ] `grep -rn "once: true" web/src` returns nothing
- [ ] `grep -rn "localStorage\|sessionStorage" web/src` returns nothing, apart from anything inside `node_modules`
- [ ] Contrast audited. Accented text uses `--accent-text`, not `--accent`
- [ ] No mock data. Every figure is a live read
- [ ] Hard refresh on `/app/asset/LCC-01` renders the route, no host 404
- [ ] Embedded wallet signup works end to end with a fresh email
- [ ] Issuance draft survives a navigation away, restored from the server
- [ ] Logo and favicon are still comment slots
- [ ] Reduced motion disables the hero video and the count-ups
- [ ] Mobile: hero stacks with the card leading, marketplace becomes cards, no horizontal overflow

**Revenue:**
- [ ] Every fee rate reads from environment, none hardcoded anywhere
- [ ] Mainnet rates match the fixed table in `APP_BLUEPRINT.md` exactly
- [ ] Curve fee proven to come from the DBC **partner** allocation, not the LP fee
- [ ] Secondary fee proven to come from the DAMM v2 **partner or protocol** share, not the LP fee
- [ ] LP fee accrual measured identical to a control pool with no partner allocation set
- [ ] Panta creator fee rate confirmed as configurable, and the real cap recorded
- [ ] Each of the four program-owned fees tested: recipient gets exact net, treasury gets exact fee
- [ ] Preset creator receives 70% before the treasury receives its 30%, in one transaction
- [ ] No deposit-only path exists. Every buy along the curve accrues 0.30%, both directions
- [ ] Issuance creation rejects any target below the $25,000 minimum raise
- [ ] Issuance fee proven never to exceed 1% of target
- [ ] Depth floor verified: a resolution from a market below the floor is rejected
- [ ] Resolution-to-release delay verified at 48 hours
- [ ] Caps configured per pool, per issuance, and protocol-wide
- [ ] Pause guardian can halt issuance, tranche release and redemption claims
- [ ] Pause guardian proven unable to touch funds already vested to a holder
- [ ] Waterfall fee charged only when a distribution actually occurs
- [ ] Attestor cost tracked separately from the 15% margin, only the margin counted as revenue
- [ ] Sweep proven idempotent, running twice in one period does not double pay
- [ ] `grep -rn "FOUNDER_DISTRIBUTION_ADDRESS" programs/ web/src` returns no literal addresses

**Submissions:**
- [ ] Public repo with README
- [ ] Demo video, 4 minutes maximum, leading with the adjudication screen
- [ ] Colosseum submission, one product, three chains
- [ ] Meteora DBC sidetrack
- [ ] CertiK submission with the eight programs and their line counts
- [ ] Panta sidetrack
- [ ] Superteam Nigeria
- [ ] X posts, per `MARKETING.md`
