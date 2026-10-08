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
supabase/          Draft storage migration
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

### Programs

```powershell
# Regenerate the lock file, pinned to the Solana 1.17.34 toolchain.
powershell -ExecutionPolicy Bypass -File .\programs\lockfile.ps1

# Type-check every programme and run the core-math tests.
powershell -ExecutionPolicy Bypass -File .\programs\check.ps1

# Build the SBF artefacts.
powershell -ExecutionPolicy Bypass -File .\programs\build-sbf.ps1
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

The landing page is eight sections with eight distinct layout families and two
eyebrows. The hero loop is ambient: the video owns its own timeline and scroll drives
scale, opacity, translation and blur only. Scroll position never touches
`video.currentTime`.

## Live data contract

Every figure the product renders is a chain read. There is no off-chain mirror of
balances, no invented figure, and no cache the chain does not back. When no issuance
qualifies and demo mode is on, a seeded fixture is served and every surface it touches
carries a visible DEMO tag. Flipping demo mode is an indexer restart, never a
programme redeploy.

The frontend stores nothing in `localStorage` or `sessionStorage`. Issuance drafts
autosave to the server through `POST /api/drafts`, keyed by user id, so a draft
survives a cleared browser and follows the user to another device.

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

Public. Superteam Nigeria scores submissions on whether or not they are open-sourced,
and a public repository also removes the Meteora requirement to grant `dannxbt` Read
access for judging.

## Licence

GPL-3.0-or-later. MetaDAO's programmes are BUSLv1.1 and were studied as an
architectural reference only. No MetaDAO code was copied.
