# fondof — Project Steering

## What is fondof?

fondof is the bridge between what you learn and what your agents do. It connects content you consume (podcasts, blogs) with the projects you're building — helping you discover existing skills, identify where ideas apply to your work, and craft best-in-class skills fitted to your specific coding environment.

The blockchain layer (Monad) provides verifiable provenance and attribution but is completely invisible to the user.

## Core Principles

1. **Need-first, not publish-first** — The user's workflow starts from either "I consumed something interesting" or "I have a problem." Discovery and matching come before creation.
2. **Environment-fitted** — Skills are never generic. They're always crafted for a specific repo's stack, conventions, and patterns.
3. **Multi-source composition** — The best skills weave ideas from multiple sources, not single-source extraction.
4. **Invisible blockchain** — No wallets, no gas, no confirmations. The chain is infrastructure, not UX.
5. **Skill-worthiness** — Not everything should be a skill. The system actively distinguishes one-time fixes from repeatable patterns.

## Tech Stack

- **Language:** TypeScript (monorepo with pnpm workspaces)
- **Packages:** `cli`, `core`, `contracts`, `shared`
- **Runtime:** Cloudflare Workers (core API), Node.js (CLI)
- **Database:** D1 (SQLite) for structured data
- **Vectors:** Cloudflare Vectorize for embeddings/semantic matching
- **Transcription:** ElevenLabs Scribe API
- **LLM:** Workers AI / Claude API
- **Blockchain:** Monad (EVM L1, Solidity contracts)
- **Contract Tooling:** Foundry (forge, cast, anvil)
- **Auth:** GitHub OAuth (device flow for CLI)

## Coding Conventions

- Use ES modules (`import`/`export`), never CommonJS
- Prefer `interface` over `type` for object shapes
- Use `zod` for runtime validation of external inputs (API responses, user input)
- Error handling: explicit Result types where possible, thrown errors for truly exceptional cases
- Name files in kebab-case: `idea-record.ts`, `repo-profile.ts`
- Keep functions small and pure where possible; side effects at the edges
- All LLM prompts live in dedicated prompt files (`*.prompt.ts`) separate from logic

## Project Structure

```
fondof/
├── .kiro/
│   ├── specs/fondof/        # Requirements, design, tasks
│   └── steering/            # This file + future steering rules
├── packages/
│   ├── cli/                 # Commander.js CLI application
│   ├── core/                # Business logic, pipelines, engines
│   ├── contracts/           # Foundry project (Solidity)
│   ├── shared/              # Shared types, schemas, utils
│   └── web/                 # Next.js 16.3+ frontend (App Router)
├── pnpm-workspace.yaml
├── package.json             # Root workspace config
├── tsconfig.json            # Base TS config
└── README.md
```

## Key Design Decisions

- **Relayer pattern for blockchain:** A server-side wallet submits transactions on behalf of users. Users never manage keys. Gas is sponsored.
- **Local-first data:** Repo profiles and idea records are stored locally (SQLite). Only hashes go on-chain.
- **Agent-agnostic skill format:** Output skills as markdown with YAML frontmatter. Works with Kiro, Claude, Cursor, or any agent that reads skill files.
- **CLI-first for Blitz:** Web UI is post-hackathon. The CLI is the primary interface.
- **Flow canvas UI:** The web frontend is a spatial canvas (not a linear feed). Sources on the left, ideas as connected nodes in the center, repos on the right, with animated beams showing matches. The metaphor is flow and transformation, not conversation.
- **Frontend stack:** Next.js 16.3+ (App Router, streaming, view transitions), Tailwind 4, Canvas UI (WebGL effects), Framer Motion (springs), Zustand (state), TanStack Query (data fetching).
- **Graceful degradation:** All canvas/WebGL effects fall back to plain HTML. Respect `prefers-reduced-motion`. Keyboard navigable.

## Monad-Specific Notes

- Chain ID: Check Monad docs for current testnet/mainnet ID
- RPC: Use Monad's public RPC endpoints
- EVM compatibility: Standard Solidity ^0.8.20, no Monad-specific opcodes needed
- Block time: 300ms, finality: 600ms — attestations feel instant
- Deploy with `forge create` or `forge script`

## Spec References

- Requirements: #[[file:.kiro/specs/fondof/requirements.md]]
- Design: #[[file:.kiro/specs/fondof/design.md]]
- Tasks: #[[file:.kiro/specs/fondof/tasks.md]]
