# Sluice, audit scope

Prepared for CertiK scoping. Everything in this document is either measured from
the repository or stated as a commitment. Nothing is estimated and presented as a
count.

- **Repository:** https://github.com/dr4ken-soul/sluiceprotocol (public)
- **Colosseum submission:** https://colosseum.com/arena/projects/sluice
- **Specification:** the `.md` files at the repository root are authoritative and the
  code follows them. `APP_BLUEPRINT.md` is the contract, `FRONTEND_SPEC.md` is the
  interface contract, `TEAM_OPS.md` §1.1 requires a contradiction between them to be
  reported as a bug rather than resolved silently.

---

## 1. What Sluice is, and who holds the risk

Sluice issues claims on real-world cash flow as tokens on Solana and has a binary
event market adjudicate every milestone instead of the issuer.

The issuer receives a NAV band from a valuation model, which shapes a sixteen
segment Meteora DBC bonding curve. A Token-2022 transfer hook enforces the issuing
jurisdiction's policy during the raise, and the curve revokes it automatically at
graduation. Each tranche of capital is tied to one binary question with a machine
checkable answer and a named verifier. A market opens on the question. If it
resolves yes the tranche releases on schedule. If it resolves no, remaining capital
routes to a redemption vault and holders claim pro rata. If the verifier fails to
report inside the grace window, the tranche resolves no by default.

**The users whose funds are at risk** are holders of a claim token during a raise,
and redeemers claiming against a failed tranche. The issuer holds a slashable bond
and a treasury position. There is no custodial third party in this loop.

**Lead with these three programmes, because they hold 100% of user funds at rest:**

| Programme | Lines | Holds |
|---|---|---|
| settlement | 600 | 100% of user capital between issuance and release |
| redemption | 381 | Everything owed on a failed milestone |
| waterfall | 438 | Real cash flow in transit |

That is 1,419 lines holding the entire balance sheet. It is the smallest slice of
the codebase and the highest security relevance, and a scoping conversation that
does not start there has started in the wrong place.

---

## 2. In scope, with measured line counts

Line counts are `wc -l` over `src/**/*.rs`, excluding test files, measured on
2026-10-12. They are not the approximate figures sometimes quoted.

| Programme | Lines | Role |
|---|---|---|
| settlement | 600 | Fee claimer, vesting, tranche release, treasury routing |
| compliance | 589 | Token-2022 transfer hook, attestation registry, policy files |
| bond | 581 | Issuer bond, slashable only on attestation failure |
| curve | 469 | NAV anchored sixteen segment curve configuration |
| waterfall | 438 | Real cash flow distribution |
| verifier | 431 | Question validation, pluggable resolution, default no |
| autopilot | 393 | DAMM v2 position split, DLMM ladder. Phase 2, auditable scope |
| redemption | 381 | Pro rata claims on failed milestones |
| **Total deployable** | **3,882** | |

Audit scope is the eight Issuance programmes **at the commit hash tagged for audit**,
and it must name that hash. A scope document without one is not a scope document.

### `core-math`, and why it is listed separately

`sluice-core-math` is 1,893 lines and is **not deployable and not in the audit
scope**. It has no Solana dependencies, no accounts, and no funds. It holds the pure
arithmetic that decides where a holder's money goes: the NAV anchored curve
derivation, pro rata entitlement, the jurisdiction policy evaluator, milestone
resolution including the default no path, the claim ledger, and the issuance fee
with its minimum raise.

It is listed here rather than omitted for one reason. It is the highest value per
line in the repository and the part most likely to contain an off by one, and a
reviewer looking only at the eight programmes would never see it. It is worth a
unit test pass and it is worth reading, but "audit this" is the wrong verb because
there is nothing to deploy and nothing to exploit.

It carries 83 unit tests inline, which are included in the 1,893 figure. The eight
deployable programmes carry none, because none of them has been run against a
validator. See §6.

---

## 3. Out of scope

| Excluded | Why |
|---|---|
| **Groups programmes** | Not built. See §4. |
| **The indexer** | Off chain read service, holds no funds, no authority |
| **The frontend** | Off chain, no keys, no authority |
| **Meteora DBC and DAMM v2** | Third party. An audit of Sluice says nothing about them |
| **Panta** | Third party market infrastructure |
| **Privy** | Third party authentication |
| **Token-2022 base implementation** | Solana core |

An audit of Sluice's own code says nothing about the security of Meteora, Panta or
Privy. Sluice is built on other people's programmes and that dependency is real,
which is why §5 exists.

---

## 4. Groups is on the roadmap, not in the scope

This is not caution. This is what audit scope means.

**A scope document names a frozen commit hash and an exact file list.** Groups has
no commit and no files. Listing it would be claiming review over code that does not
exist, and a reviewer who checks would find that in minutes.

Stated in the terms the scoping call needs:

- **In scope:** the eight Issuance programmes, at the commit tagged for audit
- **Out of scope:** Groups programmes, the indexer, the frontend, and third party
  dependencies including Meteora and Panta
- **On the roadmap:** Groups, roughly 750 lines across `circle` and `group_bond`,
  to be audited separately **before it holds funds**

Roadmap and audit scope are different documents. Groups belongs in the first and not
the second, and conflating them is how a project ends up described as audited when a
subset was.

---

## 5. Dependency risk, stated before it is found

| Dependency | Holds | Sluice loses | Sluice does not lose |
|---|---|---|---|
| Meteora DBC | Capital in curve pools during a raise | Funds in that pool | Released tranches, anything in a Sluice vault |
| Meteora DAMM v2 | Post graduation liquidity | Secondary liquidity and trading | Tokens in wallets, vault balances |
| Panta | The binary market on each milestone | Correctness of one tranche decision | Sluice's programmes |
| Privy | Issuer authentication | That one issuer's account | Protocol funds, other issuers |
| USDC | The settlement currency | The value of USDC held | Everything else |
| Solana | Liveness of the whole system | The ability to transact | Nothing, state persists |

**Settlement, redemption and waterfall hold user capital under Sluice's own
authority, separate from any pool.** A Meteora exploit drains Meteora pools and does
not touch capital already in a Sluice vault.

**The likeliest failure is not a dependency exploit.** It is a thin milestone market
being moved cheaply, which releases a tranche that should not have been released.
Four controls address it:

1. A **depth floor** of 500 USDC, below which a resolution is not accepted from the
   market and the verifier decides instead
2. A **48 hour delay** between resolution and release, during which a guardian can
   halt
3. **Value caps**
4. A **narrowly scoped pause guardian** that can halt new issuance, tranche release
   and redemption claims, but **cannot** halt a holder claiming funds already vested
   to them

Sluice cannot prevent a dependency exploit, cannot make a third party market deep,
and cannot insure deposits. The 8% insurance allocation is a protocol backstop and
is not insurance coverage for holders.

---

## 6. The state of the code, stated plainly

**The programmes do not currently compile.** Solana 1.17.34 requires Rust 1.85 or
older and the workspace lockfile floats to transitive crates requiring `edition
2024`, which that toolchain cannot parse. Six source level compile errors have been
identified and fixed. The dependency resolution is unresolved.

**None of the eight deployable programmes has been run against a validator, has been
built to SBF, or has been deployed to any cluster.** There is no deployed program ID.

What does run today:

- `sluice-core-math`, 83 unit tests passing on any toolchain, no Solana dependency
- The indexer, 47 tests passing, running in production against a live Panta API key
- The frontend and the waitlist and invite system, deployed on Solana devnet

**This means a scoping call with CertiK is premature on the code and correct on the
design.** The honest sequencing is that the dependency graph gets fixed, the
programmes are built and deployed to devnet, and then a scope document naming a
commit hash is worth a reviewer's time. Sending this one now is still the right move
because the design, the value at risk and the dependency surface are all settled, and
those are what a scoping conversation is for.

---

## 7. Mainnet target

**Target: Q2 2027.**

Sequencing, in the order it has to happen:

1. Resolve the dependency graph, `cargo build-sbf` clean
2. Deploy all eight to devnet, exercise them against a real Panta market
3. Fix what devnet breaks
4. CertiK audit of the eight at a tagged commit, settlement and redemption first
5. Publish findings, remediate, publish the remediation
6. Deploy to mainnet behind a guardian, cap the first raise
7. Open publicly

The audit is deliberately step 4 and not step 2. Shipping an unaudited programme
that holds user capital to mainnet to hit a date would be the wrong trade, and it is
the reason this target is Q2 2027 and not Q1.

---

## 8. Roadmap, 12 months from October 2026

**Q4 2026, now to January**

- Resolve the dependency graph and compile all eight programmes
- Build to SBF, deploy to devnet, exercise a full issuance end to end
- Create a live Panta binary market on devnet and wire the four gate resolver to it
- CertiK scoping call, scope frozen at a tagged commit
- Close the waitlist cohort, begin promoting in batches

**Q1 2027**

- CertiK audit of the eight, settlement, redemption and waterfall prioritised
- Remediate findings, publish both the findings and the remediation
- Mobile money rail research for Groups. Which rails exist where the people this is
  for actually are
- Groups design finalised against that research, not before it

**Q2 2027**

- Groups implementation, `circle` and `group_bond`, roughly 750 lines
- Separate audit of Groups **before it holds funds**
- Mainnet deployment behind the guardian, first raise capped
- Public launch of issuance

**Q3 2027**

- Groups to mainnet
- Autopilot phase 2, DLMM ladder, DAMM v2 and DLMM positioning
- Second issuance fee tier review. The fee schedule is fixed and published and does
  not change on volume, so this is a review, not a lever

**What is deliberately not on this roadmap:** a token. Sluice issues claims on
off-chain cash flow and there is no plan to issue one of its own. A roadmap that
ends with a token is a roadmap whose incentives changed, and the reason Groups is
gated on mobile money rails rather than on a token launch is that the rotation is
worth building without one.

---

## 9. Team and fundraising

**Team.** One founder, solo. Agbede Oluwatobiloba Paul, Computer Science
undergraduate at the Federal University of Petroleum Resources Effurun, based in
the Netherlands. Five months as an IT intern, freelance designer since 2022,
certified product ambassador since 2026, and the author of every line in this
repository.

A solo team is worth naming rather than smoothing over. It is the main execution
risk and it is the reason the audit is scoped narrowly and sequenced late. It is
also why the specification is written down: the reasoning survives the person who
wrote it, which is the only form of continuity a team of one can offer a reviewer.

**Fundraising status.** Pre-seed, not raised. No institutional capital, no SAFE, no
lead investor. Self funded to date.

**Contact for the scoping call.**

- **Telegram:** https://t.me/xoxo_psy
- **Email:** web3psycho000@gmail.com

Either reaches me directly. Telegram is faster, email is better for a document
exchange. No form and no gate.

Deliberately not published here: my phone numbers. A scoping conversation does not
need them, and putting a personal mobile on a public repository is a cost with no
benefit. If a call is wanted, Telegram does it.
