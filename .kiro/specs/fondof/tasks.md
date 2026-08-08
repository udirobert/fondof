# fondof — Implementation Tasks

## Phase 1: Project Foundation

### Task 1.1: Initialize monorepo structure
- [ ] Set up TypeScript monorepo with pnpm workspaces
- [ ] Create packages: `cli`, `core`, `contracts`, `shared`
- [ ] Configure tsconfig, eslint, prettier
- [ ] Add .gitignore for node_modules, .env, build artifacts, foundry cache

### Task 1.2: Set up Foundry for contracts
- [ ] Initialize Foundry project in `packages/contracts`
- [ ] Configure foundry.toml for Monad (EVM-compatible, chain ID, RPC)
- [ ] Create deployment scripts for Monad testnet
- [ ] Add .env.example for private keys and RPC URLs

### Task 1.3: Shared types and schemas
- [ ] Define `IdeaRecord` interface in `packages/shared`
- [ ] Define `RepoProfile` interface
- [ ] Define `DiscoveryResult` interface
- [ ] Define `SkillDraft` interface
- [ ] Define `Attestation` interface (mirrors contract struct)

## Phase 2: Chain Layer (Monad Attestation)

### Task 2.1: Write attestation smart contract
- [ ] Implement `FondofAttestation.sol` with attestSkill, getAttestation, creatorSkills
- [ ] Add events for indexing (SkillAttested)
- [ ] Write Foundry tests (attest, duplicate rejection, query)
- [ ] Deploy to Monad testnet

### Task 2.2: Build relayer service
- [ ] Create Cloudflare Worker for relayer (`packages/core/src/relayer`)
- [ ] Manage server-side wallet (private key in CF secrets)
- [ ] Expose `POST /attest` endpoint (accepts skill hash + source hashes)
- [ ] Return transaction hash as receipt
- [ ] Expose `GET /provenance/:skillHash` endpoint (query contract)

## Phase 3: Ingestion Pipeline

### Task 3.1: Content resolver
- [ ] Detect input type from URL (audio/podcast RSS, article, raw text)
- [ ] Extract audio URL from podcast RSS feeds
- [ ] Fetch article content (readability extraction)
- [ ] Hash source content (SHA-256) for provenance

### Task 3.2: Transcription
- [ ] Integrate ElevenLabs Scribe API for audio transcription
- [ ] Handle speaker diarization in output
- [ ] Chunk transcript into semantic segments (by topic shift)
- [ ] Attach timestamps to segments

### Task 3.3: Idea extraction
- [ ] LLM prompt: extract discrete ideas/patterns/techniques from segments
- [ ] Structure output as `IdeaRecord[]`
- [ ] Generate embeddings for each idea (for later matching)
- [ ] Tag with domain and applicability metadata

## Phase 4: Project Context

### Task 4.1: GitHub OAuth integration
- [ ] Implement GitHub OAuth flow (CLI-based device flow)
- [ ] Store tokens securely (local keychain or encrypted file)
- [ ] List user's repositories for selection

### Task 4.2: Repository indexing
- [ ] Fetch repo metadata (languages, deps, file tree)
- [ ] Detect frameworks from dependency files (package.json, Cargo.toml, etc.)
- [ ] Analyze file structure for architectural patterns
- [ ] Detect coding conventions (sample files → LLM analysis)
- [ ] Detect existing skills (.kiro/steering, SKILL.md, cursor rules, etc.)
- [ ] Generate repo topic embedding (aggregate of file content embeddings)
- [ ] Store as `RepoProfile` in local SQLite

## Phase 5: Discovery Engine

### Task 5.1: Content-first matching
- [ ] Compute semantic similarity: idea embeddings vs repo topic embeddings
- [ ] Structural matching: idea applicability tags vs repo frameworks/deps
- [ ] Rank matches by combined score
- [ ] Identify specific files/modules where idea applies (file-level embedding match)

### Task 5.2: Existing skill search
- [ ] Build local skill index (embed descriptions of known skills)
- [ ] Search by semantic similarity against extracted ideas
- [ ] Score fit-to-environment (does the skill match user's stack?)
- [ ] Return overlap score + fit score per skill

### Task 5.3: Skill-worthiness assessment
- [ ] LLM prompt: classify idea as "technique" vs "one-time fix" vs "design decision"
- [ ] Score repeatability (will this apply to future tasks?)
- [ ] Score specificity (is this generic or context-dependent?)
- [ ] Output recommendation: forge-skill | apply-directly | skip

## Phase 6: Composition Engine

### Task 6.1: Context assembly
- [ ] Gather target repo's conventions, deps, existing skills
- [ ] Gather all selected idea records with source segments
- [ ] Identify potential conflicts with existing skills

### Task 6.2: Skill synthesis
- [ ] LLM prompt: compose skill from multiple ideas + repo context
- [ ] Enforce citation of source segments (timestamps, paragraphs)
- [ ] Adapt patterns to target stack (e.g., translate Python pattern → Rust)
- [ ] Output in agent-agnostic skill markdown format

### Task 6.3: Skill output
- [ ] Write skill file to user's project (`.kiro/steering/` or custom path)
- [ ] Generate provenance metadata (source hashes, composition timestamp)
- [ ] If publishing: call relayer to attest on Monad

## Phase 7: CLI Interface

### Task 7.1: CLI scaffold
- [ ] Set up Commander.js CLI in `packages/cli`
- [ ] Commands: `fondof ingest <url>`, `fondof connect`, `fondof discover`, `fondof forge`, `fondof status`
- [ ] Global config file (~/.fondof/config.json) for GitHub token, preferences
- [ ] Pretty output with chalk/ora (spinners, tables, color-coded results)

### Task 7.2: `fondof connect` command
- [ ] Trigger GitHub OAuth device flow
- [ ] List repos, let user select which to index
- [ ] Run repo indexing, show progress
- [ ] Store repo profiles locally

### Task 7.3: `fondof ingest <url>` command
- [ ] Accept podcast/blog URL
- [ ] Run ingestion pipeline with progress indicators
- [ ] Display extracted ideas in a readable format
- [ ] Show discovery results: matched repos, existing skills, worthiness

### Task 7.4: `fondof forge` command
- [ ] Interactive: select idea + target repo from discovery results
- [ ] Run composition engine
- [ ] Display skill draft for review
- [ ] Prompt: install locally / publish / edit / discard
- [ ] If publish: attest on Monad, show confirmation (no blockchain details)

### Task 7.5: `fondof status` command
- [ ] Show connected repos and their last-indexed time
- [ ] Show recent ingestions and their ideas
- [ ] Show forged skills and their attestation status

## Phase 8: Integration & Demo

### Task 8.1: End-to-end happy path
- [ ] Test full flow: connect → ingest → discover → forge → attest
- [ ] Verify attestation is queryable on Monad explorer
- [ ] Ensure no blockchain UX leaks through to user

### Task 8.2: Demo preparation
- [ ] Prepare a specific podcast episode for live demo
- [ ] Pre-index 2-3 repos with interesting characteristics
- [ ] Ensure sub-60s from paste to discovery results
- [ ] Script the demo flow with fallbacks

---

## Blitz Day Prioritization (8-hour sprint)

**Must ship (hours 1-6):**
- Task 2.1: Attestation contract deployed on Monad testnet
- Task 3.1-3.3: Ingestion pipeline working (can hardcode one podcast for speed)
- Task 4.2: At least one repo pre-indexed (can skip OAuth, use PAT)
- Task 5.1-5.2: Discovery matching working
- Task 6.2: Composition producing a skill
- Task 7.3-7.4: CLI commands for ingest + forge

**Should ship (hours 6-7):**
- Task 2.2: Relayer calling contract from CLI flow
- Task 5.3: Skill-worthiness shown in output
- Task 7.1: Polished CLI output

**Nice to have (hour 8):**
- Task 7.5: Status command
- Task 8.2: Demo polish
- Live connection to multiple repos
