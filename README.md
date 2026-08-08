# fondof

**The bridge between what you learn and what your agents do.**

fondof connects the content you consume (podcasts, blogs, technical talks) with the projects you're building — helping you discover existing skills, identify where new ideas apply to your work, and craft best-in-class skills fitted to your specific coding environment.

## What fondof does

1. **Ingest** — Paste a podcast or blog URL. fondof transcribes, extracts discrete ideas, and identifies actionable patterns.
2. **Discover** — Ideas are matched against your connected repositories. fondof shows which ideas apply where, what skills already exist, and what's genuinely novel.
3. **Forge** — Compose skills from multiple sources, fitted to your repo's stack, conventions, and existing patterns. Every skill cites its sources.
4. **Attest** — Publish with verifiable provenance on Monad. The blockchain layer is completely invisible — no wallets, no gas, no confirmations.

## Two entry points

**Content-first:** "I just listened to a great podcast — where do these ideas apply across my projects?"

**Need-first:** "I have a problem in my code — what existing skills cover this, and what source material could fill the gap?"

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

We don't price skills via tokens, bonding curves, or per-request payments. If you want skill economics:
- [x402 Protocol / Coinbase Bazaar](https://x402.org) — Pay-per-call in USDC on Base
- [ERC-8239 Skill Registry](https://eips.ethereum.org/EIPS/eip-8239) — On-chain skill identity as NFTs
- [Torch Market](https://torch.market) — Bonding curves for agent tokens

### Not a domain-specific skill suite

We're domain-agnostic. If you need pre-built DeFi/crypto agent capabilities:
- [OKX OnchainOS](https://www.okx.com) — 16+ specialized on-chain skills
- [Allium AgentHub](https://allium.so) — On-chain data across 150+ chains
- [CoinMarketCap AI Agent Hub](https://coinmarketcap.com) — Market reports and token research
- [Binance AI Agent Skills](https://binance.com) — Market discovery and execution

### fondof IS for when you...

- Listen to a podcast and want to turn insights into skills for YOUR specific project
- Have a need and want to know if something already covers it — or if you should forge something new
- Want **provenance** — know exactly where a skill's thinking came from
- Want **environment-fitted** skills that respect your stack, conventions, and existing patterns
- Want to compose skills from **multiple sources**, not just copy one file

## Quick start

```bash
# Install dependencies
pnpm install

# Connect your GitHub
fondof connect

# Ingest content (podcast or blog)
fondof ingest https://example.com/podcast/episode-42.mp3

# Or start from a need
fondof need "better error handling in async TypeScript"

# Forge a skill from extracted ideas
fondof forge --latest --repo myorg/myproject

# Publish to SkillPool on Monad (signal starts growing)
fondof publish .kiro/steering/my-skill.md

# Challenge a skill you think is low quality
fondof challenge <skill-hash>

# Check status
fondof status
```

## Architecture

```
packages/
├── cli/          Commander.js CLI (connect, ingest, forge, publish, status)
├── core/         Business logic (ingestion, discovery, composition, project, relayer)
├── contracts/    Solidity on Monad (FondofAttestation.sol)
└── shared/       TypeScript types (IdeaRecord, RepoProfile, DiscoveryResult, etc.)
```

## Tech stack

- **TypeScript** monorepo (pnpm workspaces)
- **ElevenLabs Scribe** for podcast transcription
- **Cloudflare Workers AI** for LLM (free) + embeddings (bge-small, free)
- **Exa / TinyFish** for semantic skill search
- **Firecrawl / Readability** for article extraction
- **Monad** (EVM L1, 10K TPS) for SkillPool contract
- **viem** for on-chain interaction
- **Foundry** for Solidity development (15 tests)
- **Next.js 16.3** + Framer Motion for the web UI

## Environment variables

```bash
# Required for on-chain operations (SkillPool)
MONAD_RPC_URL=https://monad-testnet.g.alchemy.com/v2/<your-key>
FONDOF_RELAYER_KEY=0x...              # Relayer wallet private key
FONDOF_CONTRACT_ADDRESS=0x1c0b6C42acD41BE5582a8F34137Acb713107170a  # Deployed SkillPool

# LLM — pick one (Cloudflare is free)
CLOUDFLARE_ACCOUNT_ID=...            # Free: 10K neurons/day
CLOUDFLARE_API_TOKEN=...             # Create at dash.cloudflare.com
# ANTHROPIC_API_KEY=sk-ant-...       # Optional premium alternative

# Transcription (for podcasts)
ELEVENLABS_API_KEY=...               # Free tier available

# Search (optional, graceful degradation without)
# EXA_API_KEY=...                    # Semantic skill search
# TINYFISH_API_KEY=...               # Web search fallback (free)

# GitHub (or use `fondof connect` for OAuth)
# GITHUB_TOKEN=...
```

## Contributing

This project is being developed for Monad Blitz. See `.kiro/specs/fondof/` for full requirements, design, and implementation tasks.

## License

MIT
