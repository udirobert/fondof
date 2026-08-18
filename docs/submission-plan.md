# Ready Spec Ship — submission & content plan

> **Deadline:** Google Form + video before **23:59 UTC, Aug 23, 2026**.  
> **Strategy:** Three short daily evidence videos (Aug 17–19) → synthesis submission video (Aug 22–23) + traction metrics.

Judges get a simple click path in [README](../README.md). This doc is the **team run sheet** for daily content, final submission, and what we deliberately defer.

## Product story (keep this sharp)

**One loop, two optional inputs:**

```
Need or URL → Extract shards → Compare existing skills (optional) → Fit / Forge → Agent hand-off → Outcome → Share / attribute → optional SkillPool proof
```

**Positioning:** fondof turns what developers learn — or need — into agent skills fitted to their codebase. Craft first, proof downstream. Offchain for usefulness; onchain for public trust.

| Job | Question | Status |
|-----|----------|--------|
| **Extract (Need / URL)** | Turn my idea or link into forge-worthy shards | **Shipped** — judge path |
| **Compare (Exa)** | Does an existing *skill* already cover this? | **Shipped** — on-demand after extract |
| **Source find (FR4.5)** | Who articulated this *idea* best out there? | **Deferred** — post-hackathon wedge (see below) |

**Do not** reframe fondof as a search engine for trending dev content. Source find is optional enrichment between Need and Forge — not a second homepage.

## What stays in scope for Aug 23 (judge path)

Keep the hosted demo simple:

1. **Need** or **URL** → live extract  
2. Select shards → **Forge** panel → fitted skill  
3. Copy to Cursor / Claude / Kiro → apply it → optional outcome/share/attestation  

No new discovery UI before submit unless it ships in a day without touching the happy path.

## Three-day evidence series (Aug 17–19)

Each episode proves the same loop on **real, timely ideas**. Treat every shoot as product QA — log friction, fix only what breaks the template.

### Episode template (~90s)

| Beat | Time | Show |
|------|------|------|
| Hook | 10s | Trending discourse → gap in generic agent skills |
| Ingest | 20s | Live fondof extract (not canned) |
| Forge | 25s | Fit check, Where it lands, copy for agent |
| Agent use | 25s | Run the skill in Cursor / Kiro on real code |
| Proof | 10s | Outcome attach or “I used this” + skill page URL |

End every clip with the **skill page link**. That is distribution + provenance.

### Three episodes — different input types, same output

| Day | User state | Input path | Demo beat |
|-----|------------|------------|-----------|
| **1 — Practitioner YouTube (locked)** | Has a how-to talk; wants it as a skill for *this* stack | **URL** if captions extract; else honest **Need** paste of the technique | [Vox-style motion graphics with Claude Code + Remotion](https://youtu.be/7wuYBfE131U) → forge a HyperFrames-fitted skill → **use it to produce this episode** → publish to pool |
| **2 — Trending discourse** | Knows the trend, not the best link | **URL** (canonical article behind the thread) | Manual source pick → paste URL → forge → agent → outcome |
| **3 — Own insight** | Has a formulation, no link | **Need** tab | Need extract → forge → publish → pool signal + share |

Day 1 is the dogfood episode: we learn from someone else's Remotion tutorial, fit it to fondof's HyperFrames pipeline, and the skill is public if the video lands. Days 2–3 keep the original breadth (URL vs Need). Production stack: [`video-pipeline.md`](video-pipeline.md).

### Source constraints (free / easy)

| Source | Use |
|--------|-----|
| Article / blog the tweet links to | URL tab + Firecrawl — best path today |
| YouTube talk / conference clip | URL tab — captions + LLM extract |
| HN thread, dev blog, release notes | Stable URL ingest |
| Viral thread distilled | **Need** paste + cite thread in video / outcome note |

**Do not** build the series on raw Twitter/X API ingestion. Trending *discourse* → canonical *URL* is the honest pattern.

### Per-episode prep (fill before recording)

For each day, lock:

- **Trend / topic** (one sentence)
- **Canonical URL** (or Need text for Day 3)
- **Target repo** (fondof or named OSS)
- **Expected skill title**
- **Agent action** (what changes in code)
- **Outcome note** (PR link, before/after, or screenshot URL)

### Day 1 locked (17 Aug)

| Field | Value |
|-------|--------|
| **Trend / topic** | Agent-authored Vox-style explainers (Claude Code + Remotion tutorial) |
| **Canonical URL** | https://youtu.be/7wuYBfE131U |
| **Target repo** | fondof (`videos/` HyperFrames projects) |
| **Expected skill title** | Vox-style layered explainer for HyperFrames (VO-first, locked bg, 3 layers, stagger springs) |
| **Agent action** | Apply the forged skill to produce Day 1's evidence video in HyperFrames — not Remotion |
| **Outcome note** | Skill page + rendered clip on X/YouTube + (if we ship it) caption-extract fix |

**Ingest QA (17 Aug):** `POST /api/ingest` with that YouTube URL returned *Could not extract transcript… may not have captions.* The video **does** have spoken audio (full transcript via public page). Worker timedtext `lang=en` missed auto-captions. **Do not fake URL extract on camera.** Options before filming: (a) Need-tab with distilled technique + cite the URL in the outcome, (b) fix YouTube caption fallback (`en` / `a.en` / captionTracks) then retry URL tab. Prefer (b) if it is a small honest fix — it unblocks the judge YouTube path.

The **stack-agnostic extract** is the product story: the tutorial's Remotion APIs (`spring`, `interpolate`, Studio props) stay in the source; the skill we forge names HyperFrames equivalents (GSAP / `data-*` timing, locked canvas, VO-synced scenes). That is fondof: *their* thinking, *our* repo.

## Final submission video (~3 min, Aug 22–23)

Structure as **synthesis**, not three clips pasted together. Script skeleton: [`demo-video.md`](demo-video.md).

1. **Traction cold open** — three days, three real skills from timely ideas + visible repo outcomes.
2. **30s thesis** — learn/need → fitted craft → agent use → outcome; proof and attribution come downstream (not a scanner, not a marketplace).
3. **One live full path** — strongest day, end-to-end on [fondof.netlify.app](https://fondof.netlify.app).
4. **Evidence montage** — 15–20s from each daily video (ingest → forge → agent → outcome).
5. **Kiro angle** — flash `.kiro/specs/fondof/` + steering; spec → tasks → shipped constraints (~30s).
6. **Close** — pool link, repo, honest caveats (demo oracle, structural fit check).

Upload **unlisted YouTube**. Submit form with repo + this video + links to daily clips if useful.

## Metrics to capture for the form

- 3 skill page URLs (`/s/[hash]`)
- 3 outcome notes (even lightweight)
- X posts + engagement (screenshots OK)
- Optional: clearly labeled SkillPool usage receipts / attestation status
- One line per episode: *input → skill → repo delta*

## Post-submit: FR4.5 “Find sources” (thin wedge)

**Problem:** Users with a vague idea but no link leave fondof to Google / YouTube and return with a URL. Need mode gets them moving; source find adds depth + attribution.

**Not in scope for Aug 23** unless trivial (~1 API route + small panel).

**Proposed UX (v1):**

- **“Find sources”** button after need-extract — not a new primary tab
- Query scoped to high-signal surfaces (YouTube, HN, known dev blogs) via Exa / web search
- Return 3–5 cards: title, snippet, why it matches
- User **picks one** → re-ingest URL → shards merge or replace (user choice)
- If Compare found a partial skill: offer **Forge the gap** (already supported in forge API)

**Avoid:**

- Auto-ingest without user pick (slop + weak provenance)
- Live Twitter ingestion promises
- Discovery as homepage hero — power users with links stay fast

Track build in [`.kiro/specs/fondof/tasks.md`](../.kiro/specs/fondof/tasks.md) Task 10.2.

## What we skip until after submit

- CLI parity with web
- Durable meta beyond Cache API (stretch)
- Full FR4.5 / multi-platform search product
- Arkiv integration (see [`roadmap-arkiv.md`](roadmap-arkiv.md))

## Related docs

- Judge click path: [README](../README.md#judges-5-minute-click-path-live-no-install)
- Final video script: [`demo-video.md`](demo-video.md)
- Video production stack: [`video-pipeline.md`](video-pipeline.md)
- Parallel split (you vs video): [`parallel-split.md`](parallel-split.md)
- Spec FR4.5: [`.kiro/specs/fondof/requirements.md`](../.kiro/specs/fondof/requirements.md)
- Task checklist: [`.kiro/specs/fondof/tasks.md`](../.kiro/specs/fondof/tasks.md)
