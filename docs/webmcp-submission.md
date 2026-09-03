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

- `search_skills` — `GET /api/skills?q={query}` to search the public fondof skill pool.
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
2. Optional: click **Sign in** and connect GitHub to unlock unlimited forges after sharing. Anonymous users have **10 free forges per month**.
3. Ask:
   > "Search fondof for skills about React performance, then compose a new skill from https://nextjs.org/blog/next-16-3 for udirobert/fondof."
4. ChatGPT should call `search_skills` and `compose_skill`.

### Option B — Google Chrome with WebMCP enabled

1. Open `chrome://flags/#enable-webmcp-testing` and set to **Enabled**.
2. Relaunch Chrome.
3. Install the [Model Context Tool Inspector](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd) extension.
4. Open https://fondof.netlify.app.
5. Click the extension to see `search_skills`, `get_skill`, and `compose_skill`.

### Live API health check

```bash
curl -s 'https://fondof-api.trustfall.workers.dev/api/skills?limit=2'
curl -s 'https://fondof-api.trustfall.workers.dev/api/skills?q=React%20performance&limit=5'
```

## Suggested 3-minute demo script

Record this inside the ChatGPT in-app browser so tool calls are visible.

### 0:00–0:20 — Hook: before vs. after WebMCP

**Say:**
> When an agent visits a normal website, it has to guess: click this, fill that, wait for this div. With WebMCP, the website tells the agent exactly what it can do. I'm going to show you fondof — a skill forge — where an agent and I build a repo-specific skill together, inside ChatGPT's browser, in one sentence.

**Show:**
- Open `https://fondof.netlify.app` in the ChatGPT in-app browser.
- Quick shot of the homepage, then cut to the ChatGPT conversation with the site loaded.

### 0:20–0:45 — Set up the task

**Say:**
> I want a skill that teaches my team how to add WebMCP tools to our own Next.js app. I don't want a generic blog post. I want it fitted to the fondof codebase.

**Show:**
- In ChatGPT, type or say:
  > "Search fondof for any existing skills about WebMCP or MCP."
- ChatGPT calls `search_skills`. Capture the tool-call card if ChatGPT renders one.
- Briefly glance at the results.

### 0:45–1:40 — The WebMCP moment: compose a skill

**Say:**
> Good — nothing exactly right yet. Now I'll ask the agent to compose a new skill from the WebMCP spec and the Next.js docs, fitted to the fondof repo. This would normally mean copy-pasting URLs, picking shards, choosing a repo, and clicking forge. With WebMCP, I just ask.

**Show:**
- In ChatGPT, type:
  > "Compose a new skill from https://webmcp.dev and https://nextjs.org/docs/app/building-your-application/rendering for udirobert/fondof. Make it about adding WebMCP tools to a Next.js app."
- ChatGPT calls `compose_skill`. Capture the tool call.
- Show the response: `markdown`, `source_urls`, and `skill_url`.
- Highlight `source_urls` — "it still attributes the original sources."

### 1:40–2:20 — Human verifies and uses it

**Say:**
> The agent did the extraction and formatting. I stay in control: I can read the skill, copy it, or change the target repo. Here it is fitted to our stack — it even names where the code should land. I'm copying it into Claude Code.

**Show:**
- Open the returned `skill_url` on fondof.
- Scroll the generated skill markdown for 5–10 seconds to prove it is real and repo-specific.
- Click **Copy for Claude / Cursor / Kiro**.
- Cut to a code editor or terminal where the skill is pasted and applied — even a brief terminal/Claude Code window is enough.

### 2:20–2:50 — What changed

**Say:**
> Before WebMCP, this loop meant leaving ChatGPT, opening fondof, filling forms, and copy-pasting back. Now the site advertises its own tools, the agent calls them, and I just confirm and use the result. That's the agent-native web: humans and agents doing what each is good at.

**Show:**
- Quick before/after side-by-side or cut: old UI-clicking loop vs. one ChatGPT sentence.
- End on the fondof skill page with the public `/s/{hash}` URL visible.

### 2:50–3:00 — Close

**Say:**
> fondof: from what you learn, to what your agent does. Try it at fondof.netlify.app — the repo is open source.

**Show:**
- End card: `fondof.netlify.app` + `github.com/udirobert/fondof`.
- Hold for 5 seconds.
