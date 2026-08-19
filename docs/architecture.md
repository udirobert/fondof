# Package roles

Short map so contributors don't conflate edges. Full product story: [README](../README.md). Steering: [`.kiro/steering/project.md`](../.kiro/steering/project.md). Hackathon content plan: [submission-plan.md](submission-plan.md). Video production: [video-pipeline.md](video-pipeline.md). Future-of-data-layer note: [Arkiv roadmap item](roadmap-arkiv.md) — eval only, not shipped.

**Product hierarchy:** Need/source → extract → fit/forge → copy/use → outcome → share/attribute → optional SkillPool proof. Not a marketplace, generic registry, or AI security scanner.

**Boundary:** offchain for usefulness; onchain for public trust. SkillPool is downstream of the craft loop and should never be required for ordinary forging, hand-off, or outcome capture.

| Package | Owns | Does not own |
|---------|------|----------------|
| **web** | Judge UI, forge craft, SkillPool desk, `/u/[login]` portfolio, `/from/[source]` creator pages | Chain txs (except optional wallet) |
| **api** | HTTP edge: ingest, compose, forge, publish, skills, challenge, auth, events, billing, github-publish, sources | CLI UX |
| **core** | Libraries for CLI / shared pipelines | Public production HTTP |
| **cli** | Terminal workflow (secondary) | Hosted demo path |
| **contracts** | **SkillPool.sol** (demo) | Marketplace / yield |
| **shared** | Types | Runtime |

## Auth & billing

- **GitHub OAuth** — session in KV (`SESSIONS` namespace). Gates forge and publish; viewing/consuming is always public.
- **Freemium:** 3 free forges/month → share a skill publicly to unlock unlimited → Pro ($) for private unlimited.
- **Privacy direction:** new forges begin as private drafts; explicit public sharing enables `/s/[hash]`, source attribution, and creator discovery. Optional SkillPool attestation is a separate proof choice. Legacy public-first records remain discoverable until lifecycle controls are applied.

## Supply-side (creator) attribution

Public forges store source URL → skill hash mappings in KV (currently keyed by `source:{domain}`). This powers:
- `/from/[domain]` — source attribution, lineage cues, and evidence-backed impact snapshot
- `/api/sources/:domain` — source skills plus transparent evidence aggregation
- `/api/sources/:domain/impact` — compact source impact summary for cards/embeds
- `/api/sources/:domain/badge.svg` — embeddable badge for show notes / READMEs
- `/api/skills?sort=impact|outcomes|adapted|recent` — focused discovery views with optional genre/topic/stack filters
- `/discover/[genre]` — formal genre landing pages for topic-led discovery
- `/remix/[hash]` and `/api/skills/:hash/lineage` — ancestor/current/public-remix lineage views with source-aware re-forge action
- `/u/[login]` and `/api/skills/creator/:login` — owner/creator evidence snapshots when ownership is known
- Source pages support an authenticated `self-claimed` identity hint plus optional nonce-based domain-control verification; neither is presented as verified authorship or influence
- Skill pages show source credit, genre labels, lineage links, dynamic OG cards, and a re-forge path

**Identity boundary:** domains remain grouping/navigation keys, not proof of thought-leader identity. Canonical source IDs and skill lineage are stored with public artifacts; genres are deterministic labels derived from persisted metadata (not LLM judgements); rankings use explicit offchain evidence summaries and are not causal impact claims. Only compact public commitments need an onchain anchor.

## Progressive disclosure conventions (web)

Public pages follow one rule: **one active mode at a time, and only the audience that needs a control sees it.** Concretely:

- **Boxes are for content; lines are for actions.** Dashed/boxed panels hold real content (outcome receipts, impact snapshots). Invitations to act ("Attach outcome", "Attach agent link", "Claim source") render as single-line affordances, not boxes.
- **Tabs and sections only appear when they have something to do.** On `/s/[hash]` the Talk tab exists only when an agent link is attached or the viewer owns the skill; the Prove tab hides owner actions (stamp on-chain, hide skill) behind an "Owner tools" disclosure.
- **Owner-only controls are gated by session.** Portfolio share buttons render only for the profile owner; source claims only prompt the viewer who can act on them.
- **Power knobs collapse.** QuickPad keeps source + fit repo + Forge visible; shards and privacy live behind an Options disclosure. Secondary metadata (genres, lineage, canonical source IDs) collapses behind a "more" toggle.
- **Provenance stays collapsible.** On-chain detail (signal story, challenges, receipts, explorer links) lives in the collapsed "Provenance & Proof" disclosure with a one-line summary when closed.
- **Capability signals ride on existing surfaces.** The ElevenLabs "Talk to a Skill" voice agent is not a destination section; it appears as a small mic indicator on skill cards (pool paper cards, the public shelf, and skill-page peer cards) — and only when that skill actually has an `agentUrl` attached. No agent, no indicator. Clicking through lands on the skill page's Talk tab.

When adding a surface, place it by audience (visitor vs owner) and intent (consume vs act), then collapse everything that is not the primary action for that audience.

No creator onboarding needed — pages populate from forge data. Optional source claims are user-initiated and remain clearly labelled as self-claimed or domain-control verified, not verified thought-leader identity.

## Key contracts

**SkillPool vs FondofAttestation:** SkillPool is the live quality loop on Monad testnet. `FondofAttestation.sol` is an earlier provenance sketch — keep for history; do not document it as the demo contract.

**Artifact/proof split:** On-chain should remain minimal: skill identity, source commitments, public forger identity, backing, and challenge/use history. Human title, blurb, markdown, fit details, genres, rankings, source identity, and outcome evidence remain offchain. Discovery currently exposes an explainable evidence signal: claimed uses + attached outcome/PR confirmations with transparent caveats, never a claim that a source caused a project change. Public artifact records and evidence history use non-expiring KV; the short-lived Cache API remains only as a fast legacy/meta cache fallback.
