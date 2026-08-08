# fondof — Project Steering

## What is fondof?

fondof is the bridge between what you learn and what your agents do. It connects content you consume (podcasts, blogs) with the projects you're building — helping you discover existing skills, identify where ideas apply to your work, and craft best-in-class skills fitted to your specific coding environment.

The blockchain layer (Monad **SkillPool**) records provenance and a **quality signal** (backing, uses, challenge losses). Relayer can publish without a wallet; connecting a wallet lets you forge as yourself. Chain details stay secondary to the craft UX — not a gas theater, but not pretend-invisible either.

## Core Principles

1. **Need-first, not publish-first** — The user's workflow starts from either "I consumed something interesting" or "I have a problem." Discovery and matching come before creation. Need path requires no GitHub OAuth.
2. **Environment-fitted** — Skills are never generic. They're always crafted for a specific repo's stack, conventions, and patterns.
3. **Multi-source composition** — The best skills weave ideas from multiple sources, not single-source extraction.
4. **Craft hero, Proof secondary** — First job is a short fitted skill you can copy into Cursor / Claude / Kiro. SkillPool signal, disputes, and wallets support that story; they do not own the title card. Prefer relayer so publish works without wallet setup. Never fake “published” when chain is down.
5. **Skill-worthiness** — Not everything should be a skill. The system actively distinguishes one-time fixes from repeatable patterns.
6. **Not a marketplace** — We don't list or sell pre-made skills. SkillPool desk is a *quality loop* (draw / use / dispute), not a catalog of products for sale.
7. **Not a registry of the ecosystem** — We search existing skills (via Exa Compare) to inform forge decisions — we don't index the whole ecosystem as a product.
8. **Not a tokenization protocol** — Stakes police quality; they are not bonding curves or per-call pricing.

## Positioning: What fondof is NOT

When building features, always ask: "Does this make us look like a marketplace/aggregator/registry?" If yes, reconsider.

- **No install-from-catalog flow** — We link out to where skills live elsewhere; our output is a NEW skill fitted to the user.
- **No pricing/monetization of skill access** — Escrow and challenge stakes are signaling / policing, not listing fees you earn back as yield.
- **No generic skill templates** — Every skill output is fitted to a specific repo (demo repos count for the OAuth-free path).
- **SkillPool desk is allowed** — `/pool` shows live proven skills for agents to draw; that is quality discovery, not a marketplace homepage of SKUs.

Alternatives to redirect users toward:
- Marketplaces: ClawHub, LobeHub, SkillsMP, skills.sh
- Aggregators: VoltAgent/awesome-agent-skills, AmazingAng/skilldb
- Official repos: anthropics/skills, openai/skills
- Crypto/DeFi skills: OKX OnchainOS, Allium AgentHub
- Skill economics: x402 Protocol, ERC-8239, Torch Market

## Tech Stack

- **Language:** TypeScript (monorepo with pnpm workspaces)
- **Packages:** `web`, `api`, `cli`, `core`, `contracts`, `shared`
- **Runtime:** Cloudflare Workers (`packages/api`), Next.js on Netlify (`packages/web`), Node.js (CLI)
- **Transcription:** ElevenLabs Scribe API (optional)
- **Search:** Exa (Compare stage)
- **Content extraction:** Firecrawl (primary), Mozilla Readability (fallback)
- **LLM:** Workers AI / optional Claude
- **Blockchain:** Monad (EVM L1) — **SkillPool.sol** is the demo contract; `FondofAttestation.sol` is legacy
- **Contract Tooling:** Foundry
- **Auth:** Optional GitHub PAT in browser for private repos; need/URL path works without it

## Coding Conventions

- Use ES modules (`import`/`export`), never CommonJS
- Prefer `interface` over `type` for object shapes
- Use `zod` for runtime validation of external inputs where practical
- Error handling: explicit failures to the user; never call offline attest “published”
- Name files in kebab-case: `idea-record.ts`, `repo-profile.ts`
- Keep functions small and pure where possible; side effects at the edges

## Project Structure

```
fondof/
├── .kiro/
│   ├── specs/fondof/        # Requirements, design, tasks
│   └── steering/            # This file + forged skill examples
├── docs/
│   └── demo-video.md        # Ready Spec Ship video script
├── packages/
│   ├── web/                 # Next.js UI (primary product)
│   ├── api/                 # Cloudflare Worker HTTP edge
│   ├── cli/                 # Commander.js CLI (secondary)
│   ├── core/                # Pipelines for CLI / shared logic
│   ├── contracts/           # Foundry — SkillPool (+ legacy attestation)
│   └── shared/              # Shared types
├── pnpm-workspace.yaml
├── package.json
├── .env.example
└── README.md
```

### Package roles (do not conflate)

| Package | Role |
|---------|------|
| `web` | Judge-facing product — floor, forge, `/pool`, `/s/[hash]` |
| `api` | Live HTTP edge — ingest, forge, publish, skills, challenge |
| `core` | Library used by CLI (and some shared logic); not the public API |
| `cli` | Secondary interface; do not block demos on CLI polish |
| `contracts` | **SkillPool** = quality loop; FondofAttestation = earlier attestation sketch |

## Key Design Decisions

- **Relayer + optional wallet:** Relayer submits forge/use/challenge for demos; wallet forge attributes the forger on-chain.
- **Hashes on-chain, titles + skill body at the edge:** SkillPool stores hashes; title, blurb, landing map, and capped markdown live in Worker edge cache so `/s/[hash]` is a real artifact for any judge browser — not localStorage-only.
- **Fit check ≠ FR6 benchmark:** Forge shows a structural fit strip (sections, citations, repo tokens, length) plus a **Where it lands** path map. That is not a live agent eval on the user’s repo. Real Validation Engine stays deferred. Post-publish **Proof** = SkillPool signal (uses, escrow, losses) with sparkline motion — secondary to copying the skill for an agent.
- **One product surface:** `/` is the floor; `/canvas` redirects there. Nav is Fond + Pool.
- **Agent-agnostic skill format:** Markdown skills work with Kiro, Claude, Cursor, etc. UI uses progressive section disclosure so long files aren’t a wall.
- **Web-first for Ready Spec Ship:** Hosted Netlify + Worker is the judge path; CLI is secondary.
- **Graceful degradation:** Demo shards / local draft templates when APIs fail — must stay honest in copy.
- **Demo oracle for resolve:** Challenge settle is relayer-operated in this build — disclose it.

## Monad-Specific Notes

- Chain: Monad testnet
- Contract: SkillPool `0x1c0b6C42acD41BE5582a8F34137Acb713107170a`
- EVM compatibility: Standard Solidity ^0.8.20
- Fast finality — publish / use feel snappy for demos

## Spec References

- Requirements: #[[file:.kiro/specs/fondof/requirements.md]]
- Design: #[[file:.kiro/specs/fondof/design.md]]
- Tasks: #[[file:.kiro/specs/fondof/tasks.md]]
- Demo video: #[[file:docs/demo-video.md]]
