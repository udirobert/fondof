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
- `/api/skills?sort=impact|outcomes|adapted|recent` — focused discovery views with optional topic/stack filters
- `/u/[login]` and `/api/skills/creator/:login` — owner/creator evidence snapshots when ownership is known
- Skill pages show source credit and a re-forge path

**Identity boundary:** domains remain grouping/navigation keys, not proof of thought-leader identity. Canonical source IDs and skill lineage are stored with public artifacts; rankings use explicit offchain evidence summaries and are not causal impact claims. Only compact public commitments need an onchain anchor.

No creator onboarding needed — pages populate from forge data. Optional domain claim for analytics (future).

## Key contracts

**SkillPool vs FondofAttestation:** SkillPool is the live quality loop on Monad testnet. `FondofAttestation.sol` is an earlier provenance sketch — keep for history; do not document it as the demo contract.

**Artifact/proof split:** On-chain should remain minimal: skill identity, source commitments, public forger identity, backing, and challenge/use history. Human title, blurb, markdown, fit details, genres, rankings, source identity, and outcome evidence remain offchain. Discovery currently exposes an explainable evidence signal: claimed uses + attached outcome/PR confirmations with transparent caveats, never a claim that a source caused a project change. Public artifact records and evidence history use non-expiring KV; the short-lived Cache API remains only as a fast legacy/meta cache fallback.
