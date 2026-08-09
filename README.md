# fondof

**Forge skills fitted to *your* code — then prove they helped.**

fondof turns what you learn (or a concrete need) into a **customised, personalised skill** for a specific repo — not another generic clone from a directory. Copy it into Cursor / Claude / Kiro; publish to **SkillPool** on Monad when you want provenance and a contestable quality signal.

**Why this exists:** agent-skill directories are flooded with slop and clones; stars lag; some skills are actively untrustworthy. fondof is **not** a security scanner — it is a craft forge + quality surface so *your* useful skills can be discovered, used, and challenged.

## Built with Kiro

fondof was specified and steered in [Kiro](https://kiro.dev), then shipped as a working web + API + on-chain loop. Judges and contributors can read the agent trail in this repo:

| Artifact | Path |
|----------|------|
| Requirements | [`.kiro/specs/fondof/requirements.md`](.kiro/specs/fondof/requirements.md) |
| Design | [`.kiro/specs/fondof/design.md`](.kiro/specs/fondof/design.md) |
| Tasks | [`.kiro/specs/fondof/tasks.md`](.kiro/specs/fondof/tasks.md) |
| Project steering | [`.kiro/steering/project.md`](.kiro/steering/project.md) |
| Example forged skill | [`.kiro/steering/optimizing-next-js-performance-with-turbopack-and-.md`](.kiro/steering/optimizing-next-js-performance-with-turbopack-and-.md) |

**Spec → ship:** the live product is the web floor (extract → forge → SkillPool) backed by a Cloudflare Worker API and `SkillPool.sol` on Monad testnet — built under that Kiro spec, not a separate rewrite.

This repo also targets **Ready, Spec, Ship** (Kiro) and Monad demo contexts. See [`.kiro/`](.kiro/) for the full steering + specs package required by the hackathon.

## Product hierarchy

1. **Craft (primary)** — A short skill fitted to *your* stack, conventions, and paths — personalised and specifically useful.
2. **Hand-off** — Copy into Cursor / Claude / Kiro; use it on a real repo.
3. **Proof (near)** — SkillPool signal (backing + uses − challenge losses); disputes police junk and malice without becoming a scanner product.
4. **Outcomes (next)** — Attach what the skill *resulted in* (PR, UI delta, repo improvement) so quality is “did it help?” not only “did people stake/use it?” Thin path: `/s/[hash]` → Attach outcome (note + optional PR / screenshot URL) via edge meta; pool cards show a Result line when present.
## What fondof does

1. **Ingest** — Paste a podcast/blog URL *or* state a need in plain text (no GitHub required). fondof extracts discrete idea shards.
2. **Discover** — Shards are fitted to your repos (demo repos work out of the box). Compare finds overlapping skills when you ask.
3. **Forge** — Compose a skill preview fitted to your stack. Publish puts skin in escrow on SkillPool.
4. **SkillPool** — Agents use and dispute skills; score is quality signaling on Monad. Wallet optional (you = forger) or fondof relayer publishes for you.

## For content creators (supply-side)

Your podcast / blog / talk is being turned into actionable skills by developers. fondof gives you:

- **`/from/[your-domain]`** — a public page showing all skills forged from your content, who forged them, and where they landed
- **Permanent backlinks** — every skill file in every repo credits your content as the source
- **Embeddable badge** — show forge count in your show notes: `![forged from](fondof.netlify.app/badge/from/your-domain.svg)`
- **Honest signal** — forge count from real developers who fitted skills to real repos (not vanity downloads)

Creators don't need an account. Pages auto-populate from forge data. Optionally verify your domain for analytics.

## Two entry points

**Content-first:** "I just listened to a great podcast — where do these ideas apply across my projects?"

**Need-first (OAuth-free):** "I have a problem in my code — extract shards from the need, forge, publish." Use the **Need** tab on the start pad — no GitHub login required for the happy path.

## What fondof is NOT

fondof occupies a specific position in the agent skills ecosystem. If you're looking for something else, here's where to go:

### Not a skill marketplace

We don't host, list, or sell pre-made skills. If you want to browse and install existing skills:
- [ClawHub / OpenClaw](https://github.com/topics/openclaw-skills) — The "npm for skills" with certified and community collections
- [LobeHub Skills](https://lobehub.com/skills) — Curated one-click install skills
- [skills.sh](https://skills.sh) — CLI installer for cross-agent skills
- [SkillsMP](https://skillsmp.com) — Searchable marketplace

### Not a skill aggregator

We don't index or deduplicate the existing skill ecosystem. If you want a catalog:
- [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) — Broad cross-agent collection
- [AmazingAng/skilldb](https://github.com/AmazingAng/skilldb) — Large searchable aggregation
- [anthropics/skills](https://github.com/anthropics/skills) — Official Anthropic examples
- [openai/skills](https://github.com/openai/skills) — Official OpenAI Codex skills

### Not a skill tokenization/pricing protocol

We don't price skills via tokens, bonding curves, or per-request payments. SkillPool staking is **quality signaling / expensive policing**, not yield. If you want skill economics:
- [x402 Protocol / Coinbase Bazaar](https://x402.org) — Pay-per-call in USDC on Base
- [ERC-8239 Skill Registry](https://eips.ethereum.org/EIPS/eip-8239) — On-chain skill identity as NFTs
- [Torch Market](https://torch.market) — Bonding curves for agent tokens

### Not a domain-specific skill suite

We're domain-agnostic. If you need pre-built DeFi/crypto agent capabilities:
- [OKX OnchainOS](https://www.okx.com) — 16+ specialized on-chain skills
- [Allium AgentHub](https://allium.so) — On-chain data across 150+ chains
- [CoinMarketCap AI Agent Hub](https://coinmarketcap.com) — Market reports and token research
- [Binance AI Agent Skills](https://binance.com) — Market discovery and execution

### Not an AI security / malware scanner

We don’t claim prompt-injection detection, sandboxing, or audited skill binaries. Contestable reputation (backing, uses, challenges) is social/economic filter — not a guarantee that a skill is safe. Treat agent skills like untrusted software; forge ones you understand for *your* repo.

### fondof IS for when you...

- Want a **personalised** skill for YOUR repo — not a directory clone
- Listen to a podcast (or state a need) and want insights turned into something **specifically useful**
- Want **provenance** — know where a skill’s thinking came from
- Want to **compose** from multiple sources, then copy into your agent
- Want a **quality loop** — uses raise score; disputes police slop and bad actors
- (Soon) Want to **show outcomes** — better UI, cleaner PR, measurable repo delta attached to the skill

## Quick start (judges — hosted first)

**Live app:** [https://fondof.netlify.app](https://fondof.netlify.app)  
**API:** [https://fondof-api.fondof.workers.dev](https://fondof-api.fondof.workers.dev)  
**Contract:** SkillPool on Monad testnet — `0x75545e2C450897914df416d0D24aeB33a89a8b19`

### Testing / demo clicks

1. Open the live app (no install).
2. **Need** tab → type e.g. `retry budgets for async TypeScript fetch` → Extract (no GitHub).
   - Or **URL** tab → paste a public article URL.
3. Select 1–2 Forge-worthy shards → open Forge → **Skill for {repo}** → Fit check → **Where it lands** → expandable sections.
4. **Publish** → paper skill card → **Copy for Cursor / Claude / Kiro** (primary). Open skill for Proof if you want.
5. Skill page → skim sections → **Copy for Cursor / Claude / Kiro** → **I used this** for Proof. Optional Dispute.
6. Visit [**/pool**](https://fondof.netlify.app/pool) → Draw a skill / browse paper cards.

**Honesty:** If chain/relayer is unreachable, publish stays a local draft — we do not fake “published.” Challenge **resolve** is a demo oracle (relayer), not decentralized adjudication. **Fit check** is structural heuristics (sections / citations / repo tokens) — not a live agent eval on your repo (FR6 validation engine is deferred). Offline LLM fallbacks may seed demo shards when extract fails — labeled as such in the UI when possible.

Demo video script: [`docs/demo-video.md`](docs/demo-video.md).  
Package roles: [`docs/architecture.md`](docs/architecture.md).

### Local secondary path

```bash
pnpm install

# API (Cloudflare Worker)
cd packages/api && pnpm dev

# Web (another terminal) — point at local or deployed API
cd packages/web
# optional: NEXT_PUBLIC_API_URL=http://127.0.0.1:8787
pnpm dev
```

Copy [`.env.example`](.env.example) to `.env` / Worker secrets. Never commit real keys. Relayer + LLM secrets live in Wrangler secrets / Netlify env, not in git.

### CLI (secondary / WIP)

```bash
pnpm --filter @fondof/cli build
# fondof ingest | forge | publish | challenge | status
```

The **web floor** is the primary product for demos and Ready Spec Ship judging.

## Architecture

```
packages/
├── web/          Next.js UI — extract, forge, SkillPool desk (/pool, /s/[hash])
├── api/          Cloudflare Worker — ingest, forge, publish, skills, challenge
├── cli/          Commander.js CLI (secondary to web)
├── core/         Shared pipelines used by CLI (ingestion, composition, relayer helpers)
├── contracts/    Foundry — SkillPool.sol (demo contract); FondofAttestation.sol (legacy)
└── shared/       Shared TypeScript types
```

**Package roles:** `api` is the live HTTP edge; `core` backs the CLI and reusable logic; `web` talks to `api` over HTTPS. SkillPool is the on-chain quality loop — not a marketplace listing fee.

## Tech stack

- **TypeScript** monorepo (pnpm workspaces)
- **Next.js 16.3** + Framer Motion for the web UI (Netlify)
- **Cloudflare Workers** (Hono) for the API
- **ElevenLabs Scribe** for podcast transcription (optional)
- **Cloudflare Workers AI** for LLM + embeddings
- **Exa** for semantic skill search (Compare stage)
- **Firecrawl / Readability** for article extraction
- **Monad** (EVM L1) for SkillPool
- **viem / wagmi** for on-chain interaction
- **Foundry** for Solidity development

## Environment variables

See [`.env.example`](.env.example) for placeholders. Summary:

```bash
# On-chain (SkillPool)
MONAD_RPC_URL=https://…                 # Monad testnet RPC
FONDOF_RELAYER_KEY=0x…                  # Relayer wallet (Worker secret)
FONDOF_CONTRACT_ADDRESS=0x75545e2C450897914df416d0D24aeB33a89a8b19

# Web
NEXT_PUBLIC_API_URL=https://fondof-api.fondof.workers.dev
NEXT_PUBLIC_FONDOF_CONTRACT_ADDRESS=0x75545e2C450897914df416d0D24aeB33a89a8b19

# Auth (GitHub OAuth)
GITHUB_CLIENT_ID=…                      # GitHub OAuth app
GITHUB_CLIENT_SECRET=…                  # GitHub OAuth app

# Billing (Stripe)
STRIPE_SECRET_KEY=sk_test_…             # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_…           # Stripe webhook signing
STRIPE_PRICE_ID=price_…                 # Pro plan Price ID

# LLM / ingest (Worker secrets)
CLOUDFLARE_ACCOUNT_ID=…
CLOUDFLARE_API_TOKEN=…                  # or CF_API_TOKEN
# ANTHROPIC_API_KEY=…                   # optional
ELEVENLABS_API_KEY=…                    # optional podcasts
EXA_API_KEY=…                           # optional Compare
FIRECRAWL_API_KEY=…                     # optional articles
```

## Deployment

### API (Cloudflare Worker)

```bash
cd packages/api

# Create KV namespace for sessions + billing
wrangler kv namespace create SESSIONS
# Copy the ID into wrangler.toml → [[kv_namespaces]] id = "…"

# Set secrets
wrangler secret put FONDOF_RELAYER_KEY
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put STRIPE_PRICE_ID

# Deploy
wrangler deploy
```

### Web (Netlify)

Set these env vars in Netlify dashboard (or `netlify.toml`):
- `NEXT_PUBLIC_API_URL` → your Worker URL
- `NEXT_PUBLIC_FONDOF_CONTRACT_ADDRESS` → SkillPool address

### GitHub OAuth App

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Create a new OAuth App
3. **Authorization callback URL:** `https://YOUR-WORKER.workers.dev/api/auth/callback`
4. Copy Client ID and Client Secret into Worker secrets

### Stripe

1. Create a Product + Price in the [Stripe Dashboard](https://dashboard.stripe.com)
2. Set `STRIPE_PRICE_ID` to the Price ID
3. Create a Webhook endpoint → `https://YOUR-WORKER.workers.dev/api/billing/webhook`
4. Events to listen for: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.paused`
5. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`

## Contributing

Built for **Ready, Spec, Ship** (Kiro) and Monad demos. Specs, steering, and task status live under [`.kiro/`](.kiro/). Prefer the hosted judge path above; open issues/PRs against the web + API loop first.

## License

MIT
