# Sluice — Agent Context

## What This Is

Sluice is a protocol for issuing claims on real-world cash flow, invoices, royalties and revenue, as tokens on Solana. An issuer values their asset, configures a compliance policy, raises along a Meteora DBC bonding curve, then hits a milestone. A binary market on that milestone decides what happens next. Resolve yes and the next tranche releases. Resolve no and remaining capital routes to a redemption vault where holders claim pro rata.

Sluice is named for the gate that controls the release of water: capital sits behind it until the market confirms the work, then it opens. The structure underneath is the West African rotating savings association, the esusu, where enforcement is social because everyone knows everyone. Sluice keeps that structure and replaces the enforcement with a priced, tradeable, machine-resolvable market.

Built for Colosseum Crypto World's Fair, September 14 to October 12 2026.

---

## One-Line Pitch

Issue the real asset. The market decides if you keep the money.

---

## Critical Terminology

**Sluice is not futarchy. Never use that word.**

MetaDAO's futarchy runs conditional markets on a token's *future price* and resolves by TWAP. Sluice runs a **binary event market** on a single verifiable fact. Both use markets to decide things. They are different mechanisms.

Use "binary event market", "market-adjudicated milestone", or "adjudication". A MetaDAO judge sits on the Colosseum panel, and getting this wrong in front of the person who builds the former would be expensive.

**MetaDAO's programs are BUSLv1.1, not MIT.** Study them for architecture, never copy code. State in the README that Sluice is independently written and that MetaDAO was studied as a reference.

---

## Source of Truth

| File | Contains |
|---|---|
| `FRONTEND_SPEC.md` | Every class, animation value, z-index and piece of copy. Read the relevant section before writing a component |
| `APP_BLUEPRINT.md` | Market context, program interface, revenue model, data structures, env vars |
| `BUILD_GUIDE.md` | Phased sequencing |
| `MARKETING.md` | X posts and submission copy |
| `BRAND_AND_DOMAIN.md` | Trademark screening, domain availability, registration steps |
| `sluice-ui-and-metadao-study.md` | Reference UI study and the five errors to avoid |

This file is the map, not the territory. Where it says "as specified in X", go and read that file. Do not guess.

---

## MVP Features (all six are Phase 0)

1. **Valuation-anchored curve.** A NAV band sets the shape of a 16 segment DBC curve. Issuer sees it before committing
2. **Compliance transfer hook.** Token-2022 hook enforcing a jurisdiction policy. **DBC revokes it automatically at graduation**, controlled primary, permissionless secondary
3. **Milestone adjudication.** One machine-checkable binary question per tranche, named verifier, deadline. Silence resolves no
4. **Settlement and redemption.** Yes releases the tranche. No routes capital to a redemption vault for pro rata claims
5. **Waterfall vault.** Real-world cash flow distributing pro rata to holders
6. **Public risk terminal.** Every figure a live chain read, plus an embeddable widget and API

Autopilot is the only program deferred past Phase 0, unconditionally.

**Minimum raise is $25,000,** enforced at issuance creation.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind |
| Animation | motion/react |
| Auth, both roles | Privy plus Solana wallet adapter. Google, email, or a self-custody wallet, offered identically to issuers and investors |
| Programs | Rust, Anchor 0.29.0, Solana 1.17.34 |
| Issuance | Meteora DBC `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN` |
| Liquidity | Meteora DAMM v2 `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`, then DLMM |
| Adjudication | Panta, pluggable, internal fallback |
| Data | Yellowstone gRPC. No SQL in MVP |
| Fiat payments | Stripe, data API only |
| Hosting | Vercel |

---

## Project Structure

```
sluice/
├── programs/
│   ├── settlement/          fee claimer, vesting, bond vault, tranche release
│   ├── redemption/          pro rata claims on failed milestones
│   ├── waterfall/           cash flow distribution
│   ├── autopilot/           DAMM v2 position split, DLMM ladder
│   ├── compliance/          transfer hook, attestation registry, policy DSL
│   ├── bond/                issuer bond, slashing
│   ├── verifier/            question validation, resolution, default no
│   └── curve/               NAV-anchored 16 segment config
├── indexer/
│   └── src/
│       ├── grpc.ts          Yellowstone subscription
│       ├── featured.ts      featured issuance selection and demo fixture
│       └── api/             public data API, metered
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                    landing, eight sections
│   │   │   ├── app/page.tsx                terminal
│   │   │   ├── app/asset/[ticker]/page.tsx asset detail, five tabs
│   │   │   ├── app/issue/page.tsx          six step wizard
│   │   │   └── layout.tsx                  Privy provider, grain overlay
│   │   ├── components/
│   │   │   ├── layout/                     Nav, ProtectedRoute, WalletMenu
│   │   │   ├── sections/                   the eight landing sections
│   │   │   ├── terminal/                   holdings, value curve, range selector
│   │   │   └── asset/                      adjudication table, attestation panel
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── styles/globals.css
│   ├── public/
│   │   ├── hero-video.mp4
│   │   ├── hero-video.webp
│   │   ├── logo.svg                        not yet provided, comment slot
│   │   └── favicon.ico                     not yet provided, comment slot
│   └── tailwind.config.ts
├── FRONTEND_SPEC.md
├── APP_BLUEPRINT.md
├── BUILD_GUIDE.md
├── MARKETING.md
└── README.md
```

---

## Design System

All gates confirmed. Do not deviate from any value below.

**Aesthetic:** Bento grid operational structure, dark editorial tone
**Fingerprint:** asymmetric editorial / refined grotesk / deep dark / cinematic ambient loop on the hero, static noise interior / front-loaded / subtle precision
**Dials:** DESIGN_VARIANCE 5, MOTION_INTENSITY 3, VISUAL_DENSITY 6 landing and 9 interior
**Colour strategy:** Restrained. One accent on 10% or less of surface

**Fonts:**
- Display: Schibsted Grotesk
- Body: Inter
- Mono: Geist Mono, falling back to IBM Plex Mono

```css
@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400&family=Inter:wght@300;400;500;600&family=Geist+Mono:wght@400;500;600&display=swap');
```

**Palette:**

```css
:root {
  --bg-primary:     oklch(0.16 0.008 250);
  --bg-secondary:   oklch(0.20 0.009 250);
  --bg-surface:     oklch(0.24 0.010 250);
  --bg-elevated:    oklch(0.29 0.011 250);
  --accent:         oklch(0.55 0.18 42);
  --accent-hover:   oklch(0.62 0.18 42);
  --accent-text:    oklch(0.78 0.12 55);
  --accent-glow:    oklch(0.55 0.18 42 / 0.12);
  --text-primary:   oklch(0.96 0.005 60);
  --text-secondary: oklch(0.74 0.012 60);
  --text-muted:     oklch(0.55 0.014 60);
  --border-subtle:  oklch(0.96 0.005 60 / 0.07);
  --border-default: oklch(0.96 0.005 60 / 0.13);
  --success:        oklch(0.62 0.14 155);
  --warning:        oklch(0.72 0.15 75);
  --error:          oklch(0.58 0.20 25);
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px;
  --duration-fast: 120ms; --duration-normal: 220ms; --duration-slow: 600ms;
}
```

**`--accent` is for fills and rules. `--accent-text` is for accented text.** The accent does not clear 4.5:1 against the background, so accented text must use `--accent-text` or the contrast audit fails.

**Z-index scale:** video 0, scrim 2, grain 3, content 10, raised 20, drawer 40, drawer scrim 45, nav 50, dropdown 100, modal 400, toast 500. Never 999 or 9999.

**Motion primitive:**

```
initial:    { filter: 'blur(10px)', opacity: 0, y: 20 }
animate:    { filter: 'blur(0px)', opacity: 1, y: 0 }
transition: { duration: 0.8, ease: 'easeOut' }
viewport:   { once: false, amount: 0.1 }
```

**Hero:** asymmetric editorial, headline left on columns 1 to 6 offset downward, live issuance card on columns 7 to 12 pulled upward so they never share a baseline. Video at z-0, scrim z-2, grain z-3, headline z-10, card z-20.

**Landing sections, in order:** Hero, Problem, Mechanism, Live marketplace, Adjudication, Compliance, Metrics, Final CTA, Footer. Eight distinct layout families, two eyebrows total on sections 3 and 6.

**App interior:** static only, grain, hairlines, colour blocking. No video on any `/app` route.

---

## Logo and Favicon

Neither exists. Leave both as plain comment slots.

```tsx
{/* Logo slot: replace with public/logo.svg once provided */}
```

```html
<!-- Favicon slot: replace with public/favicon.ico once provided -->
```

Never substitute a hardcoded placeholder, a generated icon or an emoji.

---

## Code Rules

**Rust and Anchor:**
- NatSpec style doc comments on every instruction
- `#[access_control(ctx.accounts.validate())]` then `handle(ctx, args)`
- `has_one` and `address` preferred over generic `constraint`
- `associated_token::*` over `token::*` for recipients
- `#[event_cpi]` and `emit_cpi!`, never `emit!`
- Append new error variants to the **end** of `#[error_code]` enums. Anchor codes are positional and inserting in the middle breaks existing clients
- Never hardcode a treasury, founder or program address. Read from environment

**TypeScript and React:**
- camelCase for all variables and functions
- JSDoc on every function and custom hook
- CSS variables referenced directly, never hardcoded hex or raw oklch in component files
- CSS class-based hover states only, no inline `onMouseEnter` or `onMouseLeave`
- All animation imported from `motion/react`
- Blur-in entrance as the default, never a plain fadeUp
- Skeleton shimmer for loading, never a spinner
- Never `localStorage` or `sessionStorage`
- Never JetBrains Mono or Azeret Mono

**Writing rules, applying to all copy, labels, comments, JSDoc and README:**
- British English throughout
- No em dashes anywhere
- Periods and commas only when necessary
- Short direct sentences. No "seamlessly", "powerful", "cutting-edge", "unlock", "elevate"
- No lorem ipsum or placeholder copy. Every string in FRONTEND_SPEC.md is final
- No placeholder data. No Acme, no 99.9%, no round invented numbers

---

## Never Do These

- Never call Sluice futarchy, and never copy MetaDAO code. BUSLv1.1
- Never set `video.currentTime` from scroll. Gate 3 is option 1b, the video owns its timeline and scroll drives scale, opacity, y and blur only
- Never use `viewport={{ once: true }}`. Zero exceptions
- Never connect a wallet directly from a button click. Every entry point opens the modal
- Never redirect to the landing page while `ready` or `isReconnecting` is false. It causes a false bounce
- Never store application state in `localStorage` or `sessionStorage`. Privy's own session token is auth, not application state
- Never write an off-chain record before the on-chain transaction confirms
- Never hardcode the treasury or founder distribution address
- Never fabricate an audit status. If no audit is complete, say "Audit pending, not yet published"
- Never render an unlabelled invented figure. The seeded demo carries a visible DEMO tag
- Never create a deposit-only path that bypasses the curve trade fee. **There is no deposit exemption.** Buying along the curve is a curve trade and is always charged
- Never allow an issuance with a target below the $25,000 minimum raise
- Never treat the user's role as a permission check. Eligibility is decided on-chain by the transfer hook. The same address is often both issuer and investor
- Never build a separate issuer dashboard. There is one app interior with role-conditional surfaces
- Never claim Sluice is a registered exchange or that it provides legal advice
- Never use emoji as UI icons. Inline SVG or Material Icons only
- Never add a third-party icon library. Lucide and Heroicons are banned

---

## Hackathon Checklist

- Project name: Sluice
- Handles: `sluiceprotocol` on X, GitHub and Telegram. Verified free on X and GitHub, see `BRAND_AND_DOMAIN.md`
- Hackathon: Colosseum Crypto World's Fair, September 14 to October 12 2026
- One product submission per person. Select three chains at registration
- Public GitHub repository with a complete README
- Functional frontend end to end, no mock data
- Deployed on Solana mainnet
- Demo video, 4 minutes maximum

**Keep the repository public.** Superteam Nigeria scores submissions on whether or not they are open-sourced, and a public repo also removes the Meteora requirement to grant `dannxbt` Read access. If it is ever closed, that access must be granted or the Meteora submission cannot be judged.
- Meteora DBC sidetrack, winners by 31 October 2026
- CertiK submission by 13 October. Needs a public repo, programs with approximate line counts, and a 6 to 12 month roadmap
- Panta sidetrack
- Superteam Nigeria, working prototype plus three pitch reviews plus demo day
- X posts, see MARKETING.md
