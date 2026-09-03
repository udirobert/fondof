# WebMCP Challenge — fondof submission kit

Paste these straight into the Devpost form. Record the demo on [fondof.netlify.app](https://fondof.netlify.app).

## Live URL

https://fondof.netlify.app

## Public repo

https://github.com/udirobert/fondof

License: `LICENSE` (MIT) in the repo root.

## What to Build (one sentence)

fondof is an agent-native skill forge: you and your agent can search, read, and compose repo-specific skills together, directly in the browser.

## Why fondof is a strong fit for WebMCP

WebMCP is about giving agents structured, first-class access to web apps. fondof's entire job is turning "what you learned" into "what your agent does." Exposing fondof's core actions as WebMCP tools means the agent does not need a custom MCP server or a secret API key — it discovers and invokes the site while the user is already in the browser. The standard fits the product exactly: the more the agent can do, the more useful the craft becomes.

## How it creates a better user experience

Without WebMCP, a user has to copy a source URL, open fondof, paste it, pick shards, choose a repo, forge, then copy the skill into their agent. With WebMCP, the user stays in a conversational agent (ChatGPT's in-app browser) and asks, "Find me a skill on React performance and then compose one from this talk for udirobert/fondof." The agent calls the right fondof tools, shows the result, and the user copies the final skill. The cognitive overhead drops from many UI steps to one sentence.

## What people and agents can do together that was hard before

- A human can ask ChatGPT to search the public skill pool for an idea, then hand off source selection to fondof.
- The agent can read a skill, compose a new one for the user's repo, and return a shareable `/s/{hash}` URL without leaving the browser.
- The user can confirm, remix, or attribute the result — human judgment stays central while the agent handles the mechanical extraction, ranking, and formatting.

Before, this required either an MCP server the user had to install or a brittle agent trying to click through forms. Now the site itself advertises its capabilities.

## How WebMCP was implemented

We added `packages/web/src/components/webmcp-provider.tsx`, a client component that registers three tools with `document.modelContext.registerTool`:

- `search_skills` — `POST /api/search/skills` to find existing public skills.
- `get_skill` — `GET /api/skills/{hash}` to read a public skill.
- `compose_skill` — `POST /api/compose` to turn a need or URL into a repo-specific skill.

The provider is mounted in `packages/web/src/components/providers.tsx` so it runs on every page. We also updated `next.config.ts` and `packages/web/netlify.toml` to add `Permissions-Policy: tools=(self)`, which the browser requires for a page to expose WebMCP tools.

The code is at:
- `packages/web/src/components/webmcp-provider.tsx`
- `packages/web/src/components/providers.tsx`
- `packages/web/next.config.ts`
- `packages/web/netlify.toml`
- `LICENSE`

## Testing instructions (judges)

### Option A — ChatGPT in-app browser (no flags)

1. Open https://fondof.netlify.app inside ChatGPT's in-app browser.
2. Ask:
   > "Search fondof for skills about React performance, then compose a new skill from https://nextjs.org/blog/next-16-3 for udirobert/fondof."
3. ChatGPT should call `search_skills` and `compose_skill`.

### Option B — Google Chrome with WebMCP enabled

1. Open `chrome://flags/#enable-webmcp-testing` and set to **Enabled**.
2. Relaunch Chrome.
3. Install the [Model Context Tool Inspector](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd) extension.
4. Open https://fondof.netlify.app.
5. Click the extension to see `search_skills`, `get_skill`, and `compose_skill`.

### Live API health check

```bash
curl -s https://fondof-api.trustfall.workers.dev/api/skills?limit=2
curl -s -X POST https://fondof-api.trustfall.workers.dev/api/search/skills \
  -H 'content-type: application/json' \
  -d '{"query":"React performance"}'
```

## Suggested 3-minute demo script

1. **0:00–0:20** — Hook: "Generic agents have to guess at forms. WebMCP lets a website tell the agent exactly what it can do."
2. **0:20–0:50** — Open fondof in ChatGPT's in-app browser. Ask it to search the pool for "React performance." Show `search_skills` being called.
3. **0:50–2:00** — Ask the agent to compose a skill from a source URL for `udirobert/fondof`. Show `compose_skill` returning the markdown and skill URL.
4. **2:00–2:30** — Show the generated skill page and copy the markdown for Cursor/Claude/Kiro.
5. **2:30–3:00** — Close: the agent did the extraction and formatting; the human chose, verified, and used the result. That's the agent-native web.
