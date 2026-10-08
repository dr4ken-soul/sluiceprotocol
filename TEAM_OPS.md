# TEAM_OPS.md
## Sluice: Internal Operating Manual

**Read this file when** you are working on Sluice and need to know how work is organised, how decisions get made, what standard is expected, or what to do when something breaks.

**Read `PRODUCT_OPS.md` first if you are new.** It explains what Sluice is. This file assumes you already know.

---

## 0. Current Operating State

**This section is deliberately blunt, because the rest of the file depends on it being true.**

**Sluice currently has one builder.** There is no team, no company, no employees, no co-founders, and no established roles. No org chart exists to describe.

Everything below is therefore written in one of two registers, and every section says which it is:

- **Current practice.** What the sole builder actually does today. Real and in force.
- **Proposed structure.** How work *should* be organised once more than one person is involved. A proposal, not a description. Nothing in these sections should be read as a fact about the present.

This file exists so that the operating model is designed deliberately, before it is needed, rather than improvised at the point where a first collaborator arrives and there is no answer to "who decides this?".

**Do not edit any other Sluice document to imply that a team currently exists.** If a future document needs to reference roles, it should cite this file and preserve the current-versus-proposed distinction.

**Status as of 7 October 2026.** Pre-launch. In build for the Colosseum Crypto World's Fair, submission deadline 12 October 2026. No programs written, no frontend built, nothing deployed, no users, no revenue, no audits.

---

## 1. How to Read the Sluice Documentation

Read in this order on day one.

| Order | File | Why |
|---|---|---|
| 1 | `PRODUCT_OPS.md` | What Sluice is, in plain English then in detail |
| 2 | `CLAUDE.md` | Coding rules, design system, prohibited patterns |
| 3 | `FRONTEND_SPEC.md` | The interface, class by class. Read the relevant section before building a component |
| 4 | `APP_BLUEPRINT.md` | Programs, revenue model, data structures |
| 5 | `BUILD_GUIDE.md` | What to build next, in what order |
| 6 | `MARKETING.md` | Positioning and public copy |
| 7 | `BRAND_AND_DOMAIN.md` | Name, trademark, domain and handle decisions |

### 1.1 Which file wins

| Domain | Authority |
|---|---|
| What Sluice is, and how it is described | `PRODUCT_OPS.md` |
| Code structure, rules, design system | `CLAUDE.md` |
| Interface detail | `FRONTEND_SPEC.md` |
| Programs, fees, data structures | `APP_BLUEPRINT.md` |
| Build order and phase scope | `BUILD_GUIDE.md` |
| How work is organised | `TEAM_OPS.md` |

**If two files disagree, fix the disagreement at source.** Do not work around it, and do not quietly follow whichever file suits the task. A contradiction between `APP_BLUEPRINT.md` and `FRONTEND_SPEC.md` is a bug in the documentation, and it should be reported like one.

### 1.2 The rule about mock data

**No placeholder data, ever.** No lorem ipsum, no Acme, no invented round figures, no 99.9%.

Where a seeded demo is required because no live issuance exists, it carries a visible DEMO tag and is replaced automatically the moment real data exists.

This rule exists because Sluice's entire public claim is that every figure is a live chain read. One fabricated number destroys the claim.

---

## 2. Proposed Operating Structure

**Status: PROPOSAL. Not current practice.**

### 2.1 The design principle

Sluice should be organised around **ownership of areas**, not around job titles. One person can own several areas while the project is small; areas do not need headcount to exist.

The reason for this: with a small, distributed, potentially volunteer or part-time group, a title-based structure produces people waiting to be told what to do. An ownership-based structure produces people who know what they are responsible for and can act without a meeting.

### 2.2 Proposed areas of ownership

| Area | Owns | Decisions they make alone |
|---|---|---|
| Protocol | The eight Rust programs | Instruction shape, account layout, error codes, test coverage |
| Frontend | Next.js app, interface implementation | Component structure, state management, performance |
| Design | Visual system, motion, interface copy | Layout, typography, spacing, animation values |
| Data | Indexer, gRPC pipeline, public API | Schema, caching, fallback behaviour |
| Product | What gets built and why, in what order | Feature scope within a phase, user-facing copy |
| Compliance | Jurisdiction policies, attestor network, legal liaison | Policy file contents, attestor vetting criteria |
| Growth | Issuer pipeline, partnerships, X presence | Content, outreach, partnership terms within limits |
| Security | Reviews, audit liaison, key management | Security tooling, review scheduling |

**A note on ownership and single points of failure.** Every area above becomes a bus-factor risk the moment one person owns it alone. Each area should maintain a written handoff note (section 14) even while it has a single owner, because that note is what makes a second person possible.

### 2.3 What one person holding several areas looks like

While the project has one builder, all eight areas are held by that person. That is fine. It becomes a problem when it is invisible, because decisions get made in one head and never written down, and there is no way for anyone to reconstruct why.

**The minimum mitigation:** the decision log in section 3. Any non-obvious decision gets a line in it, with the reasoning, at the time it is made.

---

## 3. Decision Making

### 3.1 Current practice

The sole builder decides everything. There is no process because there is nobody to have one with.

**The one discipline that applies even now:** when a non-obvious decision is made, write it down with its reasoning in the decision log below. This takes ninety seconds and prevents the most common and most expensive failure mode of solo projects, which is relitigating a settled question six weeks later because nobody remembers why it was settled.

### 3.2 Proposed decision framework

**Status: PROPOSAL.**

Most decisions should not need discussion. Classify first, then act.

| Type | Reversible? | Who decides | Process |
|---|---|---|---|
| **Type 1** | Easily reversible, low blast radius | The area owner | Decide and do. Announce afterwards |
| **Type 2** | Reversible but expensive, or affects another area | The area owner, after consulting the affected owner | One async message, a reasonable window for objection, then decide |
| **Type 3** | Effectively irreversible, or touches user funds, compliance or the public story | Founder, with written reasoning | Written proposal, explicit review, recorded outcome |

**The test for Type 3:** does this decision touch money that is not ours, a legal or regulatory position, or something we have said publicly? If yes to any, it is Type 3.

**Disagreement resolution.** Default to the person with the most direct context on the affected area, not to seniority. If that fails, the founder decides, states the reasoning in writing, and the matter is closed. Recorded dissent is welcome and does not require consensus.

### 3.3 Decision log

Every Type 3 decision gets a row here. One line is enough. Reasoning matters more than the decision itself.

| Date | Decision | Type | Reasoning |
|---|---|---|---|
| 2026-10-05 | Binary event market, not futarchy | 3 | Different mechanism. A MetaDAO judge sits on the Colosseum panel |
| 2026-10-05 | Do not copy MetaDAO code | 3 | Their programs are BUSLv1.1, not MIT |
| 2026-10-05 | Fees fixed, never stepped | 3 | Raising rates as a protocol succeeds is backwards. Volume does the work |
| 2026-10-06 | No fee may come from the LP fee | 3 | Drains liquidity, widens spreads, destroys the secondary market |
| 2026-10-06 | No SQL database | 3 | Every figure must be a chain read. A database can drift or contradict the chain |
| 2026-10-06 | Waterfall vault stays in Phase 0 | 3 | Makes the cash flow claim demonstrable, and it earns a fee |
| 2026-10-06 | Keep the repository public | 3 | Superteam Nigeria scores open source. Removes the Meteora judge-access requirement |
| 2026-10-06 | Name: Sluice | 3 | No trademark conflict in relevant classes. Clean across financial and tech classes |
| 2026-10-07 | No deposit exemption | 3 | Sluice has no deposit-only action. Buying is a curve trade. The exemption was inherited from a perp product and described a step that does not exist |
| 2026-10-07 | Minimum raise of $25,000 | 3 | A flat fee needs a floor to sit against. Without one a $200 target pays a 100% fee |
| 2026-10-07 | One app interior, not two dashboards | 3 | Most of the surface is shared. Two dashboards means maintaining the asset page twice |
| 2026-10-07 | All sign-in methods for both roles | 3 | Withholding Google and email from investors forces them to install a wallet first, which loses them |
| 2026-10-07 | Depth floor and resolution delay | 3 | The likeliest failure is not a hack, it is a thin market moved cheaply. These two controls are the answer |

---

## 4. Communication

### 4.1 Current practice

No communication channels exist beyond whatever the builder uses directly. There are no standing meetings, no chat workspace, and no shared calendar.

### 4.2 Proposed communication principles

**Status: PROPOSAL.**

**Default to asynchronous and written.** A distributed, part-time group cannot rely on being online simultaneously, and synchronous time is the scarcest resource a small project has.

**Write decisions down, not just discussions.** A conversation that produces a decision and leaves no record has produced a decision that will be relitigated.

**One channel per purpose.** Discussion, decisions and code review should not happen in the same place, because decisions become unfindable in a stream of conversation.

| Purpose | Channel |
|---|---|
| Discussion and questions | Chat |
| Decisions and changes | Pull requests and this file |
| Bugs and tasks | Issue tracker |
| Anything needing a record | Git |

**Proposed response expectations.** Acknowledge within one working day even if the answer is "I will look at this on Thursday". Silence is what stalls small projects, not slowness.

**No standing meetings by default.** Add one only when a recurring decision genuinely needs synchronous time, and remove it the moment it stops earning its slot.

### 4.3 Public communication

**Current practice.** The X account is `@sluiceprotocol`. Post copy and cadence live in `MARKETING.md`.

**The rules that apply to anything public:**

- Never fabricate an audit status. If no audit is complete, say "Audit pending, not yet published"
- Never claim Sluice is a registered exchange or that it provides legal advice
- Never suggest a Sluice token exists. There is no token and no commitment to one
- Never present projections as results
- Never use suppression-triggering language: price targets, "100x", ticker-and-target pairings
- Put links in the first reply, never in the main post body

---

## 5. Contribution Standards

These apply now, and to any future contributor.

### 5.1 Code

**Rust and Anchor:**

- Doc comments on every instruction, in NatSpec style
- `#[access_control(ctx.accounts.validate())]` followed by `handle(ctx, args)`
- Prefer `has_one` and `address` over generic `constraint`
- Use `associated_token::*` for recipients
- `#[event_cpi]` and `emit_cpi!`, never `emit!`
- **Append new error variants to the end of `#[error_code]` enums.** Anchor error codes are positional. Inserting one in the middle silently breaks every existing client

**TypeScript and React:**

- camelCase throughout
- JSDoc on every function and custom hook
- Reference CSS variables directly. Never hardcode a hex value or raw oklch in a component
- CSS class-based hover states only. No inline `onMouseEnter` or `onMouseLeave`
- All animation from `motion/react`
- Blur-in entrance is the default. Never a plain fadeUp
- Skeleton shimmer for loading. Never a spinner
- Never `localStorage` or `sessionStorage`
- Never JetBrains Mono or Azeret Mono

**Absolute prohibitions:**

- Never hardcode a treasury, founder or program address. Read from environment
- Never write an off-chain record before the on-chain transaction confirms
- Never store application state in browser storage
- Never use a poll loop where a subscription exists
- Never set `video.currentTime` from scroll position
- Never use `viewport={{ once: true }}`

### 5.2 Writing

Applies to copy, labels, comments, JSDoc and the README:

- British English throughout
- No em dashes
- Periods and commas only where necessary
- Short, direct sentences
- No "seamlessly", "powerful", "cutting-edge", "unlock", "elevate"
- No placeholder copy of any kind

### 5.3 Documentation

See section 6.

---

## 6. Documentation Rules

**Current practice.** Documentation is maintained by the sole builder, in the repository, in Markdown, alongside the code.

### 6.1 The principle

**Documentation is part of the product, not a record of it.** A document that is out of date is worse than no document, because it is trusted and wrong.

For Sluice this is not a nicety. The public claim is that every figure is a live chain read, and that claim is only credible if the written material is equally reliable.

### 6.2 Single source of truth

Each fact lives in exactly one file. Other files link to it rather than restating it.

**Why this matters:** the moment a fact appears in two files, they will diverge. This has already happened in this repository, and several contradictions between `APP_BLUEPRINT.md` and the decisions made afterwards are still pending correction (section 16).

### 6.3 When a document must be updated

| Change | Update |
|---|---|
| A fee rate or fee source changes | `APP_BLUEPRINT.md` and `PRODUCT_OPS.md` |
| A program's instructions or accounts change | `APP_BLUEPRINT.md` and `CLAUDE.md` |
| Interface copy, layout or a design value changes | `FRONTEND_SPEC.md` |
| Build order or phase scope changes | `BUILD_GUIDE.md` and `PRODUCT_OPS.md` |
| A Type 3 decision is made | Decision log, section 3.3 |
| A name, handle or domain is settled | `BRAND_AND_DOMAIN.md`, then every file that names it |
| Positioning or public claims change | `MARKETING.md` and `PRODUCT_OPS.md` |
| An integration is added or removed | `PRODUCT_OPS.md` and `CLAUDE.md` |
| Someone joins, leaves, or changes area ownership | This file |

**The rule:** the change is not done until the documentation is updated. A pull request that changes behaviour without changing documentation is incomplete.

### 6.4 Two-level writing

Any document intended to be read by someone outside the project explains concepts in plain English first, then gives technical detail. This is a hard requirement for `PRODUCT_OPS.md`, and good practice everywhere else.

The test: could a competent non-Web3 reader follow the plain-English layer without help, and would an engineer still learn something from the detail layer? If only one is true, the section needs rewriting.

### 6.5 Updating this file

Update this file when:

- Someone joins or leaves, or area ownership changes
- A workflow, standard or ritual changes
- A proposed structure becomes real, at which point move it from "proposed" to "current"
- An operational gap in section 15 is closed

---

## 7. Development Workflow

### 7.1 Current practice

Work proceeds in the build order set out in `BUILD_GUIDE.md`. Phases run 0 through 4, with Phase 0 targeting the 12 October 2026 hackathon deadline.

### 7.2 Proposed workflow

**Status: PROPOSAL.**

**Branches.** `main` is deployable at all times. Work happens on short-lived branches named by intent: `feat/settlement-tranche-release`, `fix/redemption-double-claim`, `docs/fee-provenance`.

**Pull requests.** Every change to `main` goes through a pull request, including documentation. The pull request is the unit of record: if a change is not in a pull request, there is no record of why it was made.

**Pull request contents:**

- What changed, and why
- What was tested, and how
- Documentation updated, or an explicit note that none was needed
- Any new environment variable, with its default

**Merge.** Squash merge, so the history stays readable. Delete the branch after merge.

### 7.3 Review standards

| Change type | Review requirement |
|---|---|
| Documentation, copy, comments | Self-review plus one reviewer |
| Frontend, interface, styling | One reviewer, plus a check against `FRONTEND_SPEC.md` |
| Indexer, API, data layer | One reviewer |
| **Any program handling user funds** | **Two reviewers, mandatory** |
| Fee logic of any kind | **Two reviewers, mandatory** |
| Environment variables, keys, deployment config | Two reviewers, mandatory |

**What a reviewer looks for, in order:**

1. Does it touch user funds? If yes, is the change minimal and is every code path tested?
2. Does it contradict any documented rule in `CLAUDE.md`?
3. Is there a test, and does the test actually assert the behaviour?
4. Is documentation updated?
5. Is there anything unreachable, duplicated, or dead?

**The reviewer's job is not to approve.** It is to try to break the change, and to say so when they cannot.

### 7.4 Testing

- Every program instruction has a passing test on a local validator
- Every fee has a test asserting the exact rate, individually
- **A test asserts no deposit-only path exists.** There is no deposit exemption in Sluice. Buying along the curve must always incur the curve trade fee. This guards against the most expensive possible regression in the codebase, so it must never be removed
- **A test asserts the minimum raise.** An issuance with a target below $25,000 must be rejected at creation
- **A test asserts the issuance fee never exceeds 1% of target**
- The redemption vault reconciles to outstanding claims in every test
- A second claim on the same tranche reverts. This must be tested explicitly
- Fee routing is atomic. A failed routing reverts the transaction, and there is a test for it

---

## 8. Design Workflow

**Current practice.** Design is fully specified in `FRONTEND_SPEC.md` before implementation. Implementation follows the specification rather than the reverse.

### 8.1 Proposed principles

**Status: PROPOSAL.**

**Specification precedes implementation.** A design value that is decided in code rather than in the specification is a value nobody can find later. `FRONTEND_SPEC.md` is authoritative for every class, animation value, z-index and piece of copy.

**The design system is not a suggestion.** The palette, type scale, spacing, radii, durations and z-index scale are fixed. A component that needs a value outside the system is a signal that the system needs extending deliberately, not that the value should be hardcoded.

**Contrast is a gate, not a preference.** On the dark ground, the accent colour does not clear 4.5:1, so accented text must use `--accent-text`. Text on a dark surface uses `--text-primary`. Nothing ships without checking.

**Motion has a purpose.** Animation communicates state changes and hierarchy. It is not decoration, and nothing animates simply because it can.

**Accessibility is part of the definition of done.** Every interactive element is keyboard reachable, has a visible focus state, and carries an accurate accessible name. `prefers-reduced-motion` disables non-essential animation.

### 8.2 Interface review checklist

- Does every figure come from a chain read, with no invented values?
- Is the loading state a shimmer rather than a spinner?
- Are hover states CSS-based rather than inline handlers?
- Does the layout hold at every breakpoint in the responsive summary?
- Is the focus state visible?
- Is any seed or demo data clearly tagged?

---

## 9. Issue Handling

### 9.1 Current practice

Issues are tracked by the builder. There is no shared tracker, no severity taxonomy, and no triage cadence.

### 9.2 Proposed triage

**Status: PROPOSAL.**

| Severity | Definition | Response |
|---|---|---|
| **S1, critical** | User funds at risk, or the product is unusable | Immediate. Drop other work. See section 11 |
| **S2, high** | A core feature is broken, with a workaround | Within 24 hours |
| **S3, normal** | A feature is degraded, or a bug with limited impact | Within the current cycle |
| **S4, low** | Cosmetic, or a nice-to-have | Backlog, with no commitment |

**Anything touching user funds is S1 by default**, even if it looks contained. The cost of over-escalating is a wasted hour. The cost of under-escalating is irreversible.

**Triage is a gate, not a queue.** An issue that is not reproducible is not ready to be worked on. Get the reproduction first.

---

## 10. Escalation

### 10.1 Current practice

There is nobody to escalate to. The sole builder handles everything.

**The one thing that applies now:** if something goes wrong with user funds, stop and write down what happened before trying to fix it. The account written under pressure is the account that is accurate.

### 10.2 Proposed escalation path

**Status: PROPOSAL.**

| Situation | Escalate to | How |
|---|---|---|
| Suspected loss or risk to user funds | Founder, immediately | Direct contact, not a ticket. Do not wait |
| A program behaves differently on mainnet than in tests | Protocol owner plus founder | Direct contact |
| A security report arrives from outside | Founder, before any reply | Direct contact. Never discuss a live vulnerability in a public channel |
| A compliance or legal question | Compliance owner plus external counsel | Written |
| An area owner is unreachable and a decision is blocked | Founder | Direct contact |
| Two owners disagree on a Type 2 decision | Founder, with written reasoning from both | Written |

**Anyone can escalate.** Escalation is not a privilege of seniority, and raising a concern that turns out to be minor is never a mistake.

**Never escalate by staying silent.** An unresolved S1 held by someone who assumes someone else has it is the standard way small projects lose money.

---

## 11. Incident Handling

**Sluice holds user funds, so this section is not aspirational.** It applies from the first deployment, including to a single test issuance on mainnet.

### 11.1 Definitions

- **Incident.** User funds are at risk, were at risk, or the product is materially broken in production
- **Near miss.** A defect that could have caused an incident but did not, usually caught in review or testing

Near misses are worth recording. They are the cheapest warning available.

### 11.2 Response sequence

1. **Contain.** Stop the bleeding before diagnosing. Pause the affected path, freeze the deployment, or disable the entry point
2. **Record the timeline.** What was observed, when, by whom, and what was done. Write it as it happens, from memory it will be wrong
3. **Assess.** How much value is affected, how many users, and is the exposure growing
4. **Communicate.** Internally first, then publicly if users are affected
5. **Fix.** Minimal, targeted, tested
6. **Review.** Why did this happen, and what prevents recurrence

### 11.3 Public communication during an incident

- Say what happened, what is affected, and what is being done
- Give a time for the next update, and meet it even if there is no news
- Never speculate about cause before it is known
- Never minimise. Users forgive slow far more readily than they forgive evasive

### 11.4 Actions requiring multisig

Not executable by any individual, including the founder:

- Withdrawing above the threshold from the treasury
- Changing the founder distribution address
- Changing any fee rate
- Upgrading a program

Each requires 3-of-5 approval and a 48 hour timelock. The timelock exists so holders can see a change coming and act before it lands. It is not a formality.

---

## 12. Release Responsibility

### 12.1 Current practice

The sole builder is responsible for every release.

### 12.2 Proposed release ownership

**Status: PROPOSAL.**

Each release has one named release owner. They do not have to write the code, but they are accountable for the release happening correctly, and they are the person who answers if it does not.

### 12.3 Program release checklist

- [ ] Every instruction tested on a local validator
- [ ] Each fee tested individually, asserting the exact rate
- [ ] No deposit-only path exists; every buy incurs the curve fee
- [ ] Minimum raise of $25,000 enforced at issuance creation
- [ ] Redemption reconciles to outstanding claims
- [ ] Double claim reverts
- [ ] Fee routing is atomic and reverts on failure
- [ ] Sweep is idempotent
- [ ] No hardcoded treasury, founder or program address
- [ ] Approximate line counts updated in `APP_BLUEPRINT.md`
- [ ] Documentation updated

### 12.4 Frontend release checklist

- [ ] No `localStorage` or `sessionStorage`
- [ ] No off-chain record written before the transaction confirms
- [ ] Every figure a live chain read
- [ ] Seed data tagged as DEMO
- [ ] Focus states visible and accessible names accurate
- [ ] `prefers-reduced-motion` honoured
- [ ] Contrast checked on dark surfaces
- [ ] No console errors or warnings

### 12.5 Mainnet deployment

- [ ] Security review complete
- [ ] Multisig configured and tested
- [ ] Timelock verified
- [ ] Environment variables set, with partner fee addresses pointing at the treasury PDA
- [ ] Monitoring and alerting live
- [ ] Rollback plan written, not assumed
- [ ] Depth floor verified: a thin market's resolution is rejected
- [ ] Resolution-to-release delay verified at 48 hours
- [ ] Caps configured per pool, per issuance, and protocol-wide
- [ ] Pause guardian tested, and confirmed unable to block vested claims
- [ ] Dependency list published in the README

**The partner fee addresses matter more than they look.** The DBC and DAMM v2 partner addresses must be the treasury PDA, not a standard wallet. That address *is* the fee claimer. Pointing it at a wallet breaks revenue silently, and the failure is invisible until someone checks.

---

## 13. Access Boundaries

### 13.1 Current practice

The sole builder holds all credentials. There is no separation of access, because there is no second party to separate it from.

**This is a real risk, not a formality.** A single compromised machine currently means full compromise. The mitigations that apply regardless of team size:

- No key material in the repository, in committed files, or in any communication channel
- The treasury is a program-derived address, so no single key can drain it
- Withdrawals above the threshold require multisig and survive a timelock
- Environment variables hold every address, never source code

### 13.2 Proposed access model

**Status: PROPOSAL.**

| Resource | Who has access | Notes |
|---|---|---|
| Repository | Everyone contributing | Public. See section 20 |
| Deployment (Vercel) | Frontend and data owners | |
| RPC providers | Protocol, data and frontend owners | Rate limits are shared |
| Stripe | Founder and one other | Data API billing only. Never touches core transactions |
| Attestor network | Compliance owner | Vetting criteria are theirs to set |
| **Treasury multisig** | **Founder plus four signers, 3-of-5** | No individual, including the founder, can move funds alone |
| **Program upgrade authority** | **Multisig, never an individual key** | |
| **Founder distribution address** | **Founder only** | Changing it requires multisig and timelock |

**Principles:**

- Least privilege. Access is granted for a task and reviewed when the task ends
- No shared accounts. Ever
- Every access grant is written down here with a date
- Departing contributors lose access the same day, not at the end of a notice period

---

## 14. Handoffs

**Handoffs are written, never verbal.** A verbal handoff is a handoff that did not happen.

### 14.1 What a handoff note contains

For any area being handed over, even temporarily:

- What is in progress, and where exactly it stopped
- What is broken or half-finished, stated plainly
- Decisions made that are not yet written down anywhere
- Anything time-sensitive, with the date
- Where the relevant documentation lives

### 14.2 Minimum handoff note

Every area in section 2.2 should maintain a short note with:

- What this area owns
- The current state in one paragraph
- The three things most likely to break
- The one thing a newcomer will get wrong

**Why this matters now, with one builder.** These notes are what make a second person possible. Written at the point of need, under pressure, they will be wrong. Written calmly as you go, they are the difference between a project that can accept help and one that cannot.

---

## 15. Proposed Rituals

**Status: PROPOSAL. No rituals currently exist.**

Cadence for a small distributed group. Every item below is a proposal and should be dropped rather than performed ceremonially.

| Ritual | Cadence | Purpose |
|---|---|---|
| Build review | Weekly | What shipped, what is blocked, what is next |
| Documentation sweep | Fortnightly | Find and kill contradictions between files |
| Security review | Before every release | Checklists in sections 12.3 and 12.4 |
| Incident review | After every incident | Blameless. Why it happened, what prevents recurrence |
| Phase gate | End of each phase | Does the phase meet its bar before the next begins |

**The rule for rituals:** if a ritual stops producing decisions, delete it. A meeting that exists because it is on the calendar is a cost with no return.

---

## 16. Documentation Debt, Resolved

This section previously listed eight contradictions in `APP_BLUEPRINT.md`, where
text written before later decisions had been left in place. They were real, they
made the file disagree with itself, and they were the direct cause of a
reasonable question about whether fees were switched off in Phase 0.

**They are fixed.** All eight were corrected at source in `APP_BLUEPRINT.md` on
7 October 2026:

| Was | Now |
|---|---|
| "Five streams" above a ten-row fee table | "Ten chargeable actions" |
| Phase 0 goal: "fee switch off" | "fees live from the first transaction at the fixed published rates" |
| "Fee routing live at the bootstrapping tier, stepping up automatically" | "No switch, no bootstrapping tier, no step-up at any threshold" |
| Phase 1: "Second fee step-up" | Replaced with the milestone track record |
| "Sensitivity" twice, one of them quoting $52,000 against a table showing $76,125 | One corrected sensitivity paragraph |
| "only four are Phase 0" above a list of five | All six features are Phase 0, autopilot the sole deferral |
| Waterfall vault marked Phase 1 | Phase 0, and removed from the "if time allows" list |
| Build priority called the waterfall vault optional | Mandatory |

**The lesson, which is why this section stays.** Flagging a contradiction is not
the same as fixing it. Documenting known debt and leaving it in place means the
next reader, including the person who wrote it, has to re-derive which version
is true. If a file contradicts a decision, fix the file. Log the change
afterwards if a record is useful, not instead.

Two further corrections were made at the same time, both of which changed
product behaviour rather than just wording:

- **The deposit exemption was removed.** It described an action that does not
  exist in Sluice and created a path by which a buy could escape the curve fee
- **A minimum raise of $25,000 was added.** The flat $200 fee had no floor to
  sit against, so a $200 target would have paid a 100% fee

---

## 17. Known Operational Gaps

What does not exist yet. Stated so nobody assumes otherwise.

| Gap | Consequence |
|---|---|
| No second person | Every area is a single point of failure |
| No issue tracker | Nothing is formally triaged or prioritised |
| No monitoring or alerting | Failures will be discovered by users |
| No security review process | No structured review has been performed |
| No audit | Correct public statement: "Audit pending, not yet published" |
| No incident runbook tested | The sequence in section 11 is unexercised |
| No multisig configured | The 3-of-5 arrangement is designed, not live |
| No legal entity | Compliance and contracting have no vehicle |
| No on-call rotation | Nobody is formally watching anything |
| No contributor agreement | IP and contribution terms are undefined |

**None of these are urgent while Sluice is pre-launch.** They become urgent the moment real user funds are on mainnet.

---

## 18. Onboarding

### 18.1 The minimum a new contributor needs

1. Read `PRODUCT_OPS.md` in full
2. Read `CLAUDE.md` in full
3. Read the relevant section of `FRONTEND_SPEC.md`
4. Read section 5 of this file, the contribution standards
5. Understand the two rules that are never broken: **no mock data**, and **no fee from the LP fee**

### 18.2 First task

A new contributor's first task should be small, real, and shippable in a day. Not a tour of the codebase. Not a trivial fix that teaches nothing.

Good first tasks: a fee test that does not yet exist, a documentation contradiction from section 16, or a single component against an existing specification.

### 18.3 What to tell them explicitly

- Every figure is a chain read. There is no database
- Sluice is not futarchy. Do not use the word
- MetaDAO's programs are BUSLv1.1. Study the architecture, write independently, and say so in the README
- No placeholder data. Not even temporarily
- No em dashes. British English
- There is no team. There is the founder and whoever is helping at that moment. This file is a proposal for how that should work, not a description of how it does

---

## 19. Before Anything Public

A checklist for publishing, submitting, or demoing. Factual accuracy is the product's core claim, so this is a gate.

- [ ] No fabricated figures anywhere
- [ ] No invented audit status
- [ ] No claim to be a registered exchange, or to give legal advice
- [ ] No suggestion that a Sluice token exists
- [ ] No projections presented as results
- [ ] Every statistic sourced and current, with the range footnoted where sources disagree
- [ ] Demo data visibly tagged
- [ ] No suppression-triggering language in any post
- [ ] Links in first replies, not post bodies
- [ ] Naming is consistent: Sluice everywhere, lowercase esusu only for the traditional practice

---

## 20. Repository and Open Source

**Keep the repository public.** Superteam Nigeria scores submissions on whether they are open sourced. A public repository also removes the Meteora requirement to grant a judge read access, which is a hard blocker on the Meteora submission if the repository is closed.

If it is ever made private, that access must be granted manually or the Meteora submission cannot be judged.

**Attribution.** Sluice is independently written. MetaDAO was studied as a reference for architecture. That fact is stated in the README, and it is not a footnote, because their licence is BUSLv1.1 and the distinction matters legally.

---

*Last updated 7 October 2026. Sluice has one builder. Everything below section 1 marked "proposed" is a design for a future operating model, not a description of a current one.*
