# BRAND_AND_DOMAIN.md — Sluice

Trademark clearance and domain acquisition. Written 5 October 2026.

---

## Correction to record

An earlier message reported that `sluice.xyz`, `sluice.finance`, `sluice.protocol` and `sluice.build` were all free. **That was wrong.** It was based on HTTP status codes returning no response, which is not a valid availability signal, since a registered domain can serve nothing on port 443.

The check below uses DNS resolution validated against known controls: `google.com`, `sluice.net` and `metamask.io` all resolve, and a random 20-character string does not. That method distinguishes registered from unregistered correctly.

`sluice.xyz` and `sluice.finance` are **registered**, not free.

---

## Trademark search, USPTO

Searched 5 October 2026 via the Justia mirror of the USPTO register. Query: `sluice`. **186 results.**

### Exact match marks

| Mark | Owner | Class | Goods and Services | Status |
|---|---|---|---|---|
| SLUICE | CampusPoint Corporation | 035 | Employment agency services | **Abandoned**, 25 July 2016, no Statement of Use filed |
| SLUICE | American Fruits and Flavors LLC | 032 | Non-carbonated beverages | Filed 1992, status not yet verified |
| SLUICE | American Fruit Processors | 032 | Fruit drink and base | Filed 1991, status not yet verified |
| SLUICE | Southland Corporation | 032 | Fruit-flavoured soft drinks | Filed 1986, status not yet verified |

**The only exact-match mark in a services class is abandoned.** CampusPoint filed it in 2013, received three extensions, and never filed a Statement of Use. It is dead and is not a conflict.

### Compound marks

SLUICE FOX, SLUICE MONKEY, SLUICE GOOSE, SLUICE BOX CITY, SLUICE BOX NEWS, SLUICE BOX MEDIA, SLUICE JUICE, SUPER SLUICE, DOUBLE SLUICE JUICE, SLUICE SETTER, SIDEWINDER SLUICE, JUICY SLUICE, JUICE SLUICE.

Clusters into three industries: **gold panning and mining equipment, beverages and beer, water treatment**. None touch financial services, software or crypto.

The one worth noting is **SLUICE SETTER, Class 009, filed 2015**, digital pitch gauges for sluice boxes. It is in the same class as software but covers measuring apparatus, not software. Low risk.

### Verdict

**SLUICE appears clear for use in financial services, blockchain and software in the United States.** No mark was found in Class 009 software, Class 036 financial services, or Class 042 SaaS.

### What this search is not

- It is a **preliminary screening**, not a clearance search. A clearance search is what a trademark attorney runs before filing, and it covers state registrations, common-law use and marks not in the USPTO database
- Only the first 40 of 186 results were reviewed in detail
- Live or dead status is confirmed only for the CampusPoint mark
- **Nigeria was not searched.** The Nigerian Trademarks Registry has no reliable public online search. Since Nigeria is the beachhead market and Nigeria is a first-to-file jurisdiction, this is the gap that matters most
- UK, EU and other jurisdictions were not searched

---

## Domain availability

DNS-checked 5 October 2026. "No DNS record" strongly suggests available but is not a guarantee, since a domain can be registered and parked with no records. Always confirm at the registrar before relying on it.

### Registered, not available

| Domain | Evidence |
|---|---|
| sluice.com | resolves, 15.197.142.173 |
| sluice.xyz | resolves, 133.130.64.184 |
| sluice.finance | resolves, 192.64.119.52 |
| sluice.app | resolves, 207.207.210.229 |
| sluice.io | resolves, 208.91.197.27 |
| sluice.net | resolves and serves HTTP 200 |
| sluice.dev | resolves, 91.195.240.94 |

### Likely available

| Domain | Notes |
|---|---|
| **sluice.fund** | no DNS record. Best semantic fit for the product |
| **sluice.cash** | no DNS record. Second choice, fits cash-flow claims |
| **sluice.so** | no DNS record. Short, Solana-adjacent |
| sluice.protocol | no DNS record |
| sluice.build | no DNS record |
| sluice.gg | no DNS record |

### Likely available, .com alternatives

| Domain | Notes |
|---|---|
| **sluiceprotocol.com** | no DNS record. Reads as infrastructure |
| **sluicefinance.com** | no DNS record. Reads as financial |
| getsuluice.com | no DNS record |
| sluicexyz.xyz | no DNS record |

---

## Should the name change?

**No.** Two independent reasons, both verified 5 October 2026.

### Reason 1: every major Solana protocol uses a non-.com

Verified live by DNS:

| Protocol | Domain |
|---|---|
| Jupiter | jupiter.ag |
| Meteora | meteora.ag |
| Kamino | kamino.finance |
| Squads | squads.so |
| Sanctum | sanctum.so |
| Pyth | pyth.network |
| Jito | jito.network |
| Drift | drift.trade |
| Raydium | raydium.io |
| Uniswap | uniswap.org |

Not one uses a .com. `sluice.so` or `sluice.fund` is entirely normal for this category. `sluice.so` in particular matches exactly what Squads and Sanctum already do.

### Reason 2: changing the name does not fix it

A .com sweep of 15 alternative names found 13 already registered:

| Available | Taken |
|---|---|
| getsuluice.com | modulus.com, vest.com, cusp.com, weir.com, confluence.com |
| tributary.com | juncture.com, watershed.com, sensus.com, tessera.com, cascade.com |
| | sluiceflow.com, sluicegate.com, sluicelabs.com |

The only two free .com options are `getsuluice.com`, which is a weaker brand than Sluice, and `tributary.com`, which is longer and less distinctive. Switching trades a good name for a marginally better TLD.

## The three alternatives you checked

| Domain | Verdict |
|---|---|
| sluice.co | **Registered, not available.** Resolves to 13.248.169.48, the same address as sluice.net. If Namecheap showed it as available, that was an aftermarket or premium listing, not a standard registration |
| sluice.site | **Available but reject it.** The .site TLD carries a heavy spam and malware reputation. For a product handling people's money this is a trust problem before it is a branding problem |
| sluice.world | **Available but weak.** Generic, and says nothing about finance, issuance or infrastructure |

## Who owns the sluice.com cluster

`sluice.com` redirects to **campuspoint.com**. CampusPoint Corporation is an employment agency, and it is the same company that filed the SLUICE trademark in 2013 and abandoned it in 2016 by never filing a Statement of Use.

This is close to the best possible outcome for a name collision:

- They operate in a completely unrelated industry
- They filed the mark and let it lapse
- They are holding the domains defensively, not using them under a live mark

**Acquisition path.** Once the project has funding, approach CampusPoint about buying `sluice.com`. Abandoned marks paired with parked defensive domains are usually negotiable. Do not attempt this before there is revenue, because expressing interest signals value and raises the price.

## Revised domain recommendation

| Priority | Domain | Why |
|---|---|---|
| Primary | **sluice.fund** | Says exactly what the product does. Credible financial TLD for RWA issuance |
| Secondary | **sluice.so** | Short, Solana-native, matches Squads and Sanctum. Use for links and social handles |
| Defensive | **sluiceprotocol.com** | A .com for people who type it regardless of what is published |

Buy all three. Do not buy more than three.

## Decision, October 2026

**Working choice: `sluice.world` at $0.98 for year one.**

Verified available by DNS. `.world` is a legitimate gTLD in real use, confirmed by `one.world` and `art.world` both resolving. It does not carry the spam reputation that `.top`, `.icu`, `.click` and `.site` do, so this is a defensible pick.

### Is there something better under two dollars?

Yes, depending on whether you actually let it expire after twelve months.

| Domain | Year 1 | Year 2 renewal | 2-year total | Says finance |
|---|---|---|---|---|
| **sluice.world** | **$0.98** | **$52.98** | **$53.96** | no |
| **sluicefund.xyz** | $2.00 | $21.48 | $23.48 | **yes** |
| sluice.link | about $1 to $2 | verify at checkout | verify | no |

Verified sources: `.world` from Namecheap's own listing, $0.98 first year renewing at $52.98. `.xyz` from a pricing survey checked 30 September 2026, $2.00 first year renewing at $21.48. `.link` was not verified, check it at checkout.

**The verdict:**

- **If you genuinely abandon it after twelve months**, `sluice.world` is the cheapest possible entry at $0.98 and the $52.98 never materialises. This is the plan you described, and it works.
- **If there is any chance you keep it into year two**, `sluicefund.xyz` saves $30.48 over two years and actually says "fund" in the name. The extra $1.02 up front is worth it.
- `sluice.world` carries the steepest renewal of every option examined. The whole plan depends on discipline about auto-renew.

### Non-negotiable after purchase

1. **Disable auto-renew the moment you buy it.** Otherwise $0.98 silently becomes $52.98 in twelve months
2. Set a calendar reminder for **month eleven** to decide: renew, migrate, or let it lapse
3. Do not plan on a registrar transfer later. A transfer requires paying a renewal year, so it would cost about $52 anyway
4. Enable WHOIS privacy at checkout, free on Namecheap

### Why `sluice.world` and not `sluicefinance.world`

`sluicefinance.world` was checked and is available. Do not use it.

Every major Solana protocol follows one pattern: **short name plus a descriptive TLD**. Kamino is `kamino.finance`, not `kaminofinance.something`. Drift is `drift.trade`. Jupiter is `jupiter.ag`. The descriptive word belongs in the TLD, never crammed into the name.

| | |
|---|---|
| sluice.world | 12 characters |
| sluicefund.world | 16 characters |
| sluicefinance.world | 19 characters, 58% longer than the shortest option |

Three practical costs to the longer form: more to type, more ways to mistype and lose the traffic, and a worse social handle. `@sluice` beats `@sluicefinance` on X, GitHub and Telegram.

The semantic hint is not worth it. The domain is a placeholder, and the site title, meta description and page copy carry the meaning. When budget allows, `sluice.fund` delivers the same semantic benefit the correct way: short name, descriptive TLD, matching the pattern the majors use.

### Why .world is defensible anyway

The product is positioned as a global protocol with a West African beachhead, against a $5.7tn global emerging-market credit gap. `.world` reads as global ambition, which matches the pitch. It is generic about finance, which is the real weakness, but it is not wrong.

## Buy-later watchlist

All nine verified available by DNS on 5 October 2026. Re-check before purchase, since this data has a shelf life of weeks.

| Domain | Tier | Why |
|---|---|---|
| **sluice.fund** | First upgrade | Says exactly what the product does |
| **sluice.so** | First upgrade | Solana-native, matches Squads and Sanctum |
| **sluiceprotocol.com** | First upgrade | A .com for people who type it regardless |
| sluicefund.com | Strong backup | Best two-word .com available |
| sluicefund.xyz | Strong backup | Cheapest route to a name that says "fund" |
| sluice.link | Backup | Short and credible |
| sluicefund.co | Backup | |
| sluicefinance.com | Backup | |
| sluiceprotocol.fund | Backup | Longest, lowest priority |

**Do not buy more than three of these, ever.** Each is an annual renewal you will forget to pay, and `sluice.fund` plus `sluice.so` already cover the primary and the short-link case.

### Migration plan

| When | Action |
|---|---|
| Now | Buy `sluice.world` at $0.98, disable auto-renew, enable WHOIS privacy |
| Now | Claim X, GitHub and Telegram handles the same day |
| Month 11 | Buy `sluice.fund` and `sluice.so` if budget allows, point DNS there, let `sluice.world` lapse |
| Later | Approach CampusPoint about `sluice.com` |

Handles to claim, which cannot be verified by DNS so check each manually: `x.com/sluice`, `x.com/sluiceworld`, `github.com/sluice`, `github.com/sluiceworld`, `t.me/sluiceworld`.

---

## If the budget is under two dollars right now

Three options, in order of how much sense they make.

### Option A, recommended: free subdomain, zero spend

Skip the purchase entirely for now. Ship on a free subdomain and buy the real domain later.

| Host | Domain | Cost |
|---|---|---|
| Vercel | `sluice.vercel.app` | $0 |

Vercel is already the deployment target in `BUILD_GUIDE.md` Step 3.8, so this is not an extra decision, it is the default with a custom name on it. Free, automatic SSL, and it looks fine on a hackathon submission.

Upgrade to `sluice.fund` when the budget allows. Nothing is wasted and nothing has to be unwound.

### Option B: cheapest credible domain

If a custom domain matters for the submission, these were available at the last check:

| Domain | Note |
|---|---|
| **sluice.link** | Short and credible. Often on promo |
| **sluice.store** | Credible, though it implies commerce rather than finance |
| **sluice.digital** | Credible but generic |
| **sluicefund.xyz** | Reads as "Sluice Fund". .xyz is genuinely used across crypto, unlike the ultra-cheap TLDs below |

Verify the actual price at Namecheap checkout. Registrar pricing changes weekly and only the registrar has authoritative data.

### TLDs to avoid even though they are cheap and available

`sluice.top`, `sluice.icu`, `sluice.click`, `sluice.sbs`, `sluice.cfd`, `sluice.cyou`, `sluice.buzz`, `sluice.monster`.

All are available and all price under two dollars. They are cheap because they carry heavy spam and malware reputations. Some mail providers and browsers flag them outright. For a product asking people to put money into it, a domain that trips spam filters costs more than the two dollars saved.

### The renewal trap, read this before buying any promo domain

A sub-two-dollar price is a **first-year promotion**, not the real price. Typical year-two renewals:

| TLD | Year 1 promo | Year 2 renewal |
|---|---|---|
| .xyz | about $1 | $12 to $15 |
| .link | $1 to $2 | $15 to $20 |
| .store | $1 to $2 | $20 to $30 |
| .cash | $2 to $4 | $25 to $35 |

**Turn auto-renew off on any promo domain.** Otherwise a $1 purchase silently becomes a $25 charge in twelve months, on a domain that was only ever a placeholder.

### Upgrade path

1. Now: `sluice.vercel.app`, or a promo domain with auto-renew disabled
2. When there is budget: buy `sluice.fund` and `sluice.so`
3. Then: approach CampusPoint about `sluice.com`, which they are holding under an abandoned mark

---

## What I could not do

**I cannot register a domain.** Registration requires a payment method and an account at a registrar, and I have neither. No agent can complete this step on your behalf without credentials, and you should not hand registrar credentials to an agent.

What I did instead: produced the verified availability data above and the exact steps below, so either you or your agent can execute it in about fifteen minutes.

---

## Domain registration, step by step

### What to buy

Buy **three** domains, not one:

1. **Primary**, `sluice.fund` or `sluice.cash`. This is the public face and goes on every submission
2. **Defensive**, `sluiceprotocol.com` or `sluicefinance.com`. A `.com` matters because people will type it regardless of what you publish
3. **Typo guard**, `sluice.so` if you took `.fund` or `.cash`, since it is short and cheap

Do not buy more than three. Every extra domain is an annual renewal you will forget to pay.

### Where to buy

| Registrar | Why |
|---|---|
| Cloudflare Registrar | At-cost pricing, no markup, best long-term renewal cost. Requires moving DNS to Cloudflare |
| Porkbun | Cheap, clean interface, includes WHOIS privacy free |
| Namecheap | Most widely used, good support, free WHOIS privacy |

Avoid GoDaddy for the primary domain. Aggressive upsells and expensive renewals after year one.

### Steps

1. Go to the registrar and search each domain to confirm availability at their price. **Confirm here, do not trust the table above as final**
2. Add all three to the cart
3. Enable **WHOIS privacy**, usually free. Without it your name, email and address become public
4. Enable **auto-renew** on the primary domain only. Let the defensive ones lapse if the project changes
5. Enable **registrar lock** on the primary, which prevents unauthorised transfers
6. Set a calendar reminder 30 days before renewal

### Immediately after purchase

7. Add the primary domain to Cloudflare if you did not register there
8. Enable **full strict SSL/TLS** mode in Cloudflare
9. Add a `.dev` or staging subdomain for the build, not the root domain
10. Point Vercel at the primary domain, per `BUILD_GUIDE.md` Step 3.8
11. Register the same name on X, GitHub and Telegram **on the same day**, before announcing anything

### Timing

**Do this before the product is announced publicly.** The Colosseum submission and the X posts in `MARKETING.md` will put the name in front of thousands of people. Registering after that invites someone to buy the matching domain and sell it back.

---

## Trademark filing

### Classes to file

| Class | Covers | Why |
|---|---|---|
| **036** | Financial affairs, monetary affairs, crowdfunding, financial sponsorship | The core business |
| **009** | Downloadable software | The programs and SDK |
| **042** | SaaS, platform as a service | The terminal and API |

File all three if budget allows. If not, **036 first**, since it is the actual business and the one a competitor would contest.

### Where to file

| Jurisdiction | Why | Priority |
|---|---|---|
| **Nigeria** | Beachhead market, first-to-file, and no public search means you cannot assess risk without filing | **Highest** |
| United States | Largest market for crypto capital and the Colosseum judges | High |
| United Kingdom or EU | If you plan to serve either | Medium |

Nigeria is first-to-file, meaning whoever files first owns it regardless of who used it first. Given the product launches there, filing in Nigeria before public launch is more urgent than filing in the US.

### How

1. **Run a proper clearance search first.** Use a trademark attorney. A preliminary screening, which is what this document contains, is not enough to file on
2. File in Nigeria through a Nigerian trademark agent, who must be accredited to the Trademarks Registry under the Federal Ministry of Industry, Trade and Investment
3. File in the US through the USPTO Trademark Center. Budget roughly $350 per class in government fees, plus attorney fees. **Verify the current fee schedule before filing**
4. File an **intent-to-use** application if the product is not live yet. This is exactly the mechanism CampusPoint used and then failed to complete, so set a calendar reminder for the Statement of Use deadline

### The lesson from the CampusPoint mark

They filed in 2013, got published for opposition, received three extensions, and then abandoned it in 2016 by never filing a Statement of Use. The mark died not because anyone opposed it but because they missed a deadline.

**If you file intent-to-use, diary the Statement of Use deadline the day you file.** Extensions are available but each one is a separate fee and a separate thing to forget.

---

## Agent checklist

Tasks your coding agent **can** do:

- [ ] Re-verify domain availability at the chosen registrar, since this document's data has a shelf life
- [ ] Register the same handle on GitHub, X and Telegram once a domain is chosen
- [ ] Update every reference to the old name across all `.md` files if the domain choice changes the brand
- [ ] Add the primary domain to the Vercel project
- [ ] Configure Cloudflare SSL and registrar lock once DNS is delegated

Tasks that require **you**, not the agent:

- [ ] Pay for the domains
- [ ] Pay the trademark filing fees
- [ ] Engage a trademark attorney for the clearance search
- [ ] Engage a Nigerian trademark agent for the Nigerian filing
- [ ] Decide the legal entity jurisdiction, see Part 17 of the ECLIPS funding guide for the BVI, Cayman and Panama comparison

---

## Sources

- USPTO register, searched via the Justia Trademarks mirror on 5 October 2026, query `sluice`, 186 results
- CampusPoint Corporation mark, serial 86139999, full prosecution history retrieved, abandoned 25 July 2016
- Domain availability by DNS resolution on 5 October 2026, method validated against registered and unregistered controls
- Trademark class definitions, USPTO Nice Classification
- Legal entity jurisdiction comparison, Part 17 of the ECLIPS funding guide
