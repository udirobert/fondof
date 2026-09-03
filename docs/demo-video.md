# Demo video scripts

Unlisted YouTube is fine for Ready Spec Ship. Match live paths to the [README judge clicks](../README.md#judges-5-minute-click-path-live-no-install).

**Team plan:** three ~90s daily evidence clips (Aug 17–19) + one ~3 min synthesis submission (Aug 22–23). Full run sheet: [`submission-plan.md`](submission-plan.md).

---

## WebMCP Challenge submission video (~3 min)

Use this for the Devpost/WebMCP Google Form. Record inside the **ChatGPT in-app browser** so the WebMCP tool calls are visible. This script focuses on the agent-native angle: the website exposes structured tools, the agent invokes them, and the human verifies the result.

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

---

## Final submission video (~3 min)

Use this for the Google Form. Montage the three daily clips; do not rely on them alone.

### Setup on camera

- Browser on [https://fondof.netlify.app](https://fondof.netlify.app)
- Optional: Monad explorer tab ready for one tx after publish
- Do **not** show `.env` or private keys
- Have skill page URLs from the three daily episodes ready for the cold open

### Script

| Time | Say / show |
|------|------------|
| 0:00–0:25 | **Traction cold open:** three days, three skills from trending dev ideas — flash skill pages + outcome lines + optional X engagement. |
| 0:25–0:55 | **Problem + thesis:** generic skills miss repo context. fondof turns what you learn—or need—into a fitted skill → copy to agent → outcome. SkillPool is downstream optional proof, not the product. Not a scanner. Not a marketplace. |
| 0:55–1:15 | **Kiro:** flash `.kiro/specs/fondof/` + steering — Spec → Ship. Steering constraints visible in product (honest degradation, no fake publish). |
| 1:15–1:50 | **Live path (best day):** Need or URL → extract → select shards → **Forge** panel → Fit check → **Where it lands** → **Copy for Cursor / Claude / Kiro**. |
| 1:50–2:20 | **Outcome + proof:** apply the skill → attach what changed → share the skill. If public trust matters, optionally attest on SkillPool; mention the demo oracle on dispute resolve. |
| 2:20–2:45 | **Montage:** 15–20s from each daily clip (ingest → forge → agent → outcome). |
| 2:45–3:05 | **/pool** + close: craft first, outcomes second, proof downstream. Repo + `.kiro/`. |

### Don’t

- Don’t present offline/demo shards as live extract without saying so
- Don’t call local draft “published”
- Don’t lead with gas / hex / receipt storm — skill artifact first
- Don’t claim in-product “Find sources” (FR4.5) is shipped — Day 1 can show manual URL pick as the honest bridge

---

## Daily evidence clip (~90s each)

Repeat for three days. Different input type each day — see [`submission-plan.md`](submission-plan.md).

| Beat | Time | Show |
|------|------|------|
| Hook | 0:00–0:10 | What’s trending + why generic skills miss it |
| Ingest | 0:10–0:30 | Live extract (URL or Need — label which) |
| Forge | 0:30–0:55 | Forge panel → Fit check → Where it lands → copy |
| Agent | 0:55–1:20 | Cursor / Kiro applying the skill on real code |
| Proof | 1:20–1:30 | Outcome first; optional public share/attestation + `/s/[hash]` URL on screen |

**UI labels:** Need tab submit = **Forge** (runs extraction). URL tab = **Extract**. Composition = **Forge** panel.

### Day 1 VO (~90s) — Vox tutorial → HyperFrames skill

Parallel work: [`parallel-split.md`](parallel-split.md). Swap ingest beat if URL captions ship.

| Time | VO | Picture |
|------|-----|---------|
| 0:00–0:12 | Directories give you a Remotion skill. We needed the *thinking* fitted to HyperFrames. | Tutorial thumbnail / “generic skill” vs “fitted” |
| 0:12–0:28 | **Ingest.** URL tab if captions are live — else Need with the distilled technique, source cited. Shards from *this* talk, not a canned list. | fondof extract (label URL vs Need) |
| 0:28–0:48 | **Forge for fondof.** Locked background. Three layers. VO-first scenes. Stagger the hero, then the cutouts. Remotion springs stay in the citation; our skill names `data-start` and GSAP. | Forge panel → Fit check → Where it lands |
| 0:48–1:12 | **We used it.** Same rules building this clip: one plate, staggered layers, VO holds the cut. | HyperFrames preview / layered scene |
| 1:12–1:28 | Skill is on the pool. Copy it into Cursor. If an agent can compose from a URL, that’s the product — not a UI tour. | `/s/[hash]` + copy CTA |

---

## Legacy single-take script (reference)

Same path as README; use if you skip the 3-day series and record one take only.

| Time | Say / show |
|------|------------|
| 0:00–0:20 | **Problem:** directories are full of generic / untrusted skills; stars lag. You need a skill fitted to *your* repo — then a path to see whether it helped. |
| 0:20–0:35 | **Kiro:** flash `.kiro/specs/fondof/` + steering — Spec → Ship. Hero job: personalised craft → copy to agent → outcome; SkillPool proof is downstream. |
| 0:35–1:05 | **Need path (no GitHub):** Need tab → `retry budgets for async TypeScript` → **Forge** (extract) → shards land. |
| 1:05–1:40 | Select shards → **Forge** panel → **Skill for {repo}** → Fit check → **Where it lands** → expandable sections. |
| 1:40–2:10 | **Publish** (quiet). Paper skill card → **Copy for Cursor / Claude / Kiro**. Skill page for proof. |
| 2:10–2:40 | **I used this** → optional **Attach outcome**. Demo oracle on dispute resolve. |
| 2:40–2:55 | **/pool** desk → Draw / paper cards. |
| 2:55–3:10 | Close: craft first, proof second. Link README + `.kiro/`. |
