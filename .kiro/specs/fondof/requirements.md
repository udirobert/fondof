# fondof — Requirements

## Vision

fondof is the bridge between what you learn and what your agents do. It connects the content you consume (podcasts, blogs, conversations) with the projects you're building, helping you discover existing skills, identify where new ideas apply, and craft best-in-class skills fitted to your specific coding environment.

The blockchain layer (Monad) provides verifiable provenance and attribution but is completely invisible to the user.

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
- FR4.5: Suggest source material (podcasts, blogs) that contains relevant thinking for uncovered gaps

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

### FR7: Provenance & Attribution (Blockchain Layer — Invisible)
- FR7.1: Record source content hash on-chain when content is ingested
- FR7.2: Record skill attestation (source hashes → skill hash → benchmark score) on publish
- FR7.3: Track composition lineage (which sources contributed to which skill)
- FR7.4: Enable attribution flow when skills are used or derived by others
- FR7.5: All on-chain operations must be invisible to the user (no wallet prompts, no gas management, no confirmation screens)

### FR8: Skill Lifecycle
- FR8.1: Install skills locally for immediate use (copy for Cursor / Claude / Kiro — primary hand-off)
- FR8.2: Publish skills to SkillPool with provenance attestation (source hashes on chain, artifact in edge meta)
- FR8.3: Track skill decay — flag when source content has been updated or codebase has evolved
- FR8.4: Propose skill updates when underlying thinking or project context changes
- FR8.5: **Outcome receipts** — attach what a skill resulted in (short note + optional PR / screenshot URL) on the skill page and pool cards; quality becomes “did it help?” not only stake/use counts. Optional, honest, no fake metrics.

## Non-Functional Requirements

### NFR1: User Experience
- NFR1.1: Blockchain interactions must be completely abstracted — zero crypto UX
- NFR1.2: Content ingestion to first useful output in under 60 seconds
- NFR1.3: Discovery results must feel instant (<2s)

### NFR2: Privacy & Security
- NFR2.1: Repository code never leaves the user's control without explicit consent
- NFR2.2: Only metadata (hashes, embeddings) stored externally; source code stays local or in user's GitHub
- NFR2.3: Skills can be private (local only) or public (published with attestation)

### NFR3: Extensibility
- NFR3.1: Skill format must be agent-framework-agnostic (works with Kiro, Claude, Cursor, etc.)
- NFR3.2: Content sources must be pluggable (start with podcasts + blogs, expand later)
- NFR3.3: Project connections must be pluggable (start with GitHub, expand later)

### NFR4: Monad-Specific
- NFR4.1: Leverage Monad's 10,000 TPS and 600ms finality for responsive attestation
- NFR4.2: Use standard Solidity/EVM tooling for smart contracts
- NFR4.3: Keep on-chain storage minimal — hashes and scores, not full content

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
5. Skill publishes to SkillPool on Monad (relayer, invisible to user) → provenance verifiable via explorer
6. "I used this" raises the signal; outcome attachment (note / PR) shows on skill page + pool card
