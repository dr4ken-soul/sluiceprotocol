# Colosseum submission — Sluice

Copy from here. Nothing in this file is a claim the live site does not support.

---

## Project name

Sluice

## One-liner / tagline

Issue the real asset. The market decides if you keep the money.

## Categories

- DeFi / Tokenomics
- Infrastructure
- Consumer

## Tech stack

- Rust, Anchor 0.29.0, Solana 1.17.34
- TypeScript, Next.js 14 App Router, Tailwind, motion/react
- Node indexer over Yellowstone gRPC, with websocket and polling fallbacks
- Postgres (Supabase) for drafts and the waitlist
- Meteora DBC (bonding curve), Meteora DAMM v2 (post-graduation)
- Panta (binary event markets), Privy (auth), Token-2022 transfer hooks

## Links

- Repository: https://github.com/dr4ken-soul/sluiceprotocol
- Live site: https://sluice-beryl.vercel.app
- Waitlist: https://sluice-beryl.vercel.app/waitlist
- Video: (path to intro-video/ — fill in the hosted URL)

## Description

Sluice issues claims on real-world cash flow — invoices, royalties, rent, revenue
shares — as tokens on Solana, and has a binary event market adjudicate every
milestone instead of the issuer's word.

An issuer receives a NAV band from a valuation model. That band sets the shape of a
sixteen-segment Meteora DBC bonding curve. A Token-2022 transfer hook enforces the
issuing jurisdiction's policy during the raise, and DBC revokes it automatically at
graduation — leaving a controlled primary distribution and a permissionless
secondary market.

Each tranche of capital is tied to one binary question with a machine-checkable
answer and a named verifier. A market opens on that question. If it resolves yes, the
tranche releases on schedule. If it resolves no, remaining capital routes to a
redemption vault and holders claim pro rata. If the verifier fails to report inside
the grace window, the tranche resolves no by default.

### What is actually new

MetaDAO already ships launchpad plus futarchy plus Meteora DAMM v2, so that
combination is proven rather than new. Sluice adds four things:

1. **Off-chain cash flow as the asset.** MetaDAO launches crypto companies. Sluice
   issues claims on money that already exists outside the chain.
2. **A waterfall vault** for that real cash arriving on-chain and distributing pro
   rata.
3. **DBC auto-revocation as the compliance mechanism.** The transfer hook does not
   need a team to remove it at graduation; the bonding curve revoking the transfer
   hook is the thing that makes a controlled primary distribution possible without a
   bespoke module.
4. **A market that resolves a fact, not a price.** This is the one a judge should
   press on, so it is worth being precise about the difference.

**Sluice is not futarchy, and the word is never used to describe it.** Futarchy
runs conditional markets on a token's *future price* and resolves by TWAP. Sluice
runs a binary event market on a single verifiable fact. Both use markets to decide
things; they are different mechanisms, and conflating them in front of a judge who
builds the former would be a costly mistake.

### Groups

Savings circles, rebuilt so they work between strangers. A rotating group where
contributions are adjudicated by a market rather than by the trust of the people in
it. This is Phase 1 and it is not built. The routes exist and say so on the live
site rather than showing a mockup.

It waits on mobile money rails. The people a savings circle is for are not buying
SOL to pay gas, and shipping the rotation before the payment path would build the
hard part for nobody.

### Status, stated plainly

- The frontend and indexer are **deployed and live**, on **Solana devnet**.
- The **Rust programs do not currently compile** — the dependency graph is
  unresolved. Six compile errors are fixed; the toolchain issue is not.
- `core-math`, the pure arithmetic that decides where a holder's money goes, has
  **83 passing unit tests** and no Solana dependency. It runs on any toolchain.
- The live frontend runs against a **seeded demo fixture**, tagged DEMO on every
  surface, because no program is deployed and there is nothing on any cluster to
  read.
- Groups is not built.

A waitlist is running instead of claiming availability, and the nav's primary
action is "Join waitlist" rather than "Connect wallet".

### Safety and the honest failure mode

The likeliest failure is not an exploit of a dependency. It is a thin milestone
market being moved cheaply, which releases a tranche that should not have been
released. Four controls address it: a depth floor below which a resolution is not
accepted from the market, a 48-hour delay between resolution and release during
which a guardian can halt, value caps, and a narrowly scoped pause guardian that can
halt new issuance, tranche release and redemption claims but **cannot** halt a
holder claiming funds already vested to them.

Settlement, redemption and waterfall hold user capital under Sluice's own authority,
separate from any pool. A Meteora exploit drains Meteora pools and does not touch
capital already in a Sluice vault.

### Fees

Fixed, published, unchanging — not tiered by volume, not discounted for whales.
Curve trade 0.30%. Milestone market trade 0.50%. Secondary trade 0.30%. Redemption
claim 0.25%. Waterfall claim 0.50%. Issuance creation $200 or 0.25% of target if
greater, minimum raise $25,000 enforced at creation. Preset purchase $49 or 0.25% of
raise if greater. Attestation renewal at attestor cost plus 15%.

**There is no deposit-only action and no deposit exemption.** Buying along the curve
is a trade and is charged in both directions. An earlier version of this repository
described a fee-free deposit path; it described a step that does not exist and
created a way for a buy to escape the curve trade fee entirely.

**No Sluice fee is ever taken from the LP fee.** The LP fee pays liquidity providers
for holding the pool. Every Sluice fee comes from a partner, protocol or creator
allocation, or from a programme Sluice owns outright.

### Dependencies and what they hold

Sluice is built on other people's programmes. An audit of Sluice's own code says
nothing about Meteora, Panta or Privy.

| Dependency | What it holds | What Sluice loses | What it does not lose |
|---|---|---|---|
| Meteora DBC | Capital in curve pools during a raise | Funds in that pool | Released tranches; anything in a Sluice vault |
| Meteora DAMM v2 | Post-graduation liquidity | Secondary liquidity and trading | Tokens in wallets; vault balances |
| Panta | The binary market on each milestone | Correctness of one tranche decision | Sluice's programmes |
| Privy | Issuer authentication | That one issuer's account | Protocol funds; other issuers |
| USDC | The settlement currency | The value of USDC held | Everything else |
| Solana | Liveness of the whole system | The ability to transact | Nothing. State persists |

Sluice cannot prevent a dependency exploit, cannot make a third-party market deep,
and cannot insure deposits. The 8% insurance allocation is a protocol backstop, not
insurance coverage for holders.

### Regulatory position

Sluice is compliance infrastructure for registered offerings and licensed operators.
It is not a registered exchange and it does not provide legal advice.

### Team

(founder names and handles)

---

## Judging notes

Colosseum judges functionality, impact and novelty, and imposes no network
requirement. Devnet was chosen deliberately: mainnet costs 6-15 SOL in rent-exempt
minimum balance alone, measured per bytecode byte, and that is not a sum this
project could pay while also being right about the product.

The things worth pressing on, in order:

1. **"A market that resolves a fact, not a price."** The distinction from futarchy
   is the whole claim. See above.
2. **DBC auto-revocation.** The compliance story is that the curve removes the
   transfer hook itself, so there is no team step and no window where the hook
   should have gone and did not.
3. **The default-no path.** A verifier who does not report inside the grace window
   resolves the tranche no. Money that nobody can prove is money that does not
   release.
4. **What is not built.** Groups and the toolchain are named as gaps above rather
   than discovered during a demo.
