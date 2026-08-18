---
format: 1920x1080
duration: 40s
message: You saw a Remotion + Claude talk. You're on Cursor. fondof fits the thinking to any agent — we ingested the URL, forged a HyperFrames skill, and used it to make this clip.
arc: how-to-process
audience: developers and Ready Spec Ship judges
mode: autonomous
music: none
captions: yes
---

## Video direction

- **palette:** canvas white `#FFFFFF` / paper `#F5F2EF` locked full-bleed plate; ink `#1C1410`; tomato `#D8000F` only for offset stroke, em-dash, one hero word. Never a second accent.
- **type:** Shrikhand display (slight tilt on hero only), Libre Baskerville body, Space Grotesk chrome labels. Visible copy is short MG words — never full VO sentences.
- **vox grammar:** one locked paper plate (no camera travel). Three layers every frame — bg plate / B&W halftone character cutouts / FG scenery that occludes the lower third. Stagger: structure first, then people. Offset red duplicate 6–10px down-right.
- **cast:** Speaker (the talk), Fitted Agent (protagonist), Directory Clones (identical extras). Same three people recur.
- **motion:** power3 long-tail; GSAP fromTo springs on cutouts; VO-paced reveals; no slideshow dump; no screensaver drift.
- **never:** purple AI gradients, Remotion Studio UI, fake “published”, fake YouTube captions, fake `/s/[hash]`.

## Frame 1 — You saw this
- status: animated
- src: compositions/frames/01-hook.html
- duration: 9.613s
- transition_in: cut
- scene: YouTube talk behind a desk; Remotion+Claude stamp; swap to Cursor / any agent
- voiceover: You saw this on YouTube and wanted your agent to do it. Problem: the talk is Remotion and Claude. You're on Cursor. fondof fits the thinking to any agent.
- type: Hook
- persuasion: Relatable mismatch
- beat: hook
- blueprint: kinetic-type-beats (Adapt)
- focal: CURSOR
- roles: paper = background · speaker + clones = midground · desk/cabinet = foreground · type = overlay
- sfx: paper-whoosh, stamp
- asset_candidates: assets/cutouts/speaker-cut.png, assets/cutouts/clone-cut.png, assets/cutouts/agent-cut.png, assets/cutouts/cabinet-cut.png

Scene 1: locked paper; chrome YOU SAW THIS. Desk/cabinet FG seats first (structure before people).
Scene 2: Speaker cutout pops MID behind the desk (legs hidden) as VO says YouTube.
Scene 3: Fitted Agent joins at the laptop; clones faint in the back.
Scene 4: REMOTION + CLAUDE stamps as the problem; then in-place swap to CURSOR. Hold on any-agent.

## Frame 2 — Ingest the talk
- status: animated
- src: compositions/frames/02-ingest.html
- duration: 5.759s
- transition_in: cut
- scene: URL field on a desk; speaker behind it; shards pop as tickets
- voiceover: So we gave fondof the talk as a URL. Live extract. Shards from this video, not a canned list.
- type: Product_Intro
- persuasion: Demonstration
- beat: ingest
- blueprint: prompt-type-submit-generate (Adapt)
- focal: URL field
- roles: paper = background · speaker + listener = midground · desk = foreground · tickets = overlay
- sfx: key-tick, pop
- asset_candidates: assets/cutouts/speaker-cut.png, assets/cutouts/agent-cut.png, assets/cutouts/desk-cut.png

Adapt: type-then-answer; the answer is three shard tickets. No real browser chrome.
Scene 1: paper; URL — LIVE EXTRACT; desk FG seats.
Scene 2: typewriter youtu.be/7wuYBfE131U; POST /api/compose chip.
Scene 3: three shard tickets spring (VO-FIRST · THREE LAYERS · STAGGER). Speaker stays occluded by the desk.

## Frame 3 — Forge the rules
- status: animated
- src: compositions/frames/03-forge.html
- duration: 10.124s
- transition_in: cut
- scene: Fitted Agent as compositor behind a light table; three rule cards land on it
- voiceover: Forge for fondof. Locked background. Three layers. Voice-over holds the cut. Remotion springs stay in the citation. We name data-start and GSAP.
- type: Key_Feature
- persuasion: Enumeration
- beat: forge
- blueprint: grid-card-assemble (Reproduce)
- focal: THREE LAYERS card
- roles: paper = background · agent = midground · press/table = foreground · cards = overlay
- sfx: card-place, tick
- asset_candidates: assets/cutouts/agent-cut.png, assets/cutouts/press-cut.png

Scene 1: paper; FORGE / FONDOF; press FG seats.
Scene 2: Agent pops MID behind the table. Three cards cascade on the table — LOCKED PLATE · THREE LAYERS · VO HOLDS THE CUT.
Scene 3: citation REMOTION spring → HF data-start / GSAP. Cards hold.

## Frame 4 — We used it
- status: animated
- src: compositions/frames/04-used.html
- duration: 7.012s
- transition_in: cut
- scene: the three layers of THIS film named on beat — plate, halftone people, stage flat
- voiceover: We used it on this clip. Same plate. Same stagger. Hero first, then the cutouts. Music under the voice, never over it.
- type: Benefits
- persuasion: Dogfood / proof
- beat: apply
- blueprint: compose
- focal: stage flat
- roles: paper = background · speaker + agent = midground · stage = foreground
- sfx: spring-pop, whoosh-soft
- asset_candidates: assets/cutouts/speaker-cut.png, assets/cutouts/agent-cut.png, assets/cutouts/stage-cut.png

Scene 1: only locked paper + grain; label BG.
Scene 2: speaker + agent rise MID; label MID. Stagger.
Scene 3: stage flat springs FG, occludes legs; label FG. Hold. THIS CLIP.

## Frame 5 — Copy the skill
- status: animated
- src: compositions/frames/05-cta.html
- duration: 5.991s
- transition_in: cut
- scene: Fitted Agent small at a laptop; URL lockup; copy for any agent
- voiceover: Copy it into Cursor, or Kiro, or Claude. If an agent can compose from a URL, that is the product.
- type: CTA
- persuasion: Ask
- beat: close
- blueprint: titlecard-reveal (Adapt)
- focal: fondof.netlify.app
- roles: paper = background · agent = midground · clipboard/desk = foreground · URL = overlay
- sfx: stamp, whoosh-soft
- asset_candidates: assets/cutouts/agent-cut.png, assets/cutouts/desk-cut.png

Scene 1: paper; chrome ANY AGENT.
Scene 2: Shrikhand fondof.netlify.app wipe-up with red offset.
Scene 3: chips CURSOR · KIRO · CLAUDE; agent stays atmosphere. URL holds. No fake pool.
