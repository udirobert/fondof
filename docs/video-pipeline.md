# Video production stack (research)

How we will **make** the daily evidence clips and the Kiro submission video. Product story and episode lock: [`submission-plan.md`](submission-plan.md). Scripts: [`demo-video.md`](demo-video.md).

**Renders are not committed.** MP4/MOV/WebM and HyperFrames `renders/`, `capture/`, `.media/` are gitignored. Source compositions (`videos/<project>/compositions/`, briefs, storyboards) can live in git. Upload finished files to X and YouTube yourself.

## Default stack: HyperFrames

**Write HTML, render video.** A composition is a timed HTML document; the CLI seeks it in headless Chrome and encodes with FFmpeg. Same source for preview, edit, and render.

| Surface | Use for us |
|---------|------------|
| **Skills + CLI** | Authoring path in this repo (`npx hyperframes …`) |
| **Player / SDK** | Not needed for the series |
| **HeyGen cloud render** | Optional later; local render is enough |
| **Editframe** | Related HTML-composition model (`<ef-timegroup>`). Do **not** dual-author. Reference only if a clip needs Editframe-specific sequencing. |
| **Remotion** | Source language of the Day 1 YouTube tutorial. We **do not** scaffold a Remotion app. Forge adapts the *visual system* to HyperFrames. |

Local status (17 Aug): CLI `0.7.109`, ffmpeg present, **not signed in to HeyGen**. **VO + BGM: ElevenLabs** via gitignored `.env` (`ELEVENLABS_API_KEY`, mode `600`). TTS: HyperFrames `--provider elevenlabs`. BGM: `node scripts/elevenlabs-music.mjs` → `POST /v1/music` (`music_v2`, `force_instrumental`) → adopt `assets/bgm/track.mp3`. Skip HeyGen catalog / MusicGen unless Music API fails. Never commit the key.

## ElevenLabs Music (BGM)

Paid Music API. Helper: [`scripts/elevenlabs-music.mjs`](../scripts/elevenlabs-music.mjs).

```bash
node scripts/elevenlabs-music.mjs \
  --out videos/<project>/assets/bgm/track.mp3 \
  --duration-s 90 \
  --prompt "Instrumental documentary underscore, no vocals, quiet under VO"
```

- Always **instrumental** for beds (`force_instrumental`; pass `--vocals` only if we want lyrics).
- Length 3s–10 min. Match the cut (`--duration-s`), then HyperFrames loops/trims if needed.
- Writes a sidecar `.json` (prompt + model, no secrets). MP3 stays gitignored under `videos/`.
- Then HyperFrames: `music:` in the storyboard pointing at the adopted bed, volume ~0.12 under narration.
- Do not name copyrighted tracks/artists in prompts (API returns `bad_prompt`).

Docs: [compose](https://elevenlabs.io/docs/api-reference/music/compose) · [cookbook](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/music)

Docs we used:

- Website → video (agent capture pipeline): https://hyperframes.app/docs/3-guides/1-website-to-video
- Developer overview (composition → CLI / SDK / Player / render): https://hyperframes.heygen.com/developers/overview

## Which HyperFrames workflow for which clip

Route on **deliverable**, not on the word “video”:

| Clip | Likely route | Why |
|------|----------------|-----|
| Daily ~90s evidence (ingest → forge → agent → proof) | **`faceless-explainer`** or **`general-video`** | Narrated, multi-scene, no live-action talent. Faceless if invented graphics; general-video if we mix fondof UI captures + type. |
| Product / site tour of fondof.netlify.app | **`product-launch-video`** | `hyperframes capture` the live app — website-to-video guide. Use for one “show the product” beat, not every episode. |
| Short unnarrated sting / stat / title | **`motion-graphics`** | Under ~10s, motion is the message. Useful as openers, not the full episode. |
| Existing Remotion project we already have | **`remotion-to-hyperframes`** | Only if we literally port Remotion source. Day 1 is a **fresh HyperFrames build** inspired by a Remotion tutorial — not a port. |

Do **not** start a HyperFrames project until the brief is locked (intent layer). Do not mix Remotion Studio and HyperFrames Studio in one episode.

## Day 1 source — what the YouTube actually teaches

[I made this entire Vox-style explainer using only Claude Code and Remotion](https://youtu.be/7wuYBfE131U) (~how-to, not geopolitics as the product).

**Stack-agnostic craft (what fondof should extract):**

1. **VO-first timeline** — script table: each voice-over line maps to one visual beat.
2. **Locked visual system** — one background, fonts, and accent palette across scenes so it feels like one shot, not a slideshow.
3. **Three layers per scene** — background (static) / midground (halftone characters) / foreground (structures, cutouts).
4. **Staggered entrance** — spring the hero first, then supporting cutouts; offset accent stroke for a cheap 3D pop.
5. **Scene folders + shared plate** — per-scene props, shared bg asset.
6. **Tune in a studio, then sequence** — prop controls for scale/x/y; then stitch scenes to VO duration; mix VO + music last.

**Remotion-specific (cite, don’t copy into our skill as APIs):** `spring` / `interpolate`, Remotion Studio, Magnific/Higgsfield MCP for cutouts, ElevenLabs VO.

**HyperFrames equivalents for the forged skill:**

| Tutorial idea | HyperFrames |
|---------------|-------------|
| Scene = composition | `compositions/frames/NN-*.html` + assembled `index.html` |
| Shared locked bg | `frame.md` canvas + a full-bleed `class="clip"` ground (not `#root` background) |
| Spring pop / stagger | GSAP / HyperFrames animation rules + `data-start` offsets |
| VO sync | `SCRIPT.md` → TTS → `audio.mjs sync-durations` |
| Studio tweak | `npx hyperframes preview` + snapshot/check, not Remotion props panel |

That mapping **is** the Day 1 product story: directories would give you a Remotion skill; fondof gives you the same thinking fitted to *this* repo’s video pipeline.

## Ingest finding (blocks a naive URL-tab demo)

```text
POST https://fondof-api.trustfall.workers.dev/api/ingest
{"url":"https://www.youtube.com/watch?v=7wuYBfE131U"}
→ Could not extract transcript from YouTube video. The video may not have captions.
```

Worker tries timedtext `lang=en`, then Firecrawl, then page `captionTracks`. Auto-captions often live on `a.en` / ASR tracks, not `lang=en`. **Honest demo:** Need-tab with distilled technique until this is fixed; do not present a failed extract as live shards.

Fix (small, optional before filming): try `lang=en` **and** `lang=a.en`, and/or parse `captionTracks` including `kind=asr`. That also helps judges pasting YouTube URLs.

## Editframe — when (not) to use it

Editframe compositions are HTML web components (`<ef-timegroup mode="sequence|fixed">`) or React, with local or cloud render. Same *idea* as HyperFrames (timed HTML → MP4), different schema.

**Decision:** HyperFrames is the production default in this repo (skills already installed, CLI on PATH). Editframe stays a research reference unless a specific clip’s motion is easier in `<ef-timegroup>` sequencing — then isolate that clip; don’t rewrite the series.

## Remotion — when (not) to use it

Use Remotion only if we later **port** an existing Remotion composition (`remotion-to-hyperframes`). Mentioning Remotion in a tutorial is not a trigger to scaffold `npx create-video`. Dual-stack would muddy both the skill and the episode.

## Project layout (when we start producing)

```
videos/
  day-1-vox-explainer-skill/   # HyperFrames project (init --non-interactive)
  day-2-…/
  day-3-…/
  kiro-submission/             # synthesis video
```

Each project: `BRIEF.md`, `STORYBOARD.md`, `SCRIPT.md`, `compositions/`, gitignored `renders/video.mp4`.

## Before first render (checklist)

- [x] ElevenLabs key in gitignored `.env` (chmod 600) — TTS `--provider elevenlabs`
- [x] BGM via ElevenLabs Music API — `node scripts/elevenlabs-music.mjs --out videos/<project>/assets/bgm/track.mp3 --duration-s <cut>`
- [ ] Day 1 ingest path chosen: caption fix **or** Need paste
- [ ] Skill forged + published (or local draft labeled)
- [ ] Brief locked via HyperFrames intent layer (destination: X 1:1 vs YouTube 16:9 — **two renders** if we post both)
- [ ] User uploads MP4s; we do not commit them
