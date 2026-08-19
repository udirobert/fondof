# fondof — Implementation Tasks

Status for **Ready Spec Ship / Monad demos** (updated to match the shipped web + SkillPool loop).  
Unchecked items are deferred or partial — not abandoned.

## Phase 1: Project Foundation

### Task 1.1: Initialize monorepo structure
- [x] Set up TypeScript monorepo with pnpm workspaces
- [x] Create packages: `cli`, `core`, `contracts`, `shared`, `web`, `api`
- [x] Configure tsconfig, eslint
- [x] Add .gitignore for node_modules, .env, build artifacts, foundry cache

### Task 1.2: Set up Foundry for contracts
- [x] Initialize Foundry project in `packages/contracts`
- [x] Configure foundry.toml for Monad
- [x] Create deployment scripts for Monad testnet
- [x] `.env.example` at repo root (+ contracts example)

### Task 1.3: Shared types and schemas
- [x] Define core shared types in `packages/shared`
- [x] Skill / discovery / idea shapes used by web + API
- [ ] Full `Attestation` mirror of legacy FondofAttestation (superseded by SkillPool views)

## Phase 2: Chain Layer (SkillPool)

### Task 2.1: SkillPool contract (demo contract)
- [x] Implement `SkillPool.sol` (forge, use, challenge, resolve, signal, acquire, topSkills)
- [x] Foundry tests for SkillPool
- [x] Deploy to Monad testnet (`0x75545e2C450897914df416d0D24aeB33a89a8b19`)
- [x] Legacy `FondofAttestation.sol` retained but not the judge path

### Task 2.2: Relayer / API edge
- [x] Cloudflare Worker (`packages/api`) with forge/use/challenge/resolve/storm
- [x] Server-side wallet via Worker secrets
- [x] Publish + skill query endpoints
- [x] Edge cache for skills + human title/blurb meta
- [ ] Dedicated `GET /provenance/:skillHash` (covered via skill page + on-chain details)

## Phase 3: Ingestion Pipeline

### Task 3.1: Content resolver
- [x] Detect URL / need / podcast / article paths in API ingest
- [x] Article extraction (Firecrawl / Readability)
- [x] Source hashing for provenance
- [x] **Need-mode is live** — `POST /api/ingest {need}` extracts shards from the typed need via LLM (with `need:v1` cache); web need path calls it and shows a *labeled* local-shard fallback only when the API is unreachable
- [ ] Full podcast RSS → audio URL automation polish

### Task 3.2: Transcription
- [x] ElevenLabs path when key present
- [ ] Speaker diarization UX polish
- [x] Transcript drawer on web (view / copy / download)

### Task 3.3: Idea extraction
- [x] LLM extract → idea shards with metadata
- [x] Embeddings when Workers AI available
- [x] Streaming ingest events to the floor

## Phase 4: Project Context

### Task 4.1: GitHub integration
- [x] Browser PAT / connect for private repos (optional)
- [ ] Full CLI device-flow OAuth polish
- [x] OAuth-free happy path: Need tab + demo repos

### Task 4.2: Repository indexing
- [x] Languages / frameworks for connected + demo repos
- [ ] Deep convention LLM analysis + SQLite RepoProfile store
- [ ] Auto-detect installed `.kiro/steering` skills in target repos

## Phase 5: Discovery Engine

### Task 5.1: Content-first matching
- [x] Fit previews / repo column actions on the floor
- [x] Lexical + embedding overlap helpers
- [ ] File-level embedding match in UI

### Task 5.2: Existing skill search
- [x] Exa Compare stage (on demand, not auto on extract)
- [x] Overlap labels on shards (Exists / Partial)
- [ ] Local offline skill index

### Task 5.3: Skill-worthiness
- [x] Forge / Apply / Skip style insights on shards
- [ ] Dedicated LLM worthiness scores in API response schema

## Phase 6: Composition Engine

### Task 6.1: Context assembly
- [x] Selected shards + target repo into forge
- [x] Gap-delta forge vs partial overlap skill
- [ ] Conflict detection vs user’s installed skills

### Task 6.2: Skill synthesis
- [x] `/api/forge` multi-idea + repo context
- [x] Markdown skill draft with citations when model provides them
- [x] Real provenance — forges send each idea's actual `sourceUrl` (URL or `need://…`), so published skills credit the real source
- [x] Local draft template fallback (honest offline) — visible in-UI notice when the forge API is down; no silent template, no hard timeout race

### Task 6.3: Skill output
- [x] Preview + publish to SkillPool
- [x] Edge-persisted title/blurb for pool cards
- [ ] Write skill file into caller’s local `.kiro/steering/` from web

## Phase 7: CLI Interface

### Task 7.1–7.5: CLI
- [x] Commander scaffold in `packages/cli`
- [ ] Full polished connect / ingest / forge / status parity with web
- [ ] CLI is **secondary** for Ready Spec Ship (web is primary)

## Phase 8: Integration & Demo

### Task 8.1: End-to-end happy path
- [x] Web: need/url → extract → forge → publish → use → pool
- [x] Attestation queryable on Monad explorer
- [x] Honest copy when chain unavailable

### Task 8.2: Demo preparation
- [x] Hosted app + Worker for judges
- [x] Instant sample + live examples on pad
- [x] Demo video script in `docs/demo-video.md`
- [x] Demo oracle disclosed for challenge resolve
- [x] Test suites — vitest (LLM `parseIdeas`, need-URL provenance, source-URL canonicalization, embedding compact/cosine, skill-meta + outcome sanitization, section parsing, fit heuristics, where-it-lands) + Foundry contract tests; `pnpm test` at root
- [x] README: 5-minute judge click path + verification/testing instructions (fresh-clone + live curl checks)
- [x] Fixed dead API host in README / `.env.example` (→ `fondof-api.trustfall.workers.dev`)
- [x] Fixed `skill-sections` classification bug — "Anti-patterns" matched the `pattern` rule and was classified `guidance` (caught by test suite)

## Phase 9: Frontend (Web UI — primary product)

### Task 9.1: Next.js project setup
- [x] `packages/web` App Router, Tailwind 4, Zustand, Framer Motion
- [x] Netlify deploy

### Task 9.2–9.5: Floor / forge UX
- [x] Fond floor: pad → ingest → work stages
- [x] Idea shards, fit target, compare, forge mode
- [x] Skill preview (not markdown wall); SkillPool pulse + `/pool` desk
- [ ] Full WebGL flow-canvas beams (simplified / optional experience pages exist)

### Task 9.6: Attestation / SkillPool UX
- [x] Publish celebration + live score
- [x] Provenance tree + on-chain details (secondary)
- [x] Economics honesty (signaling ≠ yield)
- [x] Challenge queue with demo-oracle controls gated

### Task 9.7: Auth & data flow
- [x] Optional GitHub for repos
- [ ] Full TanStack Query adoption across floor
- [ ] SSE/WebSocket live updates (polling used today)

---

## Hackathon prioritization (current)

**Must stay green for judges:**
- Hosted web + API + SkillPool publish/use
- **Need path without GitHub — live LLM extraction** (not canned shards)
- Honest offline / demo-oracle disclosure (labeled fallbacks, no silent simulation)
- `.kiro/` specs + steering tracked
- README Built with Kiro + 5-minute judge click path + `pnpm test` green

**Remaining before Aug 23:**
- **3 daily evidence clips** (~90s each, Aug 17–19): trending idea → ingest → forge → agent use → outcome — run sheet in [`docs/submission-plan.md`](../../../docs/submission-plan.md)
- **Final synthesis video** (~3 min, Aug 22–23): montage daily clips + one live judge path — script in [`docs/demo-video.md`](../../../docs/demo-video.md)
- Google Form submission (repo + synthesis video + traction metrics) before 23:59 UTC
- Per-episode prep locked: topic, canonical URL (or Need text), target repo, skill hash, outcome note
- CLI parity only if time left (low priority — web is primary)

## Direction (post–craft-first)

**Canonical strategy:**

```text
Need or source → Extract → Fit / Forge → Copy / Use → Outcome → Share / Attribute → optional SkillPool proof
```

**Positioning:** fondof turns what developers learn — or need — into agent skills fitted to their codebase. Craft first, proof downstream. **Offchain for usefulness. Onchain for public trust.**

### Implementation plan

#### Phase A — Protect the core loop
- [x] Make the lifecycle explicit: private draft → public share → optional attestation
- [x] Keep Need / URL → Extract → Fit / Forge → Copy for agent fast and chain-independent
- [x] Separate public-offchain, attested, and private states in API and UI copy
- [x] Preserve honest degradation when the chain or relayer is unavailable

#### Phase B — Make public artifacts controllable and attributable
- [x] Add optional ownership and post-hoc unlist/hide for public skills; preserve immutable attestation history honestly
- [x] Persist canonical source identity, idea domains, pattern type, stack tags, and parent-skill lineage; author/title metadata remains a later enrichment
- [ ] Replace domain-only creator grouping with source identity while retaining domains as navigation
- [x] Move public artifact and evidence storage to non-expiring KV records with migration from the old TTL/cache paths

#### Phase C — Measure real value, not vanity activity
- [x] Distinguish claimed use, outcome-attached, linked-PR, and GitHub-confirmed PR evidence states; confirmation still does not prove causality
- [x] Add deduplicated, privacy-preserving receipts for authenticated users and explicitly consented browser keys; repo-fingerprint attribution remains deferred
- [x] Keep rankings and impact calculations offchain; publish the evidence behind each score (transparent evidence signal, not causal impact)
- [x] Build initial creator/source impact surfaces: `/from/[domain]`, `/u/[login]`, and source/creator aggregation APIs
- [ ] Add genre/stack discovery only after enough outcome data exists

#### Phase D — Use the chain only where it earns its place
- [ ] Keep onchain data minimal: skill identity, source commitments, public forger, backing, and challenge/use history
- [ ] Fix source commitments to represent canonical content snapshots, not only URL strings
- [ ] Treat per-click/per-copy activity as analytics, not onchain usage
- [ ] Add optional aggregate or high-confidence usage/outcome attestations only when they provide portable trust
- [ ] Keep challenge resolution explicitly labeled as oracle-assisted until adjudication is genuinely decentralized

#### Phase E — Turn evidence into distribution
- [ ] Add shareable source-impact cards: adaptations, unique stacks, outcome-backed uses, and challenge history
- [x] Add transparent evidence sorting to `/pool` and lineage/source cues to impact surfaces
- [ ] Add lineage-aware “re-forge/remix” pages linking source → original skill → derived skills
- [ ] Add multiple leaderboards such as most adapted, most outcome-backed, and rising—not one popularity score
- [x] Keep `/pool` downstream: evidence desk and discovery surface, never the homepage or generic marketplace

### Task 10.1: Outcome attachments
- [x] Optional outcome on skill page / meta: PR URL, short “what improved” note, optional screenshot URL
- [x] Persist via durable evidence records plus legacy edge meta fallback — no fake metrics
- [x] Surface lightly on `/s/[hash]` and pool cards when present
- [x] Do **not** rebrand as security scanner; keep untrusted-supply as problem context only

### Task 10.2: Find sources (FR4.5 — post-submit wedge)
- [ ] “Find sources” after need-extract — optional button, not a new primary tab
- [ ] Exa / web query scoped to YouTube, HN, dev blogs — return 3–5 cards (title, snippet, match reason)
- [ ] User picks source → re-ingest URL → merge or replace shards
- [ ] Wire to existing Compare + delta forge when partial skill match exists
- [ ] **Out of scope for Aug 23** unless ships in ~1 day without breaking judge path; it remains enrichment, not the core loop or a trending-content homepage
- Plan: [`docs/submission-plan.md`](../../../docs/submission-plan.md)
