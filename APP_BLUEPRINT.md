# APP_BLUEPRINT.md — Sluice

Issue real-world assets on Meteora. A binary market adjudicates every milestone, and capital releases only when it resolves in the issuer's favour.

Built for Colosseum Crypto World's Fair, September 14 to October 12 2026.

---

## Product Summary

Sluice is a protocol for issuing claims on real-world cash flow, invoices, royalties and revenue, as tokens on Solana. An issuer values their asset, configures a compliance policy, raises capital along a Meteora DBC bonding curve, then hits a milestone. A binary market on that milestone decides what happens next. Resolve yes and the next tranche releases. Resolve no and remaining capital routes to a redemption vault where holders claim pro rata.

Sluice is named for the gate that controls the release of water. Capital sits behind it until the market says the work is done, then it opens.

The structure underneath is the West African rotating savings association, the esusu, where a group pools contributions and each member takes the pool in turn. Enforcement there is social: everyone knows everyone, and shame does the work. Sluice keeps that structure and replaces the enforcement, because social pressure does not scale past a village and certainly does not survive an anonymous on-chain market. A priced, tradeable, machine-resolvable market does.

### The mechanism, precisely

This is **not** futarchy and the docs must never call it that. MetaDAO's futarchy runs conditional markets on a token's *future price* and resolves by TWAP. Sluice runs a **binary event market** on a single verifiable fact about a milestone. Both use markets to decide things. They are different mechanisms, and conflating them in front of a judge who builds the former would be a costly mistake.

### What is actually novel

MetaDAO already ships launchpad plus futarchy plus Meteora DAMM v2, so that combination is proven, not new. What Sluice adds:

| Claim | Why it holds |
|---|---|
| Real-world assets | MetaDAO launches crypto companies. Sluice issues claims on off-chain cash flow |
| The waterfall vault | Real-world cash arriving on-chain and distributing pro rata. Nothing in MetaDAO does this |
| Token-2022 hook plus DBC auto-revocation | MetaDAO has `gated_mint`, not a transfer hook. The invention is that DBC revokes the hook automatically at graduation |
| DBC native | MetaDAO uses its own launchpad. Sluice is native to Meteora DBC's curve, fee scheduler and migration |
| Binary event market as adjudicator | MetaDAO prices a token. Sluice resolves a fact |
| The West African wedge | Uncopyable |

---

## Market Context

### Who pays

1. **SMEs and fund SPVs in West Africa** raising between $50k and $5m against contracted revenue, who currently pay 18% to 35% annualised to local lenders or cannot borrow at all
2. **Crypto-native RWA buyers** seeking yield not correlated to token emissions, who currently buy tokenised treasuries at 4% to 5% and want higher without taking unsecured credit risk
3. **Regulated issuers and licensed operators** who need a compliance rail that does not require a program rewrite per jurisdiction

### The gap

The IFC puts unmet MSME credit demand in Sub-Saharan Africa at **$331bn**, with **$32.2bn** of that in Nigeria alone, and reports that **over 40%** of SSA SMEs name access to credit as their single worst constraint. Globally the emerging-market MSME gap is **$5.7tn**, nearer $8tn counting informal enterprises. Figures from IFC, *MSME Banking in the Digital Era*, September 2025. The AfDB puts the continent-wide figure nearer $421bn, so quote the IFC number and footnote the range rather than presenting one as settled.

The existing RWA platforms, Centrifuge, Ondo, Maple, Securitize, all serve institutional credit and treasuries. None serve a Nigerian cold chain operator with ₦180m of contracted receivables. Their minimums start where that operator's entire raise ends.

### Regulatory position

Nigeria's Investments and Securities Act 2025, signed 25 March 2025, makes digital and virtual assets **securities** under SEC jurisdiction. Issuers must register offerings. The ARIP sandbox, roughly ₦2m or about $1,245, is the pilot pathway.

**Consequence for the build and the pitch:** Sluice positions as compliance infrastructure for *registered* offerings and *licensed* operators. It is not a registered exchange and does not provide legal advice. Before mainnet, engage a Nigerian securities lawyer and confirm the framing with @SuperteamNG. This is stated in the footer of every page, not buried in terms.

### TAM, SAM, SOM

| | Figure | Reasoning |
|---|---|---|
| TAM | $5.7tn | Global emerging-market MSME credit gap |
| SAM | $32.2bn | Nigeria's unmet MSME demand, the beachhead |
| SOM year one | $4.2m | 14 issuances averaging $300k, at a 1.5% take plus ancillary fees |

---

## MVP Feature Set

**Phase 0 is what ships for the hackathon. Everything else is designed now and built later.** All six features below are Phase 0. Seven of the eight programs ship in Phase 0. Autopilot is the sole deferral, and it is deferred unconditionally: it manages post-graduation liquidity, and nothing will have graduated by 12 October.

| # | Feature | Phase | Why that phase |
|---|---|---|---|
| 1 | Valuation-anchored curve | **0** | Core mechanism, answers Meteora's novel-curve ask |
| 2 | Compliance transfer hook | **0** | The invention, and it demos cleanly |
| 3 | Milestone adjudication | **0** | The differentiator, the demo opens on it |
| 4 | Settlement and redemption | **0** | Holds the funds, holder protection |
| 5 | Waterfall vault | **0** | Makes the cash flow claim demonstrable rather than theoretical, and it earns a fee, so it is revenue-positive |
| 6 | Public risk terminal | **0** | It is the demo surface, and answers Meteora's data-tooling ask |

Also in Phase 0: the DBC to DAMM v2 graduation path, and the preset **config format** with three Sluice-authored presets. The preset **marketplace** with third-party creators and payments is Phase 2, because it needs a creator community that does not exist yet.

Deferred entirely: autopilot, the metered data API, cross-chain bridging, fiat ramps, credit scoring, insurance underwriting, governance token. Each is a stated scoping decision, not an oversight.

### Feature 1: Valuation-anchored curve

**User story:** As an issuer I want my opening price derived from something real, so I am not launching into a market that has no idea what my asset is worth.

**How it works:** The issuer supplies financials. A valuation model returns a NAV band with a confidence interval. The band sets the shape of a 16 segment DBC curve, opening at the lower bound and steepening toward the upper. The issuer sees the curve before committing.

**Acceptance:** The curve preview renders all 16 segments with the band overlaid. Changing the band changes the curve shape. The config is written to the curve account on submit.

**Complexity:** Medium

### Feature 2: Compliance transfer hook

**User story:** As an issuer I want transfer rules to match my jurisdiction, so I am not choosing between compliance and using a token.

**How it works:** A Token-2022 transfer hook enforces a policy file: who may hold, transfer limits, holding period. The issuer posts a bond, slashable on a failed attestation. **On graduation DBC revokes the hook automatically**, so the primary distribution is controlled and the secondary market is permissionless.

**Acceptance:** A transfer violating the policy is rejected before graduation. After graduation the same transfer succeeds. The bond is slashable only through the attestation failure path.

**Complexity:** High

### Feature 3: Milestone adjudication

**User story:** As a holder I want an independent check on whether the milestone happened, so I am not relying on the issuer's word.

**How it works:** Each tranche carries one machine-checkable binary question with a named verifier and a deadline. A binary market opens on it. At the deadline the verifier reports and the market resolves. If the verifier does not report within the grace window, the tranche resolves **no** by default.

**Acceptance:** Resolving yes releases the tranche on schedule. Resolving no routes remaining capital to the redemption vault. Verifier silence resolves no. The interface is pluggable, with Panta as the default resolver and an internal market as fallback, because an external market can be thin.

**Complexity:** High

### Feature 4: Settlement and redemption

**User story:** As a holder I want to be made whole without chasing anyone, if the milestone fails.

**How it works:** The settlement program owns the fee claimer, the creator vesting schedule and the bond vault. On a no resolution, remaining capital moves to the redemption vault and holders claim pro rata against what they hold.

**Acceptance:** A holder who claims receives their pro rata share. A second claim for the same tranche reverts. The vault balance reconciles to the sum of outstanding claims at all times.

**Complexity:** High

### Feature 5: Waterfall vault

**User story:** As a holder I want real-world cash flow distributed to me, not just a token I have to sell.

**How it works:** Cash arriving from the underlying asset is converted and pushed into a waterfall vault that distributes pro rata to holders at the snapshot, on a configurable cadence.

**Acceptance:** A distribution moves the correct amount to each holder. Gas is bounded regardless of holder count, so distribution uses a claim pattern rather than a push loop.

**Complexity:** High

### Feature 6: Public risk terminal

**User story:** As anyone, I want to see what is happening without trusting the interface.

**How it works:** A Yellowstone gRPC indexer streams program state into a public terminal plus an embeddable widget and API.

**Acceptance:** Every figure on the site is a live chain read. No figure is served from a cache the chain does not back. The API is rate limited and metered per the revenue model below.

**Complexity:** Medium

**What makes users pay instead of staying free:** the adjudication rail. Anyone can launch a token. Nobody can credibly promise to withhold their own capital until a market they do not control says the work is done. That is the feature you cannot fake.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js 14 App Router, TypeScript | SSR for the landing page, stable with the Solana wallet adapter |
| Styling | Tailwind CSS | Matches FRONTEND_SPEC.md exactly |
| Animation | motion/react | Current import path, not framer-motion |
| Wallet, investors | Solana wallet adapter, Phantom, Solflare, Backpack | Self-custody path |
| Wallet, issuers | Privy | Embedded Solana wallets on email or Google. Issuers are businesses without wallets |
| Programs | Rust, Anchor 0.29.0, Solana 1.17.34 | Matches the MetaDAO toolchain studied |
| Issuance | Meteora DBC `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN` | 16 segment curve, fee scheduler, migration |
| Liquidity | Meteora DAMM v2 `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`, then DLMM | Post-graduation |
| Adjudication | Panta, pluggable, internal fallback | Sidetrack eligibility plus an escape hatch if the market is thin |
| Data | Yellowstone gRPC, no SQL in MVP | Every figure is a chain read. Nothing to drift, nothing to leak |
| Payments, fiat | Stripe | Data API subscriptions only. Never for core on-chain transactions |
| Hosting | Vercel | Standard for Next.js |

**No off-chain mirror of balances.** If it is not readable from an account or an event, it does not exist as far as the frontend is concerned.

---

## Program Interface

| Program | Approx LOC | Responsibility |
|---|---|---|
| settlement | ~900 | Fee claimer, creator vesting, bond vault, tranche release |
| redemption vault | ~600 | Pro rata claims on failed milestones |
| waterfall vault | ~500 | Real-world cash flow distribution |
| autopilot | ~700 | Splits the DAMM v2 position NFT, locks a floor tranche, builds the DLMM ladder |
| compliance | ~500 | Transfer hook, attestation registry, policy DSL |
| bond vault | ~300 | Issuer bond, slashing on attestation failure |
| milestone verifier | ~400 | Question validation, resolution, default-no path |
| curve engine | ~300 | NAV-anchored 16 segment curve config |
| **Total** | **~4,200** | On-chain Rust, the figure to quote on the CertiK form |

Off-chain: gRPC indexer, public risk terminal, embeddable widget, SDK.

**CertiK form note.** When asked for programs to audit with approximate line count, list all eight with the figures above. Their first judging criterion is security relevance, meaning value at risk and funds handled, so lead with settlement, the redemption vault and the waterfall vault, which is ~2,000 LOC holding 100% of user funds.

---

## Revenue Model

Ten chargeable actions, each at a fixed published rate. Every on-chain fee routes atomically to a program-owned treasury account, never to an externally owned wallet.

### Market comparables

Rates below were researched before being set. Every Sluice rate is justified against a comp, not chosen for roundness.

**Issuance and protocol fees:**

| Comparable | Rate | What it covers |
|---|---|---|
| Ondo OUSG | 0.15% annual management, waived until 1 Jan 2027 | Fund management only |
| Centrifuge | 0.15% on some funds, 0.4% protocol fee elsewhere | Pool mechanics only |
| Securitize ATS | 1% of sale price | Secondary trade commission |
| Securitize issuance | Not published, priced per deal | Full issuance stack |
| Traditional IPO underwriting | 2% to 7% | Full issuance stack |

**Automated liquidity management:**

| Comparable | Rate |
|---|---|
| DeFi yield vaults, management fee | 1% to 2% of AUM annually |
| DeFi yield vaults, performance fee | 10% to 20% of yield generated |
| Automated vaults, most common | 0% management, 0% to 20% of yield |
| Morpho Vaults V2 curators | 1% to 2% AUM plus 10% to 15% performance |

**Data APIs:**

| Comparable | Free | Entry | Mid | Institutional |
|---|---|---|---|---|
| CoinGecko | 10K/mo | $29 to $35/mo, 100K | $103 to $129/mo, 500K | $399 to $499/mo, 2M+ |
| CoinMarketCap | 15K/mo | $29/mo, 150K | $79/mo | Enterprise, custom |
| Kaiko | Trial only |  |  | $1,000/mo L1, $2,500/mo L2 |

### The action fee table

**Every rate below is fixed. None of them change over time, none of them step up with volume, and none of them vary by user.** Revenue grows because volume grows, not because the rate does.

| Action | Fee | Rate type |
|---|---|---|
| Issuance creation | $200, or 0.25% of target if greater | one-time |
| Curve trade | **0.30%** | per swap, both directions |
| Milestone market trade | **0.50%** | per YES or NO trade |
| Secondary trade | **0.30%** | per swap, post-graduation |
| Redemption claim | **0.25%** | per claim |
| Waterfall claim | **0.50%** | per distribution claimed |
| Preset purchase | $49, or 0.25% of raise if greater | per launch |
| Attestation renewal | attestor cost + 15% | per renewal |
| Bridge | 0.15% | Phase 3, when the bridge becomes real |

**There is no deposit-only action in Sluice, and there is no deposit exemption.** Buying along the curve is a curve trade and is charged at 0.30%. The exemption was carried over from a perpetual futures product where funding an account and opening a position are two separate actions. In Sluice they are the same action, so the exemption described a step that does not exist and created a path by which a buy could escape the fee entirely. Do not reintroduce it.

Phase 2 additions, not in Phase 0:

| Action | Fee |
|---|---|
| Autopilot management | 0.50% of AUM annualised, plus 10% of yield harvested |
| Data API | $299/mo Starter, $1,499/mo Institutional |

### Why each rate is what it is

**Buying is charged, at 0.30%, because buying is a trade.** The curve trade rate applies in both directions, buy and sell. There is no separate deposit step to exempt: a buyer sends USDC and receives tokens in one swap, and the partner fee is taken inside that swap. Charging 0.30% per direction matches Uniswap v3's most common tier for volatile pairs and remains invisible per transaction at Sluice's trade sizes.

The rate must not be cut to the 0.01% to 0.10% range that a high-frequency venue could sustain. Trading carries 87% of Phase 0 gross revenue at every scale in the projections below. Dropping the curve rate from 0.30% to 0.05% removes roughly five sixths of that, taking the 10-issuance row from $76,125 to a figure that does not cover attestation costs.

**Curve and secondary trades at 0.30%.** This is Uniswap v3's most common fee tier for volatile pairs, and it is well above the perp DEX average of about 5 bps [3](https://rankfi.com/dex/hyperliquid-review/) because Sluice's markets are thin RWA pairs with no competing venue. A perp DEX cannot charge this because its traders execute multiple times a day with leverage. Sluice's holders do not, so 0.30% stays invisible per trade.

**Milestone market trades at 0.50%.** The right comparison here is a prediction market, not a perp DEX, because the behaviour matches: a user takes a position on a discrete event and holds it. Prediction market interfaces run around 1% for exactly this reason, and 0.50% undercuts that while still monetising adjudication, which is the part of Sluice nobody else has.

**Redemption claim at 0.25%.** Deliberately the lowest percentage fee in the table. This user's milestone just failed and they are recovering capital. Charging them heavily is the fastest way to turn a failed investment into a public complaint.

**Waterfall claim at 0.50%.** Charged only when real cash actually reaches a holder. No distribution, no fee, so the incentive stays aligned with the issuer getting paid.

**Issuance creation at $200 or 0.25%.** A flat floor exists so that a trivial issuance cannot consume the valuation, compliance and attestation pipeline for free. The 0.25% alternative scales it for serious raises.

**Minimum raise: $25,000.** This is a hard floor enforced at issuance creation, and it exists because the flat fee needs a floor to sit against. Without it, a $200 target would pay a 100% fee and a $1,000 target would pay 20%, which is indefensible. With it, the effective rate is 0.80% at $25,000 and falls to 0.25% at and above $80,000, where the percentage overtakes the flat fee.

**The issuance fee may never exceed 1% of the target.** This cap is a guard on future changes rather than a constraint the current numbers approach. If the flat fee is ever raised, the cap is what stops small issuers being charged a punitive rate.

**Test issuances are free on devnet and never free on mainnet.** A builder needs to exercise the wizard without paying. That path must be impossible on mainnet, where the flat fee is the only thing detering spam.

### Where every fee physically comes from

This is the part that breaks if it is guessed. Each fee has a different source layer, and taking any of them from the wrong place either loses the money or damages the pool.

| Action | Source layer | What that means |
|---|---|---|
| Curve trade | **DBC partner fee allocation** | Sluice registers as the pool's partner at creation and sets `fee_claimer` to the Treasury PDA. The fee is the partner's share of the swap fee |
| Secondary trade | **DAMM v2 and DLMM partner or protocol fee share** | Same pattern, configured at pool creation. Partner allocation, protocol share, or both depending on live config |
| Milestone market trade | **Panta creator fee** | Sluice creates the market, so Sluice is the market creator and earns creator fees on volume |
| Issuance creation | **Deducted by Sluice's own program** | Taken from the creation transaction and routed to the Treasury PDA atomically |
| Redemption claim | **Deducted by the redemption program** | Taken from the amount being claimed, before it reaches the holder |
| Waterfall claim | **Deducted by the waterfall program** | Taken from the distribution amount, before it reaches the holder |
| Preset purchase | **Deducted by the preset program** | Taken at launch, 70% forwarded to the preset creator immediately |
| Attestation renewal | **Sluice's own program** | Pass-through to the attestor, plus a 15% coordination margin |

**The rule that must never be broken:** no Sluice fee may ever be taken from the LP fee. The LP fee is what pays liquidity providers for holding the pool. Diverting it drains liquidity, widens spreads, and makes the secondary market unusable. Every Sluice fee comes from a partner, protocol, or creator allocation, or from a program Sluice owns outright.

### How every fee is routed

```
Fee generated
  |
  +-- Preset purchase only: 70% forwarded to preset creator FIRST
  |
  v
Treasury PDA (program-owned account, never an EOA)
  |
  +-- 55% Treasury reserve     audits, legal, security, runway
  +-- 25% Founder draw         founder and early team
  +-- 12% Growth               issuer rebates, BD, ecosystem
  +--  8% Insurance reserve    backstop for attestation failure
```

**Routing mechanics, in order:**

1. The program routes the fee to the Treasury PDA **inside the same transaction** that generates it. If the routing fails, the entire transaction reverts. Revenue can never be silently lost to a failed transfer.
2. For preset purchases only, the 70% creator share is transferred to the creator before the remainder reaches the Treasury PDA, also in the same transaction.
3. On the 1st of each month the distribution instruction sweeps the **founder draw** allocation to `FOUNDER_DISTRIBUTION_ADDRESS` in USDC.
4. `FOUNDER_DISTRIBUTION_ADDRESS` is read from an environment variable. It is never hardcoded in a program or a component.
5. Withdrawals above a configurable threshold require 3-of-5 multisig approval and a 48 hour timelock.
6. The sweep must be **idempotent**. Running it twice in one period must not double pay.

### Why the rates are fixed

Fixed, published, unchanging rates. Not tiered by volume, not stepped by growth, not discounted for whales.

Three reasons this is the right shape:

- **Volume does the work.** Revenue grows because more issuers raise and more trades happen. A rate that also rises makes the protocol more expensive exactly as it becomes more successful, which is backwards
- **Exchanges that raise rates lose users.** Hyperliquid discounts through HYPE staking, and every major venue runs volume discounts in the same direction [5](https://www.datawallet.com/crypto/hyperliquid-vs-binance). Sluice does not need to discount, but it must not do the opposite
- **Predictability is a feature for this market.** Issuers are businesses modelling a cost of capital. A rate that changes with protocol volume is a number they cannot put in a spreadsheet

If revenue per trade ever needs to rise, the correct lever is a **new action** or a **new product**, not a higher rate on an existing one. Autopilot and the data API in Phase 2 are exactly that: new surfaces that charge their own fixed rates.

### Verify before implementing

**This is a requirement, not a suggestion.**

Every source layer in the table above must be confirmed against live documentation before the corresponding instruction is written. DBC's fee stack has protocol, referral and partner layers, and DAMM v2 has its own, and the exact routing depends on live configuration. **Do not assume these rates will hold.**

1. Read the current DBC developer guide and the `dynamic-bonding-curve` repository before writing any fee instruction
2. Confirm the partner fee allocation and fee-claimer mechanics against live config
3. Confirm with Panta that the creator fee rate is configurable and that Sluice can set it
4. Write a test for **each** fee asserting the Treasury PDA balance increases by exactly the expected amount
5. Write a test asserting the LP fee is untouched: measure LP fee accrual with and without Sluice's partner allocation configured
6. If a real allocation cannot accommodate a target rate, lower the rate and update this file rather than shipping an instruction that silently loses revenue

Revenue that never reaches the treasury is worse than a lower rate that does.

**Why 0.50% AUM plus 10% performance on autopilot.** The DeFi vault norm is management plus performance, and autopilot is active management: it harvests, compounds and rebuilds the DLMM ladder. A management fee alone underprices it. A performance fee alone gives no baseline revenue to maintain the infrastructure. The combination sits below the 1% to 2% AUM market rate while still capturing upside.

**Why the data API is priced above general market APIs.** Sluice sells a monopoly dataset: NAV attestations, milestone market odds and redemption vault states exist nowhere else. CoinGecko competes on breadth and volume, Sluice competes on exclusivity, and exclusive data prices on value rather than call count. The Institutional tier at $1,499 sits deliberately between Kaiko's L1 at $1,000 and L2 at $2,500.

**Preset marketplace split:** 70% to the preset creator, 30% to Sluice. The creator payout happens first, before any other allocation.

**Data API tiers:**

| Tier | Price | Calls | Latency | Keys |
|---|---|---|---|---|
| Free | $0 | 10,000/month | 5 min delayed | 1 |
| Starter | $299/mo | 500,000/month | Real time REST | 3 |
| Institutional | $1,499/mo | Unlimited | WebSocket streams, SLA, white-label widget | Unlimited |

The free tier is deliberately smaller than the previous draft of 1,000 per day, which worked out to 30,000 per month. That gave away more than CoinGecko's free plan for a more exclusive dataset. 10,000 per month matches the market leader and still lets a builder evaluate properly.

### Treasury waterfall

```
All protocol revenue
  -> Treasury PDA (program-owned account, not an EOA)

  Step 1  Preset creator royalties, 70% of preset revenue
  Step 2  From the remainder:
            55%  Treasury reserve    audits, legal, security, runway
            25%  Founder draw        founder and early team
            12%  Growth              issuer rebates, BD, ecosystem
             8%  Insurance reserve   backstop for attestation failure
```

### How you get paid

**On-chain revenue, all ten chargeable actions.**

1. Programs route fees atomically to the Treasury PDA during the transaction that generates them. If the routing fails the whole transaction reverts, so revenue can never be silently lost.
2. On the 1st of each month the distribution instruction sweeps the **founder draw** allocation to `FOUNDER_DISTRIBUTION_ADDRESS` in USDC.
3. `FOUNDER_DISTRIBUTION_ADDRESS` is read from an environment variable, never hardcoded in any program or component.
4. Withdrawals above a configurable threshold require 3-of-5 multisig approval and a 48 hour timelock.

**Fiat revenue, the data API.** Stripe payouts land in the business bank account monthly, Phase 2 onward. Stripe is used only for the data API, never for a core on-chain transaction.

**Security requirements on the treasury, non-negotiable:**

- The Treasury PDA is program-owned. No single private key can drain it.
- The seed phrase and key material for the multisig signers are backed up offline in two physically separate locations.
- No key material ever appears in code, a committed file, or a communication channel.
- A withdrawal policy is published before mainnet: frequency, amounts, permitted uses.

### Projections

Assumptions, stated so the arithmetic can be checked rather than trusted:

- Curve turnover during a raise: 3x the amount raised
- Post-graduation secondary volume: 4x the amount raised per year
- Milestone market volume: 20% of capital raised per year
- Waterfall distributions: 8% of capital raised per year, an RWA yield figure
- Preset adoption: 30% of issuances, Sluice retains 30% of that revenue
- Failure rate triggering redemption: 10%
- Autopilot manages 60% of post-graduation liquidity, Phase 2 onward
- Data API mix: 3 Starter at 10 issuances, 8 Starter plus 1 Institutional at 30, 20 plus 4 at 80, 45 plus 12 at 200

| Issuances/yr | Capital raised | One-time, issuance plus preset | Trading, curve plus milestone plus secondary | Claims, redemption plus waterfall | Phase 2 | Gross | Founder draw |
|---|---|---|---|---|---|---|---|
| 10 | $3m | $8,175 | $66,000 | $1,950 | | $76,125 | $16,000 |
| 30 | $12m | $32,700 | $264,000 | $7,800 | | $304,500 | $63,900 |
| 80 | $48m | $130,800 | $1,056,000 | $31,200 | | $1,218,000 | $255,800 |
| 200 | $150m | $408,750 | $3,300,000 | $97,500 | $1,277,316 | $5,083,600 | $1,067,500 |

Phase 2 is empty in the first three rows because autopilot and the data API are both Phase 2.

**Trading fees carry 87% of Phase 0 gross revenue at every scale.** That is the whole point of the model: the rate never moves, and revenue still compounds because volume does. At 200 issuances, trading alone produces $3.3m before a single Phase 2 stream is counted.

Founder draw is 25% of gross minus preset creator royalties, so roughly 21% of gross. Figures are illustrative, not a forecast.

**Sensitivity.** At 10 issuances the model produces $76,125 gross, of which $16,000 is founder draw. That does not support a team, and it is not meant to: Phase 0 is judged on traction, not revenue, and the fixed rates exist precisely so volume can accumulate without the cost of capital rising.

The model is undiversified at low volume, because every Phase 0 fee is a function of issuance count and traded volume. The data API is the first counter-cyclical element, since subscriptions persist when issuance slows, and it does not arrive until Phase 2.

The single largest risk to these figures is the DBC partner fee allocation. If live config caps the curve fee below 0.30%, the 200-issuance row falls proportionally and trading still carries the majority of gross, but the 10 and 30 rows become marginal. Verify the allocation before quoting any of these numbers publicly.

---

## Data Structures

```rust
pub struct Issuance {
    pub issuer: Pubkey,
    pub mint: Pubkey,
    pub ticker: [u8; 8],
    pub asset_class: AssetClass,        // Revenue | Royalty | Invoice
    pub nav_low: u64,
    pub nav_high: u64,
    pub attested_nav: u64,
    pub attested_at: i64,
    pub attestor: Pubkey,
    pub curve_config: Pubkey,
    pub policy: Pubkey,
    pub bond_vault: Pubkey,
    pub settlement: Pubkey,
    pub redemption_vault: Pubkey,
    pub raised: u64,
    pub target: u64,
    pub state: IssuanceState,
    pub created_at: i64,
}

pub enum IssuanceState {
    Draft, Funding, Funded, Adjudicating, Settled, Redeeming, Closed,
}

pub struct Milestone {
    pub issuance: Pubkey,
    pub index: u8,
    pub question: [u8; 160],
    pub verifier: Pubkey,
    pub deadline: i64,
    pub grace_window: i64,
    pub tranche_size: u64,
    pub market: Pubkey,
    pub outcome: Option<bool>,          // None until resolved, false on silence
    pub resolved_at: Option<i64>,
}

pub struct Policy {
    pub jurisdiction: [u8; 4],
    pub version: u16,
    pub max_holders: u32,
    pub transfer_limit: u64,
    pub holding_period: i64,
    pub attestation_cadence: i64,
    pub revoked_at_graduation: bool,
}
```

```typescript
interface LiveIssuance {
  address: string
  ticker: string
  issuerName: string
  assetClass: 'revenue' | 'royalty' | 'invoice'
  nav: number
  navLow: number
  navHigh: number
  raised: number
  target: number
  yesCents: number | null
  noCents: number | null
  settlesInDays: number | null
  state: 'funded' | 'adjudicating' | 'settled' | 'redeeming'
  attestedAt: number
  attestor: string
  isDemo: boolean
}

interface Holding {
  mint: string
  ticker: string
  balance: number
  valueUsdc: number
  assetClass: string
  state: string
}
```

---

## Environment Variables

```
# Chain
NEXT_PUBLIC_SOLANA_RPC_URL=
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
GRPC_ENDPOINT=
GRPC_TOKEN=

# Programs, filled after deploy
NEXT_PUBLIC_SETTLEMENT_PROGRAM_ID=
NEXT_PUBLIC_REDEMPTION_PROGRAM_ID=
NEXT_PUBLIC_WATERFALL_PROGRAM_ID=
NEXT_PUBLIC_AUTOPILOT_PROGRAM_ID=
NEXT_PUBLIC_COMPLIANCE_PROGRAM_ID=
NEXT_PUBLIC_BOND_PROGRAM_ID=
NEXT_PUBLIC_VERIFIER_PROGRAM_ID=
NEXT_PUBLIC_CURVE_PROGRAM_ID=
NEXT_PUBLIC_TREASURY_ADDRESS=

# Auth
NEXT_PUBLIC_PRIVY_APP_ID=

# Revenue
FOUNDER_DISTRIBUTION_ADDRESS=
TREASURY_MULTISIG_THRESHOLD=3
TREASURY_TIMELOCK_SECONDS=172800
NEXT_PUBLIC_TREASURY_WITHDRAWAL_THRESHOLD=

# Data API
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_API_PUBLIC_URL=

# Fees. Fixed rates, never tiered, never stepped, never vary by user
NEXT_PUBLIC_FEE_CURVE_BPS=30
NEXT_PUBLIC_FEE_MILESTONEMKT_BPS=50
NEXT_PUBLIC_FEE_SECONDARY_BPS=30
NEXT_PUBLIC_FEE_REDEMPTION_BPS=25
NEXT_PUBLIC_FEE_WATERFALL_BPS=50
NEXT_PUBLIC_FEE_BRIDGE_BPS=15
NEXT_PUBLIC_ISSUANCE_FEE_FLAT_USD=200
NEXT_PUBLIC_ISSUANCE_FEE_BPS=25
NEXT_PUBLIC_PRESET_FEE_FLAT_USD=49
NEXT_PUBLIC_PRESET_FEE_BPS=25
NEXT_PUBLIC_ATTESTATION_MARGIN_BPS=150

# Meteora partner configuration. The treasury PDA must be the fee claimer
NEXT_PUBLIC_DBC_PARTNER_ADDRESS=
NEXT_PUBLIC_DAMMV2_PARTNER_ADDRESS=

# Feature flags
NEXT_PUBLIC_DEMO_MODE=true
```

`NEXT_PUBLIC_DEMO_MODE` is the only switch controlling the seeded fixture. Flipping it must not require a redeploy of the programs, only of the indexer.

---

## App Routes

| Route | Auth | Purpose |
|---|---|---|
| `/` | public | Landing, eight sections per FRONTEND_SPEC.md |
| `/app` | gated | Terminal, holdings and value curve |
| `/app/asset/:ticker` | gated | Asset detail, five tabs, adjudication and attestation |
| `/app/issue` | gated | Six step issuance wizard |

All app routes behind the gate in FRONTEND_SPEC.md §2.1 and §2.2.

---

## Build Phases

### Phase 0, Hackathon, now to 12 October 2026

Goal: win. Live on mainnet, no mock data, fees live from the first transaction at the fixed published rates.

- Curve engine, NAV-anchored 16 segment
- Compliance transfer hook with automatic revocation at graduation
- Settlement with tranche release
- Redemption vault
- Milestone verifier with Panta integration, plus trade attribution
- DBC raise graduating to DAMM v2
- Landing, terminal, asset detail, issue wizard, all live chain reads
- Preset config format with three Sluice-authored presets
- **Fee routing live from the first transaction**, at the fixed published rates. No switch, no bootstrapping tier, no step-up at any threshold

Everything on the CertiK form is quoted from Phase 0. The eight programs and roughly 4,200 lines assume the waterfall vault and autopilot are included in the count, because they are auditable scope even if they ship later. If either is cut before submission, subtract its lines and restate the total rather than quoting a figure the repo does not support.

### Phase 1, months 1 to 3

Goal: first real issuers, prove the mechanism on real money.

- Attestor network, multiple named attestors rather than one
- **Milestone track record.** Every resolved milestone accumulates into a portable, on-chain record per issuer: how many were set, how many passed, how many failed, how much capital was released versus returned. An issuer who has cleared three milestones across two issuances carries evidence no credit bureau in the target market can currently produce. This is the modern replacement for the social enforcement the esusu relied on, rebuilt as data instead of reputation, and it is the strongest reason for an honest issuer to choose Sluice twice
- **Reusable investor verification.** An investor completes KYC once and receives a verifiable credential that satisfies the transfer hook on any compliant issuance, rather than repeating onboarding per issuance. Onboarding friction is the largest measured drop-off point in tokenised investing, and per-issuance KYC makes it worse with every new issuance
- First Nigerian issuer through the ARIP sandbox
- Nigerian securities counsel engaged, name trademark filed

### Phase 2, months 4 to 9

Goal: scale the supply side.

- Autopilot, DAMM v2 position split plus DLMM ladder
- **Secondary liquidity programme.** Issuance capability is commoditising; depth is becoming the scarce thing. Sluice issuances will graduate with thin pools and stay thin without help, and a claim nobody can exit is worth less than one they can. This is a protocol-sponsored market-making programme plus LP incentives, sized per issuance and capped, aimed at a minimum workable depth rather than at volume for its own sake
- **Investor statements.** Holders accumulate claims across many issuances, each with its own distributions, redemption events and cost basis. Without a consolidated statement and an export, Sluice is unusable for anyone with an accountant, a fund administrator or a tax authority. Un glamorous, and it is the difference between a toy and an asset class
- Preset marketplace with third-party creators and payments
- Metered data API with Stripe billing
- Second jurisdiction policy file, Ghana or Kenya
- Institutional onboarding for fund SPVs

### Phase 3, months 10 to 18

Goal: become infrastructure.

- Secondary market depth beyond graduation
- **White-label issuance.** Licensed operators, microfinance institutions and fund administrators want to issue under their own brand on their own distribution, and they will not send their clients to someone else's domain. White label is the dominant enterprise route to market in tokenisation, and Sluice's architecture already supports it: jurisdiction is a policy file, compliance is a hook, and the protocol does not care whose logo is on the form. This is how Sluice reaches issuers it could never reach directly
- Real cross-chain, replacing the link-out
- Insurance underwriting as a product rather than a reserve
- Governance
- Public SDK so other launchpads can embed the adjudication rail

### Phase 4, month 18 onward

Goal: sell the enforcement layer, not the issuance.

**Adjudication as a service.** Any capital raise with milestone conditions needs what Sluice built: a question, a market, a verifier, a resolution, and a payout branch. That describes launchpads, RWA platforms, grant programmes, milestone-based VC tranches, and government disbursement programmes. None of them will build it.

This is a larger business than issuance fees, and it is the real reason to build the verifier as a pluggable interface in Phase 0 rather than hardcoding it. The pluggability that protects against thin Panta markets is the same pluggability that lets a third party adopt the rail later.

**Agent-callable adjudication.** Automated counterparties are becoming real participants in on-chain markets, and milestone adjudication is unusually well suited to them: the inputs are structured, the question is binary, the deadline is fixed, and the payout branch is deterministic. Sluice should expose the rail as an API that a program or an agent can call to open a question, read odds, and act on a resolution, without a human in the loop. Every consumer of that API also becomes a distribution channel for the data Sluice sells in Phase 2.

---

## What Is Not Being Built in Phase 0

- Autopilot, deferred to Phase 2
- Metered data API and Stripe billing, deferred to Phase 2
- Preset marketplace with third-party creators, deferred to Phase 2
- Secondary market maker beyond the DBC to DAMM v2 graduation path
- Fiat on and off ramps inside the product
- Cross-chain bridging, despite the Bridge action appearing in the UI. It links out in Phase 0
- Credit scoring or underwriting. The market prices risk, Sluice does not
- Insurance underwriting. The insurance reserve is a backstop, not a product
- Mobile app
- Governance token

---

## Security Requirements

These are release blockers, not nice-to-haves.

- Programs audited before mainnet. CertiK audit credits are a target of this build
- Treasury PDA program-owned, 3-of-5 multisig, 48 hour timelock above threshold
- Reentrancy: Solana forbids a program twice in one CPI stack. Split validate and execute across transactions where a CPI would otherwise return to the caller
- Anchor error variants appended to the end of `#[error_code]` enums only, because codes are positional
- `has_one` and `address` constraints preferred over generic `constraint`
- `associated_token` over `token` for recipient accounts
- `#[event_cpi]` and `emit_cpi!`, never `emit!`
- No `localStorage` or `sessionStorage` anywhere in the frontend
- Confirm the transaction, then write any off-chain record. Never the reverse
- Error boundary on the route outlet, individual wallet errors caught, never a route crash
- No key material in code, committed files or communication channels

---

## Dependency Risk and Blast Radius

Sluice is built on top of other people's programs. That is the point of composing, and it is also the largest risk that Sluice's own audits cannot address. An audit of Sluice's eight programs says nothing about the security of Meteora, Panta or Privy.

**The question is not whether a dependency can fail. It is what Sluice loses when one does, and what Sluice can halt in time to matter.**

### What each dependency actually holds

| Dependency | What it holds | If it is compromised | Sluice loses | Sluice does NOT lose |
|---|---|---|---|---|
| Meteora DBC | Capital in the curve pool during a raise | Funds held in that pool are drained | Capital currently sitting in DBC pools | Tranches already released; anything held in Sluice's own vaults |
| Meteora DAMM v2 | Post-graduation liquidity | Pool drained, or trading disabled | Secondary liquidity and trading | Tokens in holder wallets; balances in Sluice's vaults |
| Panta | The binary market on each milestone | A milestone resolves incorrectly | Correctness of one tranche decision | Sluice's programs; funds move only on a resolved outcome |
| Privy | Issuer authentication | An issuer account is taken over | That one issuer's account | Protocol funds; every other issuer |
| USDC | The settlement currency | Depeg | Value of USDC held across the protocol | Everything else |
| Solana | Liveness of the whole system | Outage or halt | The ability to transact until it recovers | Nothing. State persists |

**The structural protection that already exists.** Sluice's settlement, redemption and waterfall programs are Sluice's own code, roughly 2,000 lines holding 100% of user funds at rest. A DBC exploit drains DBC pools. It does not touch capital that has already moved into a Sluice vault, because that capital is held under a different program with different authority. Keeping those two things separate is the single most important architectural decision in this document, and it is already in place.

### The risk that is not a hack

The most probable failure is not an exploit of Meteora. It is **a thin milestone market being moved cheaply**, which causes a tranche to release when it should not have.

This is not a hypothetical. It is the reason the resolver is pluggable. An attacker does not need to break anything; they need to buy enough of a shallow market to move the mid price across the resolution threshold, on a market where there is no competing venue. The cost of that attack is proportional to market depth, and depth on a single-issuer milestone market is inherently limited.

Everything below exists to make that attack unprofitable or reversible.

### Mitigations

**1. Depth floor before a resolution is accepted.** If the market on a milestone has not reached a minimum depth and volume by the deadline, the resolution is not accepted from that market. It falls back to the internal market, or to the verifier report alone. This closes the cheap-manipulation vector directly, because an attacker cannot know in advance whether their spend will clear the floor.

**2. Resolution-to-release delay.** After a milestone resolves, the tranche does not release immediately. There is a delay, recommended at 48 hours to match the existing treasury timelock, during which a guardian can halt the release if the resolution is obviously wrong. Capital that is already vested to a holder is never subject to this delay. It applies only to tranche release, which is the one moment where a bad resolution converts into money leaving.

**3. Caps.** A maximum value per DBC pool, a maximum per issuance, and a maximum protocol-wide total value locked during early phases. Caps do not prevent an incident, they bound it. A protocol holding $200,000 across ten issuances is a materially worse target than one holding $20m, and it is a survivable loss rather than a fatal one.

**4. Pause guardian, narrowly scoped.** A multisig can halt new issuance creation, tranche release, and redemption claims. It must **not** be able to halt a holder from claiming funds already vested to them, because that is a rug vector, and any reviewer will read it as one.

**5. Dependency monitoring.** Track public incident signals from Meteora and Panta. On a credible signal, the guardian evaluates a pause. The delay in mitigation 2 is what makes this feasible rather than decorative.

**6. Insurance reserve, now with a defined purpose.** The 8% allocation exists to back attestation failure and dependency incidents. It is a protocol backstop, not a user-purchasable policy, and it must never be described as insurance coverage for holders.

**7. Publish the dependency list.** The README names every external dependency and states plainly what Sluice can and cannot do if one fails. Users are entitled to know what they are exposed to, and a project that hides this is a project that has not thought about it.

### What Sluice cannot do

Sluice cannot prevent a Meteora exploit, cannot make Panta's market deep, and cannot insure deposits. Any public statement implying otherwise is false. The defensible claim is narrower and still worth making: **Sluice's own vaults are separate from its dependencies' pools, Sluice can halt new issuance and tranche release, and Sluice refuses to accept a resolution from a market too thin to trust.**

---

## Hackathon Deliverables Checklist

Status markers are load-bearing. A bare `- [ ]` says "not started". A `- [~]` says
"partly built, and here is precisely what is missing", which is the distinction that
let a Phase 0 item go unbuilt for a week without anyone noticing. A `- [!]` says
"cannot be delivered as specified", with the reason. Do not downgrade a marker to
hide a gap; that is the failure this convention exists to prevent.

- [x] Public GitHub repository, complete code, README with install and usage
- [x] Functional frontend end to end, no mock data, every figure a live chain read
- [!] ~~Deployed on Solana mainnet~~ **Deviation: devnet, not mainnet.** See below.
- [ ] Demo video, 4 minutes maximum
- [ ] X posts, see MARKETING.md
- [ ] Colosseum submission, one product only, three chains selected at registration
- [ ] Meteora DBC sidetrack, winners by 31 October 2026
- [ ] CertiK submission by 13 October, needs public repo, programs with line counts, 6 to 12 month roadmap
- [~] Panta sidetrack. Client, resolver and trade attribution built. See below.
- [ ] Superteam Nigeria, working prototype plus three pitch reviews plus demo day

### Deviation: devnet instead of mainnet

**Specified:** deployed on Solana mainnet, all eight programs verified on Solscan.
**Shipping:** devnet. **Reason:** deployment is unfunded.

Measured with the Solana 1.17.34 CLI, the rent-exempt minimum on a program data
account is charged per byte of compiled bytecode:

| Bytecode | Rent-exempt minimum |
|---|---|
| 150 KB | 0.78 SOL |
| 250 KB | 1.30 SOL |
| 350 KB | 1.82 SOL |

Eight programmes is therefore 6 to 15 SOL in rent before a single fee. The builder
cannot fund that before the 12 October deadline. `strip = "symbols"`,
`panic = "abort"` and `opt-level = "z"` are set in `programs/Cargo.toml` to reduce
the figure, which is a real reduction but not one that closes a 10x gap.

**This does not disqualify the submission.** The official Crypto World's Fair rules
name three judging criteria — functionality, potential impact, novelty — and impose
no network requirement. The Solana track pays $10,000 per winning project, which at
current prices is roughly 87 SOL and funds the mainnet deploy outright. Colosseum's
own accelerator cohort announcement describes winners progressing "from devnet to
mainnet".

The remaining requirement is honesty in the submission: **state devnet plainly.** A
mainnet claim that Solscan cannot corroborate is the one failure that would
disqualify the entry.

### Panta: what is built and what is not

**Built** in `indexer/src/panta.ts` and `indexer/src/adjudication.ts`:

- Market creation, quote to build to register, per Panta's documented flow
- Market reads, including YES and NO prices and resolved state
- Primary-share buy: quote, build, submit
- **Trade attribution**, which is what `MARKETING.md` requires explicitly and what
  earns the creator fee on Sluice's own markets
- The four-gate resolver: unconfigured, unreachable, unresolved, and below the
  500 USDC depth floor each fall back to the named verifier, and to default-no on
  verifier silence

23 tests cover the resolver, including that a resolved, deep market decides and
that a thin one never can.

**Not built, and not claimable:**

- **No `PANTA_API_KEY` exists.** A key must be minted at
  `https://docs.panta.market/guides/authentication` before any of the above can be
  exercised against the live API. Until then `/api/resolver` reports
  `configured: false` and every milestone resolves through the internal fallback.
- **No market has been created.** Market creation is untested against the real API;
  the tests use a stubbed fetch.
- **The Panta sidetrack cannot be submitted on this basis.** Its first criterion is
  API integration depth and the checklist demands trade attribution wired end to
  end. Claiming it without a key and a live market would be a false claim on a track
  built to check exactly that.


---

## Build Priority

Ordered by rubric leverage, not by calendar.

1. Curve engine and DBC pool creation, because without issuance nothing else is demonstrable
2. Settlement program, because it holds the funds and is the CertiK story
3. Milestone verifier and Panta integration, because adjudication is the differentiator
4. Redemption vault, because it is the holder protection and half the trust story
5. Compliance transfer hook with the graduation revocation, because that is the invention
6. Landing page and terminal, every figure live
7. Waterfall vault, mandatory, it is the claim on real cash flow and it earns a fee
8. Autopilot, deferred to Phase 2 unconditionally
9. Demo video and X posts
