# FRONTEND_SPEC.md — Sluice

Issue real-world assets on Meteora. A binary market adjudicates every milestone, and capital releases only when it resolves in the issuer's favour. Built for Colosseum Crypto World's Fair.

---

## 0. Project Identity

- **Name:** Sluice
- **One-line pitch:** Issue the real asset. The market decides if you keep the money.
- **Aesthetic (Gate 1):** Bento grid operational structure, dark editorial tone
- **Identity Fingerprint (§0C):** asymmetric editorial / refined grotesk / deep dark / cinematic ambient loop on the hero, static noise interior / front-loaded / subtle precision
- **Dials:** DESIGN_VARIANCE 5, MOTION_INTENSITY 3, VISUAL_DENSITY 6 (landing) and 9 (app interior)
- **Category:** A, on-chain product. Wallet signing required to issue, invest and claim.
- **Chain:** Solana. Meteora DBC for issuance, DAMM v2 and DLMM for post-graduation liquidity.
- **Colour strategy:** Restrained. Tinted neutrals plus one accent used on 10% or less of surface.

### Gate decisions, all confirmed

| Gate | Decision |
|---|---|
| 1 Aesthetic | Bento grid operational structure, dark editorial tone |
| 2 Navigation | A2 scroll-morph pill combined with B1 scroll-progress line |
| 3 Background | Option 1b, scroll-linked looping video. Hero only. Static interior. |
| 4 Fonts | Schibsted Grotesk, Inter, Geist Mono |
| 5 Palette | Deep dark with terracotta accent, custom in OKLCH |
| 6 Hero | Asymmetric editorial with live issuance card |
| 7 Sections | Eight content sections plus footer, eight distinct layout families |

---

## 1. Global Design System

### 1.1 Fonts

```css
@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400&family=Inter:wght@300;400;500;600&family=Geist+Mono:wght@400;500;600&display=swap');
```

- `--font-display`: 'Schibsted Grotesk', sans-serif. Headlines and large numerals only. Never body text.
- `--font-body`: 'Inter', sans-serif. Subheads, descriptions, table copy.
- `--font-mono`: 'Geist Mono', monospace. Tickers, addresses, prices, odds, timestamps, labels.

If Geist Mono is unavailable from the CDN, fall back to `'IBM Plex Mono'`. Do not substitute JetBrains Mono or Azeret Mono.

Maximum three families. Never more than three font weights on one page.

### 1.2 Colour System

Composed in OKLCH. Never hardcode hex values in component files, always reference the variable.

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

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  --duration-fast: 120ms;
  --duration-normal: 220ms;
  --duration-slow: 600ms;
}
```

Notes for the builder:

- `--accent` is for fills and rules. `--accent-text` is for accent-coloured text on dark surfaces, because `--accent` alone does not clear 4.5:1 against `--bg-primary`.
- Card radius tops out at `--radius-xl` (16px). Pill radius is for tags and small buttons only, never containers.
- No pure black, no pure white, anywhere.

### 1.3 Semantic Z-Index Scale

```css
:root {
  --z-video: 0;
  --z-scrim: 2;
  --z-grain: 3;
  --z-content: 10;
  --z-raised: 20;
  --z-drawer: 40;
  --z-drawer-scrim: 45;
  --z-nav: 50;
  --z-dropdown: 100;
  --z-modal: 400;
  --z-toast: 500;
}
```

Never use arbitrary values such as 999 or 9999. Every new component takes a named slot.

### 1.4 Motion Primitives

Standard entrance for every section unless a recipe overrides it:

```
initial:    { filter: 'blur(10px)', opacity: 0, y: 20 }
animate:    { filter: 'blur(0px)', opacity: 1, y: 0 }
transition: { duration: 0.8, ease: 'easeOut' }
viewport:   { once: false, amount: 0.1 }
```

Grouped children stagger at `delay: index * 0.12s`, base delay 0.2s.

**Repeatable scroll enforcement, non-negotiable:**

- `viewport={{ once: false, amount: 0.1 }}` on every `whileInView`. `once: true` is banned, zero exceptions.
- `useInView` hooks use `{ once: false, amount: 0.1 }`.
- Scroll-reveal CSS uses transitions, never keyframe animations with `animation-fill-mode: forwards`.
- IntersectionObserver removes the revealed class when the element scrolls fully above the viewport (`boundingClientRect.bottom < 0`), so the animation replays.
- Every animation carries a `@media (prefers-reduced-motion: reduce)` fallback, typically a plain crossfade with zero translate.

Standard easing for all transitions: `cubic-bezier(0.16, 1, 0.3, 1)`.

### 1.5 Grain Overlay

Applied once at app root, fixed, never per section.

```tsx
<div
  className="pointer-events-none fixed inset-0 z-[3] opacity-[0.035]"
  style={{
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    backgroundSize: '128px 128px',
  }}
/>
```

Also add to global CSS:

```css
html { scrollbar-width: none; scroll-behavior: smooth; }
html::-webkit-scrollbar { display: none; }
```

### 1.6 Hero Video Contract (Gate 3, locked: Option 1b)

```
FILE LOCATION
  /public/hero-video.mp4     the loop, 8s, H.264 MP4, 1080p min, under 10MB
  /public/hero-video.webp    poster frame, Squooshed under 500KB

THE ONE RULE THAT MUST NOT BE BROKEN
  The video owns its own timeline. It autoplays and loops continuously.
  Scroll position NEVER touches video.currentTime.
  Scroll drives four CSS properties only: scale, opacity, y, filter(blur).

  If you find yourself writing video.currentTime = anything, you have built
  Technique 9 (scroll-scrubbed). That is not this project. Delete it.

  Do NOT import useVideoScrub. That is the wrong hook for Gate 3 option 1b.
  Do NOT import useFadingVideo. That is Technique 1 (crossfade loop).
```

```tsx
'use client'
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'

/**
 * Renders the hero's ambient loop. The video plays on its own timeline;
 * scroll progress is mapped to visual properties only, never to playback.
 */
export function HeroVideo() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })

  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15])
  const opacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.7, 0.3])
  const y = useTransform(scrollYProgress, [0, 1], [0, -60])
  const blur = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0, 4])
  const filter = useTransform(blur, (v) => `blur(${v}px)`)

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden">
      <motion.video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/hero-video.webp"
        style={{ scale, opacity, y, filter }}
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/hero-video.mp4" type="video/mp4" />
      </motion.video>
    </div>
  )
}
```

| Attribute | Required | Why |
|---|---|---|
| `autoPlay` | yes | 1b runs on its own timeline |
| `loop` | yes | ambient loop, not a one-shot |
| `muted` | yes | browsers block unmuted autoplay |
| `playsInline` | yes | stops iOS fullscreen hijack |
| `preload="auto"` | yes | buffered before scroll begins |
| `poster` | yes | shown while buffering and on fallback paths |

Fallbacks, in precedence order:

1. `prefers-reduced-motion: reduce` → render the poster as a static `<img>`, never mount the video
2. `navigator.connection.effectiveType` slower than 4g → poster only
3. Video fails to load → poster, plus `background-color: var(--bg-primary)` on the wrapper

**Hero only.** No video on any `/app` route. App interior is static: grain, hairlines, colour blocking.

### 1.7 Icon System

Inline SVG or Google Material Icons only.

```html
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
```

Banned: emoji as UI elements, third-party icon libraries including Lucide and Heroicons, raster icons, decorative icon fonts. Every icon-only button carries an `aria-label`.

### 1.8 Live Data Contract

Applies to every number rendered anywhere in the product.

```
TRANSPORT IS PUSH, NOT POLL
  Subscribe to issuance and settlement PDAs over Yellowstone gRPC (Geyser).
  No setInterval. No refetch on mount. No page refresh to see new state.
  Degrade in this order only:
    1. Yellowstone gRPC stream
    2. websocket accountSubscribe on the RPC provider
    3. 15s poll, last resort, logged as a warning

NO CLIENT STORAGE
  No localStorage. No sessionStorage. State lives in the query cache keyed by
  account address. On socket reconnect, refetch once then resubscribe, so a
  dropped connection self-heals with no user action.

SEEDED DEMO
  Served by the indexer behind a featuredIssuance field, never hardcoded in the
  frontend. Toggling demo off must not require a redeploy.
  The demo card and demo rows carry a visible DEMO tag. This is a product
  handling other people's money; unlabelled invented figures are a compliance
  problem, not a design one.

PROMOTION IS AUTOMATIC
  The indexer marks an issuance featured by a deterministic rule: milestone
  still open, soonest settlement timestamp, tie-broken by amount raised.
  When a real issuance qualifies it displaces the demo, the surface re-renders,
  and the DEMO tag disappears. When it settles, the next open issuance takes
  its place. The surface is never empty while any open issuance exists.

VALUES TRANSITION, THEY DO NOT JUMP
  Each figure animates count-up between old and new over 600ms with
  cubic-bezier(0.16, 1, 0.3, 1). Under prefers-reduced-motion, instant.

CONFIRM BEFORE WRITE
  Always confirm the on-chain transaction, then update any off-chain record.
  Never write an off-chain record claiming an on-chain event before confirmation.
```

Seeded demo fixture, consistent with the no-placeholder-data rule:

```
issuer:      Lagos Cold Chain Logistics
ticker:      LCC-01
nav:         ₦412.8m
raised:      68% of ₦180m target
milestone:   YES 74¢ / NO 26¢
settlesIn:   11 days
state:       FUNDED, MILESTONE OPEN
```

---

## 2. Navigation (Gate 2: A2 scroll-morph pill with B1 progress line)

```
NAV SHELL
  Position: fixed top-0 left-0 right-0 z-50
  Initial: bg-transparent border-b border-transparent py-5
  Scrolled (past 80px):
    py-3
    bg-[var(--bg-surface)]/80 backdrop-blur-xl
    border-b border-[var(--border-subtle)]
  Transition: all --duration-normal cubic-bezier(0.16, 1, 0.3, 1)
  Trigger: useScroll, scrollY > 80

  Backdrop blur is applied only because this element is position: fixed.
  Never apply backdrop-filter to elements inside a scrolling container.

PROGRESS LINE (B1)
  Position: absolute bottom-0 left-0 h-px bg-[var(--accent)]
  Width: scaleX from scrollYProgress, transform-origin left
  Element: motion.div with style={{ scaleX: scrollYProgress }}

INNER CONTAINER
  max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between

WORDMARK
  font-display text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)]
  Text: "Sluice"
  Logo slot: HTML comment placeholder. Never substitute a generated mark.
  {/* Logo slot: replace with public/logo.svg once provided */}

CENTRE LINKS (hidden below md)
  flex items-center gap-1
  Each: px-3.5 py-2 rounded-full font-body text-sm text-[var(--text-secondary)]
    hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]
    transition-colors duration-200
  Active state: text-[var(--text-primary)] plus a 4px dot in --accent below the
    label. A colour change alone is not a sufficient active state.
  Links: Mechanism, Marketplace, Adjudication, Compliance

SECTION NAME (appears beside progress line when scrolled)
  font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]
  Updates from an IntersectionObserver on each section[data-section-name]

RIGHT CLUSTER
  Wallet pill, see 2.1. On the landing page this is the Connect Wallet trigger.
  Mobile: hamburger, three spans transitioning to an X over 300ms
```

Mobile overlay:

```
fixed inset-0 z-[45] bg-[var(--bg-primary)]/98 backdrop-blur-sm
Links: font-display text-3xl, stacked, gap-6, px-8, pt-28
Animation: opacity 0 -> 1 over 300ms
Closes on Escape and on link click
```

Scroll behaviour rules, per the skill:

- Never `background: black` on the scrolled nav. Use `--bg-surface` with blur.
- No box shadow on scroll. The 1px border provides separation.
- Active link state must change more than colour: dot plus weight shift.

---

## 2.1 Wallet-Gated Routing and App-Interior Wallet Menu (Mandatory)

Sluice has a wallet-connected interior, so the full contract is explicit.

```
CONNECTION FLOW
  Landing Connect Wallet buttons open a contained modal. The modal owns
  connecting, pending, success and retryable error states.
  Never call wagmi connect() or the Solana adapter connect() directly from a
  button click. Every entry point calls the same openModal handler.

  Modal states:
    idle       explanation of what connecting means, wallet list
    connecting spinner, close button disabled so the user cannot abort
                 mid-approval
    success    brief confirmation, then navigate to /app
    error      rejection reason and a retry button

  All entry points (nav pill, hero primary CTA, final CTA) call openModal.
  None of them connect directly.

APP ROUTE GATE
  /app and every nested route render only while connected.
  During reconnecting, render the branded loading skeleton. Never redirect
  while isReconnecting is true, that causes a false bounce to the landing page.
  After confirmed disconnection, navigate to / with { state: { disconnected: true } }.
  Direct /app deep links with no wallet return the branded landing page,
  never a host 404.

  <Route element={<ProtectedRoute />}>
    <Route path="/app" element={<Terminal />} />
    <Route path="/app/issue" element={<IssueWizard />} />
    <Route path="/app/asset/:ticker" element={<AssetDetail />} />
  </Route>

CONNECTED WALLET PILL (app interior only)
  Fixed top-right. Green live-status dot, truncated address in mono, chevron
  rotating 180deg when open.
  aria-expanded and aria-haspopup="menu" required.
  Clicking opens the menu. It must never disconnect immediately.

WALLET MENU
  Glass panel below the pill.
  initial: { opacity: 0, scale: 0.95, y: -6 }
  animate: { opacity: 1, scale: 1, y: 0 }
  exit:    { opacity: 0, scale: 0.95, y: -6 }
  transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] }
  transformOrigin: 'top right'

  Status header: "WALLET CONNECTED" with the green dot.
  Full address, network (Solana), Active status, copy action, explorer link,
  and a visually distinct DISCONNECT WALLET action in --error.
  Copy swaps to a check for 1.8s then resets.
  Close on outside pointerdown via useRef plus document mousedown listener.
  No backdrop div, it breaks pointer events elsewhere.
  Close on Escape.
  Disconnect navigates to / immediately, then revokes the provider connection.

ERROR CONTAINMENT
  A React error boundary wraps the route outlet. It renders a branded recovery
  screen with retry and return-home actions. It never renders a raw stack trace
  or a blank screen.
  Wallet errors are caught individually: connection rejection, chain switch
  rejection, RPC failure, transaction failure all become an explicit modal or
  inline retry state. A wallet error must never bubble into a route crash and
  must never trigger a redirect unless the provider confirmed disconnection.

DISCONNECT TOAST
  On redirect with location.state.disconnected, show a slide-down toast.
  Auto-dismiss after 4s. Clear router state after reading so a refresh does not
  re-show it.

DEEP-LINK HOST CONFIG (release blocker)
  vercel.json:
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Required acceptance tests before demo:

- Connect from the landing page, confirm navigation to `/app`
- Refresh `/app` while connected, confirm the same route renders, no flash of landing
- Open a nested route such as `/app/asset/LCC-01` in a fresh disconnected session, confirm the branded landing page, never a host 404
- Disconnect from the menu, confirm immediate navigation to `/` with the toast
- Reject a wallet connection, confirm an in-app retry state and that the page stays usable
- Simulate an RPC failure, confirm the error boundary with recovery actions

---

## 2.2 Authentication, Role Selection and the Shared App Interior

### Why this changed

The original split gave issuers email and Google through Privy, and gave investors
self-custody wallets only. That was wrong for two reasons.

First, it withheld the easiest path from the people most likely to abandon. An
investor who has no wallet must leave Sluice, install an extension, create a
wallet, write down a seed phrase, fund it, and come back, before they can buy
anything. Every step of that loses people, and it is the exact friction the
issuer path was designed to avoid. There is no reason an issuer deserves a
smooth onboarding and an investor does not.

Second, hybrid login is the standard, not a luxury. Embedded wallet providers
ship social login, email, SMS, OAuth and external wallet connection in one
surface, and users move between them freely. Presenting wallet-only to half the
product reads as unfinished.

**The rule now: every sign-in method is available to every user, in both roles.**

### Sign-in surface

One screen, two decisions, in this order.

```
STEP 1, ROLE
  "I'm raising"          -> issuer
  "I'm investing"        -> investor
  Both selectable later. Neither is a permission boundary.

STEP 2, METHOD  (identical list for both roles)
  Continue with Google
  Continue with email          -> one-time code
  Connect a wallet             -> Phantom, Solflare, Backpack

  All three provision or link a Solana wallet.
  Embedded wallets are created on first login for Google and email.
  Wallet connection links an existing self-custody wallet.

STEP 3, CUSTODY DISCLOSURE  (shown once on first login)
  "Embedded wallets split your key between you and Privy. Sluice never holds a
   complete key. Funds at rest sit in program-owned accounts, the settlement
   account, the redemption vault and the waterfall vault, never in any wallet,
   embedded or self-custodied."
```

Order matters: role before method. Asking someone to connect a wallet before
telling them why makes the request feel like a demand. Asking what they came to
do first is a normal question.

### Role is a view preference, not an access control

**This is the most important decision in this section.** Role must never be
treated as a permission check.

- The same wallet address can be an issuer and an investor, and most issuers
  will hold positions in their own issuance
- Compliance eligibility is decided on-chain by the transfer hook and the policy
  account, never by a role flag in the interface
- "Issuer" means "show me the issuance surfaces", not "allow me to issue"

**Derive capability from chain state wherever possible.** The interface asks:
does this address own any `Issuance` accounts? If yes, the issuer surfaces
appear on their own, without the user having declared anything. Role selection
then only sets a **default landing view**, and the user can pin the other.

This avoids storing a role as a fact that goes stale the moment someone
legitimately does both.

### One app interior, not two dashboards

**Do not build a separate issuer dashboard and investor dashboard.** They share
the majority of their surface: portfolio value, holdings, asset detail,
adjudication, activity, the wallet menu, the risk terminal. Splitting them means
maintaining the asset page twice and guarantees the two copies drift.

The differences are a short list of issuer-only surfaces:

| Surface | Investor | Issuer |
|---|---|---|
| Portfolio value, holdings, activity | yes | yes |
| Marketplace, asset detail, adjudication | yes | yes |
| My issuances | no | yes |
| Create issuance wizard | no | yes |
| Attestation panel, bond status | no | yes |
| Push a distribution | no | yes |

**Implementation:**

```
/app shell, identical for both roles
  Nav:  Terminal | Marketplace | Adjudication
        + Issue        rendered only when the address owns an Issuance,
                       or when the user has pinned the issuer view
  Default landing tab is set by role choice, overridable at any time
  "Switch to issuer view" lives in the wallet menu, not buried in settings
```

A user who has never issued sees no issuer surfaces and no empty issuer tabs.
A user who has issued sees them automatically, whether or not they chose
"issuer" at sign-up.

### Config

```
appearance: { theme: 'dark', accentColor: 'oklch(0.55 0.18 42)' }
loginMethods: ['google', 'email', 'wallet']
embeddedWallets: {
  createOnLogin: 'users-without-wallets',
  requireUserPasswordOnCreate: false,
  solana: true,
}
```

### State contract

```
ready === false            -> branded skeleton, never redirect
authenticated === false    -> navigate to / with { state: { disconnected: true } }
authenticated === true     -> render outlet
user.wallet.address        -> the active signer, embedded or external
```

`ProtectedRoute` reads `authenticated` and `ready`, never `isConnected`.

Never redirect while `ready` or `isReconnecting` is false. It causes a false
bounce that looks like being logged out.

### Storage carve-out

The no-localStorage rule applies to application state: balances, issuance data,
holdings, form drafts, and the role preference. Privy managing its own session
token is expected auth behaviour, not application state.

**The role preference is stored server-side**, keyed by user id, alongside form
drafts. Do not put it in browser storage on the argument that Privy already
uses some.

### Wallet menu

One row shows the auth method: "Signed in with Google", "Signed in with email",
or "Self-custody wallet". Embedded wallet users additionally see "Link a
self-custody wallet". Issuers see "Switch to investor view", and vice versa.
Disconnect calls Privy logout, then navigates to `/`.

Investors whose balance crosses a configurable threshold are prompted to link a
self-custody wallet. This is a nudge, never a block.

### Acceptance tests

- Sign up as investor with Google, confirm an embedded Solana wallet is
  provisioned and a purchase completes without any extension installed
- Sign up as investor with a self-custody wallet, confirm the same flows work
- Sign up as issuer with email, confirm the wizard is reachable
- Sign up as investor, then create an issuance, confirm the Issue nav item and
  issuer surfaces appear without a role change
- Switch views from the wallet menu, confirm the shell persists and no reload
- Refresh `/app` as an embedded-wallet user, confirm session and route persist
- Confirm no Sluice application data, including role, is in localStorage or
  sessionStorage
- Confirm an address eligible under the compliance policy is never blocked by a
  role flag

---

## 3. Section 1: Hero

**Recipe:** bespoke asymmetric editorial. No direct recipe match, written to Golden Example 3's live-product-in-hero discipline, executed off-grid rather than centred.
**Layout family:** full-viewport hero
**Job:** Hook
**Eyebrow:** none

```
data-section-name="Hero"

SECTION
  relative min-h-[100dvh] overflow-hidden
  background: bg-[var(--bg-primary)]
  Never h-screen. 100dvh avoids the iOS toolbar jump.

LAYER STACK
  z-0:  <HeroVideo />                    see 1.6
  z-2:  text scrim                       see below
  z-3:  grain overlay                    global, see 1.5
  z-10: headline block
  z-20: live issuance card
  z-50: nav                              global

TEXT SCRIM
  absolute inset-0 z-[2] pointer-events-none
  background: linear-gradient(to right,
    var(--bg-primary) 0%,
    color-mix(in oklab, var(--bg-primary) 72%, transparent) 38%,
    transparent 68%)
  This guarantees headline contrast on any frame of the loop without
  constraining the video generation. Measured 16.9:1 on the approved still.

GRID
  relative z-10 mx-auto grid max-w-7xl
  grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10
  px-6 md:px-10 pt-32 pb-20 lg:pt-40 lg:pb-28

LEFT COLUMN (headline block)
  lg:col-span-6 flex flex-col justify-center
  lg:pt-16                        deliberate downward offset

  Headline:
    font-display text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold
    leading-[0.95] tracking-[-0.03em] text-[var(--text-primary)]
    max-w-[16ch] text-balance
    Line 1: "Issue the real asset."
    Line 2: "The market decides if you keep the money."
    Two lines on desktop, no orphan word on the last line.
    Animation: word-by-word blur reveal
      each word: blur(10px) opacity 0 y 24 -> blur(0) opacity 1 y 0
      duration 0.7s, ease easeOut, delay (wordIndex * 90ms), base 0.4s

  Subhead:
    mt-6 max-w-[46ch] font-body text-base md:text-lg
    text-[var(--text-secondary)] leading-relaxed
    Text: "Sluice issues invoices, royalties and revenue as tokens on Meteora.
      A binary market checks every milestone, and capital releases only when it
      resolves in your favour."
    Animation: initial opacity 0 y 16 / animate opacity 1 y 0
      duration 0.7s ease easeOut delay 0.7s

  CTA cluster:
    mt-10 flex flex-wrap items-center gap-4
    Animation: initial opacity 0 y 16 / animate opacity 1 y 0
      duration 0.7s ease easeOut delay 0.9s

    Primary:
      bg-[var(--accent)] text-[var(--bg-primary)] px-7 py-3.5 rounded-full
      font-mono text-sm font-medium tracking-wide
      hover:bg-[var(--accent-hover)]
      hover:shadow-[0_0_30px_oklch(0.55_0.18_42_/_0.22)]
      transition-all duration-200
      Label: "Open the terminal"
      Behaviour: if connected navigate to /app, else openModal

    Secondary:
      border border-[var(--border-default)] text-[var(--text-primary)]
      px-7 py-3.5 rounded-full font-mono text-sm
      hover:border-[var(--accent)] transition-colors duration-200
      Label: "See how settlement works"
      Behaviour: smooth-scroll to section 3

RIGHT COLUMN (live issuance card)
  lg:col-span-6 flex items-center justify-center
  lg:-mt-16                       pulled upward, breaks the shared baseline
  z-20

  Animation: initial opacity 0 y 30 scale 0.96
             animate opacity 1 y 0 scale 1
             duration 0.9s ease [0.16,1,0.3,1] delay 1.1s

  Card shell:
    w-full max-w-[420px]
    bg-[var(--bg-surface)]/70 backdrop-blur-xl
    border border-[var(--border-default)]
    rounded-[--radius-xl] p-6 md:p-7
    shadow-[0_20px_60px_-15px_oklch(0.16_0.008_250_/_0.6)]

  Header row: flex items-center justify-between mb-5
    Issuer: font-body text-sm font-semibold text-[var(--text-primary)]
      Text: "Lagos Cold Chain Logistics"
    Ticker: font-mono text-xs text-[var(--text-muted)] tracking-[0.15em]
      Text: "LCC-01"

  Status tag row: flex items-center gap-2 mb-5
    State pill:
      flex items-center gap-1.5 bg-[var(--accent-glow)]
      border border-[var(--border-default)] rounded-full
      px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em]
      text-[var(--accent-text)]
      Pulsing dot: h-1.5 w-1.5 rounded-full bg-[var(--accent)]
      Text: "FUNDED, MILESTONE OPEN"
    DEMO tag:
      font-mono text-[10px] uppercase tracking-[0.15em]
      border border-[var(--border-default)] rounded-full px-2 py-1
      text-[var(--text-muted)]
      Text: "DEMO"
      Rendered only while the featured issuance is the seeded fixture.

  Data rows, each:
    flex items-center justify-between py-3
    border-b border-[var(--border-subtle)] last:border-0
    Label: font-body text-xs text-[var(--text-secondary)]
    Value: font-mono text-sm text-[var(--text-primary)] tabular-nums

    NAV           -> "₦412.8m"
    Raised        -> "68% of ₦180m"
    Milestone     -> "YES 74¢ / NO 26¢"
    Settles in    -> "11 days"

  Milestone bar:
    mt-4 h-1.5 w-full rounded-full bg-[var(--bg-elevated)] overflow-hidden
    Fill: h-full rounded-full bg-[var(--accent)]
      width 74%, transition width 600ms cubic-bezier(0.16,1,0.3,1)
    aria-hidden, the numeric value above is the accessible source of truth

  Footer line:
    mt-5 pt-4 border-t border-[var(--border-subtle)]
    font-body text-[11px] text-[var(--text-muted)] leading-relaxed
    Text: "Every figure below is read live from the settlement account."
```

Responsive: below `lg` the grid stacks and the **card leads**, so live proof is the first thing a judge sees on mobile. Apply `flex-col-reverse` on the wrapper below `lg`.

---

## 4. Section 2: Problem

**Recipe:** `full-width-statement` (COMPOSITION_RECIPES.md, Section D)
**Layout family:** typography statement
**Job:** Hook
**Eyebrow:** none

```
data-section-name="Problem"

SECTION
  py-32 md:py-44 flex items-center
  background: bg-[var(--bg-primary)]

CONTAINER
  w-full px-6 md:px-10

STATEMENT
  font-display text-[clamp(2.5rem,8vw,8rem)] font-extrabold
  leading-[0.95] tracking-tighter text-[var(--text-primary)]
  text-left max-w-[20ch] text-balance
  Text: "Capital should follow proof, not promises."

  Max one line on desktop. If it wraps, reduce the clamp upper bound.
  Animation: word-by-word blur reveal
    each word: blur(8px) opacity 0 y 20 -> blur(0) opacity 1 y 0
    duration 0.6s ease easeOut, stagger (wordIndex * 90ms)

METADATA LINE
  font-mono text-xs tracking-[0.2em] text-[var(--text-muted)] mt-8
  uppercase max-w-[52ch]
  Text: "MOST REAL-WORLD ASSETS NEVER REACH A MARKET. THE ONES THAT DO ARE
    SETTLED ON TRUST ALONE."
  Animation: opacity 0 -> 1, duration 0.6s, delay 0.9s

No images, no cards, no CTAs in this section. It is a breath between dense
sections, per the recipe.
```

---

## 5. Section 3: Mechanism

**Recipe:** `stacked-card-reveal` (COMPOSITION_RECIPES.md, Section D)
**Layout family:** stacked layers
**Job:** Educate
**Eyebrow:** yes, one of two on the page

```
data-section-name="Mechanism"

SECTION
  relative
  background: bg-[var(--bg-primary)]

SECTION HEADER
  max-w-3xl mx-auto px-6 md:px-10 pt-28 pb-14 text-left
  Eyebrow:
    font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent-text)]
    mb-4
    Text: "THE FLOW"
  Heading:
    font-display text-3xl md:text-4xl lg:text-5xl font-bold
    tracking-[-0.02em] leading-tight text-[var(--text-primary)]
    Text: "Five stages from asset to settlement"
  Body:
    mt-4 max-w-[62ch] font-body text-base text-[var(--text-secondary)]
    leading-relaxed
    Text: "Each stage writes to a program on Solana. Nothing in the chain
      depends on the issuer keeping a promise."

CARD STACK
  Five cards. Each:
    sticky top-0 min-h-screen flex items-center justify-center
    px-6 md:px-10

  Card index and stacking:
    card 1: z-10 will-change-transform
    card 2: z-20
    card 3: z-30
    card 4: z-40
    card 5: z-50
    Cards after the first slide up from below the viewport on scroll.
    Cards before the last scale to 0.96 as the next arrives.

  Card inner:
    w-full max-w-3xl
    rounded-[--radius-xl] p-8 md:p-12
    bg-[var(--bg-surface)] border border-[var(--border-subtle)]
    shadow-[0_24px_64px_-20px_oklch(0.16_0.008_250_/_0.7)]

  Card number:
    font-mono text-xs text-[var(--text-muted)] mb-4 tracking-[0.2em]
  Card headline:
    font-display text-2xl md:text-3xl font-bold
    text-[var(--text-primary)] tracking-[-0.02em]
  Card body:
    mt-4 max-w-[55ch] font-body text-base
    text-[var(--text-secondary)] leading-relaxed

CONTENT
  01 VALUE
    "The issuer's financials are valued against comparables, producing a NAV
     band. The band sets the shape of a sixteen segment bonding curve, so the
     opening price is anchored to something real rather than to a vibe."

  02 COMPLY
    "A Token-2022 transfer hook enforces the jurisdiction's policy: who may
     hold, what may be transferred, for how long. The issuer posts a bond.
     On graduation the hook is revoked automatically and the market opens."

  03 RAISE
    "Capital comes in along the curve in USDC or a tokenised stock. Partial
     fills, a market cap fee scheduler and a partner fee split are all
     configured on the same pool."

  04 ADJUDICATE
    "A binary market opens on a single machine-checkable question about the
     milestone. Anyone may trade it. The price is the protocol's only source
     of truth about whether the milestone happened."

  05 SETTLE
    "If the market resolves yes, tranched capital releases to the issuer on
     schedule. If it resolves no, remaining capital routes to a redemption
     vault and holders claim pro rata."

ANIMATION
  Each card enters: initial opacity 0 y 40 -> animate opacity 1 y 0
  duration 0.7s ease [0.16,1,0.3,1]
  Trigger: whileInView, viewport once false amount 0.1
```

---

## 6. Section 4: Live Marketplace

**Recipe:** bespoke dense terminal table. No recipe matches, written to Golden Example specificity.
**Layout family:** content grid
**Job:** Proof
**Eyebrow:** none, section 3 holds the eyebrow and this is within the two-section gap

```
data-section-name="Marketplace"

SECTION
  py-24 md:py-32 px-6 md:px-10
  background: bg-[var(--bg-secondary)]

CONTAINER
  mx-auto max-w-7xl

SECTION HEADER
  flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10
  Heading:
    font-display text-2xl md:text-3xl font-bold
    tracking-[-0.02em] text-[var(--text-primary)]
    Text: "Live issuances"
  Live indicator:
    flex items-center gap-2 font-mono text-[11px] uppercase
    tracking-[0.15em] text-[var(--text-muted)]
    Dot: h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse
    Text: "STREAMING FROM SOLANA"

TABLE (desktop, hidden below md)
  w-full border-collapse
  Header row:
    border-b border-[var(--border-default)]
    Each th: font-mono text-[11px] uppercase tracking-[0.15em]
      text-[var(--text-muted)] text-left py-3 pr-6 font-normal
    Columns: Issuer, NAV, Raised, Milestone, Settles in, State

  Data row:
    border-b border-[var(--border-subtle)]
    transition-colors duration-200
    hover:bg-[var(--bg-elevated)]
    Each td: py-4 pr-6 font-mono text-sm tabular-nums
      text-[var(--text-secondary)]
    Issuer cell: font-body text-sm font-semibold text-[var(--text-primary)]
      with the ticker beneath in font-mono text-[11px] text-[var(--text-muted)]
    Milestone cell: two-part, YES value in --accent-text, NO value in
      text-[var(--text-muted)], separated by a thin divider
    State cell: badge, pill styles below

  State badge:
    font-mono text-[10px] uppercase tracking-[0.15em] rounded-full px-2.5 py-1
    FUNDED:        bg-[var(--accent-glow)] text-[var(--accent-text)]
                   border border-[var(--border-default)]
    ADJUDICATING:  bg-[var(--warning)]/10 text-[var(--warning)]
                   border border-[var(--warning)]/25
    SETTLED:       bg-[var(--success)]/10 text-[var(--success)]
                   border border-[var(--success)]/25
    REDEEMING:     bg-[var(--error)]/10 text-[var(--error)]
                   border border-[var(--error)]/25

  Numeric transitions: every cell animates count-up over 600ms when its value
    changes, cubic-bezier(0.16,1,0.3,1). Instant under reduced motion.

CARD LIST (below md)
  Each row becomes a card:
    rounded-[--radius-lg] border border-[var(--border-subtle)]
    bg-[var(--bg-surface)] p-4 mb-3
    Issuer name and ticker on the first line, state badge right-aligned
    NAV and Raised as a two-column grid beneath
    Milestone odds as a full-width bar, same treatment as the hero card

DATA SOURCE
  Reads from the same subscription as the hero card. See 1.8.
  Seeded demo row carries the DEMO tag in the Issuer cell.

EMPTY STATE
  Only reachable if no issuance exists and demo mode is off.
  py-16 text-center
  font-body text-sm text-[var(--text-secondary)]
  Text: "No open issuances yet. The first one appears here the moment it is
    funded."
  Plus a primary action: "Issue an asset" navigating to /app/issue

LOADING STATE
  Skeleton shimmer rows, never a spinner.
  h-14 rounded-[--radius-md] bg-[var(--bg-elevated)] with the shimmer overlay,
  five rows, animate-shimmer
```

---

## 7. Section 5: Adjudication

**Recipe:** `tabbed-feature-explorer` (COMPOSITION_RECIPES.md, Section D)
**Layout family:** interactive
**Job:** Educate
**Eyebrow:** none

```
data-section-name="Adjudication"

SECTION
  py-24 md:py-32 px-6 md:px-10
  background: bg-[var(--bg-primary)]

CONTAINER
  mx-auto max-w-7xl

SECTION HEADER
  max-w-3xl mb-12
  Heading:
    font-display text-3xl md:text-4xl font-bold tracking-[-0.02em]
    text-[var(--text-primary)]
    Text: "How a milestone is settled"
  Subheading:
    mt-4 max-w-[58ch] font-body text-base text-[var(--text-secondary)]
    leading-relaxed
    Text: "One question, one market, one resolution. The outcome moves capital
      without anyone needing to be trusted."

TAB BAR
  mt-12 flex gap-2 border-b border-[var(--border-subtle)] overflow-x-auto
  Each tab:
    px-5 py-3 font-body text-sm font-medium whitespace-nowrap
    transition-colors duration-200
    Inactive: text-[var(--text-muted)] hover:text-[var(--text-primary)]
    Active: text-[var(--text-primary)]
      border-b-2 border-[var(--accent)] -mb-px
  Tabs: The question, The market, The resolution, The settlement
  aria-selected and role="tab" required

TAB CONTENT
  mt-12 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center
  Animation: AnimatePresence mode="wait"
    initial: { opacity: 0, y: 12, filter: 'blur(6px)' }
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' }
    exit:    { opacity: 0, y: -8, filter: 'blur(4px)' }
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] }
    Exit is shorter than enter, per the exit-faster-than-enter rule.

  LEFT (text)
    Feature title:
      font-display text-2xl md:text-3xl font-bold
      text-[var(--text-primary)] tracking-[-0.02em]
    Feature description:
      mt-4 font-body text-base text-[var(--text-secondary)]
      leading-relaxed max-w-[52ch]

  RIGHT (visual)
    rounded-[--radius-lg] overflow-hidden
    bg-[var(--bg-surface)] border border-[var(--border-subtle)]
    Coded SVG, not a screenshot. See asset brief 12.2.

CONTENT

  Tab 1, THE QUESTION
    Title: "One question, answerable by a machine"
    Body: "Each tranche is tied to a single binary question with a named
      verifier and a deadline. Did the fleet complete four hundred and
      eighty deliveries in the quarter. Did the royalty statement clear
      sixty thousand dollars. Ambiguous questions are rejected at issuance,
      because a market cannot price a question it cannot resolve."
    Visual: a question card showing question text, verifier, deadline and a
      machine-checkable badge.

  Tab 2, THE MARKET
    Title: "Anyone may trade it, so the price means something"
    Body: "A binary market opens on the question. YES and NO are priced in
      cents. There is no committee and no vote. The people closest to the
      asset carry the most information, and the price is where that
      information ends up."
    Visual: an order panel with YES and NO priced in cents, a depth ladder and
      a live mid price.

  Tab 3, THE RESOLUTION
    Title: "Resolution is mechanical, not discretionary"
    Body: "At the deadline the verifier reports, the market resolves, and the
      result is written to the settlement account. If the verifier fails to
      report within the grace window, the tranche resolves no by default and
      capital routes to redemption. Silence is not ambiguity."
    Visual: a timeline showing deadline, verifier report, resolution, and the
      default path when no report arrives.

  Tab 4, THE SETTLEMENT
    Title: "Capital moves the moment it resolves"
    Body: "On yes, the tranche releases to the issuer on its vesting schedule.
      On no, remaining capital goes to the redemption vault and holders claim
      pro rata against what they hold. No negotiation, no recovery process,
      no one to chase."
    Visual: a split diagram, yes branch to release schedule, no branch to the
      redemption vault.
```

---

## 7A. Milestone Market Interface (App Interior)

**Route:** `/app/asset/[ticker]`, Adjudication tab, expanded milestone
**Layout family:** editorial panel, static only. No video on any `/app` route
**Job:** let a holder read the state of a milestone, judge whether the market is
trustworthy, and take a position

### Design intent

The reference points are Polymarket, Kalshi and Jupiter, and the useful ideas
from each are: probability shown in two formats at once, three layers of
progressive disclosure, line charts rather than candlesticks for probability
history, and contract detail surfaced prominently rather than buried.

**Sluice cannot simply adopt any of them.** On a prediction market a wrong price
costs a trader money. On Sluice a wrong resolution releases a tranche, which is
capital leaving the protocol on the strength of a market that may be thin enough
to move cheaply. The interface therefore has one job the references do not:
**it must tell the user how much the market can be trusted.**

That single requirement produces the one element here that has no equivalent in
the references: the confidence indicator.

### Layer 1, the default panel

```
+- MILESTONE 2 OF 4 --------------------------- RESOLVES IN 6d 4h -+

  Did the fleet complete 480 deliveries in Q3 2026?

  +------------------------------+  +---------------------------+
  |  YES              74%        |  |  Probability, 90 days     |
  |  74c                         |  |                           |
  |  [============----  ]        |  |   line chart, one series  |
  |                              |  |   event markers on the    |
  |  NO               26%        |  |   x axis, see below       |
  |  26c                         |  |                           |
  +------------------------------+  +---------------------------+

  [ Buy YES ]   [ Buy NO ]

  You pay $0.74. If the answer is yes, you receive $1.00.
  Fee 0.50% per trade.
```

**Rules for this layer:**

- Probability appears in **both** formats, percentage and cents, always
  together. Users who think in contracts and users who think in odds are not the
  same people
- The payout sentence is always visible and always uses the user's own numbers.
  "You pay $0.74. If yes, you receive $1.00." Never a generic explanation
- YES uses `--success`, NO uses `--error`. Fills and rules only on this panel
- Accented text uses `--accent-text`. `--accent` fails contrast against the
  background and must never be used for text
- The countdown updates without a page refresh, from the gRPC stream
- No order book at this layer. It appears on request only

### The confidence indicator

Placed directly beneath the trade action, before the resolution detail. It is
not collapsible and not hidden behind a tooltip, because a user who cannot see
market depth cannot judge whether a tranche release will be safe.

```
+- Market confidence -------------------------------------------+
|  ●  Moderate                                                  |
|     Volume $84,200     Depth within 5c $12,400     Spread 3c  |
|                                                               |
|     A thin market can be moved cheaply. If this market has    |
|     not reached minimum depth by the deadline, the resolution |
|     is not accepted from it.                                  |
+---------------------------------------------------------------+
```

| State | Condition | Indicator |
|---|---|---|
| Deep | depth at mid above the upper threshold | `--success`, "Deep" |
| Moderate | between the two thresholds | `--accent-text`, "Moderate" |
| Thin | below the lower threshold | `--warning`, "Thin, treat with caution", with the explanatory note |

The explanatory note is required at Thin, and must say what Sluice does about
it: the resolution will not be accepted from a market below the depth floor.
This is a trust element, not a disclaimer. It tells the user the protocol is
protecting them, which is the entire product claim.

**Do not soften the Thin copy.** A user who sees "Thin" and understands it is
better off than one who sees a neutral label and trades blind.

### Resolution detail

Modelled on the way regulated exchanges present contract specifications,
because on Sluice the mechanism is the trust story. Every field below is
visible at Layer 1, never collapsed.

```
  Verifier      AdevarLabs                    named, not anonymous
  Deadline      14 Oct 2026, 00:00 UTC
  Grace         48 hours. Silence resolves NO
  Source        Fleet telematics, monthly statement
  Tranche       $120,000 releases on YES
  Fee           0.50% per trade
```

Field order matters: verifier first, then deadline, then the silence rule. The
silence rule is the one users most need and least expect, so it is stated in
full rather than as a tooltip.

### Layer 2, on request

Probability history with event markers, recent trades, and position sizing.

**Event markers on the chart** are required. A probability move means nothing
without its cause. Markers: question published, verifier named, any verifier
interim update, deadline, report filed, resolved. Each is a thin vertical rule
with a label on hover, using `--border-default`, never the accent.

### Layer 3, power users

Order book, depth ladder, full trade history, position analytics. Collapsed
behind a single disclosure, default closed.

### Animation

Inherits the app interior rule: static surface, grain, hairlines. Values that
change animate from old to new with a short numeric tween. The probability bar
animates on width only. No entrance animation on this panel, because it is a
trading surface and movement here reads as instability.

### Empty and edge states

| State | Treatment |
|---|---|
| No market yet | Show the question and the deadline. Do not show an empty chart |
| Market closed, awaiting report | Freeze the probability, show "Awaiting verifier report", keep the countdown to the grace deadline running |
| Verifier silent past grace | Show "Resolved NO, verifier did not report". Never show a blank outcome |
| Resolved | Show the outcome, the branch taken, and what moved. Never leave the panel in a live state |

### Acceptance tests

- Probability renders in both percentage and cents, and both update together
- The payout sentence reflects the live price, not a hardcoded example
- Confidence state changes correctly when depth crosses each threshold
- Thin state shows the explanatory note, and the note names the depth floor rule
- All six resolution fields are visible without expanding anything
- The countdown survives a gRPC reconnect without resetting
- Awaiting-report and silent-verifier states never render an empty outcome

---

## 8. Section 6: Compliance

**Recipe:** `split-image-text` (COMPOSITION_RECIPES.md), adapted. The image slot becomes a badge stack because no photography fits this content.
**Layout family:** split content
**Job:** Reassure
**Eyebrow:** yes, second and last on the page

```
data-section-name="Compliance"

SECTION
  py-24 md:py-32 px-6 md:px-10
  background: bg-[var(--bg-secondary)]

CONTAINER
  mx-auto grid max-w-6xl grid-cols-1 lg:grid-cols-2
  gap-10 md:gap-16 items-center

LEFT COLUMN
  Eyebrow:
    font-mono text-[11px] uppercase tracking-[0.2em]
    text-[var(--accent-text)] mb-4
    Text: "COMPLIANCE"
  Heading:
    font-display text-3xl md:text-4xl lg:text-[2.75rem] font-bold
    tracking-[-0.02em] leading-tight text-[var(--text-primary)]
    Text: "Jurisdiction is configuration, not code"
  Description:
    mt-5 font-body text-base text-[var(--text-secondary)]
    leading-relaxed max-w-[52ch]
    Text: "Transfer rules live in a policy file, not in the program. A
      Nigerian SEC registered offering and a Reg D 506(c) offering run the
      same rail with different policy. Adding a jurisdiction means shipping a
      file, not redeploying a program."
  Second paragraph:
    mt-4 font-body text-sm text-[var(--text-muted)] leading-relaxed
    max-w-[52ch]
    Text: "Sluice is compliance infrastructure for registered offerings and
      licensed operators. It does not provide legal advice and it is not a
      registered exchange."
  Animation: initial opacity 0 x -20 -> animate opacity 1 x 0
    duration 0.7s ease easeOut delay 0.3s

RIGHT COLUMN
  grid grid-cols-1 sm:grid-cols-2 gap-4
  Animation: initial opacity 0 x 20 -> animate opacity 1 x 0
    duration 0.7s ease easeOut delay 0.5s

  Badge card, each:
    border border-[var(--border-default)] rounded-[--radius-lg] p-5
    bg-[var(--bg-surface)]
    Icon: inline SVG, 20px, stroke currentColor, --accent-text
      No emoji, no icon library
    Label:
      font-mono text-[11px] uppercase tracking-[0.15em]
      text-[var(--text-muted)] mt-3
    Value:
      font-body text-sm text-[var(--text-primary)] mt-1 leading-snug

  Content:
    TRANSFER POLICY  "Token-2022 hook, revoked automatically on graduation"
    ATTESTATION      "NAV attestation signed by a named attestor, timestamped"
    ISSUER BOND      "Posted at issuance, slashable on a failed attestation"
    JURISDICTION     "Policy file per market, versioned and publicly readable"
```

---

## 9. Section 7: Metrics

**Recipe:** `metrics-section` (COMPOSITION_RECIPES.md, Section B)
**Layout family:** metrics
**Job:** Proof
**Eyebrow:** none

```
data-section-name="Metrics"

SECTION
  relative py-24 md:py-32 overflow-hidden
  background: bg-[var(--bg-primary)]

CONTAINER
  relative z-10 px-6 md:px-10 mx-auto max-w-7xl

SUBTITLE
  text-center font-mono text-xs uppercase tracking-[0.2em]
  text-[var(--text-muted)] mb-16
  Text: "LIVE ON SOLANA MAINNET"

METRICS GRID
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-8

METRIC, each
  text-left
  Number:
    font-display text-4xl md:text-5xl font-extrabold
    text-[var(--text-primary)] leading-none tabular-nums
  Label:
    font-mono text-[11px] uppercase tracking-[0.15em]
    text-[var(--text-muted)] mt-3
  Divider (desktop only, between columns):
    border-l border-[var(--border-subtle)] pl-8

  Metrics:
    Capital committed       total USDC raised across all issuances
    Milestones adjudicated  count of resolved binary markets
    Capital released        cumulative on yes resolutions
    Open issuances          count currently in an open state

  Each value is read live per 1.8. Each carries a DEMO tag while seeded.

COUNTER ANIMATION
  Counts from 0 to the fetched value over 1.5s, ease-out.
  Stagger 0.2s per column.
  Trigger: whileInView, viewport once false amount 0.1, so it replays on
  re-entry but the number itself only counts once per page load.
```

---

## 10. Section 8: Final CTA

**Recipe:** bespoke centred crescendo. Deliberately not `footer-video`, so it does not collide with the footer's layout family.
**Layout family:** crescendo
**Job:** Convert
**Eyebrow:** none

```
data-section-name="Final CTA"

SECTION
  relative py-32 md:py-44 flex items-center justify-center overflow-hidden
  background: bg-[var(--bg-primary)]

  The hero loop returns here at low opacity as a fixed background layer.
  It is the same HeroVideo component, mounted a second time with opacity
  capped at 0.18 and no scroll transforms. Reuse the component, do not
  reimplement it.

CONTAINER
  relative z-10 mx-auto max-w-2xl px-6 text-center flex flex-col items-center

HEADING
  font-display text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold
  tracking-[-0.03em] leading-[0.95] text-[var(--text-primary)] text-balance
  Text: "Put your first asset on the rail"
  Animation: blur(10px) opacity 0 y 24 -> blur(0) opacity 1 y 0
    duration 0.8s ease easeOut

SUBTEXT
  mt-5 font-body text-base text-[var(--text-secondary)] max-w-md
  leading-relaxed
  Text: "Connect a wallet, value an asset, and issue against a market that
    checks the work before it releases the money."
  Animation: opacity 0 y 16 -> opacity 1 y 0
    duration 0.7s ease easeOut delay 0.2s

CTA
  mt-9 bg-[var(--accent)] text-[var(--bg-primary)] px-9 py-4 rounded-full
  font-mono text-sm font-medium tracking-wide
  hover:bg-[var(--accent-hover)]
  hover:shadow-[0_0_30px_oklch(0.55_0.18_42_/_0.22)]
  transition-all duration-200
  Label: "Open the terminal"
  Behaviour: if connected navigate to /app, else openModal
  Animation: opacity 0 y 16 -> opacity 1 y 0
    duration 0.7s ease easeOut delay 0.4s
```

---

## 11. Footer

Site chrome, not a content section, so it does not consume a layout family.

```
SECTION
  py-14 px-6 md:px-10 border-t border-[var(--border-subtle)]
  background: bg-[var(--bg-primary)]

CONTAINER
  mx-auto flex max-w-7xl flex-col gap-8
  md:flex-row md:items-center md:justify-between

LEFT
  Wordmark: font-display text-lg font-bold text-[var(--text-primary)]
    Text: "Sluice"
  Attribution: font-body text-xs text-[var(--text-muted)] mt-3 max-w-[42ch]
    Text: "Built for Colosseum Crypto World's Fair. Issuance on Meteora DBC,
      liquidity on DAMM v2 and DLMM."

RIGHT
  Link row: flex flex-wrap gap-x-8 gap-y-3
  Each: font-mono text-[11px] uppercase tracking-[0.15em]
    text-[var(--text-secondary)] hover:text-[var(--accent-text)]
    transition-colors
  Links: Docs, GitHub, X, Program IDs

BOTTOM ROW
  mt-10 pt-6 border-t border-[var(--border-subtle)]
  flex flex-col sm:flex-row justify-between gap-2
  font-mono text-[11px] text-[var(--text-muted)]
  Left: "2026 Sluice"
  Right: "Deployed on Solana mainnet"
```

---

## 12. Asset Briefs

### 12.1 Hero video

```
STATUS: approved
Type: ambient looping video, Gate 3 option 1b
Source: Pinterest reference, reframed through Google Flow to 16:9
Files: /public/hero-video.mp4 (8s, H.264, 1080p min, under 10MB)
       /public/hero-video.webp (poster, under 500KB)
Subject: faceted oxidised copper form, right third, rotating one revolution
         every 12 seconds, warm terracotta light raking across the facets
Background: warm near-black, illumination decaying smoothly leftward
Measured on the approved still:
  left third mean L 18.7, 100% dark, 0% bright
  right third mean L 59.7, 58% dark, 9% bright
  white text contrast on left two-thirds: 16.9:1
Integration: see 1.6. Autoplay, loop, muted, playsInline, preload auto.
             Scroll drives scale, opacity, y and blur only.
```

### 12.2 Adjudication tab visuals

```
STATUS: to be built, coded not sourced
Type: inline SVG components, one per tab
  Tab 1  question card: question text, verifier name, deadline,
         machine-checkable badge
  Tab 2  order panel: YES and NO priced in cents, depth ladder, live mid
  Tab 3  resolution timeline: deadline, verifier report, resolution,
         default no-report path
  Tab 4  settlement split: yes branch to release schedule, no branch to
         redemption vault
Constraints:
  No stock photography. No screenshots of a product that does not exist.
  Reference the Jupiter Predict cents pattern from the UI study for tab 2.
  Stroke 1.5, currentColor, accent on the active branch only.
  Each SVG carries role="img" and an aria-label describing the flow.
Rationale: per FRONTEND_SKILL Step 13, a platform with no user content yet
  uses coded SVG as its visual content. The code is the art.
```

### 12.3 Logo and favicon

```
STATUS: not supplied
Neither exists. Leave both as plain comment slots.
{/* Logo slot: replace with public/logo.svg once provided */}
<!-- Favicon slot: replace with public/favicon.ico once provided -->
Never substitute a hardcoded placeholder, a generated icon or an emoji.
```

---

## 13. Responsive Summary

- Breakpoints: `sm` 640, `md` 768, `lg` 1024, `xl` 1280
- Hero grid stacks below `lg`, card leads via `flex-col-reverse`
- Marketplace table becomes a card list below `md`
- Adjudication tab bar scrolls horizontally below `md`
- Metrics grid: 1 column below `md`, 2 at `md`, 4 at `lg`
- Nav centre links hidden below `md`, hamburger takes over
- Wallet pill drops to `px-3.5 py-2` and truncates address below `md`
- Every headline steps through at least three breakpoints, no bare `text-7xl`
- Touch targets minimum 44x44px
- Hero uses `min-h-[100dvh]`, never `h-screen`

## 14. Accessibility Contract

- Colour contrast 4.5:1 normal text, 3:1 large text. `--accent-text` exists
  specifically because `--accent` does not clear 4.5:1 on `--bg-primary`
- Visible focus rings on every interactive element, 2px, `--accent-text`
- `:focus-visible` used so keyboard users get rings and mouse users do not
- Every icon-only button has an `aria-label`
- Tab order matches visual reading order
- Skip to main content link is the first focusable element on every page
- Heading hierarchy sequential: one h1, then h2 per section, no skipped levels
- State is never conveyed by colour alone. Every status badge pairs colour with
  a text label
- Form validation fires on blur, not on keystroke. Errors state the cause and
  the fix
- Modal focus moves to the first interactive element on open and returns to
  the trigger on close
- All animations respect `prefers-reduced-motion`

## 16. App Interior Screens

Three routes behind the gate. All static background, grain and hairlines only, no video. Density 9. Every figure live per §1.8.

### 16.1 Terminal (`/app`)

The job is: show a holder what they own, what it is worth, and what is happening to it. The structural answer is a value curve over a selectable range plus a filterable holdings table, because those are the two questions a holder actually asks.

```
HEADER
  px-6 md:px-10 pt-28 pb-8 mx-auto max-w-7xl
  Greeting: font-display text-2xl md:text-3xl font-bold
    text-[var(--text-primary)]
    Text: "Welcome, {truncated address or email local-part}"
    An email-authenticated user sees their email local-part, not an address.
  Portfolio value: mt-2 font-display text-4xl md:text-5xl font-extrabold
    tabular-nums text-[var(--text-primary)]
  Change line: mt-2 font-mono text-sm text-[var(--text-secondary)]
    Text: "+₦18,412 over the selected range"

RANGE SELECTOR
  mt-6 inline-flex rounded-full border border-[var(--border-default)]
  bg-[var(--bg-surface)] p-1 gap-1
  Options: 1D, 1W, 1M, 3M, 1Y, ALL
  Each: px-3.5 py-1.5 rounded-full font-mono text-xs
    transition-colors duration-200
    Inactive: text-[var(--text-muted)] hover:text-[var(--text-primary)]
    Active: bg-[var(--bg-elevated)] text-[var(--text-primary)]
  role="tablist", aria-selected on the active option

VALUE CURVE
  mt-6 rounded-[--radius-lg] border border-[var(--border-subtle)]
  bg-[var(--bg-surface)] p-5 md:p-6
  Coded SVG line chart, no charting library.
    Stroke 1.5px, --accent, area fill --accent-glow
    Baseline grid: three hairlines at --border-subtle
    Y axis: five ticks, font-mono text-[10px] text-[var(--text-muted)]
    X axis: labels per selected range
  Height: h-[220px] md:h-[280px]
  Empty range: flat baseline with the empty-state copy overlaid
  role="img" with an aria-label summarising the range and change

HOLDINGS
  mt-10
  Heading: font-display text-xl font-bold text-[var(--text-primary)]
    Text: "My holdings"
  Filter row: mt-4 flex flex-wrap gap-3
    Asset class select and State select, both:
      bg-[var(--bg-surface)] border border-[var(--border-default)]
      rounded-[--radius-md] px-3 py-2 font-mono text-xs
      text-[var(--text-secondary)]
    Options, asset class: All, Revenue, Royalty, Invoice
    Options, state: All, Funded, Adjudicating, Settled, Redeeming

  Desktop table (hidden below md), columns:
    Asset, Class, Balance, Value, NAV, State
    Same row and badge treatment as §6.
    Asset cell links to /app/asset/:ticker

  Mobile: card list, same treatment as §6.

EMPTY STATE
  py-16 text-center
  font-body text-sm text-[var(--text-secondary)] max-w-[46ch] mx-auto
  Text: "No holdings yet. Once you invest in an issuance it appears here, and
    the value updates as the market repriced the milestone."
  Primary action: "Browse issuances" scrolling to §6
```

### 16.2 Asset Detail (`/app/asset/:ticker`)

The job is: let a holder act on one asset and verify it is real. Three things have to be true on this screen. The holder can act, can see what the asset is worth against its NAV, and can see the milestone being adjudicated right now.

```
ACTION BAR (sticky)
  sticky top-16 z-[20] border-b border-[var(--border-subtle)]
  bg-[var(--bg-primary)]/85 backdrop-blur-xl
  px-6 md:px-10 py-4
  flex items-center justify-between gap-4
  Left: issuer name and ticker
    font-display text-lg font-bold text-[var(--text-primary)]
    font-mono text-xs text-[var(--text-muted)] tracking-[0.15em]
  Right: three actions
    Primary:  bg-[var(--accent)] text-[var(--bg-primary)] px-5 py-2.5
              rounded-full font-mono text-xs font-medium
              hover:bg-[var(--accent-hover)] transition-colors duration-200
              Label: "Invest"
    Secondary: border border-[var(--border-default)]
               text-[var(--text-primary)] px-5 py-2.5 rounded-full
               font-mono text-xs hover:border-[var(--accent)]
               transition-colors duration-200
               Label: "Redeem"
               Disabled with 0.4 opacity and not-allowed cursor unless the
               asset is in a redeemable state
    Tertiary: font-mono text-xs text-[var(--text-secondary)]
              hover:text-[var(--accent-text)] transition-colors
              Label: "Bridge"

HEADER STATS
  px-6 md:px-10 pt-8 pb-6 mx-auto max-w-7xl
  grid grid-cols-2 lg:grid-cols-4 gap-6
  Each: label above, value below
    Label: font-mono text-[11px] uppercase tracking-[0.15em]
           text-[var(--text-muted)]
    Value: font-display text-2xl md:text-3xl font-bold tabular-nums
           text-[var(--text-primary)] mt-1
  Fields: NAV, Token price, Yield, Network

PREMIUM / DISCOUNT CHART
  mt-8 rounded-[--radius-lg] border border-[var(--border-subtle)]
  bg-[var(--bg-surface)] p-5 md:p-6
  Heading: font-body text-sm font-semibold text-[var(--text-primary)]
    Text: "Price against NAV"
  Two lines: token price in --accent, NAV in --text-muted, dashed.
  The gap between them is the point of the chart. Area between the lines
  filled --accent-glow when price is above NAV, --error at 8% when below.
  Legend: two inline swatches with labels, font-mono text-[10px]
  Range selector reuses the 16.1 component.

TAB BAR
  mt-10 border-b border-[var(--border-subtle)]
  flex gap-6 overflow-x-auto
  Tabs: Overview, Adjudication, Attestation, Integrations, Contracts
  Same active and inactive treatment as §7.

TAB 1, OVERVIEW
  grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 mt-8
  Left: font-body text-sm text-[var(--text-secondary)] leading-relaxed
    max-w-[62ch], the issuer's description
  Right: fact table, rows of label and value
    border-t border-[var(--border-subtle)]
    Each row: flex justify-between py-3
      border-b border-[var(--border-subtle)]
      Label font-body text-xs text-[var(--text-secondary)]
      Value font-mono text-xs text-[var(--text-primary)]
    Fields: Issuer, Asset type, Underlying, Attestor, Min investment,
            Liquidity, Eligibility, Accepted stablecoins, Settlement asset

TAB 2, ADJUDICATION
  The screen that wins the demo. Structure: one open question per tranche,
  with the market's current read and the resolution path, in a table that
  separates live from resolved.

  Sub tabs: Live, Resolved. Same pill treatment as the range selector.

  Table columns: Tranche, Question, Market, Closes, Outcome
  Tranche cell: font-mono text-xs text-[var(--text-muted)] tracking-[0.15em]
    Format: LCC-01-T2
  Question cell: font-body text-sm text-[var(--text-primary)] max-w-[42ch]
  Market cell: YES and NO priced in cents
    YES value: font-mono text-sm text-[var(--accent-text)] tabular-nums
    NO value: font-mono text-sm text-[var(--text-muted)] tabular-nums
    Separated by a 1px vertical divider at --border-default
  Closes cell: font-mono text-xs text-[var(--text-secondary)]
  Outcome cell: badge, per §6 state styles

  Live rows additionally show a countdown that ticks without a page refresh,
  driven by the subscription in 1.8.
  Resolved rows show the outcome and the date it resolved.

TAB 3, ATTESTATION
  The proof panel. A NAV figure is only worth something if someone signed it
  and you can see who and when.

  Panel: rounded-[--radius-lg] border border-[var(--border-default)]
    bg-[var(--bg-surface)] p-6 md:p-8
  Heading: font-display text-xl font-bold text-[var(--text-primary)]
    Text: "Proof of NAV"
  Body: mt-2 font-body text-sm text-[var(--text-secondary)] max-w-[54ch]
    Text: "Independent attestation of the underlying asset value. Sluice does
      not attest its own issuances."
  Metrics: mt-6 grid grid-cols-2 md:grid-cols-3 gap-6
    Latest attested NAV, Attested at, Next attestation due
  Attestor block: mt-6 pt-6 border-t border-[var(--border-subtle)]
    flex items-center justify-between
    Left: attestor name and credential
      font-body text-sm font-semibold text-[var(--text-primary)]
      font-mono text-[11px] text-[var(--text-muted)] mt-1
    Right: signature, truncated, with a copy action
      font-mono text-xs text-[var(--text-secondary)]
  Freshness indicator: a dot and a label
    Fresh under 30 days: --success
    Stale 30 to 60 days: --warning
    Lapsed over 60 days: --error, and the Invest action is disabled

TAB 4, INTEGRATIONS
  Table: Protocol, Network, Type
  Rows: Meteora DBC (Solana, Issuance), Meteora DAMM v2 (Solana, Liquidity),
        Meteora DLMM (Solana, Liquidity), Panta (Solana, Adjudication)
  Same table treatment as §6.

TAB 5, CONTRACTS
  Each row: label, truncated address, copy action
  Fields: Mint, Settlement account, Redemption vault, Waterfall vault,
          Bond vault, Curve config, Policy file
  Footer link: "Independent audits" opening the audit report.
  If no audit is complete at submission, the row reads "Audit pending, not yet
  published" in --text-muted. Never fabricate an audit.
```

### 16.3 Issue Wizard (`/app/issue`)

Six steps. Multi-step flows over two steps must show progress, so the step rail is mandatory, never optional.

```
STEP RAIL
  sticky top-16 z-[20] border-b border-[var(--border-subtle)]
  bg-[var(--bg-primary)]/85 backdrop-blur-xl px-6 md:px-10 py-4
  flex items-center gap-2 overflow-x-auto
  Steps: Asset, Valuation, Compliance, Curve, Milestones, Review
  Each: font-mono text-[11px] uppercase tracking-[0.15em]
    Completed: text-[var(--text-secondary)] with a check glyph
    Current: text-[var(--accent-text)] with a 2px underline in --accent
    Upcoming: text-[var(--text-muted)]
  aria-current="step" on the current one

FORM SHELL
  mx-auto max-w-3xl px-6 md:px-10 py-10

FIELD
  Label: font-body text-sm font-medium text-[var(--text-primary)] block mb-2
  Input: w-full bg-[var(--bg-surface)] border border-[var(--border-default)]
    rounded-[--radius-md] px-4 py-3 font-body text-sm
    text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
    outline-none transition-colors duration-200
    focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)]
  Error: mt-2 font-body text-xs text-[var(--error)]
    States the cause and the fix, never "Invalid input"
  Validation fires on blur, never on keystroke

NAVIGATION
  mt-10 flex items-center justify-between
  Back: font-mono text-sm text-[var(--text-secondary)]
    hover:text-[var(--text-primary)] transition-colors
  Continue: bg-[var(--accent)] text-[var(--bg-primary)] px-6 py-3
    rounded-full font-mono text-sm font-medium
    hover:bg-[var(--accent-hover)] transition-colors duration-200
    disabled: opacity 0.4 cursor-not-allowed, with the disabled attribute

AUTOSAVE
  Drafts post to POST /api/drafts on step change and on blur, keyed by user id.
  Never to localStorage. See 2.2.
  Indicator: font-mono text-[11px] text-[var(--text-muted)]
    Text: "Draft saved 14:02" or "Saving..."

STEP 2, VALUATION
  The AI valuation returns a NAV band. The band renders as a 16 segment curve
  preview so the issuer can see what they are committing to before they commit.
  Coded SVG, 16 segments, each a rounded bar whose height follows the curve
  shape, --accent on funded segments and --border-default on unfunded.
  Band overlay: a shaded region between the low and high estimate,
  --accent-glow, with both bounds labelled in mono.
  Copy beneath: "The curve opens at the lower bound and steepens toward the
    upper bound. It is a range, not a promise."

STEP 3, COMPLIANCE
  Jurisdiction select, then the resolved policy renders as a readable summary
  before it is committed: who may hold, transfer restrictions, holding period,
  attestation cadence.
  Text: "Jurisdiction is configuration. Selecting one loads a policy file, it
    does not require a program change."

STEP 5, MILESTONES
  Repeating row group. Each milestone: question, verifier, deadline,
  tranche size.
  A validation rule rejects questions that are not machine-checkable. The
  inline error explains why: "A market cannot price a question it cannot
    resolve. Name a number, a date and a source."
  Add row: dashed border button, border-[var(--border-default)]
    text-[var(--text-secondary)] hover:border-[var(--accent)]
    hover:text-[var(--accent-text)] transition-colors duration-200

STEP 6, REVIEW
  Full read-only summary of all five prior steps.
  Final action: "Issue on Meteora DBC"
  Confirmation modal before signing, stating the irreversible parts: the curve
  config and the milestone questions cannot be changed after launch.
```

---

## 15. Spec Self-Check (Step 3D Rule 7)

- [x] Every element has exact Tailwind classes, no vague descriptions
- [x] Every animation has initial, animate, duration, ease and delay
- [x] Every section declares its z-index against the global scale
- [x] Every section needing imagery has an asset brief
- [x] Every positional and sizing class carries responsive breakpoints
- [x] Composition recipes referenced by name where a match exists, bespoke
      specs written at matching depth where none did
- [x] No placeholder copy. Every headline, subhead, label and value is final
- [x] Wallet connection, hydration, protected routing, redirect, dropdown,
      disconnect and acceptance behaviour explicitly specified
- [x] Eight sections, eight distinct layout families, no family repeated
- [x] Two eyebrows across eight sections, gap of at least two after each
- [x] No `viewport={{ once: true }}` anywhere
- [x] Live data contract specified: push transport, no client storage,
      seeded demo, automatic promotion, count-up transitions
- [x] Hero video contract specifies autoplay, loop, and that scroll never
      touches `currentTime`
- [x] Hybrid auth specified: Privy embedded wallets for issuers, self-custody
      for investors, with custody disclosure and the storage carve-out
- [x] App interior specced at the same depth as the landing: terminal, asset
      detail with five tabs, and the six step issue wizard
- [x] Form autosave conflict resolved in favour of server drafts over
      localStorage
- [x] No em dashes anywhere in this document
- [x] British English throughout
