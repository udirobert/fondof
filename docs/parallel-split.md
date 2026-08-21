# Parallel split — product vs Day 1 video

**Do not serialize.** Video can ship on the **web UI + Need paste** path. Product work upgrades the same episode if it lands before render, it does not block storyboard / VO / BGM.

Acceptance for Day 1 film: live extract (URL **or** labeled Need), real forge, skill used in HyperFrames, publish or local draft labeled honestly.

---

## You (product) — in this order

### P0 — today, ~1–2h — YouTube captions

**Why:** URL-tab ingest of [the Day 1 talk](https://youtu.be/7wuYBfE131U) currently 400s. Judges paste YouTube; agents will too.

**Where:** `packages/api/src/lib/youtube.ts` (`fetchTimedText` + page `captionTracks`).

**Do:**

1. Try timedtext langs in order: `en`, `en-US`, `a.en` (auto), then any track.
2. When parsing `captionTracks`, include `kind=asr` / `vssId` auto tracks, not only `languageCode=en`.
3. If JSON3 is empty, fetch `fmt=srv3` or the track `baseUrl` XML (already have `parseYouTubeCaptions`).
4. Add a vitest with a fixture of captionTracks JSON (no live YouTube in CI if flaky).
5. Verify:

```bash
curl -sS -X POST https://fondof-api.trustfall.workers.dev/api/ingest \
  -H 'content-type: application/json' \
  -d '{"url":"https://www.youtube.com/watch?v=7wuYBfE131U"}' | head -c 400
```

Deploy Worker when green. Ping in chat: **“URL ingest live”**.

### P1 — today/tomorrow — one-shot compose for agents

**Why:** The video’s punchline is *an agent did this*. Two curls is enough; a single route is better.

**Add:** `POST /api/compose`

```json
{ "url": "https://youtu.be/7wuYBfE131U", "repo": { "name": "fondof", "frameworks": ["hyperframes","next"], "languages": ["typescript"] } }
```

or `{ "need": "…", "repo": { … } }`

**Behavior:** ingest → take 1–2 forge-worthy shards → existing `/api/forge` → `{ markdown, ideas, skillHash, sourceUrl }`. Rate-limit like forge. No fake success.

**Docs:** 15 lines in `packages/web/public/llms.txt` + README “Agent / curl” snippet.

Ping: **“compose live”**. I’ll swap one 10s beat from UI to curl.

### P2 — if time — agent skill (not MCP)

A `SKILL.md` (or `.cursor/rules`) that tells Cursor/Claude: call compose, write the markdown to `.kiro/steering/`. MCP can wait.

### Do not do before Day 1 film

CLI hosted-API parity, Find sources (FR4.5).

---

## Agent (video) — does not wait on P1

1. Lock ~90s VO + storyboard (this file’s sibling: [`demo-video.md`](demo-video.md) Day 1).
2. HyperFrames project under `videos/day-1-vox-skill/` — 16:9 YouTube primary; square export later for X.
3. ElevenLabs TTS + Music bed (`scripts/elevenlabs-music.mjs`).
4. **Skill body:** if URL ingest still down, forge via **Need** using the distilled text below (cite the YouTube in References). If you ping URL ingest live, re-forge from URL and I recut that beat.
5. Apply the skill in the composition (locked bg, 3 layers, VO-first scenes).
6. Hand you `renders/video.mp4` (gitignored) for X + YouTube upload.

### Distilled Need (use this if captions aren’t up)

Paste in Need tab / `{need}` / compose:

> Vox-style explainer for AI video: voice-over first (each line is a scene). Lock one background, type, and accent across scenes so it feels like one shot. Three layers: static bg, halftone midground characters, foreground cutouts. Stagger entrances (hero structure first, then people). Offset accent stroke for a cheap 3D pop. Tune layout in a studio, then stitch scene durations to the VO, then mix music under speech. Adapt Remotion spring/interpolate + Studio props to HyperFrames HTML (`data-start` / GSAP), not Remotion APIs.

Source to cite: `https://youtu.be/7wuYBfE131U`

---

## Sync points

| When | Signal | Video change |
|------|--------|----------------|
| Captions deployed | “URL ingest live” | Ingest beat uses URL tab |
| Compose deployed | “compose live” | 10s agent curl / Cursor skill beat |
| Skill published | `/s/[hash]` URL | End card + outcome attach |
| Neither by render time | — | Need path + UI forge; say so on camera |

## Collision rules

- You own `packages/api`, `llms.txt`, caption tests.
- Agent owns `docs/demo-video.md` Day 1, `videos/day-1-*`, `scripts/elevenlabs-music.mjs`.
- Don’t both rewrite `youtube.ts`. Don’t fake URL extract in the film.
