# fondof

**From what you learn to what your agent does.**

fondof turns what developers learn — or need — into **agent skills fitted to their codebase**. Extract the useful thinking, forge it for a real repository, hand it to Cursor / Claude / Kiro, and see whether it helped.

| | |
|---|---|
| **Live app** | [https://fondof.netlify.app](https://fondof.netlify.app) |
| **API** | [https://fondof-api.trustfall.workers.dev](https://fondof-api.trustfall.workers.dev) |
| **Public repo** | [https://github.com/udirobert/fondof](https://github.com/udirobert/fondof) |
| **License** | MIT |

## Try it now

Open [https://fondof.netlify.app](https://fondof.netlify.app). No install needed.

### WebMCP agent path (ChatGPT in-app browser)

When you open fondof in an agentic browser, the page exposes three WebMCP tools:

- **`search_skills`** — find existing public skills by topic.
- **`get_skill`** — read a public skill by hash.
- **`compose_skill`** — turn a need or URL into a repo-specific skill.

Try this in ChatGPT's in-app browser:

> "Search fondof for skills about React performance, then compose a new skill from https://nextjs.org/blog/next-16-3 for udirobert/fondof."

Or test in Google Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled, plus the [Model Context Tool Inspector](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd).

### Web UI path

1. **Extract** — paste a source URL or type a need.
2. **Forge** — pick shards and choose a target repo.
3. **Use** — copy the fitted skill into Cursor / Claude / Kiro.
4. **Share** — optionally publish the skill and attach an outcome.

Anonymous users get 10 free forges per month. Sign in to unlock unlimited forges after sharing a public skill.

## What it does

```text
Need or source → Extract → Fit / Forge → Copy / Use → Outcome → Share / Attribute → optional SkillPool proof
```

1. **Extract** — paste a source URL or state a need; fondof finds discrete, forge-worthy ideas.
2. **Fit / Forge** — connect those ideas to a target repository's stack and conventions.
3. **Hand off** — copy the skill into an agent and apply it to real work.
4. **Attribute** — credit the source, attach outcomes, and optionally add SkillPool proof.

## Project structure

```text
packages/
├── web/          Next.js UI — extract, forge, SkillPool desk, /s/[hash], /pool
├── api/          Cloudflare Worker — ingest, compose, forge, publish, skills, auth
├── core/         Shared pipelines for CLI and API
├── cli/          Commander.js terminal client (secondary)
├── contracts/    Foundry — SkillPool on Monad testnet
└── shared/       Shared TypeScript types
```

## Tech stack

- **TypeScript** monorepo (pnpm workspaces)
- **Next.js** + Framer Motion (Netlify)
- **Cloudflare Workers** (Hono)
- **Cloudflare Workers AI** for LLM + embeddings
- **Exa** for semantic skill search
- **Firecrawl / Readability** for article extraction
- **Monad** testnet for SkillPool
- **Foundry** for Solidity

## Documentation

- [WebMCP submission & testing](docs/webmcp-submission.md)
- [Demo video script](docs/demo-video.md)
- [Architecture, auth & security](docs/architecture.md)
- [Kiro build story, positioning, deployment & CLI](docs/project-guide.md)
- [Full Kiro specs & steering](.kiro/specs/fondof)

## Local development

```bash
git clone https://github.com/udirobert/fondof.git
cd fondof
pnpm install
pnpm typecheck        # all packages
pnpm test             # vitest
pnpm build            # web + api + core + cli

# Contracts (requires Foundry):
cd packages/contracts && forge build && forge test
```

See [`.env.example`](.env.example) for required variables and [`docs/project-guide.md`](docs/project-guide.md) for full deployment instructions.

## License

MIT
