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

**How Kiro shaped the build** (concrete, verifiable in the diff + specs):

- **Spec first, code second.** `requirements.md` (FR1–FR8) → `design.md` (3-layer architecture, component schemas) → `tasks.md` (phased checklist). The phases in `tasks.md` map 1:1 onto the commit history (Phase 1 scaffold → … → Phase 9 web UI), and the git log dates all fall inside the competition period.
- **Steering file as a living constraint.** `.kiro/steering/project.md` pins the decisions the agent had to respect: *"Not a security scanner"*, *"Craft hero, Proof secondary"*, *"Never fake 'published' when the chain is down"*, *"No generic skill templates."* These are visible in the shipped code — e.g. the relayer fallback keeps publish a local draft, fit-check copy says "structural heuristics, not a live agent eval", and forge always names the target repo.
- **Honest-degradation principle.** The steering rule *"explicit failures to the user; never call offline attest 'published'"* is implemented across the floor: need-extract labels its offline fallback, forge shows a visible notice on template fallback, publish stays a draft when the chain is unreachable.
- **Example steering output.** `.kiro/steering/optimizing-next-js-performance-with-turbopack-and-.md` is a real skill *fondof itself forged* (from a Next.js perf article, fitted to this repo) — dogfooding the product with the tool that built it.

This repo targets **Ready, Spec, Ship** (Kiro). See [`.kiro/`](.kiro/) for the full steering + specs package required by the hackathon.

## Product hierarchy

1. **Craft (primary)** — A short skill fitted to *your* stack, conventions, and paths — personalised and specifically useful.
2. **Hand-off** — Copy into Cursor / Claude / Kiro; use it on a real repo.
3. **Proof** — SkillPool signal (backing + uses − challenge losses); disputes police junk and malice without becoming a scanner product.
4. **Outcomes** — Attach what the skill *resulted in* (PR, UI delta, repo improvement) so quality is “did it help?” not only “did people stake/use it?” Thin path: `/s/[hash]` → Attach outcome (note + optional PR / screenshot URL) via edge meta; pool cards show a Result line when present.

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
- Want to **show outcomes** — better UI, cleaner PR, measurable repo delta attached to the skill

## Quick start (judges — hosted first)

**Live app:** [https://fondof.netlify.app](https://fondof.netlify.app)  
**API:** [https://fondof-api.trustfall.workers.dev](https://fondof-api.trustfall.workers.dev)  
**Contract:** SkillPool on Monad testnet — `0x75545e2C450897914df416d0D24aeB33a89a8b19`

### Judges: 5-minute click path (live, no install)

Open [https://fondof.netlify.app](https://fondof.netlify.app). Every step below is live — the shards you see are extracted by an LLM from **your** input at click time, not pre-baked:

1. **Extract from a need (no account, no GitHub).** **Need** tab → type `retry budgets for async TypeScript fetch` → click **Forge** (Need-tab submit runs extraction, not the forge panel). The API extracts discrete idea shards from your exact text (~5–15 s). Type something else (e.g. `structured logging for worker services`) and you'll get different shards — it's a live call, not a canned list.
2. **Or extract from a URL.** **URL** tab → click a sample (talk / docs / blog) or paste any public article URL → **Extract**. YouTube pulls real captions; articles are read + LLM-extracted.
3. **Compose a skill.** Select 1–2 shards → open the **Forge** panel → **Skill for {repo}**. The draft is LLM-composed against the repo's stack: Fit check (structural heuristics — not a live agent eval), **Where it lands**, expandable sections. Copy it for **Cursor / Claude / Kiro** — the primary hand-off.
4. **Proof (optional).** Publish (relayer signs on Monad testnet, or wallet) → skill page → **I used this** (raises on-chain signal) → optional **Attach outcome** (what it actually improved). Dispute to police slop — challenge **resolve** is a demo oracle (relayer), not decentralized adjudication.
5. **Pool.** [**/pool**](https://fondof.netlify.app/pool) → Draw a skill / browse paper cards with live signal.

Each step degrades **honestly** if a dependency is down: need-extract shows “API unreachable — local shards” (labeled, not silent); forge failure shows a local template draft with a visible notice, never passed off as LLM output; chain/relayer unreachable keeps publish a local draft — we do not fake “published.” Happy-path extraction and forge are live; dispute resolve stays a disclosed demo oracle.

Demo video script: [`docs/demo-video.md`](docs/demo-video.md).  
Submission & 3-day content plan: [`docs/submission-plan.md`](docs/submission-plan.md).  
Parallel product vs video split: [`docs/parallel-split.md`](docs/parallel-split.md).  
Video production stack: [`docs/video-pipeline.md`](docs/video-pipeline.md).  
Package roles: [`docs/architecture.md`](docs/architecture.md).

### Verification / testing instructions

From a fresh clone:

```bash
git clone https://github.com/udirobert/fondof.git
cd fondof
pnpm install
pnpm typecheck        # all packages
pnpm test             # vitest: LLM parse, fit heuristics, section parsing, meta/outcome sanitization
pnpm build            # web + api + core + cli

# Contracts (needs Foundry):
cd packages/contracts && forge build && forge test
```

**Live stack checks (no keys needed):**

```bash
# API up + pool has skills
curl -s https://fondof-api.trustfall.workers.dev/ | head -c 200
curl -s https://fondof-api.trustfall.workers.dev/api/skills | head -c 300

# Need extraction is live (different text → different shards)
curl -s -X POST https://fondof-api.trustfall.workers.dev/api/ingest \
  -H 'content-type: application/json' \
  -d '{"need":"idempotency keys for webhook consumers"}' | head -c 400

# One-shot compose: ingest + top shards + forge in a single call
curl -s -X POST https://fondof-api.trustfall.workers.dev/api/compose \
  -H 'content-type: application/json' \
  -d '{"url":"https://www.youtube.com/watch?v=7wuYBfE131U","repo":{"name":"myproject","frameworks":["react"],"languages":["typescript"]}}' | head -c 600
```

**Local dev (optional):** `pnpm install`, then `cd packages/api && pnpm dev` and `cd packages/web && pnpm dev` (set `NEXT_PUBLIC_API_URL=http://127.0.0.1:8787` for the local Worker). Copy [`.env.example`](.env.example) to `.env` / Worker secrets; relayer + LLM keys live in Wrangler secrets / Netlify env, never in git.

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

**Future of the trust layer (not shipped):** we're evaluating **Arkiv** — a queryable, time-scoped, tamper-proof Ethereum data layer — as a candidate home for provenance + contestable quality, explored **alongside** the existing Monad SkillPool (no retirement decision made). See [`docs/roadmap-arkiv.md`](docs/roadmap-arkiv.md) for the hybrid-layer boundary and why a plain DB can't credibly serve the provenance slice.

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
NEXT_PUBLIC_API_URL=https://fondof-api.trustfall.workers.dev
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
