# fondof — Project Steering

## What is fondof?

fondof turns what developers learn — or need — into **agent skills fitted to their codebase**. The hero job is a short, useful skill that can be handed to Cursor / Claude / Kiro and applied to real work.

**Brand promise:** From what you learn to what your agent does.

**North star:** a skill that is specifically useful for a real repository, followed by honest evidence of whether it helped.

**Mission:** bridge ideas and implementation — extract useful thinking, fit it to code, and help developers prove the result.

**Vision:** a living attribution graph connecting ideas, agents, codebases, and outcomes.

**Not a security product:** directories are full of slop, clones, and occasionally hostile skills; stars lag. That context motivates contestability — it does not make fondof a scanner, sandbox, or injection firewall.

The blockchain layer is optional infrastructure for public trust. Relayers may hide wallet and gas complexity, but ordinary forging and use must remain useful without a wallet or chain.

## Product hierarchy (build against this)

```text
Need or source → Extract → Fit / Forge → Copy / Use → Outcome → Share / Attribute → SkillPool proof
```

1. **Craft** — Fitted, personalised skill (primary).
2. **Hand-off** — Copy into an agent and apply to a real repo.
3. **Outcomes** — Record what changed, without inventing metrics.
4. **Attribution and discovery** — Help useful work travel back to its source and forward to other developers.
5. **SkillPool proof** — Optional downstream signal: provenance, backing, usage receipts, and challenges.

**Offchain for usefulness. Onchain for public trust.** Do not add chain mechanics to the core loop unless they create independent verification, economic commitment, or portability.

## Growth loops (build against these)

### Practitioner loop
Need or source → fitted skill → agent use → outcome → share → another developer re-forges

### Creator loop
Content gets adapted by developers → source impact page updates → creator shares the evidence → audience re-forges the idea for their own repos

### Key growth principle
The viral unit is **useful, attributable work**, not a generic skill listing or a transaction. Share outcomes, adaptations, and source impact; keep SkillPool downstream.

### Key supply-side principles
- **Attribution as distribution** — every forged skill backlinks to the source. Multiple forges = multiple permanent backlinks in real repos.
- **Creator pages, not creator accounts** — `/from/[domain]` auto-populates from forge data. No onboarding friction for creators.
- **Signal is honest** — distinguish views, copies, re-forges, claimed uses, and outcome-backed uses. Do not call a click or transaction verified project impact.
- **Not a content marketplace** — creators don't sell their content through us. We make their free/existing content more actionable and give them credit.
- **Badge embeds** — creators can embed forge-count badges in show notes / blog footers. Social proof that their content is actionable.
- **Claim is optional** — creator verifies domain ownership to access analytics. Page works without claim.

### Freemium tiers (share-to-unlock)
| | Free | Sharer | Pro |
|---|---|---|---|
| Forges/month | 3 | Unlimited | Unlimited |
| Unlock | — | Share 1 skill publicly | $ |
| GitHub publish | Manual | 1-click | 1-click + auto-sync |
| Portfolio `/u/` | Basic | Full | Full + analytics |
| Private skills | No | No | Yes |

## Core Principles

1. **Need-first, not publish-first** — Workflow starts from “I consumed something” or “I have a problem.” Discovery before creation. Need path requires no GitHub OAuth.
2. **Environment-fitted / personalised** — Skills are never generic templates. Always crafted for a specific repo’s stack, conventions, and patterns.
3. **Specifically useful** — Prefer short, actionable skills over long generic dumps. Fit check + Where it lands are craft aids, not live agent CI.
4. **Multi-source composition** — Best skills weave ideas from multiple sources, not single-source extraction.
5. **Craft hero, Proof secondary** — Copy for agents owns the title card. SkillPool, disputes, and wallets support the story. Prefer relayer. Never fake “attested” when chain is down.
6. **Skill-worthiness** — Not everything should be a skill. Distinguish one-time fixes from repeatable patterns.
7. **Not a marketplace** — We don’t list or sell generic pre-made skills. `/pool` is downstream quality discovery (draw / use / dispute), not the homepage or core creation flow.
8. **Not a registry of the ecosystem** — Compare/search informs forge; we don’t index the whole ecosystem as the product.
9. **Not a tokenization protocol** — Stakes police quality; they are not bonding curves or per-call pricing.
10. **Not a security scanner** — Challenges and signal are reputation under fire, not malware detection guarantees.

## Positioning: What fondof is NOT

When building features, ask: "Does this make us look like a marketplace / aggregator / registry / security scanner?" If yes, reconsider.

- **No install-from-catalog flow** — Link out elsewhere; our output is a NEW skill fitted to the user.
- **No pricing/monetization of skill access** — Escrow and challenge stakes are signaling / policing, not listing fees or yield.
- **No generic skill templates** — Every skill output is fitted to a specific repo (demo repos count for the OAuth-free path).
- **No fake security guarantees** — Do not claim injection-proof or malware-scanned skills.
- **SkillPool desk is allowed** — `/pool` shows live proven skills for agents to draw; that is quality discovery, not a marketplace homepage of SKUs.
- **Outcome receipts are the next craft layer** — Prefer thin, honest attachments (PR link, screenshot note) over inventing an eval dashboard.

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
- **Auth:** GitHub OAuth (session in KV); post-login `redirect` is a relative app path only; optional wallet for on-chain forger attribution

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
| `web` | Judge-facing product — floor, forge, `/pool`, `/s/[hash]`, `/u/[login]`, `/from/[source]` |
| `api` | Live HTTP edge — ingest, forge, publish, skills, challenge, auth, events, billing, github-publish, sources |
| `core` | Library used by CLI (and some shared logic); not the public API |
| `cli` | Secondary interface; do not block demos on CLI polish |
| `contracts` | **SkillPool** = quality loop; FondofAttestation = earlier attestation sketch |

## Key Design Decisions

- **Relayer + optional wallet:** Relayer submits forge/use/challenge for demos; wallet forge attributes the forger on-chain.
- **Hashes on-chain, titles + skill body at the edge:** SkillPool stores hashes; title, blurb, landing map, and capped markdown live in Worker edge cache so `/s/[hash]` is a real artifact for any judge browser — not localStorage-only.
- **Re-attach draft:** If a live skill hash has no edge markdown (or after a pool reset), `/s/[hash]` offers paste-to-attach so any browser gets sections + copy without republishing on-chain.
- **Fit check ≠ FR6 benchmark:** Forge shows a structural fit strip (sections, citations, repo tokens, length) plus a **Where it lands** path map. That is not a live agent eval on the user’s repo. Real Validation Engine stays deferred. Post-publish **Proof** = SkillPool signal (uses, escrow, losses) with sparkline motion — secondary to copying the skill for an agent.
- **Outcomes (edge meta):** Optional `outcome: { note, prUrl?, screenshotUrl? }` merged into skill meta. Honest receipts only — no invented before/after scores.
- **One product surface:** `/` is the floor; `/canvas` redirects there. Nav is Fond + Pool.
- **Agent-agnostic skill format:** Markdown skills work with Kiro, Claude, Cursor, etc. UI uses progressive section disclosure so long files aren’t a wall.
- **Web-first for Ready Spec Ship:** Hosted Netlify + Worker is the judge path; CLI is secondary.
- **Graceful degradation:** Demo shards / local draft templates when APIs fail — must stay honest in copy.
- **Demo oracle for resolve:** Challenge settle is allowlisted (`RESOLVER_LOGINS`) and signed with `FONDOF_RESOLVER_KEY` — not the hot user-operation relayer. Disclose it.

## Monad-Specific Notes

- Chain: Monad testnet
- Contract: SkillPool `0x75545e2C450897914df416d0D24aeB33a89a8b19`
- EVM compatibility: Standard Solidity ^0.8.20
- Fast finality — publish / use feel snappy for demos

## Spec References

- Requirements: #[[file:.kiro/specs/fondof/requirements.md]]
- Design: #[[file:.kiro/specs/fondof/design.md]]
- Tasks: #[[file:.kiro/specs/fondof/tasks.md]]
- Demo video: #[[file:docs/demo-video.md]]
