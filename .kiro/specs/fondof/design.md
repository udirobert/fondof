# fondof — Design

## Architecture Overview

fondof is structured as a three-layer system:

1. **Client Layer** — CLI + Web UI that the user interacts with
2. **Core Layer** — Orchestration, AI pipelines, matching, and composition logic
3. **Chain Layer** — Monad smart contracts for attestation (invisible to user)

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT LAYER                       │
│  CLI (primary for Blitz)  |  Web UI (post-Blitz)    │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                    CORE LAYER                        │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │  Ingestion  │  │  Discovery  │  │ Composition│  │
│  │  Pipeline   │  │  Engine     │  │ Engine     │  │
│  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  │
│         │                │                │         │
│  ┌──────▼────────────────▼────────────────▼──────┐  │
│  │            Project Context Store              │  │
│  │  (repo index, embeddings, conventions map)    │  │
│  └───────────────────────┬───────────────────────┘  │
│                          │                          │
│  ┌───────────────────────▼───────────────────────┐  │
│  │           Skill Registry (local + remote)     │  │
│  └───────────────────────┬───────────────────────┘  │
└──────────────────────────┼──────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────┐
│                   CHAIN LAYER                        │
│  Monad Attestation Contract (Solidity)              │
│  - attestSkill(sourceHashes, skillHash, metadata)   │
│  - queryProvenance(skillHash) → attestation record  │
│  Abstracted via server-side relayer (no user wallet)│
└─────────────────────────────────────────────────────┘
```

## Component Design

### 1. Ingestion Pipeline

**Responsibility:** Turn raw content (podcast URL, blog URL, pasted text) into structured ideas.

**Flow:**
```
Input (URL or text)
  → Content Resolver (detect type: audio, article, raw text)
  → Transcription (audio → text via Whisper / ElevenLabs Scribe)
  → Chunking (split into semantic segments with timestamps)
  → Idea Extraction (LLM: extract patterns, techniques, mental models)
  → Idea Records (structured output with metadata)
```

**Idea Record Schema:**
```typescript
interface IdeaRecord {
  id: string;
  sourceUrl: string;
  sourceHash: string;           // SHA-256 of source content
  segment: {
    startTime?: number;         // for audio (seconds)
    endTime?: number;
    startParagraph?: number;    // for text
    endParagraph?: number;
    rawText: string;            // the relevant excerpt
  };
  idea: {
    title: string;
    description: string;
    domain: string[];           // e.g. ["error-handling", "resilience"]
    applicability: string[];    // e.g. ["async", "distributed-systems"]
    patternType: "technique" | "mental-model" | "anti-pattern" | "architecture";
  };
  embedding: number[];          // vector for semantic matching
}
```

### 2. Project Context Store

**Responsibility:** Maintain a rich understanding of the user's repositories.

**GitHub Integration:**
- OAuth connection to user's GitHub
- Index selected repositories (user chooses which)
- For each repo, extract:
  - Language & framework detection
  - Dependency graph (package.json, Cargo.toml, etc.)
  - Architectural patterns (file structure, module boundaries)
  - Coding conventions (naming, error handling style, test patterns)
  - Open issues and recent PR themes
  - Existing skills already installed (.kiro/steering, SKILL.md, etc.)

**Repo Profile Schema:**
```typescript
interface RepoProfile {
  id: string;
  name: string;
  owner: string;
  languages: { language: string; percentage: number }[];
  frameworks: string[];
  dependencies: { name: string; version: string }[];
  conventions: {
    errorHandling: string;      // e.g. "anyhow + thiserror"
    testing: string;            // e.g. "vitest, integration-heavy"
    architecture: string;       // e.g. "hexagonal, DDD"
  };
  existingSkills: string[];     // skill IDs already in use
  topicEmbedding: number[];     // aggregate embedding of repo's domain
  openIssueThemes: string[];
  lastIndexed: string;
}
```

**Storage:** Local SQLite (via D1 for cloud version) + vector store for embeddings.

### 3. Discovery Engine

**Responsibility:** Match ideas ↔ projects and find existing skills.

**Two entry points:**

**Content-First (FR3):**
```
IdeaRecords + RepoProfiles
  → Semantic similarity (idea embedding vs repo topic embedding)
  → Structural match (idea.applicability vs repo.frameworks/deps)
  → Existing skill search (idea embedding vs skill catalog embeddings)
  → Skill-worthiness assessment (one-time vs repeatable pattern)
  → DiscoveryResult[]
```

**Need-First (FR4):**
```
User intent (natural language)
  → Intent embedding
  → Search skill catalogs (local + remote registries)
  → Rank by environment fit (filter by language, framework, deps)
  → Gap analysis (what's partially covered vs uncovered)
  → Source suggestions (what content addresses the gap)
  → DiscoveryResult[]
```

**Discovery Result Schema:**
```typescript
interface DiscoveryResult {
  idea: IdeaRecord;
  matchedRepos: {
    repo: RepoProfile;
    relevanceScore: number;       // 0-1
    specificFiles?: string[];     // where it applies
    rationale: string;            // why this matches
  }[];
  existingSkills: {
    skillId: string;
    name: string;
    overlapScore: number;         // 0-1 semantic overlap
    fitScore: number;             // 0-1 fit to user's env
    source: string;               // registry URL
  }[];
  skillWorthiness: {
    score: number;                // 0-1
    reasoning: string;
    recommendation: "forge-skill" | "apply-directly" | "skip";
  };
}
```

### 4. Composition Engine

**Responsibility:** Forge a skill fitted to the user's environment from one or more sources.

**Flow:**
```
Selected ideas + target repo profile + existing patterns
  → Context assembly (gather repo conventions, deps, existing skills)
  → Multi-source synthesis (LLM: weave ideas into coherent skill)
  → Environment fitting (adapt to specific stack/conventions)
  → Conflict detection (check against existing skills)
  → Skill draft with citations
```

**Output Skill Format (agent-framework-agnostic):**
```markdown
---
title: [Skill Name]
domain: [domains]
applicability: [languages, frameworks]
sources:
  - url: [source URL]
    segment: [timestamp or paragraph range]
    contribution: [what this source contributed]
provenance:
  sourceHashes: [array of content hashes]
  composedAt: [ISO timestamp]
  fittedTo: [repo name]
---

# [Skill Title]

## Context
[When this skill applies and what it assumes about the environment]

## Guidance
[The actual skill content — patterns, techniques, decision criteria]

## Anti-patterns
[What to avoid, sourced from content]

## References
[Cited segments with timestamps/links]
```

### 5. Validation Engine (Post-Blitz)

**Responsibility:** Benchmark skill quality against real tasks.

- Generate synthetic tasks from the target repo (e.g., "write a PR that adds error handling to module X")
- Run tasks with and without the skill
- Compare outputs on correctness, style adherence, convention compliance
- Score relative to existing alternatives

### 6. Chain Layer (Monad Attestation)

**Responsibility:** Immutable provenance records, invisible to user.

**Smart Contract Design:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FondofAttestation {
    struct Attestation {
        bytes32 skillHash;          // SHA-256 of skill content
        bytes32[] sourceHashes;     // hashes of source content
        uint16 overlapScore;        // 0-10000 (basis points)
        uint16 benchmarkScore;      // 0-10000 (basis points)
        address creator;            // relayer address (on behalf of user)
        uint64 timestamp;
    }

    mapping(bytes32 => Attestation) public attestations;
    mapping(address => bytes32[]) public creatorSkills;

    event SkillAttested(
        bytes32 indexed skillHash,
        address indexed creator,
        uint64 timestamp
    );

    function attestSkill(
        bytes32 skillHash,
        bytes32[] calldata sourceHashes,
        uint16 overlapScore,
        uint16 benchmarkScore
    ) external {
        require(attestations[skillHash].timestamp == 0, "Already attested");
        
        attestations[skillHash] = Attestation({
            skillHash: skillHash,
            sourceHashes: sourceHashes,
            overlapScore: overlapScore,
            benchmarkScore: benchmarkScore,
            creator: msg.sender,
            timestamp: uint64(block.timestamp)
        });
        
        creatorSkills[msg.sender].push(skillHash);
        emit SkillAttested(skillHash, msg.sender, uint64(block.timestamp));
    }

    function getAttestation(bytes32 skillHash) 
        external view returns (Attestation memory) 
    {
        return attestations[skillHash];
    }
}
```

**Relayer Design:**
- Server-side wallet signs transactions on behalf of users
- User never manages keys, gas, or approvals
- Relayer is a Cloudflare Worker with a managed private key
- Gas is sponsored (fondof pays, cost is negligible on Monad at scale)

### 7. Data Flow (End-to-End)

**Content-First Flow:**
```
1. User pastes podcast URL
2. Ingestion Pipeline → IdeaRecords[]
3. Discovery Engine matches ideas against RepoProfiles
4. User sees: "Idea A → repo X, Idea B → already covered, Idea C → novel"
5. User selects Idea C for repo X
6. Composition Engine → Skill draft (fitted to repo X)
7. User reviews/edits
8. Skill installed locally OR published
9. If published: Relayer → Monad attestation (invisible)
```

**Need-First Flow:**
```
1. User describes need: "better error handling in my async Rust code"
2. Discovery Engine searches catalogs, ranks by env fit
3. User sees: "3 existing skills, 1 partial match, gap in X"
4. User says "forge something for the gap"
5. Discovery Engine suggests source material
6. User optionally adds a podcast/blog they know about
7. Composition Engine → Skill draft
8. (same as steps 7-9 above)
```

## Technology Choices

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| CLI | TypeScript + Commander.js | Fast to build, good DX |
| Core API | Cloudflare Workers | Serverless, fast, global edge |
| Database | D1 (SQLite) | Structured data, repo profiles |
| Vector Store | Vectorize (Cloudflare) | Embeddings for semantic matching |
| Transcription | ElevenLabs Scribe / Whisper | High-quality, speaker diarization |
| LLM | Workers AI / Claude API | Idea extraction, composition |
| Blockchain | Monad (Solidity) | EVM, high throughput, low cost |
| Contract Tooling | Foundry (forge, cast) | Standard Solidity dev |
| GitHub Integration | GitHub REST/GraphQL API | Repo indexing |
| Auth | GitHub OAuth | Natural for the user base |

## Blitz Scope (v1 — 1 Day)

For Monad Blitz, we cut to the essential demo loop:

1. **Ingestion** — podcast URL → transcription → idea extraction (working)
2. **Project Context** — GitHub OAuth → repo indexing (working, 1-2 repos)
3. **Discovery** — ideas matched to repos + existing skill check (working)
4. **Composition** — forge one skill fitted to a repo (working)
5. **Attestation** — skill hash + source hashes recorded on Monad (working)
6. **Verification** — query the contract to show provenance (demo)

**Deferred to post-Blitz:**
- Validation/benchmarking engine
- Skill decay tracking
- Multi-user / registry
- Need-first entry point (focus on content-first for demo)
- Web UI (CLI only for Blitz)
