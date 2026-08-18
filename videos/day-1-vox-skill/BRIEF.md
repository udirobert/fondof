---
workflow: faceless-explainer
flow: automation
storyboard: no
message: "You saw a Remotion + Claude talk. You're on Cursor. fondof fits the thinking to any agent — we ingested the URL, forged a HyperFrames skill, and used it to make this video."
destination: youtube
aspect: 1920x1080
language: en
length: 90s
angle: how-to-process
audience: developers and Ready Spec Ship judges
narration: yes
VO_MODE: restructured
---

## Intent

Vox-style layered explainer (~40s, not padded to 90). Locked paper plate, three layers (bg / halftone characters / scenery cutouts), VO-first cuts. Dogfood a skill from https://youtu.be/7wuYBfE131U — source was Remotion + Claude; this film is HyperFrames + Cursor, copyable to any agent.

## Customizations

- ElevenLabs TTS (voice River `SAz9YHcvj6GT2YYXdXww`)
- ElevenLabs Music instrumental bed via `scripts/elevenlabs-music.mjs`
- Captions on
- Recurring cutout cast: speaker, fitted agent, directory clones; FG scenery occludes legs

## Notes

- Do not use Remotion for this film — the mismatch is the point.
- Ingest beat: URL + POST /api/compose. Do not claim YouTube captions if the provider is Firecrawl.
- End card: fondof.netlify.app — no fake `/s/[hash]` / “on the pool” until publish.
- Showcase any-agent (Cursor today, Kiro/Claude also named).
- Primary 16:9; square for X is a later export.
