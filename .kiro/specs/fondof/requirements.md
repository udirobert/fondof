# fondof — Requirements

## Vision

fondof turns what developers learn — or need — into agent skills fitted to their codebase. It bridges ideas and implementation: extract useful thinking, fit it to real code, hand it to an agent, and learn whether it helped.

**Mission:** bridge ideas and implementation.

**Vision:** a living attribution graph connecting ideas, agents, codebases, and outcomes.

The core loop is offchain and useful without blockchain. Monad is an optional public-trust layer for artifact identity, provenance commitments, backing, challenges, and portable attestations.

## Problem Statement

Developers and AI practitioners consume rich content (podcasts, blogs, technical talks) full of actionable ideas. Today:

1. Insights evaporate — there's no system connecting what you learn to what you build
2. Skill duplication is rampant — the ecosystem is inflated ~3.5x with clones
3. Generic skills don't help — they're not fitted to your stack, conventions, or codebase
4. No quality signal — you can't tell if your skill is better or worse than alternatives
5. No provenance — skills appear from nowhere with no traceability to source thinking

## User Personas

### P1: Skill Practitioner (Primary)
A developer who listens to podcasts, reads technical blogs, and wants to turn those ideas into agent skills for their own projects. They have multiple repositories, use AI coding agents daily, and care about skill quality.

### P2: Skill Consumer
A developer who wants to find the best skill for a specific need in their codebase. They don't create skills from scratch but want environment-fitted recommendations with quality signals.

### P3: Content Creator (Future)
A podcast host or blog author who wants attribution when their ideas are distilled into skills that others use.

## Functional Requirements

### FR1: Content Ingestion
- FR1.1: Accept podcast URLs and transcribe audio to text with speaker diarization
- FR1.2: Accept blog/article URLs and extract content
- FR1.3: Extract discrete ideas, patterns, and techniques from transcribed/scraped content
- FR1.4: Tag extracted ideas with topic, domain, and applicability metadata

### FR2: Project Connection
- FR2.1: Connect to user's GitHub account and index their repositories
- FR2.2: Detect language, framework, conventions, dependencies, and architectural patterns per repo
- FR2.3: Identify open issues, recurring patterns, and areas where skills could help
- FR2.4: Maintain an up-to-date project context as repos evolve

### FR3: Discovery & Matching (Content-First Entry)
- FR3.1: When content is ingested, cross-reference extracted ideas against user's repositories
- FR3.2: Surface which repos each idea applies to, with specific file/module references
- FR3.3: Show existing skills that already cover each idea (ranked by fit to user's stack)
- FR3.4: Assess "skill-worthiness" — is this a one-time fix, a design decision, or a repeatable pattern worth encoding as a skill?

### FR4: Discovery & Matching (Need-First Entry)
- FR4.1: Accept a natural language description of a need/problem
- FR4.2: ~~Search existing skill catalogs~~ → **Extract discrete technique shards from the stated need via LLM** (`POST /api/ingest {need}`), live at click time — no GitHub, no URL required. Shards are derived strictly from the typed need; a labeled local-shard fallback appears only when the API is unreachable.
- FR4.3: Search existing skill catalogs for matches (Exa Compare stage, on demand), ranked by fit to user's environment
- FR4.4: Identify gaps — where existing skills partially cover the need but miss context
- FR4.5: Suggest source material (podcasts, blogs, talks) that articulates the need well — **post–Ready Spec Ship wedge, not judge-path scope.** User has a vague idea but no URL; fondof surfaces 3–5 canonical sources (YouTube, HN, dev blogs), user picks one → re-ingest → forge with real provenance. Distinct from FR4.3 Compare (existing *skills*). See [`docs/submission-plan.md`](../../../docs/submission-plan.md). Do **not** reframe fondof as a trending-content search engine — optional enrichment between Need and Forge only.

### FR5: Skill Composition
- FR5.1: Compose skills from multiple sources (not just single-source extraction)
- FR5.2: Adapt patterns from source material to the user's specific stack/conventions
- FR5.3: Incorporate context from the target repository (existing patterns, deps, style)
- FR5.4: Cite all source material with specific segments/timestamps
- FR5.5: Detect conflicts with user's existing skills

### FR6: Validation & Benchmarking
- FR6.1: Benchmark a crafted skill against real tasks from the user's repo
- FR6.2: Compare skill quality against existing alternatives for the same intent
- FR6.3: Report where the skill helps and where it doesn't
- FR6.4: Suggest refinements based on validation results

### FR7: Public Provenance & Trust (Optional Blockchain Layer)
- FR7.1: Keep ordinary forging, hand-off, outcomes, and discovery useful without blockchain.
- FR7.2: When a user chooses public proof, anchor the exact skill identity and source commitments; do not store full content, private repo data, rankings, or outcomes on-chain.
- FR7.3: Track composition lineage and attribution offchain; optionally anchor compact public commitments.
- FR7.4: Use backing, usage receipts, and challenges as contestable quality signals, not objective safety guarantees.
- FR7.5: Abstract wallet and gas complexity through a relayer where possible; clearly label attested vs public-offchain artifacts and never fake attestation.

### FR8: Skill Lifecycle
- FR8.1: Install skills locally for immediate use (copy for Cursor / Claude / Kiro — primary hand-off)
- FR8.2: Let users share skills publicly offchain, then optionally attest them on SkillPool when portable provenance or contestable quality matters.
- FR8.3: Track skill decay — flag when source content has been updated or codebase has evolved
- FR8.4: Propose skill updates when underlying thinking or project context changes
- FR8.5: **Outcome receipts** — attach what a skill resulted in (short note + optional PR / screenshot URL) on the skill page and pool cards; quality becomes “did it help?” not only stake/use counts. Optional, honest, no fake metrics.

## Non-Functional Requirements

### NFR1: User Experience
- NFR1.1: The core workflow must work without blockchain knowledge; optional attestation should have zero required crypto UX, with clear proof status when used.
- NFR1.2: Content ingestion to first useful output in under 60 seconds
- NFR1.3: Discovery results must feel instant (<2s)

### NFR2: Privacy & Security
- NFR2.1: Repository code never leaves the user's control without explicit consent
- NFR2.2: Only metadata (hashes, embeddings) stored externally; source code stays local or in user's GitHub
- NFR2.3: Skills can be private drafts, public offchain shares, or optionally attested public artifacts.

### NFR3: Extensibility
- NFR3.1: Skill format must be agent-framework-agnostic (works with Kiro, Claude, Cursor, etc.)
- NFR3.2: Content sources must be pluggable (start with podcasts + blogs, expand later)
- NFR3.3: Project connections must be pluggable (start with GitHub, expand later)

### NFR4: Monad-Specific
- NFR4.1: Use Monad where fast, low-cost public attestations or challenge signals create product value.
- NFR4.2: Use standard Solidity/EVM tooling for the optional trust layer.
- NFR4.3: Keep on-chain storage minimal — identities, commitments, backing, and challenge/use history; never full content or private project data.

## Constraints

- C1: Built for **Ready, Spec, Ship** (Kiro hackathon) — spec → build → ship within the competition period
- C2: Team size up to 3 members
- C3: SkillPool deploys on Monad (EVM-compatible L1)
- C4: The user-facing experience must work without any blockchain knowledge
- C5: No simulated features presented as working — every judge-visible path is live or explicitly labeled as a fallback

## Success Criteria (Judge Path)

1. User types a need (no GitHub) → LLM extracts idea shards from the typed text in <30 s
2. User pastes a URL (talk / blog / podcast) → real transcript/content + idea extraction completes
3. Shards show repo fit: "Idea A applies to repo X (here's where). Idea B already has a skill (Compare)."
4. User forges a skill → LLM composes it fitted to the repo's stack; copy to Cursor / Claude / Kiro
5. A user can share a public skill without a chain; optional SkillPool attestation makes its identity/provenance and contestable signal independently inspectable
6. A claimed use or outcome is labeled honestly; an outcome attachment (note / PR) shows on the skill page and may later support richer evidence
