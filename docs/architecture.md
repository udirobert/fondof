# Package roles

Short map so contributors don’t conflate edges. Full product story: [README](../README.md). Steering: [`.kiro/steering/project.md`](../.kiro/steering/project.md).

| Package | Owns | Does not own |
|---------|------|----------------|
| **web** | Judge UI, forge craft, SkillPool desk | Chain txs (except optional wallet) |
| **api** | HTTP edge: ingest, forge, publish, skills, challenge | CLI UX |
| **core** | Libraries for CLI / shared pipelines | Public production HTTP |
| **cli** | Terminal workflow (secondary) | Hosted demo path |
| **contracts** | **SkillPool.sol** (demo) | Marketplace / yield |
| **shared** | Types | Runtime |

**SkillPool vs FondofAttestation:** SkillPool is the live quality loop on Monad testnet. `FondofAttestation.sol` is an earlier provenance sketch — keep for history; do not document it as the demo contract.

**Title meta:** On-chain = hashes only. Human title/blurb via `POST /api/publish` (or `/api/skills/:hash/meta` after wallet forge), stored in Worker edge cache.
