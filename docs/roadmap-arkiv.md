# Roadmap — Arkiv as the trust layer

> **Status: future roadmap item (not shipped).** This documents a research decision, not a claim. Arkiv is a queryable, time-scoped, tamper-proof Ethereum data layer we're evaluating as the home for fondof's *provenance & contestable quality* surface — predicated on the advantages below. Nothing here is production today, and the idea remains open to experimentation until we find product-market fit.

## Why Arkiv is on the roadmap

fondof's trust problem is: **how do we prove, to a third party, that a skill's thinking came from a real source and that its quality signal is honest?** A plain database can't answer that credibly — the audit log is a table we own and can edit, and the quality signal is privately computed. Arkiv's native primitives map almost 1:1 onto the parts of fondof that need independent verifiability:

- **Immutable, non-spoofable `$creator`** (`createdBy()`) — provenance and dispute timelines provable by anyone, with no indexer we run. This is the single strongest argument for Arkiv over Postgres.
- **Native time-scoping + auto-pruning** — review/eval traces expire on schedule instead of a TTL/service layer we maintain.
- **Queryable without a read model** — `/from/[domain]` aggregations become `getEntityCount`/filter queries.
- **A native option alongside SkillPool** — Arkiv's `$creator` + time-scoping is one candidate for the *provenance & contestable-quality* surface we currently treat via `SkillPool.sol` on Monad. We're experimenting with both rather than committing; SkillPool is **not** deprecated or retired — that call stays open while we find product-market fit.

## Honest caveats (why it's not a wholesale swap)

Arkiv is **not strictly better than what we have** — it's better for a specific slice, and worse for others:

- **Cost asymmetry.** Arkiv is pay-per-byte × lifetime. Skill bodies and audio are heavy; only metadata/indices belong on-chain.
- **Latency & throughput.** LLM forge, sessions, mapping, input munging are hot-path compute that must stay off Arkiv.
- **Mutability.** Skills get edited and versioned. Arkiv's tamper-proof model rewards append-only history; heavy editing means entity churn.
- **Ranking reads.** Arkiv is newest-first with limit-before-sort — "top-N by qualityScore" needs fetch-then-sort client-side, not a single `ORDER BY ... LIMIT`.

## Recommended boundary

| Layer | Home |
|---|---|
| LLM forge, sessions, rate-limit, caches | Cloudflare Workers / edge store (as today) |
| Skill bodies, audio, heavy files | CDN/Blob — only `bodyHash` on Arkiv |
| Source / Shard / Skill **metadata indices** | Arkiv (queryable) |
| ReviewTrace, Outcome, dispute timeline | Arkiv (tamper-proof `$creator`, time-scoped) |
| `SkillPool.sol` (Monad) | **Unchanged for now** — Arkiv explored alongside; no retirement decision made |

> Framing for the Ideathon: *experiment with Arkiv as the home for the provenance/quality slice* alongside the existing SkillPool — not a re-skin, and not a retirement. Arkiv stays an open experiment while we test which approach earns user engagement.

## Arkiv facts the schema is pinned to (from docs.arkiv.network)

- Attributes are **scalar** — string-typed or number-typed. **No arrays/`contains`.** "Contains" maps to glob `~`; numeric range (`>`/`<`) requires integer values.
- Use a `type` string discriminator per entity (`type = "skill"`) for `eq` filtering.
- Every entity has `expiresIn` (seconds, must be a positive multiple of 2 — block time is 2s); extend with `extendEntity()`.
- Ownership is split: the signing wallet is the immutable `creator`; `owner` is changeable (Change-Ownership). All five ops (create/update/delete/extend/change-owner) batch in one transaction.
- Query operators: `&& || ! = != < > <= >= ~ !~`; synthetic attrs `$owner`, `$creator`, `$key`, `$expiration`, `$createdAtBlock`, `$all`.
- `getEntityCount()`, cursor pagination (200/page), `select()` projection; **newest-first** by default, sort client-side.

## Preferred proposed entities

- **Source** — content that spawned skills (`url`, `kind`, `ingestedAt` int, `shardCount` int).
- **Shard** — one idea extracted (`sourceId`, `repo` eq, `relevanceScore` int range, `status`, `createdAt` int).
- **Skill** — the forged skill (`name`, `repo` eq, `primaryStack` eq, `stackTags` glob string, `qualityScore` int, `uses` int, `version` int, `createdAt`, `sourceId`, `bodyHash`).
- **ReviewTrace** — validation event, short `expiresIn` (`skillId` eq, `kind`, `score` int, `$creator`).
- **Outcome** — "did it help" (`skillId` eq, `kind`, `url`, `attachedAt` int).

## What stays off Arkiv (the boundary, named)

- Full skill bodies / audio — CDN/Blob, `bodyHash` only.
- Hot-path LLM extraction & shard synthesis — off-chain compute.
- Secrets, API keys, OAuth tokens — never on-chain.
- User PII and private repo contents — public identifiers only.
