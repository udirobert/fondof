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
- [x] Local draft template fallback (honest offline)

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

## Blitz / hackathon prioritization (current)

**Must stay green for judges:**
- Hosted web + API + SkillPool publish/use
- Need path without GitHub
- Honest offline / demo-oracle disclosure
- `.kiro/` specs + steering tracked
- README Built with Kiro + testing clicks

**Nice before Aug 23:**
- Demo video recorded from `docs/demo-video.md`
- More durable meta than Cache API if titles evaporate
- CLI parity only if time left

## Direction (post–craft-first)

**Product hierarchy:** personalised craft → agent hand-off → SkillPool proof → **outcome receipts** (what the skill resulted in).

### Task 10.1: Outcome attachments (next build)
- [x] Optional outcome on skill page / meta: PR URL, short “what improved” note, optional screenshot URL
- [x] Persist via edge meta (same path as markdown) — no fake metrics
- [x] Surface lightly on `/s/[hash]` and pool cards when present
- [x] Do **not** rebrand as security scanner; keep untrusted-supply as problem context only
