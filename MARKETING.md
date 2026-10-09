# MARKETING.md — Sluice

## Goal

Get Sluice in front of the Colosseum judges, the Meteora and CertiK reviewers, and the Superteam sidetrack reviewers during the submission window, without sounding like a pitch deck.

The story is one sentence: the oldest lending structure in West Africa, with the enforcement swapped for something that survives contact with strangers.

Core proof to show in public: a real issuance on mainnet, a live binary market on a real milestone, and NAV attestation visible with the attestor's name next to it. Every number on the site is a live chain read. None of it is a mockup.

---

## Posting Style

- all lowercase
- builder voice, not company voice
- one clear idea per post
- short lines with space between thoughts
- show what works, do not explain what you plan to build
- the demo video does the heavy lifting, copy supports it

## Video assets

Generated Sluice video and animation source assets are in `C:\Users\Paul\Documents\Coding Area\Personal Projects\Sluice\Video`. The current `Rotating_copper_form_in_light_20261005042457.mp4` is the ambient brand animation, not the recorded product-demo walkthrough. Inspect the folder and use the right asset for each post; never imply the ambient animation demonstrates live product behavior.

---

## X-Post Requirements, Confirmed

Taken from each track's own listing text. This settles the open question: **two tracks require track-specific X posts, four do not.**

| Track | X post required | Track-specific | Detail |
|---|---|---|---|
| Adevar Labs | **Yes** | **Yes** | Exact copy supplied by the sponsor. Must follow @AdevarLabs |
| RPC Fast | **Yes** | **Yes** | 2 to 3 posts per month for two months, so 4 to 6 posts. Must follow @rpcfast, join Telegram and Discord |
| Meteora DBC | No |  | No posting requirement in the listing |
| Superteam NG | No |  | No posting requirement. Requires 3 pitch reviews plus demo day |
| Panta | No |  | No posting requirement. Requires a working demo |
| CertiK | No |  | No posting requirement. Requires repo, line counts, 6 to 12 month roadmap |

So four of the six tracks need no track-specific post at all, and main post 2 satisfies any of them that merely wants project coverage.

**The two that do require it are also the two with strict formats.** Adevar supplies copy that should be used close to verbatim. RPC Fast is not one post but a sustained cadence across two months, and it weighs engagement, meaning replies, quotes and reposts of RPC Fast's own posts count as well.

### Non-negotiable side requirements

| Track | Requirement |
|---|---|
| Meteora DBC | If the repository is close-sourced, add GitHub user **`dannxbt`** with Read permissions for judging. Skip this if the repo is public |
| Adevar Labs | Follow @AdevarLabs |
| RPC Fast | Follow @rpcfast, join their Telegram and Discord, fill in the Focus plan application form |
| Superteam NG | Register on Colosseum marking Nigeria, submit to the Solana ecosystem track, provide a working prototype, attend at least 3 pitch reviews and demo day |
| Panta | Working demo, written in English, explaining how the Panta API is integrated |
| CertiK | Colosseum link, public repo, problem and users, programs to audit with line counts, mainnet date, 6 to 12 month roadmap, team, fundraising status, Telegram or email |

---

## Main Posts

### Post 1, the leak

No full details. The job is to create a question, not answer it.

```
been building something quietly for the @colosseum world's fair

it's called sluice

named after the rotating savings groups that have funded west african businesses longer than any bank has

twenty people, one pot, everyone takes a turn

it works because everyone knows everyone

i kept the structure and replaced the part that breaks the moment you leave the village

more soon
```

Attach nothing, or a single frame of the adjudication screen with the numbers cropped out.

---

### Post 2, the full breakdown

Post as a thread. Each part stands alone.

```
1/
sluice, properly

it issues claims on real-world cash flow as tokens on solana. invoices, royalties, revenue

the flow, five stages:

2/
value the asset

you get a nav band, not a single number. that band sets the shape of a 16 segment bonding curve on meteora dbc

the opening price is anchored to something real instead of to a vibe

3/
comply

a token-2022 transfer hook enforces your jurisdiction's policy. who can hold, transfer limits, holding period

you post a bond

at graduation dbc revokes the hook automatically, so the raise was controlled and the secondary market isn't

4/
raise

capital comes in along the curve in usdc or a tokenised stock

5/
adjudicate

each tranche carries one binary question with a machine-checkable answer and a named verifier

a market opens on it. anyone can trade it

6/
settle

resolves yes, the tranche releases on schedule

resolves no, remaining capital goes to a redemption vault and holders claim pro rata

if the verifier goes quiet, it resolves no by default. silence is not ambiguity

7/
the part i'd point at

the issuer cannot touch money the market hasn't released

no committee, no vote, no one to chase

real cash flow also lands in a waterfall vault and distributes pro rata, so you're not holding a token you have to sell to get paid

8/
built on meteora dbc, graduates to damm v2. adjudication through panta

every number on the site is a live chain read over grpc. nothing cached, nothing mocked

live on solana mainnet

[demo link] [repo link]
```

Attach the full demo video.

---

### Post 3, why i'm building it

```
why i'm building sluice

i grew up watching the esusu work

twenty people put money in, one person takes the pot, everyone gets a turn. no paperwork, no bank, no collateral

it funds more businesses in nigeria than most people realise

and it only works because everyone knows everyone

the moment you take it online, that's gone. an anonymous wallet has no reputation to lose

so the question i kept circling was: what replaces shame

not a credit score. scores are built on data that doesn't exist for most businesses here

not a committee. committees get captured

a market. people with real information about whether the work got done, putting money on it, and getting paid to be right

that's the whole idea

the oldest financial structure in west africa, with the enforcement swapped for something that survives contact with strangers

[link]
```

---

### Post 4, the numbers

Kept separate on purpose. Stats next to a product announcement bury both.

```
the numbers that made this feel worth building

$331bn of unmet credit demand for smes in sub-saharan africa
$32.2bn of that in nigeria alone
over 40% of smes here name credit access as their single worst constraint

globally the emerging-market sme gap is $5.7tn. nearer $8tn counting informal businesses

meanwhile the tokenised rwa market is funding treasuries and institutional credit

with minimums that start where a nigerian cold chain operator's entire raise ends

source: ifc, msme banking in the digital era, september 2025

the afdb puts the continent-wide figure nearer $421bn, so read it as a range not a fact

[link]
```

---

## Per-Track Posts

Each is written to what that track actually scores. Verify the posting requirement first, per the checklist above.

### Meteora DBC, $20,000 USDC

**No X post required.** Optional, but worth posting because the track rewards mainnet traction and visibility helps.

**Action item that is easy to miss:** if the repository is ever close-sourced, add GitHub user **`dannxbt`** with Read permissions or the submission cannot be judged. Keep the repo public and skip this entirely.

**Sluice touches all five of the idea classes Meteora listed**, which is worth stating plainly in the submission form:

| Meteora asked for | Sluice's answer |
|---|---|
| RWAs | Invoices, royalties and revenue as the core asset class |
| Novel curve or fee configuration | NAV-anchored 16 segment curve, shape derived from the valuation band |
| End-to-end DBC, DAMM v2, DLMM flows | DBC raise, DAMM v2 graduation, autopilot splits the position into a locked floor tranche plus a DLMM ladder |
| Data streams and developer tooling | Public risk terminal, embeddable widget, metered API over gRPC |
| DBC config preset marketplace | Preset marketplace with a 70/30 creator split |

Their stated judging order is depth of integration, technical execution, originality and taste, impact potential, then traction and volume. Write the submission in that order.

Optional post:

```
built sluice natively on meteora dbc

the nav band sets the shape of all 16 curve segments. low bound is where it opens, upper bound is where it steepens

the token-2022 transfer hook enforces jurisdiction policy during the raise, and dbc revokes it automatically at graduation

controlled primary, permissionless secondary, no manual step

then it graduates to damm v2, and the position splits into a locked floor tranche plus a dlmm ladder

rwas, novel curve config, full dbc to damm v2 to dlmm flow, data tooling and a preset marketplace. all of it on the meteora stack

live on mainnet

[demo link] [repo link]
```

### CertiK, $100,000 USDG, 10 places of $10,000

First criterion is security relevance, meaning value at risk and funds handled. Lead with that, not with the idea.

```
submitting sluice to the @CertiK audit credits programme

what's at risk:

eight anchor programs, ~4,200 lines of rust, on solana mainnet

the settlement program holds 100% of user capital. the redemption vault holds everything owed on a failed milestone. the waterfall vault holds real cash flow in transit

together that's ~2,000 lines holding every dollar users have

what's already in place:

treasury is a program-owned account, not an eoa. 3-of-5 multisig, 48h timelock above threshold

fee routing to treasury is atomic, if it fails the transaction reverts

slashing is reachable only through the attestation failure path

verifier silence resolves the tranche to no by default, so there is no stuck state

audited before mainnet is the plan, and this is the budget for it

[repo link]
```

### Panta, $5,000 USDG

**No X post required.** What matters here is the working demo and how clearly the Panta integration is explained, since Panta API integration is their first judging criterion. Submission must be in English.

**Use more of the API than you need, deliberately.** Panta scores integration depth first, and the API exposes more than market creation and trading:

| Panta API capability | Sluice's use |
|---|---|
| Market creation | One binary market per milestone tranche |
| Market data and prices | YES and NO rendered in cents across the app |
| Buying YES or NO positions | Milestone market participation |
| Reading wallet positions | Holder view of adjudication exposure |
| Claim eligibility and claiming | Payouts after resolution |
| Creator fees | Sluice as market creator |
| **Trade attribution and verification** | **Not yet used. Add it, it is the deepest remaining integration and it feeds the risk terminal** |

Trade attribution lets Sluice prove which wallets informed a resolution, which is directly useful for the adjudication record and is the kind of integration depth that separates a first-place from a fourth-place finish.

Prizes: 1st $2,000, 2nd $1,000, 3rd $1,000, 4th $1,000.

```
sluice uses @panta for the part that matters most

every tranche carries one binary question with a machine-checkable answer and a named verifier

the market on that question decides whether the issuer gets the next tranche or holders get their capital back

panta is the default resolver. the interface is pluggable with an internal fallback, because an external market can be thin

resolve yes, tranche releases on schedule
resolve no, capital routes to the redemption vault and holders claim pro rata
verifier goes quiet, resolves no

adjudication is the whole product, and it runs on panta

[demo link]
```

### Solami, $3,000 USDG

This track requires the project to run live, not merely to have users. Say that plainly.

```
sluice is live on solana mainnet for the @solami_ track

you can issue, invest and adjudicate right now

the adjudication screen is the one to look at. live binary market on a real milestone, countdown ticking, resolution path visible

every number is a chain read over grpc. nothing cached, nothing mocked

[live link] [repo link]
```

### RPC Fast, ~$500 in credits, 21 places

**Not one post. This is a two-month cadence of 2 to 3 posts per month, so plan 6.** Judges score consistency and quality of engagement, not a single announcement. Bonus credit goes for quoting and replying to RPC Fast's own posts and for educational content, so mix in replies, not just broadcasts.

Also required: follow @rpcfast, join their Telegram and Discord, and fill in the Focus plan application form.

**Month 1, post 1, infrastructure use:**

```
running sluice on @rpcfast solana mainnet rpc and the yellowstone firehose

every number on the site is a streamed account read, not a poll

issuance accounts, milestone accounts and settlement accounts are all subscribed

when a milestone resolves the interface updates without a refresh, and the value counts up rather than jumping

no setInterval anywhere in the codebase

[live link] [repo link]
```

**Month 1, post 2, educational:**

```
how sluice stays in sync without polling

grpc first, draining accounts the moment they land

websocket accountSubscribe if the stream drops

15s poll as a last resort, and it logs a warning so i can see i degraded

most stack tutorials stop at the happy path. the fallback chain is the part that keeps a terminal honest at 2am

running on @rpcfast mainnet endpoints out of frankfurt

[repo link]
```

**Month 1, post 3, progress:**

```
week two on @rpcfast

the adjudication screen now updates live as the milestone market moves, no refresh

latency from resolution to the interface updating is under a second

next is the redemption vault claim flow, which is the part i'm most nervous about getting right

[live link]
```

**Month 2, post 4, technical:**

```
measured stream health on @rpcfast this week

account updates landing in [x]ms median
reconnect gap closed by slot replay, so nothing is missed during a drop
zero degraded-to-poll events across [x] days

for a product that moves people's money, a silent stall is worse than a crash. the poll fallback exists so degradation is visible rather than invisible

[repo link]
```

**Month 2, post 5, use case:**

```
what sluice actually uses the firehose for

not a token call. three account families subscribed and filtered server side so i only pull what i asked for

issuance state, milestone markets, settlement accounts

that's the entire data path for a terminal that has to show live NAV, live market odds in cents, and live redemption vault balances

[live link] [repo link]
```

**Month 2, post 6, retrospective:**

```
two months building sluice on @rpcfast

what i'd tell another team picking an endpoint:

filter server side, pulling the whole firehose will drown you
build the fallback chain on day one, not after your first outage
log every degradation, silent failure is the expensive kind

three months of uptime, one reconnect, no data loss

[live link] [repo link]
```

**Engagement, ongoing and not optional here:** quote and repost RPC Fast announcements, reply in their Telegram and Discord, and answer other builders' questions in those channels. The judging criteria names this explicitly.

### Superteam Nigeria, $5,000

**No X post required.** The obligations are different and easy to miss:

- Register on the Colosseum platform and mark **Nigeria** as your country
- Submit into the **Solana ecosystem track**, also marking Nigeria
- Provide a working product or prototype
- **Attend at least 3 pitch reviews, then demo day**

Judging mirrors the global criteria: product functionality, potential impact, novelty, UX, **whether or not open-sourced**, and business plan.

**That open-source criterion is a scoring item, not a preference.** Keep the repository public. It also removes the Meteora `dannxbt` access requirement at the same time.

```
building sluice from port harcourt for @SuperteamNG

built on the esusu, the rotating savings groups that have funded west african businesses longer than any bank has

twenty people, one pot, everyone takes a turn

it works because everyone knows everyone

i kept the structure and replaced the enforcement with a market, so it survives contact with strangers

called it sluice because capital sits behind a gate until the work is proven, then it opens

$32.2bn of unmet sme credit demand in nigeria alone, and the tokenised rwa market has minimums that start where a nigerian cold chain operator's whole raise ends

prototype is live on mainnet

[demo link]
```

### Adevar Labs, $4,000 in kind

**This is a hard requirement, and Adevar supplies the copy.** Use it close to verbatim rather than substituting something clever, because the sponsor wrote it and recognising it is the point. Follow @AdevarLabs before posting.

Required post:

```
Just submitted our project to the @AdevarLabs Security Sidetrack on @superteamearn for @Colosseum's Crypto World's Fair Hackathon

Excited for the chance to receive a full security Pre-Audit for our project.

[project link]
```

Optional follow-up, later in the week rather than the same day. Adevar judges on codebase complexity and architectural clarity, so the substance helps:

```
what we'd want @AdevarLabs to look hardest at

eight anchor programs, ~4,200 lines of rust on solana

the settlement program holds 100% of user capital
the redemption vault holds everything owed on a failed milestone
the waterfall vault holds real cash flow in transit

~2,000 of those lines hold every dollar

treasury is a program-owned account, 3-of-5 multisig, 48h timelock
fee routing to treasury is atomic, if it fails the transaction reverts
slashing is reachable only through the attestation failure path
verifier silence resolves the tranche to no, so there is no stuck state

[repo link]
```

### Superteam Malaysia x Solami, $2,000 USDG

```
sluice, live on solana mainnet, for the @SuperteamMY x @solami_ track

issues real-world cash flow as tokens. a binary market adjudicates every milestone before capital releases

live, not a demo build

[live link] [repo link]
```

### Superteam Kazakhstan x KASE, $2,000 USDG

KASE is a stock exchange, so lead with the tokenised-securities angle rather than the West African framing.

```
submitting sluice for the @SuperteamKZ x KASE track

it's a rail for issuing regulated real-world assets onchain

transfer rules live in a policy file, not in the program, so a new jurisdiction is a config change rather than a redeploy

raise in usdc or a tokenised stock, enforced by a token-2022 hook that revokes at graduation

live on solana mainnet

[demo link] [repo link]
```

---

## Submission Notes

**Project title:** Sluice

**Tagline:** Issue the real asset. The market decides if you keep the money.

**One-liner for forms:** A protocol for issuing real-world cash flow on Solana, where a binary market adjudicates each milestone and capital releases only when it resolves in the issuer's favour.

**Built with:**
- Rust, Anchor 0.29.0, Solana 1.17.34
- Meteora DBC, DAMM v2, DLMM
- Panta for adjudication, pluggable with an internal fallback
- Token-2022 transfer hooks
- Yellowstone gRPC for all reads
- Next.js 14, TypeScript, Tailwind, motion/react
- Privy for issuer onboarding, Solana wallet adapter for investors
- Stripe for data API billing only

**Project description, under 200 words:**

Sluice issues claims on real-world cash flow, invoices, royalties and revenue, as tokens on Solana. An issuer receives a NAV band from a valuation model, and that band sets the shape of a sixteen segment Meteora DBC bonding curve, so the opening price is anchored to something real. A Token-2022 transfer hook enforces the issuing jurisdiction's policy during the raise, and DBC revokes it automatically at graduation, leaving a controlled primary distribution and a permissionless secondary market. Each tranche of capital is tied to a single binary question with a machine-checkable answer and a named verifier. A market opens on that question. If it resolves yes, the tranche releases on schedule. If it resolves no, remaining capital routes to a redemption vault and holders claim pro rata. If the verifier fails to report inside the grace window, the tranche resolves no by default. Real cash flow lands in a waterfall vault and distributes pro rata to holders.

**Demo video flow, 4 minutes maximum:**

1. Landing, hero with the live issuance card and the ambient loop (20s)
2. Connect with an email address, no wallet extension, embedded wallet provisions (25s)
3. Open an asset, show price against NAV and the attestation panel with the attestor's name (40s)
4. Adjudication tab, the live binary market on a real milestone, YES and NO priced in cents (45s)
5. Force a resolution, show the settlement branch and the redemption vault claim (50s)
6. Issue wizard, valuation step showing the NAV band driving all 16 curve segments (40s)
7. Terminal, holdings and the value curve, every figure live (25s)
8. End on the wordmark and the mainnet program IDs (15s)

**Posting sequence:**

1. Post 1, the leak, before any detail is public
2. Post 2, the thread, with the demo video, on submission day
3. Adevar required post, same week, using their copy
4. Posts 3 and 4 spaced across the following weeks, never stacked on one day
5. RPC Fast posts 1 to 3 in month one, 4 to 6 in month two, plus replies and quotes throughout

**Checklist:**

Marker meanings are defined in `APP_BLUEPRINT.md` §Hackathon Deliverables Checklist:
`[x]` done, `[~]` partly built with the gap stated, `[!]` cannot be delivered as
written, with the reason. Do not mark a track eligible on the strength of code alone
when that track's criteria require something live.

**Checklist:**

- [x] Public GitHub repo, complete code, README with install and usage
- [!] ~~Deployed on Solana mainnet, all eight programs verified on Solscan~~ **Deviation: devnet.** Deployment is unfunded: 8 programmes cost 6 to 15 SOL in rent-exempt minimum, measured per byte of bytecode with the Solana CLI. Colosseum's rules impose no network requirement, and a Solana track prize funds mainnet outright. State devnet plainly in every submission and post. Full reasoning in `APP_BLUEPRINT.md`.
- [ ] Demo video recorded, under 4 minutes, leading with the adjudication screen
- [ ] Colosseum submission, one product only, three chains selected at registration
- [ ] Adevar post published using their supplied copy, @AdevarLabs followed
- [ ] RPC Fast: @rpcfast followed, Telegram and Discord joined, Focus plan form submitted
- [ ] RPC Fast: 2 to 3 posts per month sustained for two months
- [ ] Superteam NG: registered on Colosseum marking Nigeria, submitted to the Solana ecosystem track
- [ ] Superteam NG: 3 pitch reviews attended, demo day attended
- [~] Panta: working demo plus a written explanation of the API integration, in English. Client, resolver and attribution are written and unit-tested, but **no `PANTA_API_KEY` exists**, so nothing has been exercised against the live API and no market has been created.
- [~] Panta: trade attribution wired in, not just market creation and trading. `reportTrade` is implemented and idempotent, and it is what earns the creator fee. Untested live, for the same reason.
- [ ] Meteora: repo public, or `dannxbt` added with Read permissions
- [ ] Meteora sidetrack, winners by 31 October 2026
- [ ] CertiK submission by 13 October, needs public repo, programs with line counts, 6 to 12 month roadmap, team details, fundraising status, Telegram or email for the scoping call
- [ ] Solami: 2 to 3 minute demo running against live mainnet, public repo with a runnable README
- [ ] Regional and tail tracks: Superteam Malaysia, Kazakhstan with KASE, peaq, AkcaVPN, Solami
