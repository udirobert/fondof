# Package roles

Short map so contributors don't conflate edges. Full product story: [README](../README.md). Steering: [`.kiro/steering/project.md`](../.kiro/steering/project.md). Future-of-data-layer note: [Arkiv roadmap item](roadmap-arkiv.md) — eval only, not shipped.

**Product hierarchy:** personalised craft → copy to agent → SkillPool proof → outcome receipts → supply-side attribution. Not a marketplace, registry, or AI security scanner.

| Package | Owns | Does not own |
|---------|------|----------------|
| **web** | Judge UI, forge craft, SkillPool desk, `/u/[login]` portfolio, `/from/[source]` creator pages | Chain txs (except optional wallet) |
| **api** | HTTP edge: ingest, forge, publish, skills, challenge, auth, events, billing, github-publish, sources | CLI UX |
| **core** | Libraries for CLI / shared pipelines | Public production HTTP |
| **cli** | Terminal workflow (secondary) | Hosted demo path |
| **contracts** | **SkillPool.sol** (demo) | Marketplace / yield |
| **shared** | Types | Runtime |

## Auth & billing

- **GitHub OAuth** — session in KV (`SESSIONS` namespace). Gates forge and publish; viewing/consuming is always public.
- **Freemium:** 3 free forges/month → share a skill publicly to unlock unlimited → Pro ($) for private unlimited.
- **Privacy toggle:** forges default to public (appear on `/from/` and `/u/` pages). Users can forge privately — skips source tracking and portfolio, keeps the 3/month limit.

## Supply-side (creator) attribution

Every forge stores source URL → skill hash mappings in KV (keyed by `source:{domain}`). This powers:
- `/from/[domain]` — auto-populated page showing all skills forged from a source
- `/api/sources/:domain/badge.svg` — embeddable shield badge for show notes / READMEs
- Skill pages show "Forged from [domain]" above the fold with link to `/from/` page

No creator onboarding needed — pages populate from forge data. Optional domain claim for analytics (future).

## Key contracts

**SkillPool vs FondofAttestation:** SkillPool is the live quality loop on Monad testnet. `FondofAttestation.sol` is an earlier provenance sketch — keep for history; do not document it as the demo contract.

**Title meta:** On-chain = hashes only. Human title/blurb/markdown/landings via `POST /api/publish` (or `/api/skills/:hash/meta` after wallet forge), stored in Worker edge cache. Outcome attachments should follow the same edge-meta path when added.
