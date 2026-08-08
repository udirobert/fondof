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

## Frontend Design (Web UI — Post-Blitz, but inform CLI output now)

### Design Philosophy

fondof's UI is not a chat interface, not a code editor, and not a marketplace grid. It's a **knowledge bridge** — visualizing the flow from content you consume → ideas extracted → projects they match → skills forged.

The metaphor is **flow and transformation**, not conversation.

### Differentiation from existing AI UI libraries

Existing libraries (AICSS, Beautiful UI) solve for chat/agent UX patterns: thinking states, streaming text, tool calls. fondof's interaction patterns are unique:

| Pattern | What it needs | Why it's different |
|---------|---------------|-------------------|
| Provenance graph | Visual lineage: source → ideas → skill | Not a chat bubble or a table |
| Repo-idea matching | Spatial relationships between content and code | Not a search results list |
| Composition canvas | Weaving threads from multiple sources | Not a form or editor |
| Discovery layer | Existing skills alongside novel gaps | Not a marketplace grid |

### Visual Language

**Core concept: The Flow Canvas**

The primary UI is a spatial canvas (not a linear feed) where:
- **Sources** appear on the left (podcast episodes, blog posts) as media cards
- **Ideas** extracted from them flow as connected nodes (animated connections)
- **Your repos** sit on the right as persistent context
- **Match lines** connect ideas to repos they apply to (animated, scored)
- **Skills** crystallize where ideas meet repos (the output)

This creates a visual mental model: "content flows through fondof and becomes skills in my projects."

### Key UI Patterns (fondof-specific)

#### 1. Source Card
A compact media card representing ingested content. Shows:
- Source type icon (podcast/blog/conversation)
- Title, author, duration/length
- Extraction progress (animated waveform for audio, reading progress for text)
- Number of ideas extracted (appears as nodes emerge)
- Provenance hash indicator (subtle, a small verified badge)

#### 2. Idea Node
A floating, connectable node representing an extracted idea:
- Title + one-line description
- Domain/applicability tags (colored chips)
- Skill-worthiness indicator (glow intensity: dim = one-time, bright = high skill value)
- Connection ports (link to source on left, link to repos on right)
- Status: novel (green), partially covered (amber), duplicate (red/dimmed)

#### 3. Repo Context Panel
A persistent sidebar/dock showing connected repositories:
- Repo name + language/framework badges
- Health indicator (last indexed, freshness)
- Matched ideas count (live updating as new content is ingested)
- Expandable: shows specific files/modules where ideas apply

#### 4. Match Beam
Animated connection between an idea node and a repo:
- Width/opacity encodes relevance score
- Color encodes type (green = novel opportunity, amber = partial coverage, red = conflict)
- Hovering reveals the specific match rationale
- Uses animated beam effect (inspired by beam.jakubantalik.com) for active connections

#### 5. Composition View
When the user selects ideas to forge into a skill:
- Ideas slide into a central "forge" area
- Source segments are displayed as quotable cards with timestamps/citations
- Repo context loads alongside (conventions, existing patterns)
- The skill draft builds live (streaming text, similar to Beautiful UI patterns)
- Conflict warnings pulse if the draft contradicts existing skills

#### 6. Attestation Confirmation
After publishing, a subtle visual confirms the on-chain attestation:
- A brief "verified" animation (not blockchain-themed — think checkmark crystallizing)
- The provenance hash appears as a tiny copyable badge
- No gas, no wallet, no chain terminology anywhere

### Transitions & Micro-interactions

Drawing from transitions.dev and the reference set:

| Interaction | Transition |
|-------------|-----------|
| Idea extracted from source | Node emerges with scale + blur (thinking orb → crystallized node) |
| Match found to repo | Beam draws from idea to repo with spring ease |
| Skill-worthiness assessed | Glow intensity animates from neutral to scored |
| Duplicate detected | Node dims + redline connection to existing skill |
| Skill forged | Ideas converge into center with particle merge → skill card materializes |
| Attestation confirmed | Subtle pulse + verified badge fade-in (< 600ms, matches Monad finality) |

### Loading & Processing States

Using thinking orbs / canvas-based indicators for:
- **Transcribing**: Waveform visualization (audio playing through the system)
- **Extracting ideas**: Orb in "working" state, with idea nodes emerging one by one
- **Matching**: Beams scanning across repos (searching animation)
- **Composing**: Forge glow building intensity as the skill draft streams in

### Technology Choices (Frontend)

| Choice | Technology | Rationale |
|--------|-----------|-----------|
| Framework | Next.js 16.3+ (App Router) | Latest: view transitions, cache components, instant navigations, streaming |
| Styling | Tailwind CSS 4 | Utility-first, fast iteration |
| Canvas/WebGL | Canvas UI (selective) | For beam effects, orbs, particle merge — GPU-accelerated overlays on live HTML |
| Transitions | View Transitions API + Framer Motion | Page-level (native) + component-level (spring physics) |
| AI UI primitives | AICSS / Beautiful UI (selective) | For streaming text, code blocks in composition view |
| Spatial layout | Custom (CSS Grid + absolute positioning) | The flow canvas needs custom spatial logic, no existing layout lib fits |
| State | Zustand | Lightweight, works well with streaming/real-time updates |
| Data fetching | Server Components + TanStack Query | Server for initial load, client for real-time updates |

### Responsive Strategy

- **Desktop (primary)**: Full flow canvas with spatial layout
- **Tablet**: Simplified flow, vertical rather than horizontal
- **Mobile**: Card-based linear feed (no spatial canvas), core functionality preserved

### Accessibility

- All canvas-based effects degrade gracefully (WebGL off → plain HTML underneath)
- Respect `prefers-reduced-motion` (disable beams, orbs, particle effects)
- Keyboard-navigable flow canvas (tab between nodes, enter to expand)
- Screen reader: idea nodes and connections described as a tree structure
- Color-blind safe: use shape + pattern alongside color for status encoding
