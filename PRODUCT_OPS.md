# PRODUCT_OPS.md
## Sluice: The Complete Product Reference

**Read this file when** you need to understand what Sluice is, why it exists, how it works, who it serves, or how its parts fit together. It is the broad, shareable source of truth for the product.

This document is written to work at two levels at once. Every important idea gets a plain-English explanation first, then the deeper technical detail underneath it. If you have no background in Web3, read the plain-English parts and skip the detail. If you are building on Sluice, read both.

**Audience:** collaborators, builders, designers, researchers, investors, partners, judges, and anyone who asks "what exactly is Sluice?".

**Related files:**
- `TEAM_OPS.md`: internal operating manual for people working on Sluice
- `CLAUDE.md`: agent context, coding rules and design system
- `APP_BLUEPRINT.md`: market context, programs, revenue model, data structures
- `BUILD_GUIDE.md`: build sequencing and phase scope
- `FRONTEND_SPEC.md`: the interface specification, class by class
- `MARKETING.md`: positioning, X posts and submission copy
- `BRAND_AND_DOMAIN.md`: name, trademark and domain decisions

---

## 1. The One-Line Summary

**Sluice lets a business raise money against its real-world income, and gives investors a market-enforced guarantee that the money is only released when the work is actually done.**

The tagline: **Issue the real asset. The market decides if you keep the money.**

---

## 2. Core Details

| Field | Value |
|---|---|
| Product name | Sluice |
| Tagline | Issue the real asset. The market decides if you keep the money. |
| Category | Real-world asset (RWA) issuance protocol with market-adjudicated milestone release |
| Blockchain | Solana |
| Issuance layer | Meteora Dynamic Bonding Curve (DBC) |
| Liquidity layer | Meteora DAMM v2, then DLMM |
| Adjudication layer | Panta, pluggable with an internal fallback |
| Settlement currency | USDC, with support planned for tokenised stock pairs |
| Programs | Eight, written in Rust with Anchor 0.29.0, roughly 4,200 lines |
| Frontend | Next.js 14 App Router, TypeScript, Tailwind |
| Onboarding | Privy embedded wallets for issuers, self-custody wallets for investors |
| Data layer | Yellowstone gRPC. No SQL database |
| Current state | **Pre-launch. In build for the Colosseum Crypto World's Fair, deadline 12 October 2026** |
| Primary users | SMEs and fund SPVs in West Africa; crypto-native RWA buyers |
| Web | sluice.world |
| Handles | `sluiceprotocol` on X, GitHub and Telegram |

---

## 3. Sluice in Sixty Seconds

**Plain English.**

Imagine a bakery that has a contract to supply bread to fifty hotels. The hotels pay thirty days after delivery. The bakery has plenty of confirmed future income, but it needs cash now to buy flour. A bank will either refuse the loan or charge punishing interest.

Sluice lets the bakery turn that future income into tokens and sell them to investors. Investors get paid from the bakery's actual revenue as it arrives.

The problem with doing this online is trust. Once the bakery has the money, what stops it from spending it on something else? In a small village, shame and reputation do the work. Online, with anonymous buyers, they do not.

Sluice solves this with a **gate**. The money raised is released in stages. Before each stage is released, a public prediction market is asked a simple yes-or-no question: "Did the bakery deliver to the fifty hotels by 30 September?" Anyone can trade on that question. If the market says yes, the next stage of money is released. If it says no, whatever is left goes back to investors, pro rata, and they do not have to chase anyone.

No committee. No vote. No one to beg. The gate opens or it does not.

**The detail.**

Technically, Sluice is a Solana protocol with eight Anchor programs. An issuer creates an `Issuance` account holding a NAV band, a compliance policy and a set of `Milestone` accounts. Capital raises along a 16 segment Meteora DBC bonding curve whose shape is derived from the NAV band. Each milestone carries one machine-checkable binary question with a named verifier and a deadline. A binary market is opened on that question. At resolution, the settlement program either releases the next tranche or routes remaining capital to a redemption vault where holders claim pro rata. Separate from the raise, real cash flow from the underlying asset is pushed into a waterfall vault and distributed to holders on a configurable cadence.

During the raise, a Token-2022 transfer hook enforces the jurisdiction's transfer policy. On graduation, DBC revokes that hook automatically, so the primary distribution is controlled and the secondary market is permissionless.

---

## 4. The Problem

### 4.1 The original structure

**Plain English.** Across West Africa, and in many other places, people have used a savings arrangement for generations. In Nigeria it is called an esusu (also ajo, adashi, or similar names in other regions and languages). Twenty people each put in a fixed amount every month. One person takes the whole pot that month. Everyone takes a turn. No paperwork, no bank, no collateral.

It works. It funds more small businesses than most formal systems do.

**The detail.** The esusu is an informal rotating savings and credit association (ROSCA). Its enforcement mechanism is social: every member knows every other member, and default carries reputational cost that exceeds the financial benefit of defaulting. That works because the group is small, local and stable.

### 4.2 Why it breaks online

**Plain English.** The esusu works because everyone knows everyone. Shame does the enforcing. Put that arrangement online, with anonymous wallets and people who have never met, and shame stops working. An anonymous wallet has no reputation to lose.

So the question becomes: if you take away shame, what enforces the deal?

**The detail.** Three candidate answers, each rejected for a stated reason:

1. **A credit score.** Rejected, because the data infrastructure that produces credit scores does not exist for most businesses in the target market. There is no file to score.
2. **A committee or vote.** Rejected, because committees get captured, are slow, and reintroduce exactly the trust dependency the protocol is trying to remove.
3. **A market.** Chosen. People with real information about whether work was done put money on it and are paid to be right.

### 4.3 Who has this problem

| Group | The specific problem |
|---|---|
| SMEs and fund SPVs in West Africa | Need $50k to $5m against contracted revenue. Local lenders charge 18% to 35% annualised, or refuse entirely |
| Crypto-native RWA buyers | Want yield not correlated to token emissions. Tokenised treasuries pay 4% to 5%. They want more without taking unsecured credit risk |
| Regulated issuers and licensed operators | Need a compliance rail that does not require rewriting the program for every new jurisdiction |

### 4.4 Why it matters

The IFC puts unmet MSME credit demand in Sub-Saharan Africa at **$331bn**, with **$32.2bn** of that in Nigeria alone, and reports that **over 40%** of Sub-Saharan African SMEs name access to credit as their single worst constraint. Globally the emerging-market MSME gap is **$5.7tn**, nearer $8tn counting informal enterprises.

Source: IFC, *MSME Banking in the Digital Era*, September 2025. The AfDB puts the continent-wide figure nearer $421bn, so the IFC figure should be quoted with the range footnoted rather than presented as settled.

Existing RWA platforms (Centrifuge, Ondo, Maple, Securitize) all serve institutional credit and treasuries. None of them serves a Nigerian cold chain operator with ₦180m of contracted receivables. Their minimum investment thresholds start where that operator's entire raise ends.

---

## 5. Who Sluice Is For

### 5.1 Issuers

Businesses raising against contracted future income. They supply financials, receive a valuation band, configure a compliance policy, set milestones, and raise.

Sluice assumes the issuer is a **registered business**, not an anonymous project. The compliance policy exists because issuers operate under real securities law.

### 5.2 Investors

Anyone buying a claim on real-world cash flow. They receive distributions from the waterfall vault as the underlying asset earns, and they hold redemption rights if a milestone fails.

Two audiences: crypto-native buyers seeking uncorrelated yield, and local or diaspora investors seeking exposure to businesses they understand.

### 5.3 Institutions, from Phase 2 onward

Fund SPVs and licensed operators who need a compliance rail. Not served in Phase 0.

### 5.4 Who Sluice is not for

- Anonymous teams launching speculative tokens
- Anyone seeking a loan. Sluice does not lend
- Anyone seeking insured or guaranteed returns. Nothing in Sluice is guaranteed

---

## 6. What Sluice Is Not

Boundaries matter as much as features. Each of these is a stated position, not an oversight.

| Sluice is not | Because |
|---|---|
| A prediction market | On Polymarket the market *is* the product. In Sluice you buy a claim on real cash flow, and the market is the enforcement layer underneath it |
| Futarchy | MetaDAO's futarchy runs conditional markets on a token's future price and resolves by TWAP. Sluice runs a **binary event market** on one verifiable fact. Different mechanisms. See section 19 |
| A lending protocol | No borrowing, no collateral, no interest rate. Investors buy a claim, they do not make a loan |
| A bank or registered exchange | Sluice is software infrastructure. It is not a licensed financial institution |
| A custodian | Tokens go to holder wallets. Sluice programs hold capital in vaults defined by code, not in an account anyone controls |
| A source of legal or financial advice | Issuers are responsible for their own regulatory compliance |
| A credit scoring service | The market prices risk. Sluice does not score anyone |
| An insurance product | The insurance reserve is a protocol backstop for attestation failure, not a policy any user can buy |

---

## 7. The Core Mechanism

This is the part worth understanding properly. Everything else in Sluice is in service of it.

### 7.1 The gate, plainly

Money raised is not handed over in one lump. It sits behind a gate, released in stages called **tranches**. Each stage has one question attached to it, written so that a machine can check the answer. When the question is resolved, the gate either opens or it does not.

- **Resolves yes:** the next tranche is released to the issuer on schedule.
- **Resolves no:** whatever capital remains goes to a redemption vault, and holders claim their share.
- **No answer at all:** resolves no by default. Silence is not ambiguity.

### 7.2 The gate, precisely

Each `Milestone` account holds:

- `question`: a 160 byte field containing one binary question
- `verifier`: the public key of a named party responsible for reporting
- `deadline`: when the question resolves
- `grace_window`: how long after the deadline the verifier has to report
- `tranche_size`: the amount released on a yes
- `outcome`: `None` until resolved, `false` on verifier silence

The question must be machine-checkable. The interface enforces this: it rejects questions that name no number, no date and no source, with the error explaining why. A market cannot price a question it cannot resolve.

A binary market is opened on the question. At the deadline the verifier reports, the market resolves, and the settlement program executes the correct branch.

**Why silence resolves no.** Without a default, a verifier who goes quiet creates a stuck state where capital is neither released nor redeemable. Defaulting to no is strictly better for holders, and it makes verifier reliability the issuer's problem rather than the investor's.

**Why the resolver is pluggable.** Panta is the default. An internal market is the fallback, because an external market can be thin, and a thin market can be moved cheaply. The pluggable interface protects against that, and it also happens to be the same interface that lets third parties adopt the adjudication rail later (see Phase 4, section 20).

---

## 8. Terminology

A non-Web3 reader should be able to follow the rest of this document using this table alone.

### 8.1 General Web3 terms

| Term | Plain English | In detail |
|---|---|---|
| Blockchain | A shared record of transactions that many computers keep identical copies of | Solana is the specific blockchain Sluice runs on, chosen for low cost and fast settlement |
| Wallet | An app or device that holds the keys proving you own something on a blockchain | A wallet does not hold coins. It holds keys. The assets live on the chain |
| Self-custody | You hold your own keys | Opposite of a custodial service where a company holds them for you |
| Token | A digital unit representing ownership of something | Sluice tokens represent a claim on real-world cash flow |
| Stablecoin | A token designed to hold a steady value, usually one US dollar | USDC is the settlement currency |
| Program (smart contract) | Code that runs on the blockchain and enforces rules automatically | Sluice has eight, written in Rust |
| PDA | Program Derived Address | An account address controlled by a program rather than by a private key. Sluice's treasury is a PDA, so no single key can drain it |
| Mainnet | The real blockchain, where real money is at stake | Opposite of devnet or testnet, which use valueless tokens |
| Multisig | An arrangement needing several approvals before funds move | Sluice treasury withdrawals above a threshold need 3 of 5 approvals |
| Timelock | A mandatory delay before an action takes effect | Sluice uses 48 hours, giving holders time to react |

### 8.2 Sluice-specific terms

| Term | Plain English | In detail |
|---|---|---|
| Issuance | One business raising money through Sluice | An `Issuance` account holding NAV, policy, milestones and vault addresses |
| NAV | Net Asset Value. What the underlying business income is worth | Stored as a **band** (`nav_low`, `nav_high`) with an attested value, never a single figure |
| Attestation | An independent expert confirming the NAV figure, and signing it | Sluice never attests its own issuances. The attestor's name and the date are visible to everyone |
| Bonding curve | A mathematical rule where price rises as more people buy | Removes the need for an order book during the raise |
| DBC | Meteora's Dynamic Bonding Curve | Program `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`. Configurable curve, fee schedule and graduation |
| Graduation | When a raise finishes and the pool moves to a normal trading pool | Sluice pools graduate from DBC to DAMM v2 |
| DAMM v2 | Meteora's post-graduation liquidity pool | Program `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG` |
| DLMM | Meteora's concentrated liquidity design | Used by autopilot in Phase 2 |
| Segment | One of 16 steps in the curve | Sluice's shape is derived from the NAV band across all 16 |
| Tranche | A stage of capital release | Released only on a yes resolution |
| Binary market | A market on a yes-or-no question | Prices shown in cents, like 74¢ yes and 26¢ no |
| Verifier | The named party responsible for reporting whether a milestone happened | Silence within the grace window resolves no |
| Transfer hook | A rule that runs on every token transfer and can block it | Sluice uses a Token-2022 hook for jurisdiction compliance |
| Redemption vault | Where money goes if a milestone fails | Holders claim pro rata, meaning in proportion to what they hold |
| Waterfall vault | Where real incoming money is collected and paid out | Distributes to holders at a snapshot, on a cadence |
| Bond | Money the issuer locks up as a good-faith deposit | Slashed, meaning taken, if an attestation fails |
| Pro rata | In proportion to your share | A holder with 2% of tokens gets 2% of the distribution |
| Indexer | A service that watches the chain and organises what it sees | Sluice's indexer streams over gRPC so the site never needs a database |
| gRPC | A fast streaming connection for reading chain data | Yellowstone gRPC is what Sluice uses |
| Spread | The gap between buy and sell price | Diverting LP fees widens spreads and makes the market unusable |

---

## 9. The User Journey

### 9.1 The issuer journey

**Step 1. Sign in.** The issuer creates an account with email or Google. Sluice provisions a Solana wallet for them behind the scenes.

*Why not a wallet extension:* issuers are businesses. A cold chain operator in Port Harcourt does not have a Solana wallet and will not install one to fill in a form.

**Step 2. Describe the asset.** The issuer supplies financials and selects a class: revenue, royalty, or invoice.

**Step 3. Receive a valuation band.** Sluice returns a NAV range with a confidence interval, not a single number.

*In detail:* the band writes `nav_low` and `nav_high` to the issuance account. The 16 segment curve is derived from it, opening at the lower bound and steepening toward the upper. The issuer sees the full curve, and the band overlaid on it, before committing. The wizard states plainly that it is a range, not a promise.

**Step 4. Configure compliance.** The issuer selects a jurisdiction. Sluice loads the matching policy file: who may hold, transfer limits, holding period, attestation cadence.

*In detail:* jurisdiction is configuration, not code. Selecting one loads a `Policy` account. Adding a jurisdiction later does not require redeploying any program.

**Step 5. Set milestones.** The issuer writes one binary question per tranche, names a verifier, and sets a deadline.

*In detail:* the interface rejects non-checkable questions and explains why. It asks for a number, a date and a source.

**Step 6. Launch.** The issuer confirms. The curve is written, the pool is created on DBC, and the raise is live. A one-time issuance fee applies ($200, or 0.25% of target if greater).

**Step 7. Hit milestones.** As each milestone resolves, the tranche is released or the redemption path opens. Real cash flow arriving from the business is pushed into the waterfall vault and distributed to holders.

### 9.2 The investor journey

**Step 1. Connect a wallet.** Phantom, Solflare or Backpack. Investors use self-custody, unlike issuers.

**Step 2. Browse live issuances.** Every figure on the marketplace is a live chain read: NAV, raised, target, current market odds, time to settlement.

**Step 3. Open an asset.** The asset page shows price against NAV, the attestation panel, and the adjudication table.

*In detail:* price against NAV is shown as two lines on one chart. The gap between them is the premium or discount, and it is the point of the chart.

**Step 4. Invest.** Buy along the curve. Deposits carry no fee, permanently.

**Step 5. Track milestones.** The adjudication tab shows live and resolved questions, with market odds in cents and a countdown that updates without a refresh.

**Step 6. Receive income.** Distributions arrive in the waterfall vault and are claimed by the holder.

**Step 7. If a milestone fails.** Claim pro rata from the redemption vault. No chasing, no committee.

---

## 10. Key Workflows

### 10.1 Issuance to graduation

```
Issuer signs in (Privy)
  -> supplies financials
  -> receives NAV band
  -> selects jurisdiction, policy loads
  -> sets milestones and verifier
  -> curve config written (16 segments, derived from band)
  -> DBC pool created, transfer hook active
  -> capital raised along curve
  -> graduation threshold reached
  -> pool migrates to DAMM v2
  -> DBC revokes the transfer hook automatically
  -> secondary market is now permissionless
```

### 10.2 Milestone adjudication

```
Milestone deadline reached
  -> market on the question closes
  -> verifier reports inside the grace window, or does not
  -> outcome written: true, false, or false on silence
  -> settlement program executes the branch
       yes -> next tranche released to issuer
       no  -> remaining capital moves to redemption vault
  -> holders claim pro rata
  -> second claim for the same tranche reverts
```

### 10.3 Cash flow distribution

```
Real cash arrives from the underlying business
  -> converted
  -> pushed into the waterfall vault
  -> snapshot taken
  -> holders claim pro rata
  -> distribution fee of 0.50% applies only when cash actually moves
```

*In detail:* distribution uses a claim pattern rather than a push loop, so the gas cost stays bounded no matter how many holders there are. A holder who claims after a later snapshot does not receive the earlier distribution.

### 10.4 How a number reaches the screen

```
Something changes on Solana
  -> Yellowstone gRPC streams the account update
  -> the indexer receives it and emits a typed event
  -> the frontend query cache updates, keyed by account address
  -> the interface animates from the old value to the new one
```

Fallback chain if gRPC drops: websocket `accountSubscribe`, then a 15 second poll that logs a warning. There is no `setInterval` anywhere in the codebase, and no SQL database to drift out of sync.

**The rule that follows from this:** if a figure cannot be read from an account or an event, it does not exist as far as the interface is concerned.

---

## 11. Features

| # | Feature | What it does | Phase |
|---|---|---|---|
| 1 | Valuation-anchored curve | A NAV band sets the shape of a 16 segment DBC curve | 0 |
| 2 | Compliance transfer hook | Token-2022 hook enforcing jurisdiction policy, revoked automatically at graduation | 0 |
| 3 | Milestone adjudication | One machine-checkable binary question per tranche, named verifier, silence resolves no | 0 |
| 4 | Settlement and redemption | Yes releases the tranche, no routes capital to a redemption vault | 0 |
| 5 | Waterfall vault | Real cash flow distributed pro rata to holders | 0 |
| 6 | Public risk terminal | Every figure a live chain read, plus an embeddable widget and API | 0 |

Also in Phase 0: the DBC to DAMM v2 graduation path, and the preset **config format** with three Sluice-authored presets.

Deferred to later phases: autopilot, the metered data API, the preset marketplace with third-party creators, cross-chain bridging, fiat ramps, credit scoring, insurance underwriting as a product, governance token.

**What makes this worth paying for.** Anyone can launch a token. Nobody can credibly promise to withhold their own capital until a market they do not control says the work is done.

---

## 12. Technical Architecture

### 12.1 The mental model

**Plain English.** Sluice is four things stacked:

1. A **store of facts** about an issuance (what it is worth, what rules apply, what milestones exist)
2. A **machine for raising money** (the bonding curve)
3. A **gate** (the adjudication market that decides whether each stage of money is released)
4. **Vaults** (where money sits while it is waiting to be released, paid out, or returned)

Everything on screen is read directly from the blockchain. There is no separate database that could disagree with what the chain says.

**In detail.** Eight Anchor programs on Solana, plus an off-chain indexer and frontend.

### 12.2 The programs

| Program | Approx lines | Responsibility |
|---|---|---|
| settlement | ~900 | Fee claimer, creator vesting, bond vault, tranche release |
| redemption vault | ~600 | Pro rata claims on failed milestones |
| waterfall vault | ~500 | Real-world cash flow distribution |
| autopilot | ~700 | Splits the DAMM v2 position NFT, locks a floor tranche, builds the DLMM ladder |
| compliance | ~500 | Transfer hook, attestation registry, policy engine |
| bond vault | ~300 | Issuer bond, slashing on attestation failure |
| milestone verifier | ~400 | Question validation, resolution, default-no path |
| curve engine | ~300 | NAV-anchored 16 segment curve config |
| **Total** | **~4,200** | On-chain Rust |

Off-chain: gRPC indexer, public risk terminal, embeddable widget, SDK.

**Roughly 2,000 of those lines hold 100% of user funds** (settlement, redemption vault, waterfall vault). That figure is what gets quoted first on any security submission, because the primary judging criterion is value at risk.

### 12.3 Integrations

| Integration | Role | Notes |
|---|---|---|
| Meteora DBC | Issuance and price discovery | 16 segment curve, fee scheduler, graduation. Program `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN` |
| Meteora DAMM v2 | Post-graduation liquidity | Program `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG` |
| Meteora DLMM | Concentrated liquidity ladder | Used by autopilot in Phase 2 |
| Panta | Binary market creation and resolution | Pluggable, with an internal fallback if the market is thin |
| Privy | Issuer onboarding | Embedded Solana wallets on email or Google |
| Solana wallet adapter | Investor onboarding | Phantom, Solflare, Backpack |
| Yellowstone gRPC | All chain reads | Degrades to websocket, then to a logged poll |
| Stripe | Data API billing only | Phase 2. Never used for a core on-chain transaction |

### 12.4 Authentication

Sluice has two paths into the same session.

**Everyone gets every option.** Google, email, or a self-custody wallet, offered identically whether you are raising or investing. Withholding the easiest path from investors was a mistake in an earlier version: an investor with no wallet had to leave, install an extension, create a wallet, record a seed phrase, fund it, and return before they could buy anything.

Order of decisions: **role first, then method.** "I'm raising" or "I'm investing", then Google, email, or connect a wallet. Asking for a wallet before saying why makes it feel like a demand.

**Role is a view preference, not a permission.** The same address can be both an issuer and an investor, and most issuers hold positions in their own issuance. Compliance eligibility is decided on-chain by the transfer hook, never by a role flag. Where possible the interface derives capability from chain state by asking whether the address owns any issuance accounts, and shows issuer surfaces automatically. Role choice only sets the default landing view.

**There is one app interior, not two dashboards.** Issuers and investors share portfolio value, holdings, asset detail, adjudication and activity. Only a short list is issuer-only: create issuance, my issuances, attestation panel, bond status, push a distribution. Splitting them would mean maintaining the asset page twice.

---

## 13. Business Model

### 13.1 The principle

**Every rate is fixed.** None change over time, none step up with volume, none vary by user. Revenue grows because volume grows, not because the rate does.

This was a deliberate decision. Raising rates as a protocol becomes more successful is backwards, every major exchange discounts volume rather than the reverse, and issuers are businesses modelling a cost of capital. A rate that moves is a number they cannot put in a spreadsheet.

### 13.2 The fee table

| Action | Fee | Type |
|---|---|---|
| Issuance creation | $200, or 0.25% of target if greater | one-time |
| Curve trade | 0.30% | per swap |
| Milestone market trade | 0.50% | per trade |
| Secondary trade | 0.30% | per swap |
| Redemption claim | 0.25% | per claim |
| Waterfall claim | 0.50% | per distribution |
| Preset purchase | $49, or 0.25% of raise if greater | per launch |
| Attestation renewal | attestor cost plus 15% | per renewal |
| Bridge | 0.15% | Phase 3 |

**There is no deposit-only action in Sluice, and no deposit exemption.** Buying along the curve is a curve trade, charged at 0.30%. An earlier version of this table exempted deposits, carried over from a perpetual futures product where funding an account and opening a position are two separate steps. In Sluice they are one step, so the exemption described something that does not exist and opened a path by which a buy could escape the fee entirely.

Phase 2 additions: autopilot at 0.50% of AUM annualised plus 10% of yield harvested; data API at $299/month Starter and $1,499/month Institutional.

**Why buys are charged at 0.30%, not less.** The rate applies per swap in both directions, buy and sell. It matches Uniswap v3's most common tier for volatile pairs and stays invisible per transaction at Sluice's trade sizes. It must not be cut to the 0.01% to 0.10% a high-frequency venue could sustain: trading carries 87% of Phase 0 gross at every scale, so dropping the curve rate to 0.05% removes roughly five sixths of projected revenue.

**Why redemption is the lowest percentage at 0.25%.** That user's milestone just failed and they are recovering capital. Charging them heavily converts a failed investment into a public complaint.

### 13.3 The minimum raise, and why it has to exist

**Minimum raise: $25,000, enforced at issuance creation.**

The flat $200 fee needs a floor to sit against. Without one, a $200 target pays a 100% fee and a $1,000 target pays 20%, neither of which can be defended. With it, the effective rate behaves like this:

| Target | Fee | Effective rate |
|---|---|---|
| $25,000, the floor | $200 | 0.80% |
| $50,000 | $200 | 0.40% |
| $80,000 | $200, the crossover | 0.25% |
| $80,000 and above | 0.25% of target | 0.25% |

**The issuance fee may never exceed 1% of the target.** The current numbers never approach that cap; it is a guard on future changes rather than a live constraint.

**Test issuances are free on devnet and never free on mainnet**, where the flat fee is the only thing deterring spam.

Is $200 a lot? Against the alternatives, no. Securitize's minimum engagement is estimated at $50,000 to $100,000. Republic charges 6% to 10% of funds raised plus equity. RealT charged a 10% listing fee and 2% of income. A $200 flat fee on a $25,000 raise is 0.80%, which is not merely cheaper than every comparable, it is cheaper by two to three orders of magnitude. The $200 is not the barrier. The $25,000 minimum is the barrier, and it is set there because below it the attestation cost alone exceeds the fee.

### 13.4 Where each fee physically comes from

This is the part that breaks if it is guessed. Each fee has a different source layer.

| Action | Source layer |
|---|---|
| Curve trade | DBC partner fee allocation |
| Secondary trade | DAMM v2 and DLMM partner or protocol fee share |
| Milestone market trade | Panta creator fee, because Sluice creates the market |
| Issuance creation | Deducted by Sluice's own program |
| Redemption claim | Deducted from the amount being claimed |
| Waterfall claim | Deducted from the distribution amount |
| Preset purchase | Deducted at launch, 70% forwarded to the preset creator |

**The rule that must never be broken:** no Sluice fee may ever come from the liquidity provider fee. That fee pays people for holding the pool. Diverting it drains liquidity, widens spreads and makes the secondary market unusable.

### 13.5 How revenue is routed

```
Fee generated
  -> preset creator receives 70% FIRST, where applicable
  -> Treasury PDA (program-owned, never a private-key account)
       -> 55% Treasury reserve    audits, legal, security, runway
       -> 25% Founder draw        founder and early team
       -> 12% Growth              issuer rebates, BD, ecosystem
       ->  8% Insurance reserve   backstop for attestation failure
```

Fees route **inside the same transaction** that generates them. If routing fails, the whole transaction reverts, so revenue can never be silently lost.

On the 1st of each month the founder draw is swept to an address read from an environment variable, never hardcoded. Withdrawals above a threshold need 3-of-5 multisig approval and a 48 hour timelock. The sweep must be idempotent: running it twice in one period must not double pay.

---

## 14. Regulatory Position

Nigeria's Investments and Securities Act 2025, signed 25 March 2025, makes digital and virtual assets **securities** under SEC jurisdiction. Issuers must register offerings. The ARIP sandbox, roughly ₦2m (about $1,245), is the pilot pathway.

**What this means for Sluice.** It positions as compliance infrastructure for *registered* offerings and *licensed* operators. It is not a registered exchange and does not provide legal advice. This is stated in the footer of every page, not buried in terms.

Before mainnet: engage a Nigerian securities lawyer, and confirm the framing with Superteam Nigeria.

**Why this is a feature rather than an obstacle.** As of March 2025 Nigeria legally recognises tokenised assets as securities. The compliance rail that registered issuers are now required to have does not exist yet. Sluice is designed to be that rail.

---

## 15. Security Model

Sluice handles other people's money, so these are release blockers rather than aspirations.

| Control | Detail |
|---|---|
| Treasury | Program-owned PDA. No single private key can drain it |
| Withdrawals | 3-of-5 multisig, 48 hour timelock above threshold |
| Fee routing | Atomic. A failed routing reverts the whole transaction |
| Reentrancy | Solana forbids a program twice in one CPI stack. Validate and execute are split across transactions where a CPI would otherwise return to the caller |
| Bonds | Issuer posts a bond, slashable only through the attestation failure path |
| Verifier failure | Silence resolves no. There is no stuck state |
| Redemption | A second claim on the same tranche reverts. Vault balance reconciles to outstanding claims at all times |
| Frontend | No `localStorage` or `sessionStorage`. No off-chain record is written before the transaction confirms |
| Keys | No key material in code, committed files, or communication channels |
| Audits | Programs audited before mainnet. If no audit is complete, the site says "Audit pending, not yet published". Never fabricate an audit status |
| Depth floor | A milestone market below a minimum depth and volume does not have its resolution accepted |
| Resolution delay | 48 hours between resolution and tranche release, during which a guardian can halt a wrong release |
| Caps | Maximum value per pool, per issuance, and protocol-wide during early phases |
| Pause guardian | Multisig can halt new issuance, tranche release and redemption claims. It can never block a holder from claiming funds already vested |

### 15.1 What happens if a dependency is compromised

Sluice is built on other people's programs. That is the point of composing, and it is also the largest risk Sluice's own audits cannot address. An audit of Sluice's eight programs says nothing about the security of Meteora, Panta or Privy.

The question is not whether a dependency can fail. It is what Sluice loses when one does, and what Sluice can halt in time to matter.

| Dependency | If it is compromised | Sluice loses | Sluice does NOT lose |
|---|---|---|---|
| Meteora DBC | Curve pool drained | Capital sitting in DBC pools | Released tranches; anything in Sluice's own vaults |
| Meteora DAMM v2 | Pool drained or trading disabled | Secondary liquidity | Tokens in wallets; balances in Sluice's vaults |
| Panta | A milestone resolves incorrectly | Correctness of one tranche decision | Sluice's programs; funds move only on a resolved outcome |
| Privy | Issuer account taken over | That one account | Protocol funds; every other issuer |
| USDC | Depeg | Value of USDC held | Everything else |
| Solana | Outage | Ability to transact until recovery | Nothing. State persists |

**The protection that already exists.** Sluice's settlement, redemption and waterfall programs are Sluice's own code, roughly 2,000 lines holding 100% of user funds at rest. A DBC exploit drains DBC pools. It does not touch capital already moved into a Sluice vault, because that capital sits under a different program with different authority.

**The risk that is not a hack.** The most probable failure is not an exploit of Meteora. It is a thin milestone market being moved cheaply, causing a tranche to release when it should not have. An attacker does not need to break anything, only to buy enough of a shallow market to move the mid price across the resolution threshold. The cost of that attack scales with market depth, and depth on a single-issuer milestone market is inherently limited.

Four controls exist for exactly this:

1. **Depth floor.** A market that has not reached minimum depth and volume by the deadline does not have its resolution accepted. It falls back to the internal market, or to the verifier report alone
2. **Resolution-to-release delay.** 48 hours between resolution and tranche release, during which a guardian can halt a wrong release
3. **Caps.** Maximum value per pool, per issuance, and protocol-wide during early phases. Caps do not prevent an incident, they bound it
4. **Pause guardian.** Multisig can halt new issuance, tranche release and redemption claims. It can never block a holder from claiming funds already vested, because that would be a rug vector

**What Sluice cannot do.** Sluice cannot prevent a Meteora exploit, cannot make Panta's market deep, and cannot insure deposits. The defensible claim is narrower and still worth making: Sluice's own vaults are separate from its dependencies' pools, Sluice can halt new issuance and tranche release, and Sluice refuses to accept a resolution from a market too thin to trust.

---

## 16. Design and Product Philosophy

The interface is specified in `FRONTEND_SPEC.md` in full detail. The principles behind it:

**Everything on screen is real.** No mock data, no placeholder figures, no decorative numbers. Where a seeded demo is shown because no live issuance exists, it carries a visible DEMO tag and is replaced automatically the moment real data exists.

**One accent, used sparingly.** A restrained terracotta on a deep charcoal ground, covering 10% or less of any surface. The aesthetic is dark editorial, asymmetric, and built on a bento grid structure.

**Motion is subtle and precise.** The hero carries a cinematic ambient video loop that owns its own timeline. Scrolling never controls video playback, only scale, opacity, position and blur. The app interior is static by design: grain, hairlines and colour blocking only.

**Two reading levels, consistently.** The landing page works for someone who has never used a blockchain and for someone who builds on one. This document follows the same rule.

**Typography.** Schibsted Grotesk for display, Inter for body, Geist Mono for figures.

---

## 17. Positioning

| Platform | What it does | Where Sluice differs |
|---|---|---|
| Centrifuge | Institutional credit pools on-chain | Serves institutional credit. Sluice serves SMEs whose entire raise is below Centrifuge's minimum |
| Ondo | Tokenised treasuries and money market funds | Yields 4% to 5% from government debt. Sluice yields from real business income |
| Maple | Institutional lending pools | Underwrites credit to known institutions. Sluice does not underwrite; the market prices risk |
| Securitize | Regulated tokenisation and transfer agency | Full institutional stack, priced per deal. Sluice is self-serve protocol infrastructure |
| MetaDAO | Launchpad plus futarchy | Launches crypto companies and prices a token. Sluice issues claims on off-chain cash flow and resolves a fact |

**The wedge is not the technology, it is the market.** Large RWA platforms cannot profitably serve a business raising $80,000. Their compliance overhead alone exceeds the fee. Sluice's policy engine makes jurisdiction a configuration file, which removes that overhead.

---

## 18. Current State

**Honest status as of 7 October 2026.**

| Area | Status |
|---|---|
| Product documentation | Complete. Product Ops, Team Ops, blueprint, build guide, frontend spec, marketing, brand |
| Design system | Specified in full. Fonts, palette, layout, motion, z-index, responsive, accessibility |
| Programs | **Not yet written.** Eight specified, approximately 4,200 lines planned |
| Frontend | **Not yet built.** Specification complete |
| Indexer | **Not yet built.** Architecture specified |
| Deployment | **Not yet deployed.** No program IDs assigned |
| Domain | sluice.world, registration decision made |
| Handles | `sluiceprotocol` on X, GitHub and Telegram. X account created |
| Audits | None. No audit has been performed or published |
| Users | None |
| Revenue | None |

**Sluice is a pre-launch project in active build.** The hackathon submission deadline is 12 October 2026. Nothing in this document should be read as describing a live product.

---

## 19. Roadmap

| Phase | Window | Goal | Scope |
|---|---|---|---|
| **0** | To 12 October 2026 | Win the hackathon | Seven of eight programs live on mainnet, full frontend, every figure a live chain read |
| **1** | Months 1 to 3 | First real issuers | Attestor network, **milestone track record**, **reusable investor verification**, first Nigerian issuer through the ARIP sandbox, securities counsel engaged |
| **2** | Months 4 to 9 | Scale supply | Autopilot, preset marketplace, metered data API, **secondary liquidity programme**, **investor statements**, second jurisdiction policy |
| **3** | Months 10 to 18 | Become infrastructure | **White-label issuance**, secondary market depth, real cross-chain, insurance as a product, public SDK |
| **4** | Month 18 onward | Sell the enforcement layer | Adjudication as a service, **agent-callable adjudication API** |

**Four additions beyond the original plan, and why each earns its place.**

**Milestone track record, Phase 1.** Every resolved milestone accumulates into a portable on-chain record per issuer: how many were set, how many passed, how much capital was released versus returned. An issuer who has cleared milestones across two issuances carries evidence no credit bureau in the target market can currently produce. This is the modern replacement for the social enforcement the esusu relied on, rebuilt as data instead of reputation, and it is the strongest reason for an honest issuer to come back.

**Reusable investor verification, Phase 1.** Complete KYC once, receive a verifiable credential that satisfies the transfer hook on any compliant issuance, rather than repeating onboarding every time. Onboarding friction is the largest measured drop-off point in tokenised investing, and per-issuance KYC makes it worse with every new issuance.

**Secondary liquidity programme, Phase 2.** Issuance capability is commoditising; depth is becoming the scarce thing. Sluice issuances will graduate with thin pools and stay thin without help, and a claim nobody can exit is worth less than one they can.

**Investor statements, Phase 2.** Holders accumulate claims across many issuances, each with its own distributions and cost basis. Without a consolidated statement and export, Sluice is unusable for anyone with an accountant or a tax authority. Unglamorous, and it is the difference between a toy and an asset class.

**White-label issuance, Phase 3.** Licensed operators and fund administrators want to issue under their own brand and will not send their clients to someone else's domain. White label is the dominant enterprise route to market in tokenisation, and Sluice's architecture already supports it: jurisdiction is a policy file, compliance is a hook, and the protocol does not care whose logo is on the form.

**Agent-callable adjudication, Phase 4.** Automated counterparties are becoming real participants in on-chain markets, and milestone adjudication suits them unusually well: structured inputs, binary question, fixed deadline, deterministic payout branch. Every consumer of that API also becomes a distribution channel for the data Sluice sells in Phase 2.

**Phase 4 deserves explanation.** Any capital raise with milestone conditions needs what Sluice built: a question, a market, a verifier, a resolution and a payout branch. That describes launchpads, RWA platforms, grant programmes, milestone-based venture tranches, and government disbursement programmes. None of them will build it themselves.

This is a larger business than issuance fees, and it is the reason the verifier is a pluggable interface from Phase 0 rather than a hardcoded integration. The same design decision that protects against thin markets is the one that lets a third party adopt the rail later.

---

## 20. Decision Log

Major decisions, with the reasoning. Prevents relitigating settled questions.

| Decision | Reasoning |
|---|---|
| **Binary event market, not futarchy** | MetaDAO's futarchy prices a token's future value. Sluice resolves one verifiable fact. They are different mechanisms, and a MetaDAO judge sits on the Colosseum panel. Never conflate them |
| **Do not copy MetaDAO code** | Their programs are BUSLv1.1, not MIT. Study the architecture, write Sluice independently, and say so in the README |
| **Verifier silence resolves no** | Without a default, capital can be stuck in neither-released-nor-redeemable. Defaulting to no protects holders and makes verifier reliability the issuer's problem |
| **Pluggable resolver** | An external market can be thin and therefore cheap to move. The fallback protects the mechanism and enables Phase 4 |
| **Jurisdiction as configuration** | Adding a jurisdiction must not require redeploying a program. This is what makes small issuances economically viable |
| **Hook revoked at graduation** | Controlled primary distribution, permissionless secondary market. The novelty is that DBC does the revocation automatically |
| **Privy for issuers, self-custody for investors** | Issuers are businesses without wallets. Investors are crypto-native and expect to hold their own keys |
| **Fixed fees, never stepped** | Raising rates as a protocol succeeds is backwards. Volume does the work |
| **Deposits permanently free** | Charging to put money in deters the behaviour the protocol needs most |
| **No fee from the LP fee ever** | It pays liquidity providers. Diverting it destroys the secondary market |
| **No SQL database** | Every figure must be a chain read. A database can drift, leak and contradict the chain |
| **Keep the repository public** | Superteam Nigeria scores open-source status. It also removes the Meteora requirement to grant a judge read access |
| **Name: Sluice** | Named for the gate that releases water. The structure underneath is the esusu. Free of trademark conflict in financial classes, and every major Solana protocol uses a non-.com domain anyway |
| **Waterfall vault in Phase 0** | It is what makes the real-world cash flow claim demonstrable, and it earns a fee, so it is revenue-positive |
| **No deposit exemption** | Sluice has no deposit-only action. Buying is a curve trade. The exemption was inherited from a perp product and described a step that does not exist here |
| **Minimum raise of $25,000** | A flat fee needs a floor to sit against. Without it a $200 target pays a 100% fee |
| **One app interior, not two dashboards** | Most of the surface is shared. Two dashboards means maintaining the asset page twice |
| **Role is a preference, not a permission** | The same address is often both. Eligibility is decided on-chain by the transfer hook |

---

## 21. Constraints and Assumptions

**Constraints (hard limits that shape the product):**

- Fees can only come from partner, protocol or creator allocations, never from the LP fee
- Verifier silence must resolve no
- No off-chain mirror of balances
- No `localStorage` or `sessionStorage` anywhere
- No jurisdiction change may require a program redeploy
- Every figure must be a live chain read

**Assumptions (things believed true but not yet proven):**

| Assumption | Risk if wrong |
|---|---|
| SMEs will supply financials for valuation | The curve has no anchor and the core feature collapses |
| Panta markets will be liquid enough to be credible | Thin markets can be moved cheaply. Mitigated by the internal fallback |
| Named attestors will attest NAV for modest fees | Attestation becomes the cost bottleneck |
| Registered issuers exist who want this rail | The compliance positioning has no customer |
| DBC partner allocation can accommodate the target rates | Rates must be lowered and the model restated |
| Nigerian regulators will accept the infrastructure framing | The beachhead market closes |

---

## 22. Known Limitations and Open Questions

Stated honestly so nobody is surprised later.

**Limitations by design in Phase 0:**

- No secondary market maker beyond graduation to DAMM v2
- Bridge is a link-out, not a real bridge
- No fiat on or off ramps inside the product
- No credit scoring or underwriting
- No insurance product, only a protocol reserve
- No mobile app
- No governance token

**Open questions that need answering:**

1. Does DBC's partner fee allocation actually accommodate a 30 bps curve fee? Must be verified against live config before the settlement instruction is written.
2. Does Panta allow the creator fee rate to be set, and at what cap?
3. How many holders does a single issuance need before distribution economics break down?
4. What happens when a verifier disputes the market's read rather than simply failing to report?
5. Does the ARIP sandbox accept a protocol of this shape, or only individual issuers?

---

## 23. Troubleshooting and Common Questions

**Is Sluice a prediction market?**
No. On a prediction market the market is the product. In Sluice you buy a claim on real-world cash flow, and the binary market is the enforcement layer underneath it.

**Is this futarchy?**
No. See section 20. Do not use the word.

**What stops the issuer from taking the money and leaving?**
The tranches. Capital is released in stages, and each stage requires a yes resolution on a machine-checkable question.

**What if the verifier disappears?**
The milestone resolves no by default, and remaining capital goes to the redemption vault.

**Who attests the NAV? An independent third party, or Sluice?**
An independent attestor. Sluice never attests its own issuances. The attestor's name, the date and the signature are visible on the asset page.

**Where does my money sit during a raise?**
In program-controlled vaults, not in anyone's account. The treasury is a program-derived address, so no private key controls it.

**Why is there a transfer rule at all, if crypto is meant to be open?**
Because issuers operate under securities law. The hook lets them comply during the raise, and it is revoked automatically at graduation so the secondary market is fully open.

**Is there a token?**
No. There is no Sluice token and no commitment to create one. Do not state otherwise publicly.

**Is Sluice audited?**
Not yet. Until an audit completes and is published, the correct statement is "Audit pending, not yet published".

**Is my investment guaranteed?**
No. Milestones can fail. That is the point of the mechanism, and it is why redemption exists.

---

## 24. Where Knowledge Lives

| File | Authoritative for |
|---|---|
| `PRODUCT_OPS.md` | This file. Broad product understanding. Share it freely |
| `TEAM_OPS.md` | Internal working practices, ownership, workflows. Internal |
| `CLAUDE.md` | Agent context, coding rules, design system, prohibited patterns |
| `APP_BLUEPRINT.md` | Market context, program interface, revenue model, data structures, environment variables |
| `BUILD_GUIDE.md` | Build order, phase scope, per-fee implementation steps, quality audit |
| `FRONTEND_SPEC.md` | Every class, animation value, z-index, and piece of interface copy |
| `MARKETING.md` | Positioning, X posts, submission copy, accounts to follow |
| `BRAND_AND_DOMAIN.md` | Name origin, trademark screening, domain and handle decisions |
| `sluice-ui-and-metadao-study.md` | Reference UI study and the five factual errors to avoid |

**Rule:** if two files disagree, `CLAUDE.md` and `APP_BLUEPRINT.md` govern the build, `FRONTEND_SPEC.md` governs the interface, and this file governs how the product is described. Disagreements should be fixed at source, not worked around.

---

*Last updated 7 October 2026. Sluice is a pre-launch project in build for the Colosseum Crypto World's Fair.*
